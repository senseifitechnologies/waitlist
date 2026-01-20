# Waitlist Backend

A simple TypeScript backend to receive waitlist emails using Express.js and PostgreSQL.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase database URL to `DATABASE_URL`

3. Build the project:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

For development:
```bash
npm run dev
```

## API

### POST /waitlist

Add an email to the waitlist.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
- 200: Email added successfully
- 400: Invalid email or missing email
- 409: Email already exists

### GET /waitlist

Retrieve all emails in the waitlist.

**Response:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-01-20T12:00:00.000Z"
  }
]
```

Emails are stored in a PostgreSQL database on Supabase.

## Deployment

### Render
1. Connect your GitHub repository to Render
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variable: `DATABASE_URL` (from Supabase)
5. Deploy!

### Supabase
1. Create a new project on Supabase
2. Run the migration SQL in the Supabase SQL editor
3. Copy the database URL to your environment variables

## Running the Server

The server runs on port 3000 by default. You can change it with the `PORT` environment variable.