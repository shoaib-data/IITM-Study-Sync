import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { TrafficSummary, TrafficLogEntry, DailyTrafficMetric, UserProfile } from '../types';
import { removeUndefinedFields } from './firestoreService';

const VISITOR_ID_KEY = 'iitm_study_sync_visitor_id';
const LAST_SESSION_KEY = 'iitm_study_sync_last_session';

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
 * Generates an initial clean zero baseline spanning the last 14 days
 */
export function getZeroTrafficSummary(): TrafficSummary {
  const history: Record<string, DailyTrafficMetric> = {};
  const today = new Date();

  // Create date buckets for the last 14 days initialized at 0 visits
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    history[dateStr] = {
      date: dateStr,
      totalVisits: 0,
      uniqueVisitors: 0,
      studentVisits: 0,
      guestVisits: 0,
      pageViews: {},
    };
  }

  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    todayVisits: 0,
    activeSessions: 1, // Current active viewer
    pageViews: {
      Dashboard: 0,
      'My Term': 0,
      'Course History': 0,
      Friends: 0,
      'Start New Term': 0,
    },
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
 * Optional seed generator for mock test environments
 */
export function generateSeedHistoricalMetrics(): Record<string, DailyTrafficMetric> {
  const history: Record<string, DailyTrafficMetric> = {};
  const today = new Date();

  for (let i = 14; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();

    const baseVisits = dayOfWeek === 0 ? 165 : dayOfWeek === 4 ? 140 : 85 + Math.floor(Math.sin(i) * 30);
    const visits = Math.max(45, baseVisits + Math.floor(Math.random() * 25));
    const unique = Math.round(visits * 0.62);
    const student = Math.round(visits * 0.82);
    const guest = visits - student;

    history[dateStr] = {
      date: dateStr,
      totalVisits: visits,
      uniqueVisitors: unique,
      studentVisits: student,
      guestVisits: guest,
      pageViews: {
        Dashboard: Math.round(visits * 0.42),
        'My Term': Math.round(visits * 0.35),
        'Course History': Math.round(visits * 0.1),
        Friends: Math.round(visits * 0.08),
        'Start New Term': Math.round(visits * 0.05),
      },
    };
  }

  return history;
}

export function generateSeedTrafficSummary(): TrafficSummary {
  const dailyHistory = generateSeedHistoricalMetrics();
  let totalVisits = 0;
  let uniqueVisitors = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  Object.values(dailyHistory).forEach((d) => {
    totalVisits += d.totalVisits;
    uniqueVisitors += Math.round(d.uniqueVisitors * 0.65);
  });

  return {
    totalVisits: totalVisits + 342,
    uniqueVisitors: Math.max(180, Math.round(uniqueVisitors * 0.8)),
    todayVisits: dailyHistory[todayStr]?.totalVisits || 78,
    activeSessions: 7,
    pageViews: {
      Dashboard: 780,
      'My Term': 690,
      'Course History': 210,
      Friends: 175,
      'Start New Term': 120,
      'Sign In / Welcome': 95,
      'Admin Console': 35,
    },
    deviceDistribution: {
      desktop: 1140,
      mobile: 820,
      tablet: 145,
    },
    browserDistribution: {
      Chrome: 1420,
      Firefox: 310,
      Safari: 245,
      Edge: 130,
    },
    levelDistribution: {
      Foundation: 950,
      'Diploma in Programming': 580,
      'Diploma in Data Science': 420,
      Degree: 155,
    },
    dailyHistory,
    lastUpdated: new Date().toISOString(),
  };
}

let lastLoggedPage = '';
let lastLogTimestamp = 0;

/**
 * Record a pageview / visitor event
 */
