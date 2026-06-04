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

export async function GET(request: Request) {
  const discoveryResponse = await fetch(AUTH.discoveryUrl, {
    headers: {
      Accept: 'application/json',
    },
  });
  const discovery = await discoveryResponse.json();
  const userInfoEndpoint = discovery.userinfo_endpoint ?? AUTH.endpoints.userInfo;

  const response = await fetch(userInfoEndpoint, {
    headers: {
      Accept: 'application/json',
      Authorization: request.headers.get('authorization') ?? '',
    },
  });
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: corsHeaders(response.headers.get('content-type') ?? 'application/json'),
  });
}
