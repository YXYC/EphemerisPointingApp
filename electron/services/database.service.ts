import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

export class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database

  private constructor() {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'satellite.db')
    this.db = new Database(dbPath)
    this.initializeTables()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private initializeTables() {
    // 启用外键约束
    this.db.pragma('foreign_keys = ON')

    // 创建卫星数据表
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
    `)

    // 创建星历计算结果表
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
    `)

    // 创建精测矩阵表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS measurement_matrices (
        name TEXT PRIMARY KEY,
        roll_urad REAL,
        pitch_urad REAL,
        yaw_urad REAL
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_satellite_data_time ON satellite_data(time);
      CREATE INDEX IF NOT EXISTS idx_satellite_data_name ON satellite_data(satellite_name);
      CREATE INDEX IF NOT EXISTS idx_ephemeris_results_time ON ephemeris_results(time);
      CREATE INDEX IF NOT EXISTS idx_ephemeris_results_source ON ephemeris_results(source_satellite);
      CREATE INDEX IF NOT EXISTS idx_ephemeris_results_target ON ephemeris_results(target_satellite);
    `)

    // 优化数据库性能
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = -2000') // 使用2MB缓存
  }

  // 卫星数据相关方法
  public upsertSatelliteData(data: {
    time: string
    satellite_name: string
    pos_x: number
    pos_y: number
    pos_z: number
    q0: number
    q1: number
    q2: number
    q3: number
  }) {
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
    `)
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
    )
  }

  public upsertSatelliteDataBatch(dataArr: {
    time: string
    satellite_name: string
    pos_x: number
    pos_y: number
    pos_z: number
    q0: number
    q1: number
    q2: number
    q3: number
  }[]) {
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
    `)

    // 使用事务和批量插入优化性能
    const insertMany = this.db.transaction((rows) => {
      const batchSize = 1000
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        for (const row of batch) {
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
          )
        }
      }
    })
    
    insertMany(dataArr)
  }

  // 星历计算结果相关方法
  public upsertEphemerisResult(data: {
    source_satellite: string
    target_satellite: string
    time: string
    distance: number
    yaw: number
    pitch: number
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO ephemeris_results (
        source_satellite, target_satellite, time, distance, yaw, pitch
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(time, source_satellite, target_satellite) DO UPDATE SET
        distance = excluded.distance,
        yaw = excluded.yaw,
        pitch = excluded.pitch
    `)
    return stmt.run(
      data.source_satellite,
      data.target_satellite,
      data.time,
      data.distance,
      data.yaw,
      data.pitch
    )
  }

  // 精测矩阵相关方法
  public upsertMeasurementMatrix(data: {
    name: string
    roll_urad: number
    pitch_urad: number
    yaw_urad: number
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO measurement_matrices (
        name, roll_urad, pitch_urad, yaw_urad
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        roll_urad = excluded.roll_urad,
        pitch_urad = excluded.pitch_urad,
        yaw_urad = excluded.yaw_urad
    `)
    return stmt.run(
      data.name,
      data.roll_urad,
      data.pitch_urad,
      data.yaw_urad
    )
  }

  // 查询方法
  public getAllSatelliteNames(): string[] {
    const rows = this.db.prepare('SELECT DISTINCT satellite_name FROM satellite_data').all()
    return rows.map((row: any) => row.satellite_name)
  }

  public getSatelliteData(
    timeRange?: { start: string; end: string },
    satellite?: string,
    page: number = 1,
    pageSize: number = 10
  ) {
    let query = `
      WITH filtered_data AS (
        SELECT * FROM satellite_data
        WHERE 1=1
        ${timeRange ? 'AND time BETWEEN ? AND ?' : ''}
        ${satellite ? 'AND satellite_name = ?' : ''}
      )
      SELECT * FROM filtered_data
      ORDER BY time ASC
      LIMIT ? OFFSET ?
    `
    
    const params = []
    if (timeRange) {
      params.push(timeRange.start, timeRange.end)
    }
    if (satellite) {
      params.push(satellite)
    }
    params.push(pageSize, (page - 1) * pageSize)

    const data = this.db.prepare(query).all(...params)

    // 使用子查询优化计数
    const countQuery = `
      SELECT COUNT(*) as total FROM satellite_data
      WHERE 1=1
      ${timeRange ? 'AND time BETWEEN ? AND ?' : ''}
      ${satellite ? 'AND satellite_name = ?' : ''}
    `
    const total = (this.db.prepare(countQuery).get(...params.slice(0, params.length - 2)) as any).total

    return { data, total }
  }

  public getEphemerisResults(
    timeRange?: { start: string; end: string }, 
    sourceSatellite?: string, 
    targetSatellite?: string,
    page: number = 1,
    pageSize: number = 10
  ) {
    let query = 'SELECT * FROM ephemeris_results'
    const conditions = []
    const params = []

    if (timeRange) {
      conditions.push('time BETWEEN ? AND ?')
      params.push(timeRange.start, timeRange.end)
    }
    if (sourceSatellite) {
      conditions.push('source_satellite = ?')
      params.push(sourceSatellite)
    }
    if (targetSatellite) {
      conditions.push('target_satellite = ?')
      params.push(targetSatellite)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY time DESC'
    query += ' LIMIT ? OFFSET ?'
    params.push(pageSize, (page - 1) * pageSize)

    const data = this.db.prepare(query).all(...params)

    let countQuery = 'SELECT COUNT(*) as total FROM ephemeris_results'
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ')
    }
    const total = (this.db.prepare(countQuery).get(...params.slice(0, params.length - 2)) as any).total

    return { data, total }
  }

  public getMeasurementMatrices() {
    return this.db.prepare('SELECT * FROM measurement_matrices ORDER BY name').all()
  }

  // 删除方法
  public deleteSatelliteData(time: string, satellite: string) {
    return this.db.prepare('DELETE FROM satellite_data WHERE time = ? AND satellite_name = ?').run(time, satellite)
  }

  public deleteEphemerisResult(time: string, sourceSatellite: string, targetSatellite: string) {
    return this.db.prepare('DELETE FROM ephemeris_results WHERE time = ? AND source_satellite = ? AND target_satellite = ?')
      .run(time, sourceSatellite, targetSatellite)
  }

  public deleteMeasurementMatrix(name: string) {
    return this.db.prepare('DELETE FROM measurement_matrices WHERE name = ?').run(name)
  }

  // 关闭数据库连接
  public close() {
    this.db.close()
  }

  public clearAllTables() {
    this.db.prepare('DELETE FROM satellite_data').run()
    this.db.prepare('DELETE FROM ephemeris_results').run()
    this.db.prepare('DELETE FROM measurement_matrices').run()
  }
} 