require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

// --- Environment variables ---
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WAITLIST_TABLE = process.env.WAITLIST_TABLE || 'waitlist';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Fail fast if Supabase is not configured correctly
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// --- Supabase client (service role, backend only) ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// --- Express app setup ---
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// POST /waitlist - accepts { email }
app.post('/waitlist', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Insert into Supabase table (e.g., "waitlist" with columns: id (uuid), email (text, unique), created_at (timestamptz))
    const { data, error } = await supabase
      .from(WAITLIST_TABLE)
      .insert({ email: normalizedEmail })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation gracefully
      const isDuplicate =
        typeof error.message === 'string' &&
        (error.message.toLowerCase().includes('duplicate') ||
          error.message.toLowerCase().includes('unique'));

      if (isDuplicate) {
        return res.status(200).json({
          message: 'You are already on the waitlist.',
          email: normalizedEmail
        });
      }

      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save email. Please try again later.' });
    }

    return res.status(201).json({
      message: 'Successfully joined the waitlist.',
      email: data.email
    });
  } catch (err) {
    console.error('Unexpected error in /waitlist:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Waitlist API listening on port ${PORT}`);
});

