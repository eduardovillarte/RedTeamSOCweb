import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import crypto from 'crypto';

import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

export function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT,
      value TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      toolId TEXT,
      toolName TEXT,
      toolDesc TEXT,
      toolCommand TEXT,
      target TEXT,
      date TEXT,
      content TEXT,
      severity TEXT,
      raw TEXT
    )`);

    // Create default admin if not exists
    db.get(`SELECT * FROM users WHERE username = 'admin'`, async (err, row) => {
      if (!row) {
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        const hash = await bcrypt.hash(defaultPassword, 10);
        db.run(`INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [hash]);
        console.log("=================================================");
        console.log(`Default admin created.`);
        console.log(`Username: admin`);
        console.log(`Password: ${defaultPassword}`);
        console.log("PLEASE SAVE THIS PASSWORD OR CHANGE IT IMMEDIATELY.");
        console.log("=================================================");
      }
    });
  });
}

export default db;
