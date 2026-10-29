import { Env, corsHeaders } from './helpers';

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.next();
  const newHeaders = new Headers(response.headers);
  const cors = corsHeaders() as Record<string, string>;
  for (const [key, value] of Object.entries(cors)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

