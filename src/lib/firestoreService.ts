import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { db, checkIsAdmin, generateFriendCode } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import {
  UserProfile,
  CourseCatalogItem,
  CalendarTerm,
  UserTerm,
  UserCourse,
  FriendRequest,
  UserLevel,
  WeeklyChecklist,
  CourseScores,
  FinalGrade,
  AssessmentType,
} from '../types';
import { INITIAL_COURSE_CATALOG, INITIAL_CALENDAR_TERMS, COURSE_COLORS } from './constants';

/**
 * Recursively removes all undefined values from an object or array.
 * Firestore client SDK throws "Unsupported field value: undefined" if any field contains undefined.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// --- User Profile ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function ensureUserProfile(
  authUser: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null },
  defaultLevel: UserLevel = 'Foundation'
): Promise<UserProfile> {
  const path = `users/${authUser.uid}`;
  try {
    const userRef = doc(db, 'users', authUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      const isAdmin = checkIsAdmin(authUser.email);
      if (existing.isAdmin !== isAdmin) {
        await updateDoc(userRef, { isAdmin });
        existing.isAdmin = isAdmin;
      }
      return existing;
    }

    const newProfile: any = {
      uid: authUser.uid,
      name: authUser.displayName || 'Student',
      email: authUser.email || '',
      friendCode: generateFriendCode(),
      friends: [],
      level: defaultLevel,
      isAdmin: checkIsAdmin(authUser.email),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (authUser.photoURL) {
      newProfile.photoURL = authUser.photoURL;
    }

    await setDoc(userRef, removeUndefinedFields(newProfile));
    return newProfile as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserLevel(uid: string, level: UserLevel): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), removeUndefinedFields({
      level,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Course Catalog (Admin Managed, Read-Only for others) ---

export function subscribeCourseCatalog(callback: (courses: CourseCatalogItem[]) => void) {
  const path = 'courseCatalog';
  return onSnapshot(
    collection(db, 'courseCatalog'),
    async (snap) => {
      const courses: CourseCatalogItem[] = [];
      snap.forEach((d) => {
        courses.push({ id: d.id, ...(d.data() as Omit<CourseCatalogItem, 'id'>) });
      });
      callback(courses);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function seedCourseCatalogIfEmpty(): Promise<void> {
  const path = 'courseCatalog';
  try {
    const snap = await getDocs(collection(db, 'courseCatalog'));
    if (snap.empty) {
      console.log('Seeding initial official IITM course catalog...');
      const batch = writeBatch(db);
      for (const item of INITIAL_COURSE_CATALOG) {
        const ref = doc(collection(db, 'courseCatalog'));
        batch.set(ref, removeUndefinedFields({
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function addCatalogCourse(course: Omit<CourseCatalogItem, 'id'>): Promise<string> {
  const path = 'courseCatalog';
  try {
    const ref = doc(collection(db, 'courseCatalog'));
    await setDoc(ref, removeUndefinedFields({
      ...course,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCatalogCourse(id: string, course: Partial<CourseCatalogItem>): Promise<void> {
  const path = `courseCatalog/${id}`;
  try {
    await updateDoc(doc(db, 'courseCatalog', id), removeUndefinedFields({
      ...course,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCatalogCourse(id: string): Promise<void> {
  const path = `courseCatalog/${id}`;
  try {
    await deleteDoc(doc(db, 'courseCatalog', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Academic Calendar (Global automated & admin-managed) ---

export function subscribeCalendarTerms(callback: (terms: CalendarTerm[]) => void) {
  const path = 'calendar';
  return onSnapshot(
    collection(db, 'calendar'),
    (snap) => {
      const terms: CalendarTerm[] = [];
      snap.forEach((d) => {
        const data = d.data() as CalendarTerm;
        const cycleId = data.cycle || d.id;
        terms.push({
          ...data,
          termId: cycleId,
          cycle: cycleId,
        });
      });
      // Sort chronologically by start date
      terms.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      callback(terms);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function seedCalendarIfEmpty(): Promise<void> {
  const path = 'calendar';
  try {
    const snap = await getDocs(collection(db, 'calendar'));
    if (snap.empty) {
      console.log('Seeding initial IITM academic calendar with 13 verified terms...');
      const batch = writeBatch(db);
      for (const term of INITIAL_CALENDAR_TERMS) {
        const docId = term.cycle || term.termId;
        const ref = doc(db, 'calendar', docId);
        batch.set(ref, removeUndefinedFields({
          ...term,
          termId: docId,
          cycle: docId,
          syncStatus: 'ok',
          source: 'manually seeded',
          lastScrapedAt: new Date().toISOString(),
        }));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateCalendarTermDoc(termId: string, data: Partial<CalendarTerm>): Promise<void> {
  const path = `calendar/${termId}`;
  try {
    await updateDoc(doc(db, 'calendar', termId), removeUndefinedFields({
      ...data,
      lastScrapedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function triggerCalendarSync(): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const res = await fetch('/api/calendar/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success && Array.isArray(data.terms)) {
      // Fetch existing calendar documents to check if any are manually seeded
      const snap = await getDocs(collection(db, 'calendar'));
      const existingDocs: Record<string, CalendarTerm> = {};
      snap.forEach((d) => {
        existingDocs[d.id] = d.data() as CalendarTerm;
      });

      const batch = writeBatch(db);
      for (const term of data.terms) {
        const docId = term.cycle || term.termId;
        const existing = existingDocs[docId];

        // The scraper should never overwrite a manually-seeded document without checking against known-good data
        if (existing && existing.source === 'manually seeded') {
          const verified = INITIAL_CALENDAR_TERMS.find((t) => (t.cycle || t.termId) === docId);
          if (verified) {
            // Retain verified known-good dates and source
            const ref = doc(db, 'calendar', docId);
            batch.set(ref, removeUndefinedFields({
              ...verified,
              termId: docId,
              cycle: docId,
              syncStatus: 'ok',
              source: 'manually seeded',
              lastScrapedAt: data.lastScrapedAt || new Date().toISOString(),
            }), { merge: true });
            continue;
          }
        }

        const ref = doc(db, 'calendar', docId);
        batch.set(ref, removeUndefinedFields({
          ...term,
          termId: docId,
          cycle: docId,
          lastScrapedAt: data.lastScrapedAt || new Date().toISOString(),
          syncStatus: 'ok',
        }), { merge: true });
      }
      await batch.commit();
      return { success: true, message: `Successfully verified and synced ${data.terms.length} terms via Gemini`, count: data.terms.length };
    } else {
      console.warn('Scraper returned failure:', data.error);
      return { success: false, message: data.error || 'Scraping failed; keeping existing verified dates' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

// --- Per-User Term & Course Management ---

export function subscribeUserTerms(uid: string, callback: (terms: UserTerm[]) => void) {
  const path = `users/${uid}/terms`;
  return onSnapshot(
    collection(db, 'users', uid, 'terms'),
    (snap) => {
      const list: UserTerm[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as UserTerm), termId: d.id });
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeUserCourses(
  uid: string,
  termId: string,
  callback: (courses: UserCourse[]) => void,
  includeDropped = false
) {
  const path = `users/${uid}/terms/${termId}/courses`;
  return onSnapshot(
    collection(db, 'users', uid, 'terms', termId, 'courses'),
    (snap) => {
      const courses: UserCourse[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<UserCourse, 'id'>;
        // Dropped courses are kept for audit/backend only; do not show in user-facing active term grids
        if (!includeDropped && data.status === 'dropped') {
          return;
        }
        courses.push({ id: d.id, ...data });
      });
      callback(courses);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function startNewTerm(
  uid: string,
  calendarTerm: CalendarTerm,
  selectedCourses: CourseCatalogItem[]
): Promise<string> {
  const termId = calendarTerm.termId;
  const userPath = `users/${uid}`;

  try {
    // 1. Fetch current active terms to archive them
    const termsRef = collection(db, 'users', uid, 'terms');
    const existingTerms = await getDocs(termsRef);
    const batch = writeBatch(db);

    existingTerms.forEach((d) => {
      const data = d.data() as UserTerm;
      if (data.isActive) {
        batch.update(d.ref, { isActive: false });
      }
    });

    // 2. Create the new active term doc
    const newTermRef = doc(db, 'users', uid, 'terms', termId);
    const newTermData: UserTerm = {
      termId,
      calendarId: calendarTerm.termId,
      termName: `${calendarTerm.cycleType} ${calendarTerm.termId.replace(/^[A-Za-z]+/, '')} Term`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    batch.set(newTermRef, removeUndefinedFields(newTermData));

    // 3. Create course subcollection docs
    const defaultWeeklyProgress: Record<string, WeeklyChecklist> = {};
    for (let w = 1; w <= 12; w++) {
      defaultWeeklyProgress[`week${w}`] = {
        assignmentSubmitted: false,
        practiceQuestionsCompleted: false,
        notesCreated: false,
      };
    }

    selectedCourses.forEach((catCourse, index) => {
      const courseDocRef = doc(db, 'users', uid, 'terms', termId, 'courses', catCourse.id);
      const userCourse: any = {
        courseId: catCourse.id,
        name: catCourse.name,
        level: catCourse.level,
        assessmentType: catCourse.assessmentType,
        color: COURSE_COLORS[index % COURSE_COLORS.length],
        scores: {},
        weeklyProgress: defaultWeeklyProgress,
        status: 'enrolled',
        finalGrade: null,
      };

      if (catCourse.examComponents) {
        userCourse.examComponents = catCourse.examComponents;
      }
      if (catCourse.projectComponents) {
        userCourse.projectComponents = catCourse.projectComponents;
      }

      batch.set(courseDocRef, removeUndefinedFields(userCourse));
    });

    // 4. Update user activeTermId
    const userRef = doc(db, 'users', uid);
    batch.update(userRef, removeUndefinedFields({
      activeTermId: termId,
      updatedAt: new Date().toISOString(),
    }));

    await batch.commit();
    return termId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

/**
 * Drop a course from the active term.
 * Keeps an internal audit record on the document (status: "dropped", droppedAt: timestamp)
 * but it is completely removed from user-facing views.
 */
