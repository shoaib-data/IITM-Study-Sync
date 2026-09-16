import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const VERIFIED_TERMS = [
  {
    cycle: 'Sep2026',
    cycleType: 'Sep',
    startDate: '2026-10-02',
    quiz1Date: '2026-11-15',
    oppe1Window: { start: '2026-11-22', end: '2026-12-05' },
    quiz2Date: '2026-12-20',
    oppe2Window: { start: '2027-01-03', end: '2027-01-03' },
    endTermDate: '2027-01-10',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Jan2027',
    cycleType: 'Jan',
    startDate: '2027-02-05',
    quiz1Date: '2027-03-14',
    oppe1Window: { start: '2027-03-27', end: '2027-03-28' },
    quiz2Date: '2027-04-11',
    oppe2Window: { start: '2027-04-25', end: '2027-05-02' },
    endTermDate: '2027-05-09',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'May2027',
    cycleType: 'May',
    startDate: '2027-06-04',
    quiz1Date: '2027-07-11',
    oppe1Window: { start: '2027-07-22', end: '2027-07-25' },
    quiz2Date: '2027-08-08',
    oppe2Window: { start: '2027-08-22', end: '2027-08-29' },
    endTermDate: '2027-09-05',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Sep2027',
    cycleType: 'Sep',
    startDate: '2027-10-01',
    quiz1Date: '2027-11-07',
    oppe1Window: { start: '2027-11-27', end: '2027-11-28' },
    quiz2Date: '2027-12-12',
    oppe2Window: { start: '2027-12-19', end: '2028-01-02' },
    endTermDate: '2028-01-09',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Jan2028',
    cycleType: 'Jan',
    startDate: '2028-02-04',
    quiz1Date: '2028-03-12',
    oppe1Window: { start: '2028-03-25', end: '2028-03-26' },
    quiz2Date: '2028-04-09',
    oppe2Window: { start: '2028-04-23', end: '2028-04-30' },
    endTermDate: '2028-05-07',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'May2028',
    cycleType: 'May',
    startDate: '2028-06-09',
    quiz1Date: '2028-07-16',
    oppe1Window: { start: '2028-07-29', end: '2028-07-30' },
    quiz2Date: '2028-08-20',
    oppe2Window: { start: '2028-08-27', end: '2028-09-03' },
    endTermDate: '2028-09-10',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Sep2028',
    cycleType: 'Sep',
    startDate: '2028-09-29',
    quiz1Date: '2028-11-05',
    oppe1Window: { start: '2028-11-25', end: '2028-11-26' },
    quiz2Date: '2028-12-03',
    oppe2Window: { start: '2028-12-10', end: '2028-12-24' },
    endTermDate: '2029-01-06',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Jan2029',
    cycleType: 'Jan',
    startDate: '2029-02-09',
    quiz1Date: '2029-03-18',
    oppe1Window: { start: '2029-04-07', end: '2029-04-08' },
    quiz2Date: '2029-04-15',
    oppe2Window: { start: '2029-04-29', end: '2029-05-06' },
    endTermDate: '2029-05-13',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'May2029',
    cycleType: 'May',
    startDate: '2029-06-08',
    quiz1Date: '2029-07-15',
    oppe1Window: { start: '2029-07-28', end: '2029-07-29' },
    quiz2Date: '2029-08-12',
    oppe2Window: { start: '2029-08-19', end: '2029-09-02' },
    endTermDate: '2029-09-09',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Sep2029',
    cycleType: 'Sep',
    startDate: '2029-09-28',
    quiz1Date: '2029-11-11',
    oppe1Window: { start: '2029-11-24', end: '2029-11-25' },
    quiz2Date: '2029-12-02',
    oppe2Window: { start: '2029-12-09', end: '2029-12-23' },
    endTermDate: '2030-01-06',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Jan2030',
    cycleType: 'Jan',
    startDate: '2030-02-01',
    quiz1Date: '2030-03-10',
    oppe1Window: { start: '2030-03-25', end: '2030-03-26' },
    quiz2Date: '2030-04-07',
    oppe2Window: { start: '2030-04-20', end: '2030-04-28' },
    endTermDate: '2030-05-12',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'May2030',
    cycleType: 'May',
    startDate: '2030-06-07',
    quiz1Date: '2030-07-14',
    oppe1Window: { start: '2030-07-27', end: '2030-07-28' },
    quiz2Date: '2030-08-11',
    oppe2Window: { start: '2030-08-18', end: '2030-08-31' },
    endTermDate: '2030-09-08',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
  {
    cycle: 'Sep2030',
    cycleType: 'Sep',
    startDate: '2030-09-27',
    quiz1Date: '2030-11-10',
    oppe1Window: { start: '2030-11-23', end: '2030-11-24' },
    quiz2Date: '2030-12-01',
    oppe2Window: { start: '2030-12-08', end: '2030-12-22' },
    endTermDate: '2031-01-05',
    syncStatus: 'ok',
    source: 'manually seeded',
  },
];

async function seedVerifiedCalendar() {
  console.log('Seeding verified official calendar terms into Firestore...');

  // 1. Get existing documents in calendar
  const calendarColl = collection(db, 'calendar');
  const existingDocs = await getDocs(calendarColl);
  console.log(`Found ${existingDocs.size} existing calendar docs in Firestore.`);

  const verifiedCycles = new Set(VERIFIED_TERMS.map(t => t.cycle));

  // 2. Remove obsolete or incorrect documents that are not in verified set (e.g. old May2026)
  for (const docSnap of existingDocs.docs) {
    if (!verifiedCycles.has(docSnap.id)) {
      console.log(`Removing outdated/unverified calendar doc: ${docSnap.id}`);
      await deleteDoc(doc(db, 'calendar', docSnap.id));
    }
  }

  // 3. Write all 13 verified official documents, matched by the 'cycle' field as doc ID
  const batch = writeBatch(db);
  for (const term of VERIFIED_TERMS) {
    const docRef = doc(db, 'calendar', term.cycle);
    batch.set(docRef, {
      ...term,
      termId: term.cycle,
      lastScrapedAt: new Date().toISOString(),
    });
    console.log(`Queued overwrite for ${term.cycle}: start ${term.startDate}, end ${term.endTermDate}`);
  }

  await batch.commit();
  console.log('Batch commit successful! 13 verified terms written.');

  // 4. Verify data from server
  const verifyDocs = await getDocs(calendarColl);
  console.log(`Verification: calendar collection now contains ${verifyDocs.size} documents:`);
  verifyDocs.forEach(d => {
    const data = d.data();
    console.log(` - [${d.id}] start: ${data.startDate}, q1: ${data.quiz1Date}, q2: ${data.quiz2Date}, end: ${data.endTermDate}, status: ${data.syncStatus}, source: ${data.source}`);
  });
}

seedVerifiedCalendar()
  .then(() => {
    console.log('Calendar seed completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Calendar seed error:', err);
    process.exit(1);
  });
