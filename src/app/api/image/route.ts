'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return new NextResponse('File path is required', { status: 400 });
  }

  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    return new NextResponse('WebDAV configuration is incomplete', { status: 500 });
  }

  const client = createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });

  try {
    const stat = await client.stat(path);
    const mimeType = stat.mime || 'application/octet-stream';
    const stream = client.createReadStream(path);
    
    // Using a regular Readable stream to send to Next.js response
    const nodeStream = new Readable({
      read() {
        // Compatibility wrapper
      }
    });

    stream.on('data', (chunk) => {
      nodeStream.push(chunk);
    });

    stream.on('end', () => {
      nodeStream.push(null);
    });
    
    stream.on('error', (error) => {
        nodeStream.emit('error', error);
    });


    return new NextResponse(nodeStream as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stat.size),
      },
    });

  } catch (error) {
    console.error(`Failed to fetch image from WebDAV: ${path}`, error);
    return new NextResponse('Image not found or could not be fetched.', { status: 404 });
  }
}
