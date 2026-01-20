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
app.post('/waitlist', async (req: Request, res: Response) => {
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
    await db.query('INSERT INTO waitlist (email) VALUES ($1)', [email]);
    res.status(200).json({ message: 'Email added to waitlist' });
  } catch (error: any) {
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(409).json({ error: 'Email already in waitlist' });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all waitlist emails
app.get('/waitlist', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT id, email, created_at FROM waitlist ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});