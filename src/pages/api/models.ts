import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { modelsFor, type ChatEnvironment } from '../../lib/chat-server';
export const prerender = false;
export const GET: APIRoute = () => {
  const config = env as ChatEnvironment;
  return Response.json(
    {
      models:
        config.RWKV_API_KEY && config.RWKV_API_URL && config.CHAT_RATE_LIMITER
          ? modelsFor(config)
          : [],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
