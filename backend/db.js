'use strict';
const { Pool } = require('pg');

const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // Development PostgreSQL is local and rejects TLS; production requires it.
  ssl: isDeployment ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