export async function recordPageView(options: {
  page: string;
  path?: string;
  userProfile?: UserProfile | null;
}) {
  const now = Date.now();
  // Prevent duplicate logs within 2 seconds for the same page
  if (options.page === lastLoggedPage && now - lastLogTimestamp < 2000) {
    return;
  }
  lastLoggedPage = options.page;
  lastLogTimestamp = now;

  try {
    const visitorId = getVisitorId();
    const device = detectDevice();
    const browser = detectBrowser();
    const os = detectOS();
    const todayStr = new Date().toISOString().split('T')[0];
    const isGuest = !options.userProfile;

    const logEntry: Omit<TrafficLogEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      page: options.page,
      path: options.path || `/${options.page.toLowerCase().replace(/\s+/g, '-')}`,
      visitorId,
      userId: options.userProfile?.uid,
      userName: options.userProfile?.name,
      userEmail: options.userProfile?.email,
      userLevel: options.userProfile?.level,
      isGuest,
      device,
      browser,
      os,
      referrer: typeof document !== 'undefined' ? document.referrer || 'Direct Visit' : 'Direct Visit',
    };

    // 1. Add to trafficLogs collection
    const cleanLog = removeUndefinedFields(logEntry);
    await addDoc(collection(db, 'trafficLogs'), cleanLog);

    // 2. Update aggregate summary document
    const summaryDocRef = doc(db, 'siteTraffic', 'summary');
    const summarySnap = await getDoc(summaryDocRef);

    const isFirstTimeVisitor = typeof window !== 'undefined' && !localStorage.getItem('iitm_visitor_tracked');
    if (isFirstTimeVisitor && typeof window !== 'undefined') {
      try {
        localStorage.setItem('iitm_visitor_tracked', 'true');
      } catch {
        // ignore localStorage access issues
      }
    }

    if (!summarySnap.exists()) {
      const initial = getZeroTrafficSummary();
      initial.totalVisits = 1;
      initial.todayVisits = 1;
      initial.uniqueVisitors = 1;
      initial.lastUpdated = new Date().toISOString();
      if (!initial.dailyHistory[todayStr]) {
        initial.dailyHistory[todayStr] = {
          date: todayStr,
          totalVisits: 1,
          uniqueVisitors: 1,
          guestVisits: isGuest ? 1 : 0,
          studentVisits: isGuest ? 0 : 1,
          pageViews: { [options.page]: 1 },
        };
      } else {
        initial.dailyHistory[todayStr].totalVisits = 1;
        initial.dailyHistory[todayStr].uniqueVisitors = 1;
        if (isGuest) {
          initial.dailyHistory[todayStr].guestVisits = 1;
        } else {
          initial.dailyHistory[todayStr].studentVisits = 1;
        }
        initial.dailyHistory[todayStr].pageViews = { [options.page]: 1 };
      }
      initial.pageViews[options.page] = 1;
      initial.deviceDistribution[device] = 1;
      initial.browserDistribution[browser] = (initial.browserDistribution[browser] || 0) + 1;
      if (options.userProfile?.level) {
        initial.levelDistribution[options.userProfile.level] =
          (initial.levelDistribution[options.userProfile.level] || 0) + 1;
      }

      await setDoc(summaryDocRef, removeUndefinedFields(initial));
    } else {
      // Atomic increment
      await updateDoc(summaryDocRef, {
        totalVisits: increment(1),
        todayVisits: increment(1),
        ...(isFirstTimeVisitor ? { uniqueVisitors: increment(1) } : {}),
        [`pageViews.${options.page}`]: increment(1),
        [`deviceDistribution.${device}`]: increment(1),
        [`browserDistribution.${browser}`]: increment(1),
        ...(options.userProfile?.level
          ? { [`levelDistribution.${options.userProfile.level}`]: increment(1) }
          : {}),
        [`dailyHistory.${todayStr}.totalVisits`]: increment(1),
        [`dailyHistory.${todayStr}.${isGuest ? 'guestVisits' : 'studentVisits'}`]: increment(1),
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Non-blocking: fail silently on logging errors
    console.debug('[Traffic Tracker] Non-blocking ping note:', err);
  }
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
        callback(data);
      } else {
        // Initialize default clean zero summary
        const initial = getZeroTrafficSummary();
        callback(initial);
        try {
          await setDoc(summaryDocRef, removeUndefinedFields(initial));
        } catch {
          // ignore if user is not authorized to write
        }
      }
    },
    (err) => {
      console.warn('[Traffic Tracker] Snapshot warning:', err);
      // provide local clean zero fallback so admin view never crashes
      callback(getZeroTrafficSummary());
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to the latest traffic log hits (e.g. last 30 logs)
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
 * Reset traffic data to clean zero baseline (Pure Real Traffic)
 */
export async function resetTrafficToZero(): Promise<void> {
  const summaryDocRef = doc(db, 'siteTraffic', 'summary');
  const fresh = getZeroTrafficSummary();
  await setDoc(summaryDocRef, removeUndefinedFields(fresh));
}

/**
 * Optional: Reset / Seed realistic baseline analytics (demo mode)
 */
export async function resetAndSeedTrafficData(): Promise<void> {
  const summaryDocRef = doc(db, 'siteTraffic', 'summary');
  const fresh = generateSeedTrafficSummary();
  await setDoc(summaryDocRef, removeUndefinedFields(fresh));
}

/**
 * Fallback recent logs (empty by default for real analytics)
 */
export function generateFallbackRecentLogs(): TrafficLogEntry[] {
  return [];
}
