"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  attendanceKey,
  AttendanceInput,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceStatus,
  SessionType,
} from "@/lib/attendance";

type Day = "saturday" | "sunday" | "monday" | "tuesday" | "wednesday";

type SessionDefinition = {
  id: string;
  day: Day;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  instructor?: string;
  room?: string;
  sessionType: SessionType;
  rowSpan?: number;
  styleClass?: string;
  evenWeekOnly?: boolean;
};

type DatedSession = SessionDefinition & {
  attendanceDate: string;
};

const DAYS: { key: Day; label: string }[] = [
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
];

const DAY_OFFSETS: Record<Day, number> = {
  saturday: 0,
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
};

const TIME_SLOTS = [
  { start: "08:00", end: "08:50", label: "8:00–8:50", kind: "class" },
  { start: "08:50", end: "09:40", label: "8:50–9:40", kind: "class" },
  { start: "09:40", end: "10:30", label: "9:40–10:30", kind: "class" },
  { start: "10:30", end: "10:50", label: "10:30–10:50", kind: "break" },
  { start: "10:50", end: "11:40", label: "10:50–11:40", kind: "class" },
  { start: "11:40", end: "12:30", label: "11:40–12:30", kind: "class" },
  { start: "12:30", end: "13:20", label: "12:30–1:20", kind: "class" },
  { start: "13:20", end: "14:30", label: "1:20–2:30", kind: "break" },
  { start: "14:30", end: "15:20", label: "2:30–3:20", kind: "class" },
  { start: "15:20", end: "16:00", label: "3:20–4:00", kind: "class" },
] as const;

const REGULAR_SESSIONS: SessionDefinition[] = [
  { id: "sun-math", day: "sunday", startTime: "11:40", endTime: "12:30", courseCode: "MATH 2213", courseName: "Mathematics", instructor: "Dr. Md. Bellal Hossain", room: "101", sessionType: "regular" },
  { id: "sun-hum", day: "sunday", startTime: "12:30", endTime: "13:20", courseCode: "HUM 2213", courseName: "Humanities", instructor: "Md. Abu Bokar Siddique", room: "101", sessionType: "regular" },
  { id: "sun-num-lab", day: "sunday", startTime: "14:30", endTime: "16:00", courseCode: "CSE 2204", courseName: "Numerical Methods Lab", instructor: "Shyla Afroge / Md. Azmain Yakin Srizon", room: "NW LAB", sessionType: "regular", rowSpan: 2, styleClass: "numerical-lab", evenWeekOnly: true },
  { id: "mon-micro", day: "monday", startTime: "08:50", endTime: "09:40", courseCode: "CSE 2205", courseName: "Microprocessors", instructor: "Md. Sozib Hossain", room: "101", sessionType: "regular" },
  { id: "mon-algo", day: "monday", startTime: "10:50", endTime: "12:30", courseCode: "CSE 2201", courseName: "Algorithm", instructor: "Md. Mazharul Islam Tushar", room: "SEMINAR", sessionType: "regular", rowSpan: 2 },
  { id: "mon-num", day: "monday", startTime: "12:30", endTime: "13:20", courseCode: "CSE 2203", courseName: "Numerical Methods", instructor: "Shyla Afroge / Md. Azmain Yakin Srizon", room: "SEMINAR", sessionType: "regular" },
  { id: "mon-algo-lab", day: "monday", startTime: "14:30", endTime: "16:00", courseCode: "CSE 2202", courseName: "Algorithm Lab", instructor: "Md. Mazharul Islam Tushar", room: "ACL LAB", sessionType: "regular", rowSpan: 2, styleClass: "algorithm-lab" },
  { id: "tue-algo", day: "tuesday", startTime: "08:50", endTime: "09:40", courseCode: "CSE 2201", courseName: "Algorithm", instructor: "Md. Mazharul Islam Tushar", room: "203", sessionType: "regular" },
  { id: "tue-hum", day: "tuesday", startTime: "09:40", endTime: "10:30", courseCode: "HUM 2213", courseName: "Humanities", instructor: "Md. Abu Bokar Siddique", room: "203", sessionType: "regular" },
  { id: "tue-math", day: "tuesday", startTime: "10:50", endTime: "11:40", courseCode: "MATH 2213", courseName: "Mathematics", instructor: "Mst. Rupale Khatun", room: "203", sessionType: "regular" },
  { id: "tue-micro", day: "tuesday", startTime: "11:40", endTime: "13:20", courseCode: "CSE 2205", courseName: "Microprocessors", instructor: "Md. Sozib Hossain", room: "203", sessionType: "regular", rowSpan: 2 },
  { id: "tue-writing", day: "tuesday", startTime: "14:30", endTime: "16:00", courseCode: "CSE 2200", courseName: "Technical Writing Lab", instructor: "Prof. Dr. Md. Nazrul Islam Mondal / Md. Nasif Osman Khansur", room: "101", sessionType: "regular", rowSpan: 2, styleClass: "technical-writing-lab" },
  { id: "wed-hum", day: "wednesday", startTime: "08:50", endTime: "09:40", courseCode: "HUM 2213", courseName: "Humanities", instructor: "Shoaib Islam", room: "SEMINAR", sessionType: "regular" },
  { id: "wed-math", day: "wednesday", startTime: "09:40", endTime: "10:30", courseCode: "MATH 2213", courseName: "Mathematics", instructor: "Mst. Rupale Khatun", room: "SEMINAR", sessionType: "regular" },
  { id: "wed-micro-lab", day: "wednesday", startTime: "10:50", endTime: "13:20", courseCode: "CSE 2206", courseName: "Microprocessors Lab", instructor: "Md. Sozib Hossain", room: "ACL LAB", sessionType: "regular", rowSpan: 3, styleClass: "microprocessor-lab" },
  { id: "wed-num", day: "wednesday", startTime: "14:30", endTime: "16:00", courseCode: "CSE 2203", courseName: "Numerical Methods", instructor: "Shyla Afroge", room: "203", sessionType: "regular", rowSpan: 2 },
];

