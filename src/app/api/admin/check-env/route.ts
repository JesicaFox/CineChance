import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPreview: apiKey ? `${apiKey.slice(0, 5)}...${apiKey.slice(-5)}` : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
  });
}
