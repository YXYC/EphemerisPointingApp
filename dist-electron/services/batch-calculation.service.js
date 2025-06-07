"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const services_database_service = require("./database.service.js");
const worker_threads = require("worker_threads");
const path = require("path");
const services_satelliteProcessor_service = require("./satellite-processor.service.js");
class BatchCalculationService {
  constructor() {
    this.workerPool = /* @__PURE__ */ new Map();
    this.taskQueue = [];
    this.MAX_WORKERS = 4;
    this.WORKER_TIMEOUT = 3e4;
    this.nextWorkerId = 0;
    this.activeWorkerCount = 0;
    this.dbService = services_database_service.DatabaseService.getInstance();
    this.satelliteProcessor = new services_satelliteProcessor_service.SatelliteProcessor();
  }
  createWorker() {
    const workerId = this.nextWorkerId++;
    const workerPath = path.join(__dirname, "../../dist-electron/workers/calculation.worker.js");
    if (!require("fs").existsSync(workerPath)) {
      throw new Error(`Worker 文件不存在: ${workerPath}`);
    }
    const worker = new worker_threads.Worker(workerPath);
    this.activeWorkerCount++;
    worker.on("message", (result) => {
      const task = this.taskQueue.shift();
      if (task) {
        task.resolve(result);
      }
      this.workerPool.set(workerId, worker);
      this.processNextTask();
    });
    worker.on("error", (error) => {
      this.handleWorkerError(workerId, error);
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        this.handleWorkerExit(workerId);
      }
    });
    this.workerPool.set(workerId, worker);
    return workerId;
  }
  getAvailableWorker() {
    if (this.activeWorkerCount < this.MAX_WORKERS) {
      try {
        this.createWorker();
      } catch (error) {
        return null;
      }
    }
    for (const worker of this.workerPool.values()) {
      if (worker.threadId) {
        return worker;
      }
    }
    return null;
  }
  handleWorkerError(workerId, error) {
    const worker = this.workerPool.get(workerId);
    if (worker) {
      try {
        worker.terminate();
      } catch (e) {
      }
      this.workerPool.delete(workerId);
      this.activeWorkerCount--;
      const task = this.taskQueue.shift();
      if (task) {
        task.reject(error);
      }
    }
  }
  handleWorkerExit(workerId) {
    this.workerPool.delete(workerId);
    this.activeWorkerCount--;
  }
  processNextTask() {
    if (this.taskQueue.length === 0) return;
    const worker = this.getAvailableWorker();
    if (!worker) {
      this.createWorker();
      return;
    }
    const task = this.taskQueue[0];
    setTimeout(() => {
      const index = this.taskQueue.findIndex((t) => t === task);
      if (index !== -1) {
        this.taskQueue.splice(index, 1);
        task.reject(new Error("Worker 任务超时"));
      }
    }, this.WORKER_TIMEOUT);
    worker.postMessage(task.task);
  }
  async processTaskWithWorker(task) {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      if (!worker) {
        resolve({ success: false, error: "没有可用的 Worker" });
        return;
      }
      const messageHandler = (message) => {
        if (message.type === "progress") {
          return;
        }
        worker.removeListener("message", messageHandler);
        if (message.type === "error") {
          resolve({ success: false, error: message.error });
          return;
        }
        if (message.type === "complete" && message.success) {
          resolve({ success: true, results: message.results });
          return;
        }
        if (message.success && Array.isArray(message.results)) {
          resolve({ success: true, results: message.results });
          return;
        }
        resolve({ success: false, error: "未知的 Worker 消息格式" });
      };
      const errorHandler = (error) => {
        worker.removeListener("error", errorHandler);
        resolve({ success: false, error: error.message });
      };
      worker.on("message", messageHandler);
      worker.once("error", errorHandler);
      worker.postMessage(task);
    });
  }
  static getInstance() {
    if (!BatchCalculationService.instance) {
      BatchCalculationService.instance = new BatchCalculationService();
    }
    return BatchCalculationService.instance;
  }
  // 检查两个时间点是否在1.2秒内
  isWithinTimeThreshold(time1, time2) {
    const t1 = new Date(time1).getTime();
    const t2 = new Date(time2).getTime();
    return Math.abs(t1 - t2) <= 1200;
  }
  // 获取卫星数据
  async getSatelliteData(satelliteName, startTime, endTime, startPage, pageSize) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`无效的时间格式: startTime=${startTime}, endTime=${endTime}`);
      }
      const { data } = await this.dbService.getSatelliteData(
        { start: startTime, end: endTime },
        satelliteName,
        startPage,
        pageSize
      );
      if (!Array.isArray(data)) {
        throw new Error(`获取卫星数据返回格式错误: ${JSON.stringify(data)}`);
      }
      if (data.length === 0) {
        console.log(`卫星 ${satelliteName} 在时间范围 ${startTime} 到 ${endTime} 内没有数据`);
        return [];
      }
      const validData = data.filter((item) => {
        if (!item.time || !item.satellite_name || typeof item.pos_x !== "number" || typeof item.pos_y !== "number" || typeof item.pos_z !== "number") {
          console.warn(`跳过无效数据点: ${JSON.stringify(item)}`);
          return false;
        }
        return true;
      });
      if (validData.length === 0) {
        console.log(`卫星 ${satelliteName} 在时间范围内没有有效数据`);
        return [];
      }
      return validData.map((item) => ({
        time: item.time,
        position: {
          x: item.pos_x,
          y: item.pos_y,
          z: item.pos_z
        },
        attitude: typeof item.q0 === "number" && typeof item.q1 === "number" && typeof item.q2 === "number" && typeof item.q3 === "number" ? {
          q0: item.q0,
          q1: item.q1,
          q2: item.q2,
          q3: item.q3
        } : void 0
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`获取卫星 ${satelliteName} 数据失败:`, errorMessage);
      throw new Error(`获取卫星 ${satelliteName} 数据失败: ${errorMessage}`);
    }
  }
  // 获取精测矩阵数据
  async getMeasurementMatrix(matrixId) {
    try {
      const matrices = await this.dbService.getMeasurementMatrices();
      const matrix = matrices.find((m) => m.name === matrixId);
      if (!matrix) {
        throw new Error(`未找到ID为 ${matrixId} 的精测矩阵`);
      }
      return {
        roll: matrix.roll_urad,
        pitch: matrix.pitch_urad,
        yaw: matrix.yaw_urad
      };
    } catch (error) {
      throw new Error(`获取精测矩阵数据失败: ${error}`);
    }
  }
  // 保存计算结果
  async saveCalculationResults(results) {
    try {
      for (const result of results) {
        await this.dbService.upsertEphemerisResult({
          time: result.time,
          source_satellite: result.source_satellite,
          target_satellite: result.target_satellite,
          yaw: result.yaw,
          pitch: result.pitch,
          distance: result.distance
        });
      }
    } catch (error) {
      throw new Error(`保存计算结果失败: ${error}`);
    }
  }
  // 批量计算主函数
  async batchCalculate(params, progressCallback) {
    const { startTime, endTime, sourceSatellite, targetSatellite, matrixId } = params;
    try {
      if (!startTime || !endTime || !sourceSatellite || !targetSatellite || !matrixId) {
        return {
          success: false,
          message: "缺少必要的计算参数"
        };
      }
      const matrix = await this.getMeasurementMatrix(matrixId);
      const [sourceData, targetData] = await Promise.all([
        this.getSatelliteData(sourceSatellite, startTime, endTime, 1, 1e5),
        this.getSatelliteData(targetSatellite, startTime, endTime, 1, 1e5)
      ]);
      if (sourceData.length === 0 || targetData.length === 0) {
        const missingSource = sourceData.length === 0 ? `本星 "${sourceSatellite}"` : "";
        const missingTarget = targetData.length === 0 ? `对星 "${targetSatellite}"` : "";
        const missingSatellites = [missingSource, missingTarget].filter(Boolean).join("、");
        return {
          success: false,
          message: `${missingSatellites} 在时间范围 ${startTime} 到 ${endTime} 内没有数据，请先导入卫星数据`
        };
      }
      const targetTimeMap = /* @__PURE__ */ new Map();
      for (const target of targetData) {
        targetTimeMap.set(target.time, target);
      }
      const BATCH_SIZE = 1e3;
      const totalBatches = Math.ceil(sourceData.length / BATCH_SIZE);
      const tasks = [];
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, sourceData.length);
        const batchSourceData = sourceData.slice(start, end);
        tasks.push({
          sourceData: batchSourceData,
          targetData: targetTimeMap,
          sourceSatellite,
          targetSatellite,
          matrix
        });
      }
      const batchResults = await Promise.all(
        tasks.map(async (task, index) => {
          const result = await this.processTaskWithWorker(task);
          if (progressCallback) {
            const progress = Math.min(100, (index + 1) / totalBatches * 100);
            progressCallback(progress);
          }
          return result;
        })
      );
      const calculationResults = [];
      let hasError = false;
      let errorMessage = "";
      for (const result of batchResults) {
        if (result.success && result.results && result.results.length > 0) {
          calculationResults.push(...result.results);
          try {
            await this.saveCalculationResults(result.results);
          } catch (error) {
            hasError = true;
            errorMessage = "保存计算结果时发生错误";
          }
        } else if (!result.success) {
          hasError = true;
          errorMessage = result.error || "批次处理失败";
        }
      }
      if (calculationResults.length > 0) {
        const displayResults = calculationResults.map((result) => ({
          ...result,
          yaw: result.yaw / 1e6 * (180 / Math.PI),
          pitch: result.pitch / 1e6 * (180 / Math.PI)
        }));
        return {
          success: true,
          message: hasError ? `计算完成，但${errorMessage}` : "计算完成",
          results: displayResults
        };
      } else {
        return {
          success: false,
          message: hasError ? errorMessage : "没有符合的完整数据，请检查输入数据是否完整"
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  // 清理资源
  cleanup() {
    for (const worker of this.workerPool.values()) {
      try {
        worker.terminate();
      } catch (e) {
      }
    }
    this.workerPool.clear();
    this.activeWorkerCount = 0;
    this.taskQueue = [];
  }
  // 处理单个批次的数据
  async processBatch(sourceData, targetTimeMap, sourceSatellite, targetSatellite, matrix) {
    const results = [];
    for (const sourcePoint of sourceData) {
      if (!sourcePoint.attitude) continue;
      let closestTargetPoint = null;
      let minTimeDiff = Infinity;
      const sourceTime = new Date(sourcePoint.time).getTime();
      for (const [targetTime, targetPoint] of targetTimeMap.entries()) {
        const timeDiff = Math.abs(new Date(targetTime).getTime() - sourceTime);
        if (timeDiff <= 1200 && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestTargetPoint = targetPoint;
        }
      }
      if (closestTargetPoint) {
        try {
          this.satelliteProcessor.setSatelliteState(
            new services_satelliteProcessor_service.Vector3d(sourcePoint.position.x, sourcePoint.position.y, sourcePoint.position.z),
            new services_satelliteProcessor_service.Quaternion(sourcePoint.attitude.q0, sourcePoint.attitude.q1, sourcePoint.attitude.q2, sourcePoint.attitude.q3)
          );
          this.satelliteProcessor.setTargetPosition(
            new services_satelliteProcessor_service.Vector3d(closestTargetPoint.position.x, closestTargetPoint.position.y, closestTargetPoint.position.z)
          );
          this.satelliteProcessor.setMeasurementMatrix(matrix.roll, matrix.pitch, matrix.yaw);
          const { distance, yaw, pitch } = this.satelliteProcessor.calculateRelativeState();
          const result = {
            time: sourcePoint.time,
            source_satellite: sourceSatellite,
            target_satellite: targetSatellite,
            yaw: yaw * 1e6,
            // 转换为微弧度
            pitch: pitch * 1e6,
            // 转换为微弧度
            distance
          };
          if (this.validateCalculationResult(result)) {
            results.push(result);
          }
        } catch (error) {
          continue;
        }
      }
    }
    return results;
  }
  validateSatelliteData(data, satelliteName) {
    const invalidPoints = data.filter((d) => !d.attitude);
    if (invalidPoints.length > 0) {
      console.warn(`卫星 ${satelliteName} 有 ${invalidPoints.length} 个点缺少姿态数据`);
    }
    return invalidPoints.length === 0;
  }
  validateCalculationResult(result) {
    const isValid = typeof result.yaw === "number" && typeof result.pitch === "number" && typeof result.distance === "number" && result.distance > 0 && !isNaN(result.yaw) && !isNaN(result.pitch) && Math.abs(result.yaw) < 2 * Math.PI * 1e6 && // 检查是否在合理范围内
    Math.abs(result.pitch) < Math.PI * 1e6;
    return isValid;
  }
}
exports.BatchCalculationService = BatchCalculationService;
