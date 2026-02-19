## Waitlist API (Express + Supabase, Render-ready)

Minimal backend API that accepts waitlist emails, stores them in Supabase, and is ready to deploy on Render.

### Endpoints

- **POST** `/waitlist`
  - **Body**: `{ "email": "user@example.com", "ref": "optionalReferralCode" }`  
    - `ref` is optional; when present and valid, the signup is attributed to that referrer (referral link usage).
  - **Responses**:
    - `201` – `{ message: "Successfully joined the waitlist.", email: "user@example.com", referral_code: "...", referral_link: "https://...?ref=..." }`
    - `200` – `{ message: "You are already on the waitlist.", email: "user@example.com", referral_code: "...", referral_link: "..." }`
    - `400` – `{ error: "Email is required." | "Invalid email format." }`
    - `500` – `{ error: "Failed to save email. Please try again later." | "Internal server error." }`

- **GET** `/referrals/:code`
  - Returns referral stats for the given code (successful signups only).
  - **Response (200)**: `{ "code": "<code>", "successfulCount": <number> }`  
    - `successfulCount` is the number of users who joined the waitlist using this referral link. Unknown codes return `successfulCount: 0`.

- **GET** `/referrals/by-email?email=user@example.com`
  - Returns referral stats by the user’s email (no need to know their referral code).
  - **Response (200)**: `{ "email": "...", "referral_code": "...", "referral_link": "...", "successfulCount": <number> }`
  - **404**: `{ "error": "Email not found on waitlist." }` if the email is not on the waitlist.

- **GET** `/health`
  - Simple health check: `{ "status": "ok" }`

### Required Environment Variables

Set these in your local `.env` and in Render’s **Environment** settings:

- **`PORT`**
  - Port for the Express server.
  - **On Render**: Render automatically sets `PORT`; you don’t need to define it manually.

- **`SUPABASE_URL`**
  - Your Supabase project URL.
  - From Supabase: **Project Settings → API → Project URL**.

- **`SUPABASE_SERVICE_ROLE_KEY`**
  - Your Supabase **service_role** key (backend-only, high-privilege).
  - From Supabase: **Project Settings → API → service_role**.
  - **Never expose this key in frontend or public code.**

- **`WAITLIST_TABLE`** (optional)
  - Name of the table where emails are stored, default is `waitlist`.

- **`REFERRALS_TABLE`** (optional)
  - Name of the referrals table, default is `referrals`.

- **`REFERRAL_BASE_URL`** (optional)
  - Base URL for referral links (e.g. your landing page). Omit or leave empty for relative links like `?ref=CODE`.

### Supabase Table Schema (recommended)

Run the migration in **Supabase → SQL Editor** using `supabase/migrations/001_referral_schema.sql`. It:

1. Adds **`referral_code`** to `waitlist` (unique, not null, backfilled for existing rows).
2. Creates **`referrals`** table: `id`, `referrer_id` (FK waitlist), `referred_id` (FK waitlist), `created_at`, unique `(referrer_id, referred_id)`.

If creating from scratch, create `waitlist` first with at least:

- **`id`**: `uuid`, primary key, default `gen_random_uuid()`
- **`email`**: `text`, `unique`
- **`created_at`**: `timestamptz`, default `now()`
- **`referral_code`**: `text`, `unique`, not null (see migration for backfill)

Then run the migration to add `referral_code` if missing and create `referrals`.

### Local Development

1. **Install dependencies**

```bash
cd /Users/apple/Downloads/Archive/senseifi/waitlist-view
npm install
```

2. **Create `.env`** in the project root and set the variables listed above.

3. **Run the server**

```bash
npm run dev
```

4. **Test the API**

```bash
# Join waitlist (returns referral_link and referral_code)
curl -X POST http://localhost:3000/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Join with a referrer (pass ref from someone's referral link)
curl -X POST http://localhost:3000/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "friend@example.com", "ref": "REFERRER_CODE"}'

# Get referral stats by code
curl http://localhost:3000/referrals/REFERRER_CODE

# Get referral stats by email (user only needs their email)
curl "http://localhost:3000/referrals/by-email?email=you@example.com"
```

### Render Deployment Notes

- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (optionally) `WAITLIST_TABLE`, `REFERRALS_TABLE`, `REFERRAL_BASE_URL`.

