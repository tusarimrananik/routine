import type { AttendanceInput } from "@/lib/attendance";

export const TOTAL_WEEKS = 15;
const STORAGE_WEEK_ONE = new Date(Date.UTC(2000, 0, 1));

type RegularSessionTemplate = {
  dayOffset: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  alternatingWeekOnly?: boolean;
};

const REGULAR_SESSION_TEMPLATES: RegularSessionTemplate[] = [
  { dayOffset: 1, startTime: "11:40", endTime: "12:30", courseCode: "MATH 2213", courseName: "Mathematics" },
  { dayOffset: 1, startTime: "12:30", endTime: "13:20", courseCode: "HUM 2213", courseName: "Humanities" },
  { dayOffset: 1, startTime: "14:30", endTime: "16:00", courseCode: "CSE 2204", courseName: "Numerical Methods Lab", alternatingWeekOnly: true },
  { dayOffset: 2, startTime: "08:50", endTime: "09:40", courseCode: "CSE 2205", courseName: "Microprocessors" },
  { dayOffset: 2, startTime: "10:50", endTime: "12:30", courseCode: "CSE 2201", courseName: "Algorithm" },
  { dayOffset: 2, startTime: "12:30", endTime: "13:20", courseCode: "CSE 2203", courseName: "Numerical Methods" },
  { dayOffset: 2, startTime: "14:30", endTime: "16:00", courseCode: "CSE 2202", courseName: "Algorithm Lab" },
  { dayOffset: 3, startTime: "08:50", endTime: "09:40", courseCode: "CSE 2201", courseName: "Algorithm" },
  { dayOffset: 3, startTime: "09:40", endTime: "10:30", courseCode: "HUM 2213", courseName: "Humanities" },
  { dayOffset: 3, startTime: "10:50", endTime: "11:40", courseCode: "MATH 2213", courseName: "Mathematics" },
  { dayOffset: 3, startTime: "11:40", endTime: "13:20", courseCode: "CSE 2205", courseName: "Microprocessors" },
  { dayOffset: 3, startTime: "14:30", endTime: "16:00", courseCode: "CSE 2200", courseName: "Technical Writing Lab" },
  { dayOffset: 4, startTime: "08:50", endTime: "09:40", courseCode: "HUM 2213", courseName: "Humanities" },
  { dayOffset: 4, startTime: "09:40", endTime: "10:30", courseCode: "MATH 2213", courseName: "Mathematics" },
  { dayOffset: 4, startTime: "10:50", endTime: "13:20", courseCode: "CSE 2206", courseName: "Microprocessors Lab" },
  { dayOffset: 4, startTime: "14:30", endTime: "16:00", courseCode: "CSE 2203", courseName: "Numerical Methods" },
];

export function getWeekDate(week: number, dayOffset = 0) {
  const date = new Date(STORAGE_WEEK_ONE);
  date.setUTCDate(STORAGE_WEEK_ONE.getUTCDate() + ((week - 1) * 7) + dayOffset);
  return date.toISOString().slice(0, 10);
}

export function getRegularSessionsThroughWeek(currentWeek: number): AttendanceInput[] {
  const sessions: AttendanceInput[] = [];

  for (let week = 1; week <= currentWeek; week += 1) {
    REGULAR_SESSION_TEMPLATES
      .filter((session) => !session.alternatingWeekOnly || week % 2 !== 0)
      .forEach((session) => {
        sessions.push({
          attendanceDate: getWeekDate(week, session.dayOffset),
          startTime: session.startTime,
          endTime: session.endTime,
          courseCode: session.courseCode,
          courseName: session.courseName,
          sessionType: "regular",
        });
      });
  }

  return sessions;
}

export function getSavedWeekCutoff(currentWeek: number, now = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Dhaka",
  }).format(now).toLowerCase();
  const dayOffsets: Record<string, number> = {
    saturday: 0,
    sunday: 1,
    monday: 2,
    tuesday: 3,
    wednesday: 4,
    thursday: 5,
    friday: 6,
  };
  const dayOffset = dayOffsets[weekday] ?? 5;

  if (dayOffset > 4) {
    return {
      fromDate: getWeekDate(1),
      cutoffDate: getWeekDate(currentWeek, 5),
      cutoffTime: "00:00",
    };
  }

  const values: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Dhaka",
  }).formatToParts(now).forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return {
    fromDate: getWeekDate(1),
    cutoffDate: getWeekDate(currentWeek, dayOffset),
    cutoffTime: `${values.hour}:${values.minute}`,
  };
}
