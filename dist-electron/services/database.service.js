"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const Database = require("better-sqlite3");
const path = require("path");
const electron = require("electron");
class DatabaseService {
  constructor() {
    const userDataPath = electron.app.getPath("userData");
    const dbPath = path.join(userDataPath, "satellite.db");
    this.db = new Database(dbPath);
    this.initializeTables();
  }
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  initializeTables() {
    this.db.pragma("foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS satellite_data (
        time TEXT,
        satellite_name TEXT,
        pos_x REAL,
        pos_y REAL,
        pos_z REAL,
        q0 REAL,
        q1 REAL,
        q2 REAL,
        q3 REAL,
        PRIMARY KEY (time, satellite_name)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ephemeris_results (
        source_satellite TEXT,
        target_satellite TEXT,
        time TEXT,
        distance REAL,
        yaw REAL,
        pitch REAL,
        PRIMARY KEY (time, source_satellite, target_satellite)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS measurement_matrices (
        name TEXT PRIMARY KEY,
        roll_urad REAL,
        pitch_urad REAL,
        yaw_urad REAL
      )
    `);
  }
  // 卫星数据相关方法
  upsertSatelliteData(data) {
    const stmt = this.db.prepare(`
      INSERT INTO satellite_data (
        time, satellite_name, pos_x, pos_y, pos_z, q0, q1, q2, q3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(time, satellite_name) DO UPDATE SET
        pos_x = excluded.pos_x,
        pos_y = excluded.pos_y,
        pos_z = excluded.pos_z,
        q0 = excluded.q0,
        q1 = excluded.q1,
        q2 = excluded.q2,
        q3 = excluded.q3
    `);
    return stmt.run(
      data.time,
      data.satellite_name,
      data.pos_x,
      data.pos_y,
      data.pos_z,
      data.q0,
      data.q1,
      data.q2,
      data.q3
    );
  }
  upsertSatelliteDataBatch(dataArr) {
    const stmt = this.db.prepare(`
      INSERT INTO satellite_data (
        time, satellite_name, pos_x, pos_y, pos_z, q0, q1, q2, q3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(time, satellite_name) DO UPDATE SET
        pos_x = excluded.pos_x,
        pos_y = excluded.pos_y,
        pos_z = excluded.pos_z,
        q0 = excluded.q0,
        q1 = excluded.q1,
        q2 = excluded.q2,
        q3 = excluded.q3
    `);
    const insertMany = this.db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(
          row.time,
          row.satellite_name,
          row.pos_x,
          row.pos_y,
          row.pos_z,
          row.q0,
          row.q1,
          row.q2,
          row.q3
        );
      }
    });
    insertMany(dataArr);
  }
  // 星历计算结果相关方法
  upsertEphemerisResult(data) {
    const stmt = this.db.prepare(`
      INSERT INTO ephemeris_results (
        source_satellite, target_satellite, time, distance, yaw, pitch
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(time, source_satellite, target_satellite) DO UPDATE SET
        distance = excluded.distance,
        yaw = excluded.yaw,
        pitch = excluded.pitch
    `);
    return stmt.run(
      data.source_satellite,
      data.target_satellite,
      data.time,
      data.distance,
      data.yaw,
      data.pitch
    );
  }
  // 精测矩阵相关方法
  upsertMeasurementMatrix(data) {
    const stmt = this.db.prepare(`
      INSERT INTO measurement_matrices (
        name, roll_urad, pitch_urad, yaw_urad
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        roll_urad = excluded.roll_urad,
        pitch_urad = excluded.pitch_urad,
        yaw_urad = excluded.yaw_urad
    `);
    return stmt.run(
      data.name,
      data.roll_urad,
      data.pitch_urad,
      data.yaw_urad
    );
  }
  // 查询方法
  getAllSatelliteNames() {
    const rows = this.db.prepare("SELECT DISTINCT satellite_name FROM satellite_data").all();
    return rows.map((row) => row.satellite_name);
  }
  getSatelliteData(timeRange, satellite, page = 1, pageSize = 10) {
    let query = "SELECT * FROM satellite_data";
    const conditions = [];
    const params = [];
    if (timeRange) {
      conditions.push("time BETWEEN ? AND ?");
      params.push(timeRange.start, timeRange.end);
    }
    if (satellite) {
      conditions.push("satellite_name = ?");
      params.push(satellite);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY time ASC";
    query += " LIMIT ? OFFSET ?";
    params.push(pageSize, (page - 1) * pageSize);
    const data = this.db.prepare(query).all(...params);
    let countQuery = "SELECT COUNT(*) as total FROM satellite_data";
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }
    const total = this.db.prepare(countQuery).get(...params.slice(0, params.length - 2)).total;
    return { data, total };
  }
  getEphemerisResults(timeRange, sourceSatellite, targetSatellite) {
    let query = "SELECT * FROM ephemeris_results";
    const conditions = [];
    const params = [];
    if (timeRange) {
      conditions.push("time BETWEEN ? AND ?");
      params.push(timeRange.start, timeRange.end);
    }
    if (sourceSatellite) {
      conditions.push("source_satellite = ?");
      params.push(sourceSatellite);
    }
    if (targetSatellite) {
      conditions.push("target_satellite = ?");
      params.push(targetSatellite);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY time DESC";
    return this.db.prepare(query).all(...params);
  }
  getMeasurementMatrices() {
    return this.db.prepare("SELECT * FROM measurement_matrices ORDER BY name").all();
  }
  // 删除方法
  deleteSatelliteData(time, satellite) {
    return this.db.prepare("DELETE FROM satellite_data WHERE time = ? AND satellite_name = ?").run(time, satellite);
  }
  deleteEphemerisResult(time, sourceSatellite, targetSatellite) {
    return this.db.prepare("DELETE FROM ephemeris_results WHERE time = ? AND source_satellite = ? AND target_satellite = ?").run(time, sourceSatellite, targetSatellite);
  }
  deleteMeasurementMatrix(name) {
    return this.db.prepare("DELETE FROM measurement_matrices WHERE name = ?").run(name);
  }
  // 关闭数据库连接
  close() {
    this.db.close();
  }
  clearAllTables() {
    this.db.prepare("DELETE FROM satellite_data").run();
    this.db.prepare("DELETE FROM ephemeris_results").run();
    this.db.prepare("DELETE FROM measurement_matrices").run();
  }
}
exports.DatabaseService = DatabaseService;
