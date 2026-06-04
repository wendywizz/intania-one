import { AUTH } from '@/constants/auth';

function corsHeaders(contentType = 'application/json') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': contentType,
  };
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET() {
  const response = await fetch(AUTH.discoveryUrl, {
    headers: {
      Accept: 'application/json',
    },
  });
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: corsHeaders(response.headers.get('content-type') ?? 'application/json'),
  });
}
