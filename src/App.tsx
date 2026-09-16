import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SaveStatusProvider, useSaveStatus } from './context/SaveStatusContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MyTermView } from './components/MyTermView';
import { CourseHistoryView } from './components/CourseHistoryView';
import { StartNewTermView } from './components/StartNewTermView';
import { FriendsView } from './components/FriendsView';
import { AdminPanelView } from './components/AdminPanelView';
import { FriendDetailModal } from './components/FriendDetailModal';
import { UserProfile } from './types';
import {
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';

function AppContent() {
  const { currentUser, userProfile, loading, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [inspectingFriend, setInspectingFriend] = useState<UserProfile | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignInClick = async () => {
    setSignInLoading(true);
    setSignInError(null);
    try {
      await signIn();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setSignInError(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            DS
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
            <span>Loading IITM Study Sync...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in state
  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col justify-between">
        {/* Simple Top Bar */}
        <header className="border-b border-zinc-200 bg-white px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                DS
              </div>
              <div>
                <span className="font-bold text-zinc-900 text-sm tracking-tight block leading-tight">
                  IITM Study Sync
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  IIT Madras BS Degree in Data Science &amp; Applications
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Academic System Live</span>
            </div>
          </div>
        </header>

        {/* Main Hero & Sign-In Card */}
        <main className="max-w-4xl mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8 shadow-xs space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto mb-2">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                Sign in to IITM Study Sync
              </h1>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                A shared academic tracker for IIT Madras BS Data Science students. Track weekly assignments, practice questions, and peer progress.
              </p>
            </div>

            {signInError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs leading-relaxed">
                {signInError}
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              id="google-sign-in-btn"
              disabled={signInLoading}
              onClick={handleSignInClick}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {signInLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google Account</span>
                </>
              )}
            </button>

            {/* Feature Highlights Grid */}
            <div className="pt-4 border-t border-zinc-100 space-y-2.5 text-xs text-zinc-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Automated Academic Sync:</strong> Term start, quiz, OPPE, and end-term dates scraped &amp; parsed with Gemini.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>12-Week Grid:</strong> Check off weekly assignments, practice questions, and lecture notes with instant autosave.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Friends Sync:</strong> Exchange 6-character Friend Codes to track study progress term by term.
                </span>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400">
          IITM Study Sync &bull; Built for IIT Madras BS in Data Science &amp; Applications
        </footer>
      </div>
    );
  }

  // Authenticated State
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToNewTerm={() => setActiveTab('newterm')}
            onNavigateToMyTerm={() => setActiveTab('myterm')}
            onSelectFriend={(f) => setInspectingFriend(f)}
          />
        )}

        {activeTab === 'myterm' && <MyTermView />}

        {activeTab === 'history' && <CourseHistoryView />}

        {activeTab === 'newterm' && (
          <StartNewTermView onTermStarted={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'friends' && <FriendsView />}

        {activeTab === 'admin' && userProfile.isAdmin && <AdminPanelView />}
      </main>

      {/* Friend Detail Modal from Dashboard or Friends View */}
      {inspectingFriend && (
        <FriendDetailModal
          friend={inspectingFriend}
          onClose={() => setInspectingFriend(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SaveStatusProvider>
        <AppContent />
      </SaveStatusProvider>
    </AuthProvider>
  );
}
