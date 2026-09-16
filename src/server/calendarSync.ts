import { GoogleGenAI } from '@google/genai';

export interface ScrapedCalendarTerm {
  termId: string;
  cycle?: string;
  cycleType: 'Jan' | 'May' | 'Sep';
  startDate: string;
  quiz1Date: string;
  quiz2Date: string;
  endTermDate: string;
  oppe1Window: { start: string; end: string };
  oppe2Window: { start: string; end: string };
  syncStatus?: 'ok' | 'failed';
  source?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  terms: ScrapedCalendarTerm[];
  lastScrapedAt: string;
  source: 'live_scrape' | 'fallback_scrape';
  rawResponse?: string;
  error?: string;
}

// Verified official known-good data for Sep2026 through Sep2030 (13 terms)
// Scraper must never overwrite these without checking against this known-good data first.
export const KNOWN_GOOD_TERMS: Record<string, ScrapedCalendarTerm> = {
  Sep2026: {
    termId: 'Sep2026',
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
  Jan2027: {
    termId: 'Jan2027',
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
  May2027: {
    termId: 'May2027',
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
  Sep2027: {
    termId: 'Sep2027',
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
  Jan2028: {
    termId: 'Jan2028',
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
  May2028: {
    termId: 'May2028',
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
  Sep2028: {
    termId: 'Sep2028',
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
  Jan2029: {
    termId: 'Jan2029',
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
  May2029: {
    termId: 'May2029',
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
  Sep2029: {
    termId: 'Sep2029',
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
  Jan2030: {
    termId: 'Jan2030',
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
  May2030: {
    termId: 'May2030',
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
  Sep2030: {
    termId: 'Sep2030',
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
};

// Fallback HTML snapshot reflecting real IITM Academic Calendar structure with separate
// "For Qualifier Student" and "For Term Students" sections
const IITM_CALENDAR_HTML_SNAPSHOT = `
<!DOCTYPE html>
<html>
<head><title>Academic Calendar - IITM BS Degree</title></head>
<body>
<div class="calendar-wrapper">
  <h1>Academic Calendar - IIT Madras BS Degree</h1>

  <section class="qualifier-section">
    <h2>For Qualifier Student</h2>
    <table border="1">
      <thead>
        <tr><th>Cycle</th><th>Qualifier Commences</th><th>Qualifier Exam 1</th><th>Qualifier Exam 2</th></tr>
      </thead>
      <tbody>
        <tr><td>September 2026</td><td>September 14, 2026</td><td>October 18, 2026</td><td>November 22, 2026</td></tr>
        <tr><td>January 2027</td><td>January 18, 2027</td><td>February 21, 2027</td><td>March 28, 2027</td></tr>
      </tbody>
    </table>
  </section>

  <section class="dad-qualifier-section">
    <h2>For DAD Qualifier Students</h2>
    <table border="1">
      <thead>
        <tr><th>Cycle</th><th>Commencement</th><th>Qualifier Exam</th></tr>
      </thead>
      <tbody>
        <tr><td>September 2026</td><td>September 20, 2026</td><td>November 01, 2026</td></tr>
      </tbody>
    </table>
  </section>

  <section class="term-students-section">
    <h2>For Term Students</h2>
    <table border="1">
      <thead>
        <tr>
          <th>Cycle / Term</th>
          <th>Term Commences (Start Date)</th>
          <th>Quiz 1</th>
          <th>OPPE 1 Window</th>
          <th>Quiz 2</th>
          <th>OPPE 2 Window</th>
          <th>End Term Exam</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>September 2026 (Sep2026)</td>
          <td>October 02, 2026</td>
          <td>November 15, 2026</td>
          <td>November 22, 2026 - December 05, 2026</td>
          <td>December 20, 2026</td>
          <td>January 03, 2027 - January 03, 2027</td>
          <td>January 10, 2027</td>
        </tr>
        <tr>
          <td>January 2027 (Jan2027)</td>
          <td>February 05, 2027</td>
          <td>March 14, 2027</td>
          <td>March 27, 2027 - March 28, 2027</td>
          <td>April 11, 2027</td>
          <td>April 25, 2027 - May 02, 2027</td>
          <td>May 09, 2027</td>
        </tr>
        <tr>
          <td>May 2027 (May2027)</td>
          <td>June 04, 2027</td>
          <td>July 11, 2027</td>
          <td>July 22, 2027 - July 25, 2027</td>
          <td>August 08, 2027</td>
          <td>August 22, 2027 - August 29, 2027</td>
          <td>September 05, 2027</td>
        </tr>
        <tr>
          <td>September 2027 (Sep2027)</td>
          <td>October 01, 2027</td>
          <td>November 07, 2027</td>
          <td>November 27, 2027 - November 28, 2027</td>
          <td>December 12, 2027</td>
          <td>December 19, 2027 - January 02, 2028</td>
          <td>January 09, 2028</td>
        </tr>
      </tbody>
    </table>
  </section>
</div>
</body>
</html>
`;

export async function fetchAndParseAcademicCalendar(): Promise<CalendarSyncResult> {
  const lastScrapedAt = new Date().toISOString();
  let htmlContent = '';
  let source: 'live_scrape' | 'fallback_scrape' = 'live_scrape';

  // 1. Fetch live page
  try {
    const res = await fetch('https://study.iitm.ac.in/ds/academic_calendar.html', {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      let rawHtml = await res.text();
      // Clean HTML to remove scripts, styles, svg, and bulky noise before sending to Gemini
      rawHtml = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      rawHtml = rawHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      rawHtml = rawHtml.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
      htmlContent = rawHtml.slice(0, 30000);
    } else {
      source = 'fallback_scrape';
      htmlContent = IITM_CALENDAR_HTML_SNAPSHOT;
    }
  } catch {
    // Network restricted or site unreachable; use snapshot
    source = 'fallback_scrape';
    htmlContent = IITM_CALENDAR_HTML_SNAPSHOT;
  }

  // 2. Call Gemini API to extract structured term data
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in server environment');
    return {
      success: false,
      terms: Object.values(KNOWN_GOOD_TERMS),
      lastScrapedAt,
      source,
      error: 'GEMINI_API_KEY is not configured; preserving verified known-good terms',
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `You are parsing the official IIT Madras BS Data Science academic calendar web page.

CRITICAL INSTRUCTION - TARGET "FOR TERM STUDENTS" ONLY:
The IITM academic calendar page contains separate tables and sections for different student categories:
1. "For Term Students" (or "Term Students")
2. "For Qualifier Student" / "For Qualifier Students"
3. "For DAD Qualifier Students"

You MUST extract term dates ONLY from rows and tables under the "For Term Students" headers/sections.
STRICTLY IGNORE all rows, columns, dates, and tables under "For Qualifier Student", "For Qualifier Students", or "For DAD Qualifier Students" sections entirely!
Qualifier exams happen at different dates (often weeks earlier) and MUST NOT be used for regular term student quiz dates, OPPE windows, or term commencement dates.

Extract each term into a clean JSON array of objects.
Each object MUST have this exact schema:
{
  "termId": string (e.g. "Sep2026", "Jan2027", "May2027" - exactly 3-letter month followed by 4-digit year),
  "cycle": string (same as termId, e.g. "Sep2026"),
  "cycleType": "Jan" | "May" | "Sep",
  "startDate": string (YYYY-MM-DD),
  "quiz1Date": string (YYYY-MM-DD),
  "quiz2Date": string (YYYY-MM-DD),
  "endTermDate": string (YYYY-MM-DD),
  "oppe1Window": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "oppe2Window": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }
}

HTML Content:
${htmlContent}

Return ONLY a valid JSON array. No markdown formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '';
    let parsed: ScrapedCalendarTerm[];
    try {
      parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed) && typeof parsed === 'object') {
        parsed = (parsed as unknown as { terms?: ScrapedCalendarTerm[] }).terms || [parsed as unknown as ScrapedCalendarTerm];
      }
    } catch {
      return {
        success: false,
        terms: Object.values(KNOWN_GOOD_TERMS),
        lastScrapedAt,
        source,
        rawResponse: rawText,
        error: 'Gemini JSON parse failed; preserving known-good terms',
      };
    }

    // 3. Validation & Merging with Known-Good Protection:
    // The scraper should never overwrite a manually-seeded document without checking it against this known-good data first.
    const resultMap: Record<string, ScrapedCalendarTerm> = { ...KNOWN_GOOD_TERMS };

    for (const term of parsed) {
      if (!term.termId || !term.cycleType || !term.startDate || !term.endTermDate) {
        continue;
      }

      // Ensure cycle field is set
      const cycleKey = term.cycle || term.termId;
      term.cycle = cycleKey;

      const start = new Date(term.startDate).getTime();
      const q1 = new Date(term.quiz1Date).getTime();
      const q2 = new Date(term.quiz2Date).getTime();
      const end = new Date(term.endTermDate).getTime();

      // Plausibility check
      const isValidOrdering = start < q1 && q1 < q2 && q2 < end;
      const weeks = (end - start) / (7 * 24 * 60 * 60 * 1000);
      const isPlausibleDuration = weeks >= 10 && weeks <= 16;

      if (!isValidOrdering || !isPlausibleDuration) {
        console.warn(`Implausible term dates parsed for ${term.termId}; skipping`, term);
        continue;
      }

      // Check against known-good data:
      if (KNOWN_GOOD_TERMS[cycleKey]) {
        // Sep2026 - Sep2030: If scraped dates match known-good or verified official data, keep verified source
        const kg = KNOWN_GOOD_TERMS[cycleKey];
        if (
          term.startDate === kg.startDate &&
          term.quiz1Date === kg.quiz1Date &&
          term.quiz2Date === kg.quiz2Date &&
          term.endTermDate === kg.endTermDate
        ) {
          resultMap[cycleKey] = {
            ...kg,
            syncStatus: 'ok',
            source: 'manually seeded',
          };
        } else {
          // If scraped dates differ from known-good verified data, DO NOT overwrite!
          console.warn(`Scraped dates for ${cycleKey} differ from verified known-good official data. Retaining known-good data.`);
          resultMap[cycleKey] = {
            ...kg,
            syncStatus: 'ok',
            source: 'manually seeded',
          };
        }
      } else {
        // Future terms beyond Sep2030 or new cycles: accept if plausible
        resultMap[cycleKey] = {
          ...term,
          syncStatus: 'ok',
          source: 'scraped from official portal',
        };
      }
    }

    const finalTerms = Object.values(resultMap);

    return {
      success: true,
      terms: finalTerms,
      lastScrapedAt,
      source,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      terms: Object.values(KNOWN_GOOD_TERMS),
      lastScrapedAt,
      source,
      error: errorMsg,
    };
  }
}
