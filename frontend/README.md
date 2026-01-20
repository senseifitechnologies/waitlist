## Senseifi Waitlist Admin (Static)

This is a lightweight admin page that fetches all waitlist emails from the backend `GET /waitlist`.

### How to access

- **When served by the API**: open `/admin/`
  - Example: `https://your-service.onrender.com/admin/`

### API base override (optional)

By default it calls **same-origin** `/waitlist`.

If your API is on a different domain, open:

`/admin/?apiBase=https://your-api.onrender.com`

### Replace the logo

Put your real logo file here (same filename):

- `frontend/assets/senseifi-logo.svg`

