'use strict';
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function ownsSubscription(userId, subscriptionId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM subscriptions WHERE id = $1 AND user_id = $2',
    [subscriptionId, userId]
  );
  return rows.length > 0;
}

function toReminder(r) {
  return {
    id: r.id,
    subscriptionId: r.subscription_id,
    audioUrl: r.audio_url,
    reminderType: r.reminder_type,
    createdAt: r.created_at,
  };
}

// POST /api/voice/generate
router.post('/generate', async (req, res) => {
  const { subscriptionId, reminderType, text, voiceName } = req.body || {};
  const elevenLabsKey = req.headers['x-elevenlabs-key'];
  if (!subscriptionId || !reminderType)
    return res.status(400).json({ error: 'subscriptionId and reminderType required' });

  try {
    if (!(await ownsSubscription(req.user.id, subscriptionId)))
      return res.status(404).json({ error: 'Subscription not found' });

    let audioUrl = null;

    if (elevenLabsKey && text) {
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
        audioUrl = `https://api.elevenlabs.io/v1/history`;
      }
    }

    if (!audioUrl) audioUrl = `voice://${subscriptionId}/${reminderType}`;

    const { rows } = await pool.query(
      'INSERT INTO voice_reminders (subscription_id, audio_url, reminder_type) VALUES ($1,$2,$3) RETURNING *',
      [subscriptionId, audioUrl, reminderType]
    );
    res.status(201).json(toReminder(rows[0]));
  } catch (err) {
    console.error('[voice/generate]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/voice/reminders/:subscriptionId
router.get('/reminders/:subscriptionId', async (req, res) => {
  try {
    if (!(await ownsSubscription(req.user.id, req.params.subscriptionId)))
      return res.status(404).json({ error: 'Subscription not found' });
    const { rows } = await pool.query(
      'SELECT * FROM voice_reminders WHERE subscription_id = $1 ORDER BY created_at DESC',
      [req.params.subscriptionId]
    );
    res.json(rows.map(toReminder));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/voice/reminders — only the authenticated user's reminders
router.get('/reminders', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT vr.* FROM voice_reminders vr
       JOIN subscriptions s ON s.id = vr.subscription_id
       WHERE s.user_id = $1
       ORDER BY vr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(toReminder));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
