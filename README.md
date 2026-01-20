# Waitlist Backend

A simple TypeScript backend to receive waitlist emails using Express.js.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
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

Emails are stored in an SQLite database (`database.db`).

## Running the Server

The server runs on port 3000 by default. You can change it with the `PORT` environment variable.