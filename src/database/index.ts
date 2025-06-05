import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'
import { app } from 'electron'

let db: Database | null = null

export async function initDatabase() {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'ephemeris.db')
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  // 创建必要的表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ephemeris_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  return db
}

export async function getDatabase() {
  if (!db) {
    await initDatabase()
  }
  return db
}

export async function closeDatabase() {
  if (db) {
    await db.close()
    db = null
  }
} 