import { NextResponse } from 'next/server';
import { HttpError } from './state';

// Wraps a route handler: turns thrown errors into JSON responses.
export const handle = (fn) => async (req) => {
  try {
    return await fn(req);
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
};
export const json = (data, status = 200) => NextResponse.json(data, { status });
export const body = async (req) => { try { return await req.json(); } catch { throw new HttpError(400, 'Invalid JSON'); } };
