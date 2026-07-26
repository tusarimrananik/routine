"use client";

import { useEffect, useMemo, useState } from "react";
import { AttendanceRecord } from "@/lib/attendance";
import { getSavedWeekCutoff, getWeekDate, TOTAL_WEEKS } from "@/lib/semester";

const DEMO_STORAGE_KEY = "routine-demo-attendance-v1";
type SubjectStat = { code: string; name: string; present: number; absent: number; total: number; percentage: number };
type AttendanceResponse = { records: AttendanceRecord[]; currentWeek: number; cutoffDate: string; cutoffTime: string };

function readDemoRecords() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY) || "{}") as Record<string, AttendanceRecord>;
    return Object.values(stored);
  } catch { return []; }
}

function hasStarted(record: AttendanceRecord, cutoffDate: string, cutoffTime: string) {
  return record.attendanceDate < cutoffDate || (record.attendanceDate === cutoffDate && record.startTime <= cutoffTime);
}

export function AttendanceAnalytics({ demoMode = false }: { demoMode?: boolean }) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedCurrentWeek, setSelectedCurrentWeek] = useState(1);
  const [nextWeekStartDate, setNextWeekStartDate] = useState<string | null>(null);
  const [startWeek, setStartWeek] = useState(1);
  const [endWeek, setEndWeek] = useState(1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (demoMode) {
      setCurrentWeek(TOTAL_WEEKS); setSelectedCurrentWeek(TOTAL_WEEKS); setEndWeek(TOTAL_WEEKS); setSettingsLoaded(true); return;
    }

    let active = true;
    let lastServerWeek: number | null = null;
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("Could not load the saved current week.");
        const data = (await response.json()) as { currentWeek: number; nextWeekStartDate: string | null };
        if (!active) return;
        setCurrentWeek(data.currentWeek);
        setNextWeekStartDate(data.nextWeekStartDate);
        if (lastServerWeek === null) {
          setSelectedCurrentWeek(data.currentWeek);
          setEndWeek(data.currentWeek);
        } else {
          setSelectedCurrentWeek((week) => week === lastServerWeek ? data.currentWeek : week);
          setEndWeek((week) => week === lastServerWeek ? data.currentWeek : Math.min(week, data.currentWeek));
        }
        lastServerWeek = data.currentWeek;
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the saved current week.");
      } finally {
        if (active) setSettingsLoaded(true);
      }
    }

    loadSettings();
    const interval = window.setInterval(loadSettings, 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, [demoMode]);

  useEffect(() => {
    if (!settingsLoaded) return;
    let cancelled = false;
    setLoading(true); setError("");
    if (startWeek > endWeek) { setRecords([]); setError("Starting week must be before the ending week."); setLoading(false); return; }
    const startDate = getWeekDate(startWeek);
    const endDate = getWeekDate(endWeek, 4);
    if (demoMode) {
      const cutoff = getSavedWeekCutoff(currentWeek);
      setRecords(readDemoRecords().filter((record) => record.sessionType === "regular" && record.attendanceDate >= startDate && record.attendanceDate <= endDate && hasStarted(record, cutoff.cutoffDate, cutoff.cutoffTime)));
      setLoading(false); return;
    }
    fetch(`/api/attendance?from=${startDate}&to=${endDate}`)
      .then(async (response) => { if (!response.ok) throw new Error("Could not load attendance analytics."); return response.json(); })
      .then((data: AttendanceResponse) => { if (!cancelled) setRecords(data.records.filter((record) => record.sessionType === "regular" && hasStarted(record, data.cutoffDate, data.cutoffTime))); })
      .catch((requestError: Error) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentWeek, demoMode, endWeek, refreshKey, settingsLoaded, startWeek]);

  async function saveCurrentWeek() {
    setSaving(true); setSavedMessage(""); setError("");
    if (demoMode) { setCurrentWeek(selectedCurrentWeek); setEndWeek(selectedCurrentWeek); setSaving(false); setSavedMessage(`Week ${selectedCurrentWeek} saved.`); return; }
    try {
      const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentWeek: selectedCurrentWeek }) });
      if (!response.ok) throw new Error("Could not save the current week.");
      const data = (await response.json()) as { currentWeek: number; nextWeekStartDate: string | null };
      setCurrentWeek(data.currentWeek); setEndWeek(data.currentWeek); setStartWeek((week) => Math.min(week, data.currentWeek));
      setNextWeekStartDate(data.nextWeekStartDate);
      setSavedMessage(`Week ${data.currentWeek} saved. It will advance automatically next Saturday.`); setRefreshKey((key) => key + 1);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not save the current week."); }
    finally { setSaving(false); }
  }

  const subjects = useMemo(() => {
    const grouped = new Map<string, SubjectStat>();
    records.forEach((record) => {
      const current = grouped.get(record.courseCode) || { code: record.courseCode, name: record.courseName, present: 0, absent: 0, total: 0, percentage: 0 };
      current.total += 1;
      if (record.status === "present") current.present += 1; else current.absent += 1;
      current.percentage = Math.round((current.present / current.total) * 100); grouped.set(record.courseCode, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [records]);

  const savedWeekOptions = Array.from({ length: currentWeek }, (_, index) => index + 1);
  return (
    <section className="analytics-content">
      <div className="current-week-setting">
        <label><span>Current semester week</span><select value={selectedCurrentWeek} onChange={(event) => setSelectedCurrentWeek(Number(event.target.value))}>
          {Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1).map((week) => <option key={week} value={week}>Week {week}</option>)}
        </select></label>
        <button type="button" disabled={saving} onClick={saveCurrentWeek}>{saving ? "Saving…" : "Save current week"}</button>
        <small>
          Regular attendance counts Week 1 through Week {currentWeek}. {nextWeekStartDate
            ? `Week ${currentWeek + 1} starts automatically on ${nextWeekStartDate}.`
            : "Week 15 is the final semester week."}
        </small>
      </div>
      {savedMessage ? <p className="analytics-success" role="status">{savedMessage}</p> : null}
      <div className="date-filter">
        <label><span>Starting week</span><select value={startWeek} onChange={(event) => setStartWeek(Number(event.target.value))}>
          {savedWeekOptions.map((week) => <option key={week} value={week}>Week {week}</option>)}
        </select></label>
        <span className="date-arrow">→</span>
        <label><span>Ending week</span><select value={endWeek} onChange={(event) => setEndWeek(Number(event.target.value))}>
          {savedWeekOptions.map((week) => <option key={week} value={week}>Week {week}</option>)}
        </select></label>
        <small>Showing regular attendance from Week {startWeek} through Week {endWeek}.</small>
      </div>
      {error ? <p className="analytics-error" role="alert">{error}</p> : null}
      <section className="subject-section">
        <div className="subject-heading"><div><p>Selected period</p><h2>Regular Attendance by Subject</h2></div><span>{subjects.length} subjects</span></div>
        <div className="analytics-table-scroll"><table className="analytics-table">
          <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Total</th><th>Attendance</th></tr></thead>
          <tbody>{!loading && subjects.length === 0 ? <tr><td className="empty-analytics" colSpan={5}>No completed regular classes in this week range.</td></tr> : subjects.map((subject) => (
            <tr key={subject.code}><td><strong>{subject.name}</strong><small>{subject.code}</small></td><td className="present-number">{subject.present}</td><td className="absent-number">{subject.absent}</td><td>{subject.total}</td><td><div className="percentage-cell"><strong>{subject.percentage}%</strong><span><i style={{ width: `${subject.percentage}%` }} /></span></div></td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </section>
  );
}
