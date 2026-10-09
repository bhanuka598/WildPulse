import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('wildpulse.db');

export const initDB = () => {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS patrols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId TEXT,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'SCHEDULED',
      actualStart TEXT,
      actualEnd TEXT,
      syncStatus TEXT DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      localId TEXT UNIQUE,
      serverId TEXT,
      patrolServerId TEXT,
      incidentType TEXT,
      description TEXT,
      latitude REAL,
      longitude REAL,
      photoPath TEXT,
      severity TEXT DEFAULT 'MEDIUM',
      capturedAt TEXT,
      syncStatus TEXT DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS gps_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patrolServerId TEXT,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      timestamp TEXT,
      syncStatus TEXT DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT,
      entityId TEXT,
      action TEXT,
      payload TEXT,
      createdAt TEXT
    );
  `);
};

export default db;