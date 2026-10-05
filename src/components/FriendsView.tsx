import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  subscribeFriendsList,
} from '../lib/firestoreService';
import { FriendRequest, UserProfile } from '../types';
import { FriendDetailModal } from './FriendDetailModal';
import { UserAvatar } from './UserAvatar';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react';

export const FriendsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [connectedFriends, setConnectedFriends] = useState<UserProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Subscribe to friend requests
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeFriendRequests(currentUser.uid, (incoming, outgoing) => {
      setIncomingRequests(incoming.filter((r) => r.status === 'pending'));
      setOutgoingRequests(outgoing.filter((r) => r.status === 'pending'));
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to connected friends profiles in real-time
  useEffect(() => {
    if (!userProfile?.friends || userProfile.friends.length === 0) {
      setConnectedFriends([]);
      return;
    }

    const unsub = subscribeFriendsList(userProfile.friends, (list) => {
      setConnectedFriends(list);
    });

    return () => unsub();
  }, [userProfile?.friends]);

  const handleCopyMyCode = () => {
    if (!userProfile?.friendCode) return;
    navigator.clipboard.writeText(userProfile.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !friendCodeInput.trim()) return;

    setIsSending(true);
    setStatusMsg(null);

    const res = await sendFriendRequest(userProfile, friendCodeInput.trim());
    setIsSending(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setFriendCodeInput('');
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const handleAccept = async (req: FriendRequest) => {
    try {
      await acceptFriendRequest(req);
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const handleDecline = async (reqId: string) => {
    try {
      await declineFriendRequest(reqId);
    } catch (err) {
      console.error('Error declining friend request:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Study Sync Friends Network
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Consent-based study sharing. Exchange 6-character Friend Codes to track each other&apos;s weekly study progress and score histories.
            </p>
          </div>

          {/* User's own Friend Code badge */}
          {userProfile?.friendCode && (
            <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:px-5 flex items-center justify-between sm:justify-start gap-4">
              <div>
                <div className="text-[10px] uppercase font-semibold text-zinc-400">Your Friend Code</div>
                <div className="text-lg font-mono font-bold tracking-wider text-zinc-900 dark:text-zinc-100">
                  {userProfile.friendCode}
                </div>
              </div>
              <button
                id="copy-my-friend-code-btn"
                onClick={handleCopyMyCode}
                className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-650 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Add Friend & Pending Requests */}
        <div className="space-y-6">
          {/* Add Friend Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add Friend by Code</h2>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                  Enter student&apos;s 6-character code
                </label>
                <input
                  id="friend-code-input"
                  type="text"
                  maxLength={6}
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. K8M2P9"
                  className="w-full px-3 py-2 text-sm font-mono tracking-widest uppercase border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-800"
                />
              </div>

              {statusMsg && (
                <div
                  className={`text-xs p-2.5 rounded-md ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {statusMsg.text}
                </div>
              )}

              <button
                id="send-friend-request-btn"
                type="submit"
                disabled={isSending || friendCodeInput.trim().length !== 6}
                className="w-full py-2 px-4 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-2xs"
              >
                {isSending ? 'Sending Request...' : 'Send Friend Request'}
              </button>
            </form>
          </div>

          {/* Pending Requests Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Pending Requests
                </h3>
              </div>
              <span className="text-xs text-zinc-400">
                {incomingRequests.length} incoming
              </span>
            </div>

            {/* Incoming Requests */}
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No incoming friend requests.</p>
            ) : (
              <div className="space-y-2.5">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    id={`incoming-req-${req.id}`}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        photoURL={req.fromPhotoURL}
                        alt={req.fromName}
                        size="xs"
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{req.fromName}</div>
                        <div className="text-[10px] text-zinc-400">{req.fromEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        id={`accept-req-btn-${req.id}`}
                        onClick={() => handleAccept(req)}
                        className="flex-1 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        id={`decline-req-btn-${req.id}`}
                        onClick={() => handleDecline(req.id)}
                        className="flex-1 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400">
                  Sent Requests ({outgoingRequests.length})
                </div>
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between text-xs p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded border border-zinc-200 dark:border-zinc-700"
                  >
                    <span className="text-zinc-600 dark:text-zinc-300 font-medium">Request Sent</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connected Friends List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Connected Friends</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click any friend to inspect their live 12-week study progress and archived score records.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300">
              {connectedFriends.length} Friends
            </span>
          </div>

          {connectedFriends.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No Friends Connected Yet</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Share your Friend Code <strong className="text-zinc-900 dark:text-zinc-100">{userProfile?.friendCode}</strong> with course mates, or enter their code on the left to start syncing study activity.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connectedFriends.map((f) => (
                <div
                  key={f.uid}
                  id={`friend-card-${f.uid}`}
                  onClick={() => setSelectedFriend(f)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs cursor-pointer transition-all space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      photoURL={f.photoURL}
                      alt={f.name}
                      size="md"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{f.name}</h4>
                      <span className="inline-block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {f.level}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <span>Friend Code: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{f.friendCode}</strong></span>
                    <span className="flex items-center text-zinc-800 dark:text-zinc-200 font-medium group">
                      Inspect
                      <ArrowRight className="w-3 h-3 ml-1 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Friend Detail Modal */}
      {selectedFriend && (
        <FriendDetailModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );
};