const CURRENT_CT: SessionDefinition[] = [
  { id: "ct-sat-micro", day: "saturday", startTime: "08:00", endTime: "08:50", courseCode: "CSE 2205", courseName: "Microprocessors CT", sessionType: "ct", styleClass: "ct-active" },
  { id: "ct-mon-num", day: "monday", startTime: "08:00", endTime: "08:50", courseCode: "CSE 2203", courseName: "Numerical Methods CT", sessionType: "ct", styleClass: "ct-active" },
  { id: "ct-wed-algo", day: "wednesday", startTime: "08:00", endTime: "08:50", courseCode: "CSE 2201", courseName: "Algorithm CT", sessionType: "ct", styleClass: "ct-active" },
];

const NEXT_CT: SessionDefinition[] = [
  { id: "ct-sun-hum", day: "sunday", startTime: "08:00", endTime: "08:50", courseCode: "HUM 2213", courseName: "Humanities CT", sessionType: "ct", styleClass: "ct-active" },
  { id: "ct-tue-math", day: "tuesday", startTime: "08:00", endTime: "08:50", courseCode: "MATH 2213", courseName: "Mathematics CT", sessionType: "ct", styleClass: "ct-active" },
];

const EMPTY_SUMMARY: AttendanceSummary = {
  overall: { present: 0, total: 0, percentage: 0 },
  regular: { present: 0, total: 0, percentage: 0 },
  ct: { present: 0, total: 0, percentage: 0 },
};

const DEMO_STORAGE_KEY = "routine-demo-attendance-v1";

function getDhakaToday() {
  const values: Record<string, number> = {};
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Dhaka",
  }).formatToParts(new Date());

  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  });

  return new Date(Date.UTC(values.year, values.month - 1, values.day));
}

function getWeekStart(nextWeek: boolean) {
  const today = getDhakaToday();
  const daysSinceSaturday = (today.getUTCDay() + 1) % 7;
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - daysSinceSaturday + (nextWeek ? 7 : 0));
  return start;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDatedSession(session: SessionDefinition, weekStart: Date): DatedSession {
  const date = new Date(weekStart);
  date.setUTCDate(weekStart.getUTCDate() + DAY_OFFSETS[session.day]);
  return { ...session, attendanceDate: toDateKey(date) };
}

function toInput(session: DatedSession, status?: AttendanceStatus): AttendanceInput {
  return {
    attendanceDate: session.attendanceDate,
    startTime: session.startTime,
    endTime: session.endTime,
    courseCode: session.courseCode,
    courseName: session.courseName,
    sessionType: session.sessionType,
    status,
  };
}

function percentageLabel(stat: AttendanceSummary["overall"]) {
  return stat.total ? `${stat.percentage}%` : "—";
}

