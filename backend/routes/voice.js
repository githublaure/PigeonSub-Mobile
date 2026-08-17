'use strict';
const express = require('express');
const pool = require('../db');

const router = express.Router();
// Voice routes are auth-optional per api.ts (requireAuth=false on generate/getReminders)

// POST /api/voice/generate
router.post('/generate', async (req, res) => {
  const { subscriptionId, reminderType, text, voiceName } = req.body || {};
  const elevenLabsKey = req.headers['x-elevenlabs-key'];
  if (!subscriptionId || !reminderType)
    return res.status(400).json({ error: 'subscriptionId and reminderType required' });

  try {
    let audioUrl = null;

    if (elevenLabsKey && text) {
      // Forward to ElevenLabs
      const voiceId = voiceName || 'Rachel';
      const elRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1' }),
        }
      );
      if (elRes.ok) {
        // Store a placeholder URL — in production you'd upload to storage
        audioUrl = `https://api.elevenlabs.io/v1/history`;
      }
    }

    if (!audioUrl) audioUrl = `voice://${subscriptionId}/${reminderType}`;

    const { rows } = await pool.query(
      'INSERT INTO voice_reminders (subscription_id, audio_url, reminder_type) VALUES ($1,$2,$3) RETURNING *',
      [subscriptionId, audioUrl, reminderType]
    );
    const r = rows[0];
    res.status(201).json({
      id: r.id,
      subscriptionId: r.subscription_id,
      audioUrl: r.audio_url,
      reminderType: r.reminder_type,
      createdAt: r.created_at,
    });
  } catch (err) {
    console.error('[voice/generate]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/voice/reminders/:subscriptionId
router.get('/reminders/:subscriptionId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM voice_reminders WHERE subscription_id = $1 ORDER BY created_at DESC',
      [req.params.subscriptionId]
    );
    res.json(rows.map(r => ({
      id: r.id, subscriptionId: r.subscription_id,
      audioUrl: r.audio_url, reminderType: r.reminder_type, createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/voice/reminders
router.get('/reminders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM voice_reminders ORDER BY created_at DESC LIMIT 100');
    res.json(rows.map(r => ({
      id: r.id, subscriptionId: r.subscription_id,
      audioUrl: r.audio_url, reminderType: r.reminder_type, createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
