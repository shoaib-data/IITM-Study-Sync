import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';
import { fetchAndParseAcademicCalendar } from './src/server/calendarSync.ts';

dotenv.config();

function calendarApiPlugin(): Plugin {
  let latestStatus: any = null;

  return {
    name: 'calendar-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/calendar/sync' && req.method === 'POST') {
          try {
            const result = await fetchAndParseAcademicCalendar();
            latestStatus = result;
            if (!result.success) {
              console.error('[IITM Calendar Sync Failed]', {
                error: result.error,
                adminAlert: 'syedshoaib.outlook@gmail.com',
              });
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: errorMsg }));
          }
          return;
        }

        if (req.url === '/api/calendar/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(latestStatus || { status: 'idle', message: 'No sync performed yet' }));
          return;
        }

        if (req.url === '/api/notify-admin' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            console.log('[Admin Notification Alert]', body);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Admin alert dispatched' }));
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), calendarApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
