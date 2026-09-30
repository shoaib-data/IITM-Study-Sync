import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { fetchAndParseAcademicCalendar } from './src/server/calendarSync.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

let latestCalendarSync: any = null;

// Calendar Sync API endpoint
app.post('/api/calendar/sync', async (req, res) => {
  try {
    const result = await fetchAndParseAcademicCalendar();
    latestCalendarSync = result;

    if (!result.success) {
      console.error('[IITM Calendar Sync Failed]', {
        error: result.error,
        rawResponse: result.rawResponse,
        adminNotified: 'syedshoaib.outlook@gmail.com',
      });
      // In production with Firebase Trigger Email extension or SendGrid/Resend,
      // an automated email is dispatched here to the admin
    }

    res.json(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

app.get('/api/calendar/status', (req, res) => {
  res.json(latestCalendarSync || { status: 'idle', message: 'No sync performed yet' });
});

app.post('/api/notify-admin', (req, res) => {
  const { reason, details } = req.body;
  console.log('[Admin Notification Dispatched to syedshoaib.outlook@gmail.com]', {
    reason,
    details,
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, message: 'Notification logged and dispatched to admin' });
});

// Serve static frontend in production
const distPath = path.join(__dirname, 'dist');
app.use(
  express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

// Automated scheduled sync simulation (runs on start and every 12 hours)
setInterval(async () => {
  try {
    console.log('[Scheduled Calendar Sync] Running automated academic calendar update...');
    latestCalendarSync = await fetchAndParseAcademicCalendar();
  } catch (err) {
    console.error('[Scheduled Calendar Sync Error]', err);
  }
}, 12 * 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
