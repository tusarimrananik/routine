"use client";

import { useEffect, useMemo, useState } from "react";

import { AttendanceRecord, AttendanceStat, SessionType } from "@/lib/attendance";

const DEMO_STORAGE_KEY = "routine-demo-attendance-v1";

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

function toStat(present: number, total: number): AttendanceStat {
  return {
    present,
    total,
    percentage: total ? Math.round((present / total) * 100) : 0,
  };
}

function buildTotal(records: AttendanceRecord[], type?: SessionType) {
  const selected = type ? records.filter((record) => record.sessionType === type) : records;
  const present = selected.filter((record) => record.status === "present").length;
  return toStat(present, selected.length);
}

function percentageLabel(stat: AttendanceStat) {
  return stat.total ? `${stat.percentage}%` : "—";
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
  const today = getDhakaNow().date;
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(today);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    if (startDate > endDate) {
      setRecords([]);
      setError("Start date must be before the end date.");
      setLoading(false);
      return;
    }

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
  }, [demoMode, endDate, startDate]);

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

  const overall = buildTotal(records);
  const regular = buildTotal(records, "regular");
  const ct = buildTotal(records, "ct");

  return (
    <section className="analytics-content">
      <div className="date-filter">
        <label>
          <span>Starting from</span>
          <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <span className="date-arrow">→</span>
        <label>
          <span>Up to</span>
          <input type="date" value={endDate} min={startDate} max={today} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <small>Only classes that have already started are counted.</small>
      </div>

      {error ? <p className="analytics-error">{error}</p> : null}

      <div className="analytics-summary-grid">
        <article className="analytics-summary-card overall-card">
          <span>Overall Attendance</span>
          <strong>{loading ? "…" : percentageLabel(overall)}</strong>
          <small>{overall.present} present out of {overall.total}</small>
        </article>
        <article className="analytics-summary-card">
          <span>Regular Classes</span>
          <strong>{loading ? "…" : percentageLabel(regular)}</strong>
          <small>{regular.present} present out of {regular.total}</small>
        </article>
        <article className="analytics-summary-card ct-card">
          <span>CT Attendance</span>
          <strong>{loading ? "…" : percentageLabel(ct)}</strong>
          <small>{ct.present} present out of {ct.total}</small>
        </article>
      </div>

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
                  <td className="empty-analytics" colSpan={5}>No attendance records in this date range.</td>
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
