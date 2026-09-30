import React, { useState, useEffect } from 'react';
import {
  subscribeTrafficSummary,
  subscribeTrafficLogs,
  recordPageView,
  resetTrafficToZero,
  resetAndSeedTrafficData,
} from '../lib/trafficService';
import { TrafficSummary, TrafficLogEntry, DailyTrafficMetric } from '../types';
import {
  Activity,
  Users,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  RotateCcw,
} from 'lucide-react';

export const TrafficViewerView: React.FC = () => {
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [logs, setLogs] = useState<TrafficLogEntry[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '14d'>('7d');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubSummary = subscribeTrafficSummary((data) => setSummary(data));
    const unsubLogs = subscribeTrafficLogs(25, (entries) => setLogs(entries));

    return () => {
      unsubSummary();
      unsubLogs();
    };
  }, []);

  const handleSimulateHit = async (pageName: string, isGuest: boolean) => {
    setIsSimulating(true);
    setFeedback(null);
    try {
      await recordPageView({
        page: pageName,
        userProfile: isGuest
          ? null
          : {
              uid: 'sim_std_admin_test',
              name: 'IITM DS Student',
              email: 'student@ds.study.iitm.ac.in',
              friendCode: 'TEST01',
              friends: [],
              level: 'Diploma in Data Science',
              isAdmin: false,
            },
      });
      setFeedback(`Recorded test visit to "${pageName}" (${isGuest ? 'Guest' : 'Student'})`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetToZero = async () => {
    if (!confirm('Reset traffic analytics to 0 real visits? All counters and historical baselines will be set to zero.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetTrafficToZero();
      setFeedback('Traffic analytics counters successfully reset to 0 real visits!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportData = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify({ summary, recentLogs: logs }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iitm-study-sync-traffic-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!summary) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto mb-2" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading live site traffic analytics...</p>
      </div>
    );
  }

  // Calculate daily data based on selected time range
  const historyEntries = (Object.values(summary.dailyHistory || {}) as DailyTrafficMetric[]).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const displayHistory: DailyTrafficMetric[] =
    timeRange === '7d' ? historyEntries.slice(-7) : historyEntries.slice(-14);

  const maxDailyVisits = Math.max(...displayHistory.map((d) => d.totalVisits), 1);
  const totalRangeVisits = displayHistory.reduce((acc, d) => acc + d.totalVisits, 0);
  const avgDailyVisits = Math.round(totalRangeVisits / (displayHistory.length || 1));

  // Device calculations
  const totalDeviceVisits =
    summary.deviceDistribution.desktop +
    summary.deviceDistribution.mobile +
    summary.deviceDistribution.tablet;

  const desktopPct = totalDeviceVisits > 0 ? Math.round((summary.deviceDistribution.desktop / totalDeviceVisits) * 100) : 0;
  const mobilePct = totalDeviceVisits > 0 ? Math.round((summary.deviceDistribution.mobile / totalDeviceVisits) * 100) : 0;
  const tabletPct = totalDeviceVisits > 0 ? Math.round((summary.deviceDistribution.tablet / totalDeviceVisits) * 100) : 0;

  // Student vs Guest calculation
  const totalStudents = (Object.values(summary.dailyHistory || {}) as DailyTrafficMetric[]).reduce(
    (acc, d) => acc + (d.studentVisits || 0),
    0
  );
  const totalGuests = (Object.values(summary.dailyHistory || {}) as DailyTrafficMetric[]).reduce(
    (acc, d) => acc + (d.guestVisits || 0),
    0
  );
  const totalAudience = totalStudents + totalGuests;
  const studentPct = totalAudience > 0 ? Math.round((totalStudents / totalAudience) * 100) : 0;
  const guestPct = totalAudience > 0 ? 100 - studentPct : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Live Site Traffic &amp; Visitor Intelligence
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Real-time tracking of page visits, student engagement, devices, and peak academic study hours.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Simulate Hit Button */}
            <div className="relative group">
              <button
                id="traffic-simulate-hit-btn"
                disabled={isSimulating}
                onClick={() => handleSimulateHit('Dashboard', false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
                title="Send a sample student visit event"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulate Hit</span>
              </button>
            </div>

            {/* Reset to 0 Data */}
            <button
              id="traffic-reset-btn"
              disabled={isResetting}
              onClick={handleResetToZero}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
              title="Reset all traffic analytics counters to zero"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Reset to 0</span>
            </button>

            {/* Export JSON */}
            <button
              id="traffic-export-btn"
              onClick={handleExportData}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-3 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Page Views */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Site Visits</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {summary.totalVisits.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Pure real visitor tracking</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Unique Visitors</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {summary.uniqueVisitors.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Individual devices tracked
          </div>
        </div>

        {/* Today's Visits */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Today&apos;s Traffic</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {summary.todayVisits.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Recorded since midnight UTC
          </div>
        </div>

        {/* Active Now / Live Sessions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Live Active Students</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <span>{Math.max(1, summary.activeSessions || 1)}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Active in current 15m window
          </div>
        </div>
      </div>

      {/* Main Historical Traffic Trend Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Traffic Velocity &amp; Daily Student Visits</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Daily visits over time. Higher spikes coincide with assignment deadlines &amp; quiz dates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Timeframe:</span>
            <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === '7d'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimeRange('14d')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === '14d'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Last 14 Days
              </button>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4">
          <div className="h-52 flex items-end gap-2 sm:gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2 px-1">
            {displayHistory.map((metric) => {
              const hasVisits = metric.totalVisits > 0;
              const heightPct = hasVisits ? Math.max(10, Math.round((metric.totalVisits / maxDailyVisits) * 100)) : 3;
              const dateObj = new Date(metric.date + 'T12:00:00Z');
              const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
              const dayNum = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const isToday = metric.date === new Date().toISOString().split('T')[0];

              return (
                <div key={metric.date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] py-1 px-2 rounded-md shadow-md whitespace-nowrap">
                    <div className="font-bold">{dayNum} ({dayName})</div>
                    <div>Total Visits: {metric.totalVisits}</div>
                    <div className="text-zinc-300 dark:text-zinc-600">
                      Students: {metric.studentVisits} &bull; Guests: {metric.guestVisits}
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[48px] flex flex-col justify-end items-center rounded-t-md overflow-hidden bg-zinc-100 dark:bg-zinc-800" style={{ height: `${heightPct}%` }}>
                    {hasVisits ? (
                      <>
                        {/* Guest segment */}
                        <div
                          className="w-full bg-blue-400 dark:bg-blue-500"
                          style={{
                            height: `${Math.round(
                              (metric.guestVisits / (metric.totalVisits || 1)) * 100
                            )}%`,
                          }}
                          title={`Guests: ${metric.guestVisits}`}
                        />
                        {/* Student segment */}
                        <div
                          className={`w-full ${
                            isToday
                              ? 'bg-emerald-600 dark:bg-emerald-500'
                              : 'bg-zinc-800 dark:bg-zinc-300 group-hover:bg-zinc-900 dark:group-hover:bg-white'
                          } transition-colors`}
                          style={{
                            height: `${Math.round(
                              (metric.studentVisits / (metric.totalVisits || 1)) * 100
                            )}%`,
                          }}
                          title={`Students: ${metric.studentVisits}`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700/60 rounded-t-xs" />
                    )}
                  </div>

                  {/* Day Label */}
                  <div className="mt-2 text-center">
                    <span
                      className={`text-[10px] block font-medium ${
                        isToday
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {dayName}
                    </span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 hidden sm:block">
                      {dateObj.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Legend & Summary Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-zinc-800 dark:bg-zinc-300" />
                <span className="text-zinc-600 dark:text-zinc-400">Authenticated Students</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-400 dark:bg-blue-500" />
                <span className="text-zinc-600 dark:text-zinc-400">Guest Visitors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                <span className="text-zinc-600 dark:text-zinc-400">Today</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 text-xs">
              <div>
                Total in Range: <strong className="text-zinc-900 dark:text-zinc-100">{totalRangeVisits.toLocaleString()}</strong>
              </div>
              <div>
                Daily Avg: <strong className="text-zinc-900 dark:text-zinc-100">{avgDailyVisits.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Popular Features & Platform / Audience Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Popular Pages & Tab Engagement */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <span>Feature &amp; Page Hits</span>
            </h3>
            <span className="text-[11px] font-medium text-zinc-400">Views</span>
          </div>

          <div className="space-y-3">
            {Object.entries(summary.pageViews || {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([page, countVal]) => {
                const count = countVal as number;
                const totalPageViews =
                  Object.values(summary.pageViews || {}).reduce(
                    (a, b) => (a as number) + (b as number),
                    0
                  ) || 1;
                const pct = Math.round((count / (totalPageViews as number)) * 100);
                return (
                  <div key={page} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{page}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-[11px]">{pct}%</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Card 2: Devices & Browsers */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <span>Device &amp; Platform Breakdown</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Client devices accessing the web application.
            </p>
          </div>

          {/* Device bar breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                <Monitor className="w-3.5 h-3.5 text-blue-500" /> Desktop
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {desktopPct}% ({summary.deviceDistribution.desktop.toLocaleString()})
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${desktopPct}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> Mobile
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {mobilePct}% ({summary.deviceDistribution.mobile.toLocaleString()})
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mobilePct}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                <Tablet className="w-3.5 h-3.5 text-purple-500" /> Tablet
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {tabletPct}% ({summary.deviceDistribution.tablet.toLocaleString()})
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${tabletPct}%` }} />
            </div>
          </div>

          {/* Browser chips */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
              Top Browsers
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(summary.browserDistribution || {}).length > 0 ? (
                Object.entries(summary.browserDistribution || {}).map(([bName, bCount]) => (
                  <div
                    key={bName}
                    className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{bName}</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{bCount}</span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-2 text-center text-[11px] text-zinc-400">
                  No browser visits recorded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Academic Levels & User Segmentation */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <span>Student Academic Levels</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Traffic distribution across IITM BS levels.
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(summary.levelDistribution || {}).map(([lvl, countVal]) => {
              const count = Number(countVal) || 0;
              const totalLvl =
                Object.values(summary.levelDistribution || {}).reduce<number>(
                  (a, b) => a + (Number(b) || 0),
                  0
                );
              const lvlPct = totalLvl > 0 ? Math.round((count / totalLvl) * 100) : 0;
              return (
                <div key={lvl} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{lvl}</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
                      style={{ width: `${lvlPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student vs Guest Progress */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Authenticated vs Guest Traffic</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {studentPct}% Students
              </span>
            </div>
            <div className="h-2 rounded-full bg-blue-400 dark:bg-blue-500 flex overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-500 h-full"
                style={{ width: `${studentPct}%` }}
                title={`Students: ${studentPct}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{totalStudents.toLocaleString()} student visits</span>
              <span>{totalGuests.toLocaleString()} guest visits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Stream (Live Hits) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Live Activity Stream (Recent Visits)
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              ({logs.length} events loaded)
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Listening in real-time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Visitor / Identity</th>
                <th className="px-4 py-3 font-semibold">Page Viewed</th>
                <th className="px-4 py-3 font-semibold">Device &amp; Browser</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.isGuest ? (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                              {log.visitorId.slice(0, 10)} (Guest)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {log.userName || 'IITM Student'}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">{log.userEmail}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium">
                          {log.page}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                          {log.device === 'desktop' ? (
                            <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                          ) : log.device === 'mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                          ) : (
                            <Tablet className="w-3.5 h-3.5 text-zinc-500" />
                          )}
                          <span className="capitalize">{log.device}</span>
                          <span className="text-zinc-400">&bull;</span>
                          <span>{log.browser}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {log.isGuest ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Guest
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {log.userLevel || 'Student'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-zinc-400 opacity-60" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No visitor sessions recorded yet</p>
                    <p className="text-[11px] text-zinc-400 mt-1">Real student page visits and guest traffic will appear here automatically in real time.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
