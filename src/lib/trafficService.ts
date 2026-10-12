import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  increment,
  updateDoc,
  arrayUnion,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import { TrafficSummary, TrafficLogEntry, DailyTrafficMetric, UserProfile } from '../types';
import { removeUndefinedFields } from './firestoreService';

const VISITOR_ID_KEY = 'iitm_study_sync_visitor_id';
const SESSION_VISIT_KEY = 'iitm_study_sync_session_active';

/**
 * Returns India calendar date string (YYYY-MM-DD) based on Asia/Kolkata timezone.
 * Resets precisely at midnight Indian Standard Time (IST).
 */
export function getIndiaDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    // Fallback if Intl timeZone is not supported
    const offset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(date.getTime() + offset);
    return istTime.toISOString().split('T')[0];
  }
}

/**
 * Returns or initializes a persistent anonymous visitor ID
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server_visitor';
  let vid = localStorage.getItem(VISITOR_ID_KEY);
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(VISITOR_ID_KEY, vid);
  }
  return vid;
}

/**
 * Basic client device detection
 */
export function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 768 && width <= 1024)) {
    return 'tablet';
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    ) ||
    width < 768
  ) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Detect browser name
 */
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Other Browser';
}

/**
 * Detect Operating System
 */
export function detectOS(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other OS';
}

/**
 * Generates an initial clean zero baseline spanning the last 14 days in Asia/Kolkata time
 */
export function getZeroTrafficSummary(): TrafficSummary {
  const history: Record<string, DailyTrafficMetric> = {};
  const today = new Date();

  // Create date buckets for the last 14 days in Asia/Kolkata timezone
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getIndiaDateString(d);

    history[dateStr] = {
      date: dateStr,
      totalVisits: 0,
      uniqueVisitors: 0,
      studentVisits: 0,
      guestVisits: 0,
      loggedInUids: [],
    };
  }

  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    registeredUsers: 0,
    todayVisits: 0,
    activeSessions: 1,
    deviceDistribution: {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    },
    browserDistribution: {
      Chrome: 0,
      Firefox: 0,
      Safari: 0,
      Edge: 0,
    },
    levelDistribution: {
      Foundation: 0,
      'Diploma in Programming': 0,
      'Diploma in Data Science': 0,
      Degree: 0,
    },
    dailyHistory: history,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * TOTAL SITE VISITS:
 * Increment once when the app loads in a new session (using sessionStorage).
 * Refreshes, in-app navigation, and tab switches inside the app DO NOT count.
 * Closing and reopening the site, or opening it in a new browser tab, starts a new
 * browser session and counts as a new visit.
 * The same person opening the site twice in a day counts as 2.
 */
