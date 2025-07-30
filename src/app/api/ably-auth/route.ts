
"use server";

import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';

export async function GET(request: NextRequest) {
  const ABLY_API_KEY = process.env.ABLY_API_KEY;

  if (!ABLY_API_KEY) {
    return NextResponse.json(
      { error: "ABLY_API_KEY not configured on server" },
      { status: 500 }
    );
  }
  
  // Use a random client ID for each connection
  const clientId = Math.random().toString(36).substring(2, 15);

  const client = new Ably.Rest(ABLY_API_KEY);

  try {
    const tokenRequest = await client.auth.createTokenRequest({ 
        clientId: clientId,
        // Capabilities can be restricted here for added security
        // For this app, we allow subscribing and presence
        capability: {
             "hubqueue:updates": ["subscribe"],
        }
    });
    return NextResponse.json(tokenRequest);
  } catch (e) {
    console.error("Error creating Ably token request:", e);
    const error = e as Error;
    return NextResponse.json(
        { error: `Error creating Ably token request: ${error.message}` },
        { status: 500 }
    );
  }
}
