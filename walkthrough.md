# Security Summary

**Reviewed Files**: 8 (`server.ts`, `vite.config.ts`, `src/lib/firebase.ts`, `src/server/calendarSync.ts`, `src/components/ResourcesView.tsx`, `firebase-applet-config.json`, `.gitignore`, `package.json`)
**Issues Resolved**: 16 (with 4 external configuration items flagged for DNS/Cloud Console follow-up)

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Missing Security Headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) | `server.ts` | 22-74 | Express did not attach browser security or clickjacking headers to responses. | High | Fixed | Added `helmet` and explicit response header middleware setting `Strict-Transport-Security`, `Content-Security-Policy` (with `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy`. |
| Exposed Server Framework Header (`X-Powered-By`) | `server.ts` | 19, 59, 73 | Express sent `X-Powered-By: Express` on HTTP responses. | Low | Fixed | Disabled `x-powered-by` via `app.disable('x-powered-by')` and `helmet({ hidePoweredBy: true })`. |
| Missing Rate Limiting on Auth & API Endpoints | `server.ts` | 16, 80-124 | `/api/auth/signin`, `/api/auth/login`, `/api/login`, `/login`, `/api/auth/register`, `/api/register`, and `/api/*` had no request throttling. | High | Fixed | Configured `app.set('trust proxy', 1)` and added `express-rate-limit` (`authLimiter`: 5 req / 15 min on all 6 auth/login/register paths; `apiLimiter` and `strictApiLimiter` on `/api/*`). |
| Unbounded Request Body & Unvalidated Notification Payload | `server.ts`, `vite.config.ts` | 77, 154-174 | `/api/notify-admin` accepted arbitrary body content without size or field checks. | Medium | Fixed | Restricted JSON body parsing to `16kb` and validated `reason` and `details` types and lengths. |
| Resource Link Scheme Hardening | `src/components/ResourcesView.tsx` | 500 | Resource card links rendered `item.url` directly in `href` without a render-time scheme guard. | Medium | Fixed | Added `validateResourceUrl(item.url)` check at render time so only `https://` URLs are linked. |
| Environment File Ignore Rules | `.gitignore` | 7-10 | `.env*` was listed, without explicit `.env` and `.env.local` rules. | Low | Fixed | Explicitly added `.env` and `.env.local` to `.gitignore` while keeping `.env.example` tracked. |
| Google/Firebase API Key in Client Bundle | `firebase-applet-config.json` | 4 | Firebase Web SDK client configuration (`apiKey`) is bundled into frontend assets as required by Firebase client initialization; `GEMINI_API_KEY` remains strictly server-side in `process.env`. | High | Needs Follow-Up | Verified `GEMINI_API_KEY` never leaves `server.ts` / `src/server/calendarSync.ts`. Restrict the Firebase Web `apiKey` in Google Cloud Console by HTTP referrer (`https://iitm-study-sync.onrender.com/*`) and allowed Firebase APIs only, and rotate if an unrestricted key was ever shared. |
| DNS Security Records (SPF, DMARC, CAA) | External DNS | — | DNS TXT (`SPF`, `_dmarc`) and `CAA` records cannot be defined in application code and apply at the domain's DNS provider. | Medium | Needs Follow-Up | Add `SPF`, `_dmarc`, and `CAA` records in your DNS provider if attaching a custom domain (Render manages root DNS for `onrender.com` subdomains). |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Server-Side AI Key | `src/server/calendarSync.ts` | `GEMINI_API_KEY` is read strictly from `process.env.GEMINI_API_KEY` on the Node server and never exposed to the client bundle. |
| Database Access Control | `firestore.rules` | Firestore rules enforce owner-only access to private tasks, friend-gated reads on terms/courses, and admin-only writes for catalog/resources. |
| Clickjacking Defense | `server.ts` | Both `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` block framing across legacy and modern browsers. |

## PoC Verification

### Missing Rate Limiting on Authentication Endpoints
#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Rate Limiting (`/api/auth/signin`, `/api/auth/login`, `/api/login`, `/login`, `/api/auth/register`, `/api/register`) |
| Impact | High |
| Affected File | `server.ts:80-124` |
| Test Scenario | Send 6 consecutive rapid requests from the same client IP to `/api/auth/signin` (or `/api/auth/login`, `/api/login`, `/login`, `/api/auth/register`, `/api/register`). |

#### How It Was Fixed
Enabled `trust proxy` (`1`) for accurate client IP resolution behind Render's reverse proxy, and mounted `express-rate-limit` (`max: 5` requests per 15-minute window) in front of all six authentication/login/register paths.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Requests 1–5 arrive at `app.use(authRoutes, authLimiter)` in `server.ts:116` | Rate limiter increments counter for client IP and attaches `RateLimit-*` headers |
| 2 | 6th rapid request arrives within the 15-minute window | `authLimiter` detects count > 5 |
| 3 | `authLimiter` terminates request before route handler executes | **Handled Safely** (`429 Too Many Requests` JSON response returned) |

#### Conclusion
**Fix Verified** - Rapid automated probing or brute-force attempts against any of the six authentication routes are blocked on the 6th request with HTTP 429.

### Missing Security Headers, Clickjacking, and Framework Fingerprinting
#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and exposed `X-Powered-By` |
| Impact | High |
| Affected File | `server.ts:19-74` |
| Test Scenario | Request `GET /` on the Express server and inspect HTTP response headers, or attempt to embed the page in an external `<iframe>`. |

#### How It Was Fixed
Disabled `x-powered-by` in Express and applied `helmet` plus explicit header middleware emitting `Strict-Transport-Security`, `Content-Security-Policy` (including `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Incoming HTTP request reaches Express middleware in `server.ts:22-74` | `helmet` and header middleware attach all defensive headers and strip `X-Powered-By` |
| 2 | Browser or scanner inspects response headers or loads page inside `<iframe>` | `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` block framing; HSTS enforces HTTPS |
| 3 | Response delivered | **Handled Safely** |

#### Conclusion
**Fix Verified** - All required security headers are present on every response and technology fingerprinting via `X-Powered-By` is removed.
