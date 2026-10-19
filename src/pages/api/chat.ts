import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleChat, type ChatEnvironment } from '../../lib/chat-server';
export const prerender = false;
export const POST: APIRoute = ({ request }) =>
  handleChat(request, env as ChatEnvironment);