export async function recordSiteVisit(options: {
  currentUser?: { uid: string } | null;
  userProfile?: UserProfile | null;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  // If this browser tab/session already recorded its visit, skip!
  if (sessionStorage.getItem(SESSION_VISIT_KEY)) {
    return;
  }

  // Set the sessionStorage flag immediately to guard against re-renders or concurrent calls
  sessionStorage.setItem(SESSION_VISIT_KEY, 'true');

  try {
    const visitorId = getVisitorId();
    const device = detectDevice();
    const browser = detectBrowser();
    const os = detectOS();
    const todayIndiaStr = getIndiaDateString();
    const isGuest = !options.userProfile && !options.currentUser;

    const logEntry: Omit<TrafficLogEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      event: isGuest ? 'Guest Session' : 'Student Session',
      page: 'Site Session',
      path: '/',
      visitorId,
      userId: options.userProfile?.uid || options.currentUser?.uid,
      userName: options.userProfile?.name,
      userEmail: options.userProfile?.email,
      userLevel: options.userProfile?.level,
      isGuest,
      device,
      browser,
      os,
      referrer: typeof document !== 'undefined' ? document.referrer || 'Direct Visit' : 'Direct Visit',
    };

    // 1. Add entry to trafficLogs collection
    const cleanLog = removeUndefinedFields(logEntry);
    await addDoc(collection(db, 'trafficLogs'), cleanLog);

    // 2. Increment aggregate siteTraffic summary document
    const summaryDocRef = doc(db, 'siteTraffic', 'summary');
    const summarySnap = await getDoc(summaryDocRef);

    if (!summarySnap.exists()) {
      const initial = getZeroTrafficSummary();
      initial.totalVisits = 1;
      initial.lastUpdated = new Date().toISOString();
      initial.dailyHistory[todayIndiaStr] = {
        date: todayIndiaStr,
        totalVisits: 1,
        uniqueVisitors: 1,
        guestVisits: isGuest ? 1 : 0,
        studentVisits: isGuest ? 0 : 1,
        loggedInUids: options.userProfile?.uid ? [options.userProfile.uid] : [],
      };
      initial.deviceDistribution[device] = 1;
      initial.browserDistribution = { [browser]: 1 };
      if (options.userProfile?.level) {
        initial.levelDistribution = { [options.userProfile.level]: 1 };
      }
      await setDoc(summaryDocRef, removeUndefinedFields(initial));
    } else {
      await updateDoc(summaryDocRef, {
        totalVisits: increment(1),
        [`deviceDistribution.${device}`]: increment(1),
        [`browserDistribution.${browser}`]: increment(1),
        ...(options.userProfile?.level
          ? { [`levelDistribution.${options.userProfile.level}`]: increment(1) }
          : {}),
        [`dailyHistory.${todayIndiaStr}.date`]: todayIndiaStr,
        [`dailyHistory.${todayIndiaStr}.totalVisits`]: increment(1),
        [`dailyHistory.${todayIndiaStr}.${isGuest ? 'guestVisits' : 'studentVisits'}`]: increment(1),
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.debug('[Traffic Tracker] Non-blocking site visit error:', err);
  }
}

/**
 * TODAY'S TRAFFIC (Logged-in Today):
 * Records unique users who opened the app while signed in today, deduplicated by user UID.
 * The day boundary is midnight India time (Asia/Kolkata).
 * Example: one user opens the site twice today -> Logged-in Today shows 1, Total Site Visits shows 2.
 */
export async function recordUserLoginToday(user: {
  uid: string;
  name?: string;
  email?: string;
  level?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !user?.uid) return;

  const todayIndiaStr = getIndiaDateString();
  const sessionFlagKey = `iitm_logged_in_today_${todayIndiaStr}_${user.uid}`;

  // If already verified in this session tab, skip redundant writes
  if (sessionStorage.getItem(sessionFlagKey)) {
    return;
  }
  sessionStorage.setItem(sessionFlagKey, 'true');

  try {
    const docId = `${todayIndiaStr}_${user.uid}`;
    const userDocRef = doc(db, 'dailyActiveUsers', docId);

    // Save individual login record deduplicated by docId: ${todayIndiaStr}_${uid}
    await setDoc(
      userDocRef,
      removeUndefinedFields({
        date: todayIndiaStr,
        userId: user.uid,
        userName: user.name || 'Student',
        userEmail: user.email || '',
        userLevel: user.level || 'Foundation',
        timestamp: new Date().toISOString(),
      }),
      { merge: true }
    );

    // Update dailyHistory in summary with arrayUnion(uid)
    const summaryDocRef = doc(db, 'siteTraffic', 'summary');
    try {
      await updateDoc(summaryDocRef, {
        [`dailyHistory.${todayIndiaStr}.date`]: todayIndiaStr,
        [`dailyHistory.${todayIndiaStr}.loggedInUids`]: arrayUnion(user.uid),
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      // Non-blocking
    }
  } catch (err) {
    console.debug('[Traffic Tracker] Non-blocking daily active user record error:', err);
  }
}

/**
 * Backwards-compatible stub for any legacy callers.
 * Does NOT track per-tab page views; instead delegates to recordSiteVisit if session not active.
 */
export async function recordPageView(options: {
  page?: string;
  path?: string;
  userProfile?: UserProfile | null;
}): Promise<void> {
  await recordSiteVisit({ userProfile: options.userProfile });
}

/**
 * Subscribe to traffic summary for admin panel
 */
export function subscribeTrafficSummary(
  callback: (summary: TrafficSummary) => void
): () => void {
  const summaryDocRef = doc(db, 'siteTraffic', 'summary');

  const unsubscribe = onSnapshot(
    summaryDocRef,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as TrafficSummary;
        if (data.dailyHistory) {
          const normalizedHistory: Record<string, DailyTrafficMetric> = {};
          for (const [dateKey, metric] of Object.entries(data.dailyHistory)) {
            if (metric && typeof metric === 'object') {
              normalizedHistory[dateKey] = {
                date: metric.date || dateKey,
                totalVisits: metric.totalVisits ?? 0,
                uniqueVisitors: metric.uniqueVisitors ?? 0,
                guestVisits: metric.guestVisits ?? 0,
                studentVisits: metric.studentVisits ?? 0,
                loggedInUids: Array.isArray(metric.loggedInUids) ? metric.loggedInUids : [],
                loggedInCount: Array.isArray(metric.loggedInUids)
                  ? metric.loggedInUids.length
                  : (metric.studentVisits ?? 0),
              };
            }
          }
          data.dailyHistory = normalizedHistory;
        }
        callback(data);
      } else {
        const initial = getZeroTrafficSummary();
        callback(initial);
        try {
          await setDoc(summaryDocRef, removeUndefinedFields(initial));
        } catch {
          // ignore if user is not authorized
        }
      }
    },
    (err) => {
      console.warn('[Traffic Tracker] Snapshot warning:', err);
      callback(getZeroTrafficSummary());
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to the real-time count of unique logged-in students today (IST date).
 * Only accessible to admin.
 */
export function subscribeLoggedInTodayCount(
  callback: (count: number) => void
): () => void {
  const todayIndiaStr = getIndiaDateString();
  const q = query(collection(db, 'dailyActiveUsers'), where('date', '==', todayIndiaStr));

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      callback(snap.size);
    },
    (err) => {
      console.warn('[Traffic Tracker] Logged-in today count subscription note:', err);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to the real-time count of registered users in the users collection.
 * Only accessible to admin.
 */
export function subscribeRegisteredUsersCount(
  callback: (count: number) => void
): () => void {
  const usersCol = collection(db, 'users');

  const unsubscribe = onSnapshot(
    usersCol,
    (snap) => {
      callback(snap.size);
    },
    async (err) => {
      console.warn('[Traffic Tracker] Users count subscription note:', err);
      try {
        const snap = await getCountFromServer(usersCol);
        callback(snap.data().count);
      } catch (countErr) {
        console.warn('[Traffic Tracker] Fallback getCountFromServer note:', countErr);
      }
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to the latest traffic log hits (last 30 logs)
 */
export function subscribeTrafficLogs(
  limitCount: number = 30,
  callback: (logs: TrafficLogEntry[]) => void
): () => void {
  const q = query(collection(db, 'trafficLogs'), orderBy('timestamp', 'desc'), limit(limitCount));

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const logs: TrafficLogEntry[] = [];
      snap.forEach((docSnap) => {
        logs.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<TrafficLogEntry, 'id'>),
        });
      });
      callback(logs);
    },
    (err) => {
      console.warn('[Traffic Tracker] Logs subscription warning:', err);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Reset traffic data to clean zero baseline
 */
export async function resetTrafficToZero(): Promise<void> {
  const summaryDocRef = doc(db, 'siteTraffic', 'summary');
  const fresh = getZeroTrafficSummary();
  await setDoc(summaryDocRef, removeUndefinedFields(fresh));
}

/**
 * Fallback recent logs
 */
export function generateFallbackRecentLogs(): TrafficLogEntry[] {
  return [];
}
