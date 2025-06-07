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
        time TEXT NOT NULL,
        satellite_name TEXT NOT NULL,
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        pos_z REAL NOT NULL,
        q0 REAL NOT NULL,
        q1 REAL NOT NULL,
        q2 REAL NOT NULL,
        q3 REAL NOT NULL,
        PRIMARY KEY (time, satellite_name)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ephemeris_results (
        source_satellite TEXT NOT NULL,
        target_satellite TEXT NOT NULL,
        time TEXT NOT NULL,
        distance REAL NOT NULL,
        yaw REAL NOT NULL,
        pitch REAL NOT NULL,
        PRIMARY KEY (time, source_satellite, target_satellite)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS measurement_matrices (
        name TEXT PRIMARY KEY,
        roll_urad REAL NOT NULL,
        pitch_urad REAL NOT NULL,
        yaw_urad REAL NOT NULL
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
  getSatelliteData(timeRange, satellite) {
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
    query += " ORDER BY time DESC";
    return this.db.prepare(query).all(...params);
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
}
exports.DatabaseService = DatabaseService;
