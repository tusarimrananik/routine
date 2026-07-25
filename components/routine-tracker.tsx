"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  attendanceKey,
  AttendanceInput,
  AttendanceRecord,
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

const DEMO_STORAGE_KEY = "routine-demo-attendance-v1";
const TOTAL_WEEKS = 15;
const STORAGE_WEEK_ONE = new Date(Date.UTC(2000, 0, 1));

function getWeekStart(week: number) {
  const start = new Date(STORAGE_WEEK_ONE);
  start.setUTCDate(STORAGE_WEEK_ONE.getUTCDate() + ((week - 1) * 7));
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

function readDemoRecords() {
  try {
    return JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY) || "{}") as Record<string, AttendanceRecord>;
  } catch {
    return {} as Record<string, AttendanceRecord>;
  }
}

type RoutineTrackerProps = {
  demoMode?: boolean;
  userImage?: string;
  userName?: string;
  signOutAction?: () => Promise<void>;
};

export function RoutineTracker({
  demoMode = false,
  userImage = "",
  userName = "Student",
  signOutAction,
}: RoutineTrackerProps) {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());

  const weekStart = useMemo(() => getWeekStart(selectedWeek), [selectedWeek]);
  const alternateCtWeek = selectedWeek % 2 === 0;

  const sessions = useMemo(() => {
    const regular = REGULAR_SESSIONS.filter((session) => !session.evenWeekOnly || !alternateCtWeek);
    const ct = alternateCtWeek ? NEXT_CT : CURRENT_CT;
    return [...regular, ...ct].map((session) => toDatedSession(session, weekStart));
  }, [alternateCtWeek, weekStart]);

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

  const applyResponse = useCallback((data: { records: AttendanceRecord[] }) => {
    const nextRecords: Record<string, AttendanceStatus> = {};
    data.records.forEach((record) => {
      nextRecords[attendanceKey(record)] = record.status;
    });
    setRecords(nextRecords);
  }, []);

  const applyDemoRecords = useCallback((stored: Record<string, AttendanceRecord>) => {
    applyResponse({
      records: Object.values(stored).filter(
        (record) => record.attendanceDate >= range.from && record.attendanceDate <= range.to,
      ),
    });
  }, [applyResponse, range]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
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

  return (
    <section className="schedule-container">
      <div className="tracker-toolbar">
        <details className="profile-menu">
          <summary aria-label="Open account menu">
            {userImage ? (
              <img src={userImage} alt={`${userName} profile`} referrerPolicy="no-referrer" />
            ) : (
              <span aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
            )}
          </summary>
          <div className="profile-popover">
            <Link className="profile-action" href="/analytics">Analytics</Link>
            {signOutAction ? (
              <form action={signOutAction}>
                <button className="profile-action profile-sign-out" type="submit">Sign out</button>
              </form>
            ) : null}
          </div>
        </details>

        <div className="week-switcher" role="group" aria-label="Choose schedule week">
          <button
            className="week-nav-button"
            type="button"
            aria-label="Previous week"
            disabled={selectedWeek === 1}
            onClick={() => setSelectedWeek((week) => Math.max(1, week - 1))}
          >
            ‹
          </button>
          <span className="week-display" aria-live="polite">Week {selectedWeek}</span>
          <button
            className="week-nav-button"
            type="button"
            aria-label="Next week"
            disabled={selectedWeek === TOTAL_WEEKS}
            onClick={() => setSelectedWeek((week) => Math.min(TOTAL_WEEKS, week + 1))}
          >
            ›
          </button>
        </div>
      </div>
      {error ? <p className="tracker-error" role="alert">{error}</p> : null}

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
    </section>
  );
}
