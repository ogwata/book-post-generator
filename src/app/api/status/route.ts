import { NextResponse } from 'next/server';
import { getAISettings, getXSettings } from '@/lib/env';

export async function GET() {
  const ai = getAISettings();
  const x = getXSettings();

  return NextResponse.json({
    ai: {
      configured: !!ai,
      provider: ai?.provider || null,
      model: ai?.model || null,
      hasEndpoint: !!ai?.endpoint,
    },
    x: {
      configured: !!x,
    },
  });
}
