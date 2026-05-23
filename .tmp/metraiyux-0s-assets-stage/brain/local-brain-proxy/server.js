import Fastify from 'fastify';
import Static from '@fastify/static';
import { request } from 'undici';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../');
const app = Fastify({ logger: true });
await app.register(Static, { root, prefix: '/' });
app.post('/api/local-chat', async (req, reply) => {
  const target = process.env.OLLAMA_CHAT_URL || 'http://127.0.0.1:11434/v1/chat/completions';
  const upstream = await request(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) });
  reply.code(upstream.statusCode).headers({ 'content-type': upstream.headers['content-type'] || 'application/json' });
  return upstream.body;
});
app.listen({ port: Number(process.env.PORT || 8787), host: '0.0.0.0' });
