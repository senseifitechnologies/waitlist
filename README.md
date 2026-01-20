## Waitlist API (Express + Supabase, Render-ready)

Minimal backend API that accepts waitlist emails, stores them in Supabase, and is ready to deploy on Render.

### Endpoints

- **POST** `/waitlist`
  - **Body**: `{ "email": "user@example.com" }`
  - **Responses**:
    - `201` – `{ message: "Successfully joined the waitlist.", email: "user@example.com" }`
    - `200` – `{ message: "You are already on the waitlist.", email: "user@example.com" }`
    - `400` – `{ error: "Email is required." | "Invalid email format." }`
    - `500` – `{ error: "Failed to save email. Please try again later." | "Internal server error." }`

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

### Supabase Table Schema (recommended)

Create a table named `waitlist` with at least:

- **`id`**: `uuid`, default `uuid_generate_v4()`, primary key
- **`email`**: `text`, `unique`
- **`created_at`**: `timestamptz`, default `now()`

Example SQL:

```sql
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);
```

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
curl -X POST http://localhost:3000/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Render Deployment Notes

- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (optionally) `WAITLIST_TABLE`.

