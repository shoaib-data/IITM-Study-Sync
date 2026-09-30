import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import {
  subscribeUserTerms,
  subscribeUserCourses,
  subscribeCalendarTerms,
  toggleWeeklyChecklist,
  getFriendsList,
} from '../lib/firestoreService';
import { UserTerm, UserCourse, CalendarTerm, UserProfile } from '../types';
import { calculateTermWeek, formatDateString } from '../lib/dateUtils';
import { ChecklistIconToggle } from './ChecklistIconToggle';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Sparkles,
  Users,
  Award,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DashboardViewProps {
  onNavigateToNewTerm: () => void;
  onNavigateToMyTerm: () => void;
  onSelectFriend: (friend: UserProfile) => void;
}

interface FriendProgressSummary {
  profile: UserProfile;
  activeTermName: string;
  currentWeek: number;
  completedTasks: number;
  totalTasks: number;
  percentage: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToNewTerm,
  onNavigateToMyTerm,
  onSelectFriend,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { triggerSaving, triggerSaved, triggerError } = useSaveStatus();

  const [activeTerm, setActiveTerm] = useState<UserTerm | null>(null);
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [calendarTerms, setCalendarTerms] = useState<CalendarTerm[]>([]);
  const [friendsProgress, setFriendsProgress] = useState<FriendProgressSummary[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Subscribe to user terms
  useEffect(() => {
    if (!currentUser) return;
    const unsubTerms = subscribeUserTerms(currentUser.uid, (terms) => {
      const active = terms.find((t) => t.isActive);
      setActiveTerm(active || null);
    });
    return () => unsubTerms();
  }, [currentUser]);

  // Subscribe to calendar terms
  useEffect(() => {
    const unsubCal = subscribeCalendarTerms((terms) => {
      setCalendarTerms(terms);
    });
    return () => unsubCal();
  }, []);

  // Subscribe to active term's courses
  useEffect(() => {
    if (!currentUser || !activeTerm) {
      setCourses([]);
      return;
    }
    const unsubCourses = subscribeUserCourses(currentUser.uid, activeTerm.termId, (cList) => {
      setCourses(cList);
    });
    return () => unsubCourses();
  }, [currentUser, activeTerm]);

  // Find matching calendar doc for active term
  const matchedCalendar = calendarTerms.find((c) => c.termId === activeTerm?.calendarId);
  const weekInfo = calculateTermWeek(matchedCalendar?.startDate);
  const currentWeekKey = `week${weekInfo.weekNumber}`;

  // Fetch Friends' Progress
  useEffect(() => {
    if (!userProfile?.friends || userProfile.friends.length === 0) {
      setFriendsProgress([]);
      return;
    }

    let isMounted = true;
    const fetchFriendsData = async () => {
      setLoadingFriends(true);
      try {
        const friendProfiles = await getFriendsList(userProfile.friends);
        const summaries: FriendProgressSummary[] = [];

        for (const f of friendProfiles) {
          let termName = 'No active term';
          let weekNum = 1;
          let completed = 0;
          let total = 0;

          if (f.activeTermId) {
            try {
              const termSnap = await getDoc(doc(db, 'users', f.uid, 'terms', f.activeTermId));
              if (termSnap.exists()) {
                const termData = termSnap.data() as UserTerm;
                termName = termData.termName;

                // Match friend's calendar for live week calculation
                const fCal = calendarTerms.find((c) => c.termId === termData.calendarId);
                const fWeek = calculateTermWeek(fCal?.startDate);
                weekNum = fWeek.weekNumber;

                // Read friend's courses
                const coursesSnap = await getDocs(
                  collection(db, 'users', f.uid, 'terms', f.activeTermId, 'courses')
                );
                coursesSnap.forEach((docSnap) => {
                  const courseData = docSnap.data() as UserCourse;
                  if (courseData.weeklyProgress) {
                    Object.values(courseData.weeklyProgress).forEach((wp) => {
                      total += 3;
                      if (wp.assignmentSubmitted) completed++;
                      if (wp.practiceQuestionsCompleted) completed++;
                      if (wp.notesCreated) completed++;
                    });
                  }
                });
              }
            } catch (err) {
              console.warn(`Could not load friend ${f.name} details:`, err);
            }
          }

          summaries.push({
            profile: f,
            activeTermName: termName,
            currentWeek: weekNum,
            completedTasks: completed,
            totalTasks: total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          });
        }

        if (isMounted) {
          setFriendsProgress(summaries);
          setLoadingFriends(false);
        }
      } catch (err) {
        console.error('Error fetching friends progress:', err);
        if (isMounted) setLoadingFriends(false);
      }
    };

    fetchFriendsData();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.friends, calendarTerms]);

  // Toggle checklist item
  const handleToggle = async (
    courseId: string,
    field: 'assignmentSubmitted' | 'practiceQuestionsCompleted' | 'notesCreated',
    currentVal: boolean
  ) => {
    if (!currentUser || !activeTerm) return;
    triggerSaving();
    try {
      await toggleWeeklyChecklist(
        currentUser.uid,
        activeTerm.termId,
        courseId,
        currentWeekKey,
        field,
        currentVal
      );
      triggerSaved();
    } catch (err) {
      triggerError('Failed to update checklist');
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner: Term status and Week Calculation */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                {userProfile?.level || 'IITM BS Degree'}
              </span>
              {activeTerm && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Term
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {activeTerm ? activeTerm.termName : 'Welcome to IITM Study Sync'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {matchedCalendar ? (
                <>
                  Synced with academic calendar &bull; Started {formatDateString(matchedCalendar.startDate)} &bull; End Term: {formatDateString(matchedCalendar.endTermDate)}
                </>
              ) : (
                'Track your term progress, weekly assignments, practice questions, notes, and friend activity.'
              )}
            </p>
          </div>

          {activeTerm && (
            <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 sm:px-5 self-start md:self-auto">
              <Clock className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Academic Week</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>{weekInfo.displayText}</span>
                  {weekInfo.isCompleted && (
                    <span className="text-xs text-zinc-400 font-normal">(Finished)</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!activeTerm ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No Active Term Found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Ready to start your semester? Select your calendar cycle and choose your official courses straight from the catalog.
            </p>
          </div>
          <button
            id="dashboard-start-term-btn"
            onClick={onNavigateToNewTerm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start New Term</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: This Week's Courses & 3 Checklist Icons */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Week {weekInfo.weekNumber} Checklist
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tap icons to toggle completion &bull; Assignment &bull; Practice &bull; Notes
                </p>
              </div>
              <button
                id="view-full-term-grid-btn"
                onClick={onNavigateToMyTerm}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
              >
                <span>Full 12-Week Grid</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No courses enrolled in this term.
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const weekProgress = course.weeklyProgress?.[currentWeekKey] || {
                    assignmentSubmitted: false,
                    practiceQuestionsCompleted: false,
                    notesCreated: false,
                  };

                  const completedCount =
                    (weekProgress.assignmentSubmitted ? 1 : 0) +
                    (weekProgress.practiceQuestionsCompleted ? 1 : 0) +
                    (weekProgress.notesCreated ? 1 : 0);

                  return (
                    <div
                      key={course.id}
                      id={`course-card-${course.id}`}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-shadow shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      {/* Left color bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: course.color }}
                      />

                      <div className="pl-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {course.level}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {course.assessmentType === 'project' ? 'Project Course' : 'Exam Course'}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {course.name}
                        </h3>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3 pt-0.5">
                          <span>
                            Week {weekInfo.weekNumber}: {completedCount}/3 items
                          </span>
                          {course.assessmentType === 'exam' && course.examComponents?.oppeCount ? (
                            <span>&bull; {course.examComponents.oppeCount} OPPEs</span>
                          ) : null}
                          {course.assessmentType === 'project' && course.projectComponents?.hasViva ? (
                            <span>&bull; Viva component</span>
                          ) : null}
                        </div>
                      </div>

                      {/* 3 Checklist Icons: Assignment / Practice / Notes */}
                      <div className="flex items-center gap-3 pl-2 sm:pl-0 self-end sm:self-center">
                        <div className="flex items-center gap-2 bg-zinc-50/80 dark:bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-700/60">
                          {/* 1. Assignment */}
                          <div className="text-center">
                            <ChecklistIconToggle
                              id={`toggle-${course.id}-assignment`}
                              type="assignment"
                              completed={weekProgress.assignmentSubmitted}
                              onToggle={() =>
                                handleToggle(
                                  course.id,
                                  'assignmentSubmitted',
                                  weekProgress.assignmentSubmitted
                                )
                              }
                            />
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Asgn</div>
                          </div>

                          {/* 2. Practice */}
                          <div className="text-center">
                            <ChecklistIconToggle
                              id={`toggle-${course.id}-practice`}
                              type="practice"
                              completed={weekProgress.practiceQuestionsCompleted}
                              onToggle={() =>
                                handleToggle(
                                  course.id,
                                  'practiceQuestionsCompleted',
                                  weekProgress.practiceQuestionsCompleted
                                )
                              }
                            />
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Prac</div>
                          </div>

                          {/* 3. Notes */}
                          <div className="text-center">
                            <ChecklistIconToggle
                              id={`toggle-${course.id}-notes`}
                              type="notes"
                              completed={weekProgress.notesCreated}
                              onToggle={() =>
                                handleToggle(
                                  course.id,
                                  'notesCreated',
                                  weekProgress.notesCreated
                                )
                              }
                            />
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Note</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Academic Milestones quick bar */}
            {matchedCalendar && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Upcoming Term Milestones
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400 font-medium">Quiz 1 Exam</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatDateString(matchedCalendar.quiz1Date)}
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400 font-medium">Quiz 2 Exam</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatDateString(matchedCalendar.quiz2Date)}
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400 font-medium">OPPE 1 Window</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatDateString(matchedCalendar.oppe1Window?.start)}
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-500 dark:text-zinc-400 font-medium">End Term Exam</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatDateString(matchedCalendar.endTermDate)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Friends' Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Friends&apos; Progress</h2>
              </div>
              <span className="text-xs text-zinc-400">
                {friendsProgress.length} connected
              </span>
            </div>

            {loadingFriends ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Syncing friends data...
              </div>
            ) : friendsProgress.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Connect with fellow IITM BS students using their 6-character Friend Code to see each other&apos;s weekly study completion!
                </p>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                  Your Code: <span className="font-mono font-bold">{userProfile?.friendCode}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {friendsProgress.map((item) => (
                  <div
                    key={item.profile.uid}
                    id={`friend-progress-card-${item.profile.uid}`}
                    onClick={() => onSelectFriend(item.profile)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200">
                          {item.profile.photoURL ? (
                            <img
                              src={item.profile.photoURL}
                              alt={item.profile.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            item.profile.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.profile.name}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {item.profile.level}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          Week {item.currentWeek}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{item.activeTermName}</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.percentage}% ({item.completedTasks}/{item.totalTasks})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                      <span>View term &amp; score history</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
