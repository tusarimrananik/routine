"use client";

import { useEffect, useMemo, useState } from "react";

import { AttendanceRecord } from "@/lib/attendance";

const DEMO_STORAGE_KEY = "routine-demo-attendance-v1";
const TOTAL_WEEKS = 15;
const STORAGE_WEEK_ONE = new Date(Date.UTC(2000, 0, 1));

type SubjectStat = {
  code: string;
  name: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
};

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

function getWeekDate(week: number, dayOffset = 0) {
  const date = new Date(STORAGE_WEEK_ONE);
  date.setUTCDate(STORAGE_WEEK_ONE.getUTCDate() + ((week - 1) * 7) + dayOffset);
  return date.toISOString().slice(0, 10);
}

function readDemoRecords() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY) || "{}") as Record<string, AttendanceRecord>;
    return Object.values(stored);
  } catch {
    return [];
  }
}

export function AttendanceAnalytics({ demoMode = false }: { demoMode?: boolean }) {
  const [startWeek, setStartWeek] = useState(1);
  const [endWeek, setEndWeek] = useState(TOTAL_WEEKS);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    if (startWeek > endWeek) {
      setRecords([]);
      setError("Starting week must be before the ending week.");
      setLoading(false);
      return;
    }

    const startDate = getWeekDate(startWeek);
    const endDate = getWeekDate(endWeek, 4);

    const now = getDhakaNow();
    const onlyStarted = (record: AttendanceRecord) =>
      record.attendanceDate < now.date ||
      (record.attendanceDate === now.date && record.startTime <= now.time);

    if (demoMode) {
      const selected = readDemoRecords().filter(
        (record) =>
          record.attendanceDate >= startDate &&
          record.attendanceDate <= endDate &&
          onlyStarted(record),
      );
      setRecords(selected);
      setLoading(false);
      return;
    }

    fetch(`/api/attendance?from=${startDate}&to=${endDate}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load attendance analytics.");
        return response.json();
      })
      .then((data: { records: AttendanceRecord[] }) => {
        if (!cancelled) setRecords(data.records.filter(onlyStarted));
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
  }, [demoMode, endWeek, startWeek]);

  const subjects = useMemo(() => {
    const grouped = new Map<string, SubjectStat>();

    records.forEach((record) => {
      const current = grouped.get(record.courseCode) || {
        code: record.courseCode,
        name: record.courseName.replace(/\s+CT$/i, ""),
        present: 0,
        absent: 0,
        total: 0,
        percentage: 0,
      };

      current.total += 1;
      if (record.status === "present") current.present += 1;
      else current.absent += 1;
      current.percentage = Math.round((current.present / current.total) * 100);
      grouped.set(record.courseCode, current);
    });

    return Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [records]);

  return (
    <section className="analytics-content">
      <div className="date-filter">
        <label>
          <span>Starting week</span>
          <select value={startWeek} onChange={(event) => setStartWeek(Number(event.target.value))}>
            {Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1).map((week) => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </label>
        <span className="date-arrow">→</span>
        <label>
          <span>Ending week</span>
          <select value={endWeek} onChange={(event) => setEndWeek(Number(event.target.value))}>
            {Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1).map((week) => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </label>
        <small>Showing attendance from Week {startWeek} through Week {endWeek}.</small>
      </div>

      {error ? <p className="analytics-error">{error}</p> : null}

      <section className="subject-section">
        <div className="subject-heading">
          <div>
            <p>Selected period</p>
            <h2>Attendance by Subject</h2>
          </div>
          <span>{subjects.length} subjects</span>
        </div>

        <div className="analytics-table-scroll">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Total</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {!loading && subjects.length === 0 ? (
                <tr>
                  <td className="empty-analytics" colSpan={5}>No attendance records in this week range.</td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject.code}>
                    <td>
                      <strong>{subject.name}</strong>
                      <small>{subject.code}</small>
                    </td>
                    <td className="present-number">{subject.present}</td>
                    <td className="absent-number">{subject.absent}</td>
                    <td>{subject.total}</td>
                    <td>
                      <div className="percentage-cell">
                        <strong>{subject.percentage}%</strong>
                        <span><i style={{ width: `${subject.percentage}%` }} /></span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
