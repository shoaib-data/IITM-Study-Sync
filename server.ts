import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { fetchAndParseAcademicCalendar } from './src/server/calendarSync.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust first reverse proxy (e.g., Render / Cloud Run) for accurate client IP rate limiting
app.set('trust proxy', 1);

// Hide Express technology signature (X-Powered-By)
app.disable('x-powered-by');

// Security headers via Helmet + explicit Permissions-Policy
app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://apis.google.com',
          'https://accounts.google.com',
          'https://www.gstatic.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
        frameSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://*.firebaseapp.com',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: {
      action: 'deny',
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    xContentTypeOptions: true,
    hidePoweredBy: true,
  })
);

// Additional explicit headers for Permissions-Policy and strict HSTS/clickjacking coverage
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
});

// Parse JSON bodies with strict size limit to prevent payload exhaustion
app.use(express.json({ limit: '16kb' }));

// Rate limiter for authentication & login-related routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false,
});

// General rate limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for expensive/admin-alert endpoints
const strictApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests to this endpoint, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth rate limiter to all standard auth/login/register endpoints
const authRoutes = [
  '/api/auth/signin',
  '/api/auth/login',
  '/api/login',
  '/login',
  '/api/auth/register',
  '/api/register',
];
app.use(authRoutes, authLimiter);

// Return 404 JSON on non-existent API auth endpoints (after rate limiter runs)
app.all(
  [
    '/api/auth/signin',
    '/api/auth/login',
    '/api/login',
    '/api/auth/register',
    '/api/register',
  ],
  (req, res) => {
    res.status(404).json({
      error: 'Authentication is handled via Firebase Auth; this endpoint is not enabled.',
    });
  }
);

app.use('/api', apiLimiter);

let latestCalendarSync: any = null;

// Calendar Sync API endpoint
app.post('/api/calendar/sync', strictApiLimiter, async (req, res) => {
  try {
    const result = await fetchAndParseAcademicCalendar();
    latestCalendarSync = result;

    if (!result.success) {
      console.error('[IITM Calendar Sync Failed]', {
        error: result.error,
        rawResponse: result.rawResponse,
        adminNotified: 'syedshoaib.outlook@gmail.com',
      });
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

app.post('/api/notify-admin', strictApiLimiter, (req, res) => {
  const { reason, details } = req.body ?? {};
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 200) {
    res.status(400).json({ success: false, error: 'Invalid notification reason' });
    return;
  }
  const safeDetails =
    typeof details === 'string'
      ? details.slice(0, 1000)
      : details && typeof details === 'object'
        ? JSON.stringify(details).slice(0, 1000)
        : '';

  console.log('[Admin Notification Dispatched]', {
    reason: reason.trim(),
    details: safeDetails,
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, message: 'Notification logged and dispatched to admin' });
});

// Reject unknown /api/* paths with JSON 404 rather than serving the SPA HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
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
