import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SaveStatusBadge } from './SaveStatusBadge';
import {
  BookOpen,
  Calendar,
  Clock,
  PlusCircle,
  Users,
  ShieldCheck,
  LogOut,
  Copy,
  Check,
  GraduationCap,
} from 'lucide-react';
import { USER_LEVELS } from '../lib/constants';
import { updateUserLevel } from '../lib/firestoreService';
import { UserLevel } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'myterm'
  | 'history'
  | 'newterm'
  | 'friends'
  | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const { userProfile, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);

  const copyFriendCode = () => {
    if (!userProfile?.friendCode) return;
    navigator.clipboard.writeText(userProfile.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLevelSelect = async (level: UserLevel) => {
    if (!userProfile) return;
    setLevelMenuOpen(false);
    try {
      await updateUserLevel(userProfile.uid, level);
    } catch (err) {
      console.error('Failed to update level:', err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'myterm', label: 'My Term', icon: Calendar },
    { id: 'history', label: 'Course History', icon: Clock },
    { id: 'newterm', label: 'Start New Term', icon: PlusCircle },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  if (userProfile?.isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
              <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
                DS
              </div>
              <div>
                <span className="font-semibold text-zinc-900 text-base tracking-tight block leading-tight">
                  IITM Study Sync
                </span>
                <span className="text-[11px] text-zinc-500 font-medium block">
                  IIT Madras BS Degree
                </span>
              </div>
            </div>

            {/* Level Selector */}
            {userProfile && (
              <div className="relative ml-2 hidden sm:block">
                <button
                  id="user-level-badge-btn"
                  onClick={() => setLevelMenuOpen(!levelMenuOpen)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1.5 transition-colors"
                  title="Click to update your academic level"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-zinc-600" />
                  <span>{userProfile.level}</span>
                </button>

                {levelMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg py-1.5 z-40">
                    <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Select Academic Level
                    </div>
                    {USER_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        id={`level-option-${lvl.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={() => handleLevelSelect(lvl)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-zinc-50 transition-colors ${
                          userProfile.level === lvl ? 'text-zinc-900 font-semibold bg-zinc-50' : 'text-zinc-600'
                        }`}
                      >
                        {lvl}
                        {userProfile.level === lvl && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center/Right Nav Tabs & Status */}
          <div className="flex items-center gap-4">
            {/* Autosave Status Indicator */}
            <div className="hidden md:flex items-center border-r border-zinc-200 pr-4">
              <SaveStatusBadge />
            </div>

            {/* Friend Code Pill */}
            {userProfile?.friendCode && (
              <button
                id="friend-code-copy-btn"
                onClick={copyFriendCode}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200 transition-colors"
                title="Your unique 6-character Friend Code (click to copy)"
              >
                <span className="text-zinc-400 font-normal">Code:</span>
                <span className="font-mono font-bold tracking-wider">{userProfile.friendCode}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700" />
                )}
              </button>
            )}

            {/* User Profile & Sign Out */}
            {userProfile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center text-xs font-semibold text-zinc-700 border border-zinc-300">
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    userProfile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  id="sign-out-btn"
                  onClick={signOut}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation Row */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-zinc-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
