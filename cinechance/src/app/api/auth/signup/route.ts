import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  console.error('signup route: DATABASE_URL is not set')
}

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

export async function POST(request: Request) {
  let body: any = null;
  try {
    body = await request.json();
  } catch (e) {
    console.error('Failed to parse JSON body for signup', e);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) return NextResponse.json({ message: 'Email and password required' }, { status: 400 });

  let client;
  try {
    client = await pool.connect();
  } catch (e) {
    console.error('Database connect error in signup', e);
    return NextResponse.json({ message: 'Database connection error' }, { status: 500 });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const res = await client.query(
      `INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, now()) RETURNING id, email`,
      [email, hashed]
    );
    const user = res.rows[0];
    return NextResponse.json({ user });
  } catch (err: any) {
    console.error('Signup handler error', err);
    if (err?.code === '23505') {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }
    return NextResponse.json({ message: String(err) }, { status: 500 });
  } finally {
    try {
      client?.release();
    } catch (e) {
      console.error('Error releasing client', e);
    }
  }
}
