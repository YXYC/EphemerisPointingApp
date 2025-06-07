"use strict";
const worker_threads = require("worker_threads");
const services_satelliteProcessor_service = require("../services/satellite-processor.service.js");
const TIME_THRESHOLD = 1200;
const MAX_BATCH_SIZE = 1e3;
const processor = new services_satelliteProcessor_service.SatelliteProcessor();
function validateInputData(task) {
  if (!task.sourceData || !task.targetData || !task.matrix) {
    return false;
  }
  if (!task.sourceSatellite || !task.targetSatellite) {
    return false;
  }
  if (typeof task.matrix.roll !== "number" || typeof task.matrix.pitch !== "number" || typeof task.matrix.yaw !== "number") {
    return false;
  }
  return true;
}
function findClosestTargetPoint(sourceTime, targetData) {
  let closestPoint = null;
  let minTimeDiff = Infinity;
  for (const [targetTime, targetPoint] of targetData.entries()) {
    const timeDiff = Math.abs(new Date(targetTime).getTime() - sourceTime);
    if (timeDiff <= TIME_THRESHOLD && timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestPoint = targetPoint;
    }
  }
  return closestPoint;
}
function validateCalculationResult(result) {
  return typeof result.yaw === "number" && typeof result.pitch === "number" && typeof result.distance === "number" && result.distance > 0 && !isNaN(result.yaw) && !isNaN(result.pitch) && Math.abs(result.yaw) < 2 * Math.PI * 1e6 && Math.abs(result.pitch) < Math.PI * 1e6;
}
function processDataPoint(sourcePoint, closestTargetPoint, sourceSatellite, targetSatellite, matrix) {
  if (!sourcePoint.attitude) return null;
  try {
    processor.setSatelliteState(
      new services_satelliteProcessor_service.Vector3d(sourcePoint.position.x, sourcePoint.position.y, sourcePoint.position.z),
      new services_satelliteProcessor_service.Quaternion(
        sourcePoint.attitude.q0,
        sourcePoint.attitude.q1,
        sourcePoint.attitude.q2,
        sourcePoint.attitude.q3
      )
    );
    processor.setTargetPosition(
      new services_satelliteProcessor_service.Vector3d(
        closestTargetPoint.position.x,
        closestTargetPoint.position.y,
        closestTargetPoint.position.z
      )
    );
    processor.setMeasurementMatrix(matrix.roll, matrix.pitch, matrix.yaw);
    const { distance, yaw, pitch } = processor.calculateRelativeState();
    const result = {
      time: sourcePoint.time,
      source_satellite: sourceSatellite,
      target_satellite: targetSatellite,
      yaw: yaw * 1e6,
      pitch: pitch * 1e6,
      distance
    };
    return validateCalculationResult(result) ? result : null;
  } catch (error) {
    console.error("处理数据点失败:", error);
    return null;
  }
}
function processBatch(task) {
  if (!validateInputData(task)) {
    throw new Error("无效的输入数据");
  }
  const results = [];
  const { sourceData, targetData, sourceSatellite, targetSatellite, matrix } = task;
  for (let i = 0; i < sourceData.length; i += MAX_BATCH_SIZE) {
    const batch = sourceData.slice(i, i + MAX_BATCH_SIZE);
    for (const sourcePoint of batch) {
      const sourceTime = new Date(sourcePoint.time).getTime();
      const closestTargetPoint = findClosestTargetPoint(sourceTime, targetData);
      if (closestTargetPoint) {
        const result = processDataPoint(
          sourcePoint,
          closestTargetPoint,
          sourceSatellite,
          targetSatellite,
          matrix
        );
        if (result) {
          results.push(result);
        }
      }
    }
    if (worker_threads.parentPort) {
      const progress = Math.min(100, (i + batch.length) / sourceData.length * 100);
      worker_threads.parentPort.postMessage({
        type: "progress",
        progress
      });
    }
  }
  return results;
}
if (worker_threads.parentPort) {
  worker_threads.parentPort.on("message", (task) => {
    var _a, _b;
    try {
      const results = processBatch(task);
      (_a = worker_threads.parentPort) == null ? void 0 : _a.postMessage({
        type: "complete",
        success: true,
        results
      });
    } catch (error) {
      (_b = worker_threads.parentPort) == null ? void 0 : _b.postMessage({
        type: "error",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  process.on("uncaughtException", (error) => {
    var _a;
    (_a = worker_threads.parentPort) == null ? void 0 : _a.postMessage({
      type: "error",
      success: false,
      error: `未捕获的异常: ${error.message}`
    });
  });
  process.on("unhandledRejection", (reason) => {
    var _a;
    (_a = worker_threads.parentPort) == null ? void 0 : _a.postMessage({
      type: "error",
      success: false,
      error: `未处理的 Promise 拒绝: ${reason}`
    });
  });
}
