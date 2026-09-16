import React, { useState, useEffect } from 'react';
import { UserProfile, UserTerm, UserCourse, CalendarTerm } from '../types';
import { calculateTermWeek, formatDateString } from '../lib/dateUtils';
import { subscribeCalendarTerms } from '../lib/firestoreService';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  X,
  Calendar,
  Check,
  Award,
  BookOpen,
  History,
  Clock,
} from 'lucide-react';

interface FriendDetailModalProps {
  friend: UserProfile | null;
  onClose: () => void;
}

export const FriendDetailModal: React.FC<FriendDetailModalProps> = ({ friend, onClose }) => {
  const [activeTerm, setActiveTerm] = useState<UserTerm | null>(null);
  const [activeCourses, setActiveCourses] = useState<UserCourse[]>([]);
  const [archivedTerms, setArchivedTerms] = useState<UserTerm[]>([]);
  const [archivedCoursesMap, setArchivedCoursesMap] = useState<Record<string, UserCourse[]>>({});
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [activeTab, setActiveTab] = useState<'term' | 'history'>('term');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCal = subscribeCalendarTerms(setCalendarTerms);
    return () => unsubCal();
  }, []);

  useEffect(() => {
    if (!friend) return;
    let isMounted = true;
    setLoading(true);

    const loadFriendData = async () => {
      try {
        // 1. Fetch friend's terms
        const termsSnap = await getDocs(collection(db, 'users', friend.uid, 'terms'));
        let foundActive: UserTerm | null = null;
        const archivedList: UserTerm[] = [];

        termsSnap.forEach((d) => {
          const tData = { ...(d.data() as UserTerm), termId: d.id };
          if (tData.isActive) {
            foundActive = tData;
          } else {
            archivedList.push(tData);
          }
        });

        // 2. Fetch active term courses
        let curCourses: UserCourse[] = [];
        if (foundActive) {
          const cSnap = await getDocs(
            collection(db, 'users', friend.uid, 'terms', (foundActive as UserTerm).termId, 'courses')
          );
          cSnap.forEach((d) => {
            curCourses.push({ id: d.id, ...(d.data() as Omit<UserCourse, 'id'>) });
          });
        }

        // 3. Fetch archived courses
        const archMap: Record<string, UserCourse[]> = {};
        for (const archTerm of archivedList) {
          const aSnap = await getDocs(
            collection(db, 'users', friend.uid, 'terms', archTerm.termId, 'courses')
          );
          const cList: UserCourse[] = [];
          aSnap.forEach((d) => {
            cList.push({ id: d.id, ...(d.data() as Omit<UserCourse, 'id'>) });
          });
          archMap[archTerm.termId] = cList;
        }

        if (isMounted) {
          setActiveTerm(foundActive);
          setActiveCourses(curCourses);
          setArchivedTerms(archivedList);
          setArchivedCoursesMap(archMap);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading friend details:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadFriendData();
    return () => {
      isMounted = false;
    };
  }, [friend]);

  if (!friend) return null;

  const matchedCalendar = calendarTerms.find((c) => c.termId === activeTerm?.calendarId);
  const weekInfo = calculateTermWeek(matchedCalendar?.startDate);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="friend-detail-modal"
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Modal Top Header */}
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center text-sm font-bold text-zinc-700">
              {friend.photoURL ? (
                <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover" />
              ) : (
                friend.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900">{friend.name}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                  {friend.level}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Friend Code: <span className="font-mono font-medium text-zinc-600">{friend.friendCode}</span> &bull; Read-Only Friend View
              </p>
            </div>
          </div>

          <button
            id="close-friend-modal-btn"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation tabs inside modal */}
        <div className="flex border-b border-zinc-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('term')}
            className={`py-3 text-xs font-semibold border-b-2 mr-6 flex items-center gap-1.5 transition-colors ${
              activeTab === 'term'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Active Term Progress</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Course History &amp; Scores</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-50/30">
          {loading ? (
            <div className="text-center py-12 text-xs text-zinc-400">Loading friend data...</div>
          ) : activeTab === 'term' ? (
            /* TAB 1: ACTIVE TERM VIEW */
            !activeTerm ? (
              <div className="text-center py-10 bg-white border border-dashed border-zinc-300 rounded-xl">
                <p className="text-xs text-zinc-500">{friend.name} has not started an active term yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Term Banner */}
                <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">{activeTerm.termName}</h3>
                    <div className="text-xs text-zinc-400">
                      Calculated Progress: <strong className="text-zinc-800">{weekInfo.displayText}</strong>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Week {weekInfo.weekNumber} of 12
                  </span>
                </div>

                {/* 12-Week Grid (Read-Only) */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden">
                  <div className="p-3 border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
                    {friend.name}&apos;s 12-Week Study Grid (Read-Only)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50/50">
                          <th className="px-3 py-2 text-left font-semibold text-zinc-700">Course</th>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                            <th
                              key={w}
                              className={`px-1.5 py-2 text-center font-semibold ${
                                w === weekInfo.weekNumber ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                              }`}
                            >
                              W{w}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {activeCourses.map((c) => (
                          <tr key={c.id}>
                            <td className="px-3 py-2.5 font-medium text-zinc-900 flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="line-clamp-1">{c.name}</span>
                            </td>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                              const prog = c.weeklyProgress?.[`week${w}`] || {
                                assignmentSubmitted: false,
                                practiceQuestionsCompleted: false,
                                notesCreated: false,
                              };
                              const done =
                                (prog.assignmentSubmitted ? 1 : 0) +
                                (prog.practiceQuestionsCompleted ? 1 : 0) +
                                (prog.notesCreated ? 1 : 0);
                              return (
                                <td key={w} className="px-1 py-2 text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      done === 3
                                        ? 'bg-emerald-600 text-white'
                                        : done > 0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-zinc-100 text-zinc-400'
                                    }`}
                                  >
                                    {done}/3
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* TAB 2: COURSE HISTORY & FINAL SCORES */
            <div className="space-y-4">
              {archivedTerms.length === 0 ? (
                <div className="text-center py-10 bg-white border border-dashed border-zinc-300 rounded-xl">
                  <p className="text-xs text-zinc-500">{friend.name} has no archived terms yet.</p>
                </div>
              ) : (
                archivedTerms.map((term) => {
                  const cList = archivedCoursesMap[term.termId] || [];
                  return (
                    <div
                      key={term.termId}
                      className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <h4 className="text-sm font-bold text-zinc-900">{term.termName}</h4>
                        <span className="text-xs text-zinc-400">Archived</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cList.map((course) => (
                          <div
                            key={course.id}
                            className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2 text-xs"
                          >
                            <div className="font-semibold text-zinc-900 flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: course.color }}
                              />
                              {course.name}
                            </div>

                            {/* Scores list */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                              {course.assessmentType === 'exam' ? (
                                <>
                                  {course.examComponents?.quiz1 && (
                                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                                      <span className="text-zinc-400 block text-[9px]">Quiz 1</span>
                                      <span className="font-bold text-zinc-800">
                                        {course.scores?.quiz1?.score ?? '—'} / {course.scores?.quiz1?.max ?? 100}
                                      </span>
                                    </div>
                                  )}
                                  {course.examComponents?.quiz2 && (
                                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                                      <span className="text-zinc-400 block text-[9px]">Quiz 2</span>
                                      <span className="font-bold text-zinc-800">
                                        {course.scores?.quiz2?.score ?? '—'} / {course.scores?.quiz2?.max ?? 100}
                                      </span>
                                    </div>
                                  )}
                                  {course.examComponents?.endTerm && (
                                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                                      <span className="text-zinc-400 block text-[9px]">End Term</span>
                                      <span className="font-bold text-zinc-800">
                                        {course.scores?.endTerm?.score ?? '—'} / {course.scores?.endTerm?.max ?? 100}
                                      </span>
                                    </div>
                                  )}
                                  {(course.examComponents?.oppeCount ?? 0) >= 1 && (
                                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                                      <span className="text-zinc-400 block text-[9px]">OPPE 1</span>
                                      <span className="font-bold text-zinc-800">
                                        {course.scores?.oppe1?.score ?? '—'} / {course.scores?.oppe1?.max ?? 100}
                                      </span>
                                    </div>
                                  )}
                                  {(course.examComponents?.oppeCount ?? 0) === 2 && (
                                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                                      <span className="text-zinc-400 block text-[9px]">OPPE 2</span>
                                      <span className="font-bold text-zinc-800">
                                        {course.scores?.oppe2?.score ?? '—'} / {course.scores?.oppe2?.max ?? 100}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="bg-white p-1.5 rounded border border-zinc-200">
                                    <span className="text-zinc-400 block text-[9px]">Project</span>
                                    <span className="font-bold text-zinc-800">
                                      {course.scores?.project?.score ?? '—'} / {course.scores?.project?.max ?? 100}
                                    </span>
                                  </div>
                                  {course.projectComponents?.hasViva && (
                                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                                      <span className="text-zinc-400 block text-[9px]">Viva</span>
                                      <span className="font-bold text-zinc-800">
                                        {course.scores?.viva?.score ?? '—'} / {course.scores?.viva?.max ?? 100}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
