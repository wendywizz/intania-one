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

export async function POST(request: Request) {
  const discoveryResponse = await fetch(AUTH.discoveryUrl, {
    headers: {
      Accept: 'application/json',
    },
  });
  const discovery = await discoveryResponse.json();
  const tokenEndpoint = discovery.token_endpoint ?? AUTH.endpoints.token;
  const body = await request.text();

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
    },
    body,
  });
  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: corsHeaders(response.headers.get('content-type') ?? 'application/json'),
  });
}