function getDhakaNow() {
  const values: Record<string, string> = {};
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Dhaka",
  }).formatToParts(new Date());

  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function demoSummary(records: AttendanceRecord[]): AttendanceSummary {
  const now = getDhakaNow();
  const counts = {
    regular: { present: 0, total: 0 },
    ct: { present: 0, total: 0 },
  };

  records.forEach((record) => {
    const started =
      record.attendanceDate < now.date ||
      (record.attendanceDate === now.date && record.startTime <= now.time);

    if (!started) return;
    counts[record.sessionType].total += 1;
    if (record.status === "present") counts[record.sessionType].present += 1;
  });

  const toStat = (present: number, total: number) => ({
    present,
    total,
    percentage: total ? Math.round((present / total) * 100) : 0,
  });
  const regular = toStat(counts.regular.present, counts.regular.total);
  const ct = toStat(counts.ct.present, counts.ct.total);

  return {
    regular,
    ct,
    overall: toStat(regular.present + ct.present, regular.total + ct.total),
  };
}

function readDemoRecords() {
  try {
    return JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY) || "{}") as Record<string, AttendanceRecord>;
  } catch {
    return {} as Record<string, AttendanceRecord>;
  }
}

export function RoutineTracker({ demoMode = false }: { demoMode?: boolean }) {
  const [nextWeek, setNextWeek] = useState(false);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());

  const dhakaDateKey = toDateKey(getDhakaToday());
  const weekStart = useMemo(() => getWeekStart(nextWeek), [nextWeek, dhakaDateKey]);

  const sessions = useMemo(() => {
    const regular = REGULAR_SESSIONS.filter((session) => !session.evenWeekOnly || !nextWeek);
    const ct = nextWeek ? NEXT_CT : CURRENT_CT;
    return [...regular, ...ct].map((session) => toDatedSession(session, weekStart));
  }, [nextWeek, weekStart]);

  const sessionMap = useMemo(() => {
    const map = new Map<string, DatedSession>();
    sessions.forEach((session) => map.set(`${session.day}|${session.startTime}`, session));
    return map;
  }, [sessions]);

  const range = useMemo(() => {
    const end = new Date(weekStart);
    end.setUTCDate(weekStart.getUTCDate() + 4);
    return { from: toDateKey(weekStart), to: toDateKey(end) };
  }, [weekStart]);

  const currentDay = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Dhaka",
  }).format(new Date(clock)).toLowerCase();

  const applyResponse = useCallback((data: { records: AttendanceRecord[]; summary: AttendanceSummary }) => {
    const nextRecords: Record<string, AttendanceStatus> = {};
    data.records.forEach((record) => {
      nextRecords[attendanceKey(record)] = record.status;
    });
    setRecords(nextRecords);
    setSummary(data.summary);
  }, []);

  const applyDemoRecords = useCallback((stored: Record<string, AttendanceRecord>) => {
    const allRecords = Object.values(stored);
    applyResponse({
      records: allRecords.filter(
        (record) => record.attendanceDate >= range.from && record.attendanceDate <= range.to,
      ),
      summary: demoSummary(allRecords),
    });
  }, [applyResponse, range]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    if (demoMode) {
      const stored = readDemoRecords();

      sessions.forEach((session) => {
        const record = toInput(session, "absent") as AttendanceRecord;
        const key = attendanceKey(record);
        if (!stored[key]) stored[key] = record;
      });

      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored));
      applyDemoRecords(stored);
      setLoading(false);
      return;
    }

    fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync",
        sessions: sessions.map((session) => toInput(session)),
        ...range,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load attendance.");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) applyResponse(data);
      })
      .catch((requestError: Error) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyDemoRecords, applyResponse, demoMode, range, sessions]);

  async function toggleAttendance(session: DatedSession) {
    const key = attendanceKey(toInput(session));
    const oldStatus = records[key] || "absent";
    const status: AttendanceStatus = oldStatus === "present" ? "absent" : "present";

    setSavingKey(key);
    setError("");
    setRecords((current) => ({ ...current, [key]: status }));

    if (demoMode) {
      const stored = readDemoRecords();
      stored[key] = toInput(session, status) as AttendanceRecord;
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored));
      applyDemoRecords(stored);
      setSavingKey(null);
      return;
    }

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          record: toInput(session, status),
          ...range,
        }),
      });

      if (!response.ok) throw new Error("Could not save attendance.");
      applyResponse(await response.json());
    } catch (requestError) {
      setRecords((current) => ({ ...current, [key]: oldStatus }));
      setError(requestError instanceof Error ? requestError.message : "Could not save attendance.");
    } finally {
      setSavingKey(null);
    }
  }

  function isCovered(day: Day, slotIndex: number) {
    return sessions.some((session) => {
      if (session.day !== day || !session.rowSpan) return false;
      const startIndex = TIME_SLOTS.findIndex((slot) => slot.start === session.startTime);
      return slotIndex > startIndex && slotIndex < startIndex + session.rowSpan;
    });
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 4);
  const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const weekLabel = `${dateFormatter.format(weekStart)}–${dateFormatter.format(weekEnd)}`;

  return (
    <section className="schedule-container">
      <div className="toggle-container">
        <span className="week-status">{nextWeek ? "Next CT Week" : "Current CT Week"}</span>
        <div className="week-control">
          <label className="week-switch">
            <input type="checkbox" checked={nextWeek} onChange={(event) => setNextWeek(event.target.checked)} />
            <span className="slider" />
          </label>
          <span>Next CT Week</span>
        </div>
      </div>

      <div className="attendance-panel">
        <div className="attendance-copy">
          <span>{weekLabel}</span>
          <span className="attendance-summary">
            {loading ? "Loading…" : `${summary.overall.present}/${summary.overall.total} completed · ${percentageLabel(summary.overall)}`}
          </span>
          {error ? <span className="save-error">{error}</span> : <span className="attendance-help">Tap a class to change attendance</span>}
        </div>
        <button className="summary-button" type="button" onClick={() => setShowSummary(true)}>
          Overall Attendance
        </button>
      </div>

      <div className="table-scroll" role="region" aria-label="Class routine" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th className="time-column">Time</th>
              {DAYS.map((day) => (
                <th key={day.key} className={currentDay === day.key ? "current-day-column" : ""}>
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, slotIndex) => (
              <tr className={slot.kind === "break" ? "break-row" : "class-slot-row"} key={slot.start}>
                <td className="time-label">{slot.label}</td>
                {DAYS.map((day) => {
                  if (isCovered(day.key, slotIndex)) return null;
                  const session = sessionMap.get(`${day.key}|${slot.start}`);
                  const todayClass = currentDay === day.key ? " current-day-column" : "";

                  if (session) {
                    const key = attendanceKey(toInput(session));
                    const status = records[key] || "absent";
                    return (
                      <td
                        className={`course-cell attendance-cell attendance-${status} ${session.styleClass || ""}${todayClass}`}
                        data-session-type={session.sessionType}
                        key={day.key}
                        rowSpan={session.rowSpan}
                        role="button"
                        tabIndex={0}
                        aria-pressed={status === "present"}
                        aria-label={`${session.courseName}: ${status}`}
                        onClick={() => toggleAttendance(session)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleAttendance(session);
                          }
                        }}
                      >
                        <div className="course-info">
                          <span className="course-code">{session.courseCode}</span>
                          <span className="course-name">{session.courseName}</span>
                          {session.sessionType === "ct" ? <span className="ct-label">CT</span> : null}
                          {session.evenWeekOnly ? <span className="ct-label">Even Week · Every 2 Weeks</span> : null}
                          {session.instructor ? <span className="instructor">{session.instructor}</span> : null}
                          {session.room ? <span className="room">{session.room}</span> : null}
                        </div>
                        {savingKey === key ? <span className="saving-dot" aria-label="Saving" /> : null}
                      </td>
                    );
                  }

                  return slot.kind === "break" ? (
                    <td className={`break-cell${todayClass}`} key={day.key}>BREAK</td>
                  ) : (
                    <td className={`empty-cell${todayClass}`} key={day.key} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSummary ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowSummary(false)}>
          <section className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Saved attendance</p>
                <h2 id="summary-title">Overall Attendance</h2>
              </div>
              <button className="modal-close" type="button" aria-label="Close" onClick={() => setShowSummary(false)}>×</button>
            </div>

            <div className="stat-grid">
              <article className="stat-card stat-overall">
                <span>Overall</span>
                <strong>{percentageLabel(summary.overall)}</strong>
                <small>{summary.overall.present} of {summary.overall.total} attended</small>
              </article>
              <article className="stat-card">
                <span>Regular Classes</span>
                <strong>{percentageLabel(summary.regular)}</strong>
                <small>{summary.regular.present} of {summary.regular.total} attended</small>
              </article>
              <article className="stat-card stat-ct">
                <span>CT Attendance</span>
                <strong>{percentageLabel(summary.ct)}</strong>
                <small>{summary.ct.present} of {summary.ct.total} attended</small>
              </article>
            </div>

            <p className="summary-note">Only classes and CTs whose start time has passed are included.</p>
          </section>
        </div>
      ) : null}
    </section>
  );
}