export async function dropUserCourse(
  uid: string,
  termId: string,
  courseId: string
): Promise<void> {
  const path = `users/${uid}/terms/${termId}/courses/${courseId}`;
  try {
    const courseRef = doc(db, 'users', uid, 'terms', termId, 'courses', courseId);
    await updateDoc(courseRef, removeUndefinedFields({
      status: 'dropped',
      droppedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Replace a course: marks the old course as dropped and adds the new course
 * starting fresh with its own weekly progress grid from week 1.
 */
export async function replaceUserCourse(
  uid: string,
  termId: string,
  oldCourseId: string,
  newCourse: CourseCatalogItem,
  existingColor?: string
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    const batch = writeBatch(db);

    // 1. Drop old course
    const oldCourseRef = doc(db, 'users', uid, 'terms', termId, 'courses', oldCourseId);
    batch.update(oldCourseRef, removeUndefinedFields({
      status: 'dropped',
      droppedAt: new Date().toISOString(),
    }));

    // 2. Add new course starting fresh
    const newCourseRef = doc(db, 'users', uid, 'terms', termId, 'courses', newCourse.id);
    const defaultWeeklyProgress: Record<string, WeeklyChecklist> = {};
    for (let w = 1; w <= 12; w++) {
      defaultWeeklyProgress[`week${w}`] = {
        assignmentSubmitted: false,
        practiceQuestionsCompleted: false,
        notesCreated: false,
      };
    }

    const userCourseData: any = {
      courseId: newCourse.id,
      name: newCourse.name,
      level: newCourse.level,
      assessmentType: newCourse.assessmentType,
      color: existingColor || COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)],
      scores: {},
      weeklyProgress: defaultWeeklyProgress,
      status: 'enrolled',
      finalGrade: null,
    };

    if (newCourse.examComponents) {
      userCourseData.examComponents = newCourse.examComponents;
    }
    if (newCourse.projectComponents) {
      userCourseData.projectComponents = newCourse.projectComponents;
    }

    batch.set(newCourseRef, removeUndefinedFields(userCourseData));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

/**
 * Updates the final grade for a course document.
 */
export async function updateCourseFinalGrade(
  uid: string,
  termId: string,
  courseId: string,
  finalGrade: FinalGrade | null
): Promise<void> {
  const path = `users/${uid}/terms/${termId}/courses/${courseId}`;
  try {
    const courseRef = doc(db, 'users', uid, 'terms', termId, 'courses', courseId);
    await updateDoc(courseRef, removeUndefinedFields({
      finalGrade: finalGrade || null,
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export interface BackfillCourseInput {
  name: string;
  courseId?: string;
  level: UserLevel;
  assessmentType: AssessmentType;
  finalGrade: FinalGrade;
  scores?: CourseScores;
  examComponents?: any;
  projectComponents?: any;
}

/**
 * Creates a historical read-only term entry with completed courses and final grades.
 */
export async function backfillPastTerm(
  uid: string,
  termData: {
    termName: string;
    calendarId?: string;
    courses: BackfillCourseInput[];
  }
): Promise<string> {
  const userPath = `users/${uid}`;
  try {
    const batch = writeBatch(db);

    const termsCollectionRef = collection(db, 'users', uid, 'terms');
    const newTermRef = doc(termsCollectionRef);
    const termId = newTermRef.id;

    const termRecord: UserTerm = {
      termId,
      calendarId: termData.calendarId || termId,
      termName: termData.termName,
      isActive: false,
      isManualBackfill: true,
      createdAt: new Date().toISOString(),
    };
    batch.set(newTermRef, removeUndefinedFields(termRecord));

    termData.courses.forEach((c, index) => {
      const courseDocId = c.courseId || `hist-${index}-${Date.now()}`;
      const courseDocRef = doc(db, 'users', uid, 'terms', termId, 'courses', courseDocId);

      const courseRecord: any = {
        courseId: courseDocId,
        name: c.name,
        level: c.level,
        assessmentType: c.assessmentType,
        color: COURSE_COLORS[index % COURSE_COLORS.length],
        finalGrade: c.finalGrade,
        scores: c.scores || {},
        weeklyProgress: {},
        status: 'enrolled',
      };

      if (c.examComponents) courseRecord.examComponents = c.examComponents;
      if (c.projectComponents) courseRecord.projectComponents = c.projectComponents;

      batch.set(courseDocRef, removeUndefinedFields(courseRecord));
    });

    await batch.commit();
    return termId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

/**
 * Delete a user term and all its courses subcollection docs.
 */
export async function deleteUserTerm(uid: string, termId: string): Promise<void> {
  const path = `users/${uid}/terms/${termId}`;
  try {
    const coursesSnap = await getDocs(collection(db, 'users', uid, 'terms', termId, 'courses'));
    const batch = writeBatch(db);
    coursesSnap.forEach((d) => {
      batch.delete(d.ref);
    });
    batch.delete(doc(db, 'users', uid, 'terms', termId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Permanently delete an individual course document from a term.
 */
export async function deleteUserCourse(
  uid: string,
  termId: string,
  courseId: string
): Promise<void> {
  const path = `users/${uid}/terms/${termId}/courses/${courseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'terms', termId, 'courses', courseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function toggleWeeklyChecklist(
  uid: string,
  termId: string,
  courseId: string,
  weekKey: string,
  itemKey: keyof WeeklyChecklist,
  currentValue: boolean
): Promise<void> {
  const path = `users/${uid}/terms/${termId}/courses/${courseId}`;
  try {
    const courseRef = doc(db, 'users', uid, 'terms', termId, 'courses', courseId);
    await updateDoc(courseRef, {
      [`weeklyProgress.${weekKey}.${itemKey}`]: !currentValue,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateCourseScoreField(
  uid: string,
  termId: string,
  courseId: string,
  scores: CourseScores
): Promise<void> {
  const path = `users/${uid}/terms/${termId}/courses/${courseId}`;
  try {
    const courseRef = doc(db, 'users', uid, 'terms', termId, 'courses', courseId);
    await updateDoc(courseRef, removeUndefinedFields({ scores }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Friend Request & Friends System ---

export async function findUserByFriendCode(code: string): Promise<UserProfile | null> {
  const path = 'users';
  try {
    const cleanCode = code.trim().toUpperCase();
    const q = query(collection(db, 'users'), where('friendCode', '==', cleanCode));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function sendFriendRequest(
  currentUser: UserProfile,
  friendCode: string
): Promise<{ success: boolean; message: string }> {
  const path = 'friendRequests';
  try {
    const cleanCode = friendCode.trim().toUpperCase();
    if (cleanCode === currentUser.friendCode) {
      return { success: false, message: 'You cannot send a friend request to yourself.' };
    }

    const targetUser = await findUserByFriendCode(cleanCode);
    if (!targetUser) {
      return { success: false, message: 'No student found with that 6-character Friend Code.' };
    }

    if (currentUser.friends?.includes(targetUser.uid)) {
      return { success: false, message: `${targetUser.name} is already your friend.` };
    }

    // Check if an existing pending request already exists
    const q = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', currentUser.uid),
      where('toUid', '==', targetUser.uid),
      where('status', '==', 'pending')
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      return { success: false, message: 'A friend request is already pending for this student.' };
    }

    const reqRef = doc(collection(db, 'friendRequests'));
    const requestData: any = {
      id: reqRef.id,
      fromUid: currentUser.uid,
      toUid: targetUser.uid,
      fromName: currentUser.name,
      fromEmail: currentUser.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (currentUser.photoURL) {
      requestData.fromPhotoURL = currentUser.photoURL;
    }

    await setDoc(reqRef, removeUndefinedFields(requestData));
    return { success: true, message: `Friend request sent to ${targetUser.name}!` };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeFriendRequests(
  uid: string,
  callback: (incoming: FriendRequest[], outgoing: FriendRequest[]) => void
) {
  const path = 'friendRequests';
  // Query incoming
  const qIncoming = query(collection(db, 'friendRequests'), where('toUid', '==', uid));
  // Query outgoing
  const qOutgoing = query(collection(db, 'friendRequests'), where('fromUid', '==', uid));

  let incomingList: FriendRequest[] = [];
  let outgoingList: FriendRequest[] = [];

  const unsubIncoming = onSnapshot(
    qIncoming,
    (snap) => {
      incomingList = [];
      snap.forEach((d) => incomingList.push({ ...(d.data() as FriendRequest), id: d.id }));
      callback(incomingList, outgoingList);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );

  const unsubOutgoing = onSnapshot(
    qOutgoing,
    (snap) => {
      outgoingList = [];
      snap.forEach((d) => outgoingList.push({ ...(d.data() as FriendRequest), id: d.id }));
      callback(incomingList, outgoingList);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );

  return () => {
    unsubIncoming();
    unsubOutgoing();
  };
}

export async function acceptFriendRequest(request: FriendRequest): Promise<void> {
  const path = `friendRequests/${request.id}`;
  try {
    const batch = writeBatch(db);

    // Update request status
    const reqRef = doc(db, 'friendRequests', request.id);
    batch.update(reqRef, { status: 'accepted' });

    // Bidirectional friendship: add toUid to fromUid's friends array, and fromUid to toUid's friends array
    const fromUserRef = doc(db, 'users', request.fromUid);
    const toUserRef = doc(db, 'users', request.toUid);

    batch.update(fromUserRef, { friends: arrayUnion(request.toUid) });
    batch.update(toUserRef, { friends: arrayUnion(request.fromUid) });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const path = `friendRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getFriendsList(friendUids: string[]): Promise<UserProfile[]> {
  if (!friendUids || friendUids.length === 0) return [];
  const profiles: UserProfile[] = [];
  for (const fUid of friendUids) {
    try {
      const snap = await getDoc(doc(db, 'users', fUid));
      if (snap.exists()) {
        profiles.push(snap.data() as UserProfile);
      }
    } catch (err) {
      console.warn(`Could not fetch friend profile ${fUid}:`, err);
    }
  }
  return profiles;
}
