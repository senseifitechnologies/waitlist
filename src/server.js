require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

// --- Environment variables ---
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WAITLIST_TABLE = process.env.WAITLIST_TABLE || 'waitlist';
const REFERRALS_TABLE = process.env.REFERRALS_TABLE || 'referrals';
const REFERRAL_BASE_URL = (process.env.REFERRAL_BASE_URL || '').trim().replace(/\/+$/, '');

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

// --- Referral helpers ---
function generateReferralCode() {
  return crypto.randomBytes(8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildReferralLink(code) {
  if (!code) return '';
  const base = REFERRAL_BASE_URL || '';
  return base ? `${base}?ref=${encodeURIComponent(code)}` : `?ref=${encodeURIComponent(code)}`;
}

// --- Express app setup ---
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

// Serve lightweight admin UI (static) at /admin
app.use('/admin', express.static(path.join(__dirname, '..', 'frontend')));

// API router: mount at root and at /api so both /waitlist and /api/waitlist work
const api = express.Router();

api.get('/', (_req, res) => {
  res.json({ name: 'Waitlist API', endpoints: ['POST /waitlist', 'POST /api/waitlist', 'GET /health'] });
});
api.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Join waitlist handler - shared by POST /waitlist and POST /waitlist/join
async function joinWaitlistHandler(req, res) {
  try {
    const { email, ref: refCode } = req.body || {};

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const referralCode = generateReferralCode();

    const { data, error } = await supabase
      .from(WAITLIST_TABLE)
      .insert({ email: normalizedEmail, referral_code: referralCode })
      .select()
      .single();

    if (error) {
      const isDuplicate =
        typeof error.message === 'string' &&
        (error.message.toLowerCase().includes('duplicate') ||
          error.message.toLowerCase().includes('unique'));

      if (isDuplicate) {
        const { data: existing } = await supabase
          .from(WAITLIST_TABLE)
          .select('referral_code')
          .eq('email', normalizedEmail)
          .single();
        const code = existing?.referral_code || '';
        return res.status(200).json({
          message: 'You are already on the waitlist.',
          email: normalizedEmail,
          referral_code: code,
          referral_link: buildReferralLink(code)
        });
      }

      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save email. Please try again later.' });
    }

    const newId = data.id;
    let referralRecorded = false;

    if (typeof refCode === 'string' && refCode.trim()) {
      const trimmedRef = refCode.trim();
      const { data: referrerRow } = await supabase
        .from(WAITLIST_TABLE)
        .select('id')
        .eq('referral_code', trimmedRef)
        .maybeSingle();
      if (referrerRow && referrerRow.id !== newId) {
        const { error: refErr } = await supabase.from(REFERRALS_TABLE).insert({
          referrer_id: referrerRow.id,
          referred_id: newId
        });
        if (refErr) {
          console.error('Referral insert failed:', refErr);
        } else {
          referralRecorded = true;
        }
      }
    }

    return res.status(201).json({
      message: 'Successfully joined the waitlist.',
      email: data.email,
      referral_code: data.referral_code,
      referral_link: buildReferralLink(data.referral_code),
      referral_recorded: referralRecorded
    });
  } catch (err) {
    console.error('Unexpected error in /waitlist:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

api.post('/waitlist', joinWaitlistHandler);
api.post('/waitlist/', joinWaitlistHandler);
api.post('/waitlist/join', joinWaitlistHandler);
api.post('/waitlist/join/', joinWaitlistHandler);

// GET /waitlist - fetch all waitlist entries (ordered by created_at desc)
api.get('/waitlist', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from(WAITLIST_TABLE)
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch waitlist.' });
    }

    return res.json({
      count: data?.length || 0,
      entries: data || []
    });
  } catch (err) {
    console.error('Unexpected error in GET /waitlist:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /referrals/by-email?email=... - stats by user's email (no need to know referral code)
api.get('/referrals/by-email', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const { data: waitlistRow } = await supabase
      .from(WAITLIST_TABLE)
      .select('id, referral_code')
      .eq('email', email)
      .maybeSingle();

    if (!waitlistRow) {
      return res.status(404).json({ error: 'Email not found on waitlist.' });
    }

    const { count, error: countError } = await supabase
      .from(REFERRALS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', waitlistRow.id);
    const successfulCount = !countError ? (count ?? 0) : 0;

    return res.status(200).json({
      email: email,
      referral_code: waitlistRow.referral_code,
      referral_link: buildReferralLink(waitlistRow.referral_code),
      successfulCount
    });
  } catch (err) {
    console.error('Unexpected error in GET /referrals/by-email:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /referrals/:code - stats for a referral code (successful signups only)
api.get('/referrals/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Referral code is required.' });
    }

    const { data: referrerRow } = await supabase
      .from(WAITLIST_TABLE)
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();

    let successfulCount = 0;
    if (referrerRow) {
      const { count, error: countError } = await supabase
        .from(REFERRALS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', referrerRow.id);
      if (!countError) successfulCount = count ?? 0;
    }

    return res.status(200).json({
      code,
      successfulCount
    });
  } catch (err) {
    console.error('Unexpected error in GET /referrals/:code:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.use(api);
app.use('/api', api);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', path: _req.method + ' ' + _req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`Waitlist API listening on port ${PORT}`);
});

