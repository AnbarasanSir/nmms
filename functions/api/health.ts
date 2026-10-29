import { Env, jsonResponse, errorResponse } from '../helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return jsonResponse({
    status: 'ok',
    serverTime: new Date().toISOString(),
    database: {
      connected: !!context.env.DB,
      type: 'Cloudflare D1 (SQLite)',
    },
  });
};

