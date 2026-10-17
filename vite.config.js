import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import geminiHandler from './api/gemini.js';
import chatsHandler from './api/chats.js';

// Custom Vite plugin to serve the /api/gemini and /api/chats serverless routes locally
function serverlessApiPlugin() {
  return {
    name: 'serverless-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/gemini')) {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            req.body = body;
            await geminiHandler(req, res);
          });
          return;
        }

        if (req.url.startsWith('/api/chats')) {
          if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
            await chatsHandler(req, res);
            return;
          }
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            req.body = body;
            await chatsHandler(req, res);
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Load env variables (including GEMINI_API_KEY) into process.env for local node
  const env = loadEnv(mode, process.cwd(), '');
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    plugins: [react(), serverlessApiPlugin()],
    server: {
      port: 5173,
      host: true, // Allow connections from phone / local network (e.g. 192.168.x.x)
      open: false
    }
  };
});
