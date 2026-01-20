import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import db from './db';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint to receive waitlist emails
app.post('/waitlist', (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Simple validation for email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Insert email into database
  try {
    const stmt = db.prepare('INSERT INTO waitlist (email) VALUES (?)');
    stmt.run(email);
    res.status(200).json({ message: 'Email added to waitlist' });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Email already in waitlist' });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all waitlist emails
app.get('/waitlist', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare('SELECT id, email, created_at FROM waitlist ORDER BY created_at DESC');
    const emails = stmt.all();
    res.status(200).json(emails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});