'use strict';
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 8082;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health checks (the production startup probe calls GET /)
app.get('/', (_, res) => res.json({ status: 'ok', service: 'pigeonsub-api' }));
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'pigeonsub-api' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/voice', require('./routes/voice'));

// 404
app.use((req, res) => res.status(404).json({ error: `No route: ${req.method} ${req.path}` }));

// Error handler
app.use((err, req, res, _next) => {
  console.error('[server error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
        category VARCHAR(100) NOT NULL DEFAULT 'Other',
        category_color VARCHAR(50) DEFAULT '#7C3AED',
        usage_frequency VARCHAR(50) DEFAULT 'used',
        next_renewal DATE,
        safety_date DATE,
        icon_class VARCHAR(100),
        bg_color VARCHAR(50),
        note TEXT,
        purchase_proof_image TEXT,
        unsubscribe_proof_image TEXT,
        rating INTEGER,
        is_suspect BOOLEAN DEFAULT FALSE,
        is_flagged BOOLEAN DEFAULT FALSE,
        use_safety_date BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_trial BOOLEAN DEFAULT FALSE,
        trial_ends_at DATE,
        purchase_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        budget_cap DECIMAL(10,2),
        monthly_overrides JSONB DEFAULT '{}',
        default_budget DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS voice_reminders (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        audio_url TEXT NOT NULL,
        reminder_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[db] Schema ready');
  } catch (err) {
    console.error('[db] Schema init error:', err.message);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[pigeonsub-api] Listening on port ${PORT}`);
  });
}

start();
