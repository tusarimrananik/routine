export type SessionType = "regular" | "ct";
export type AttendanceStatus = "present" | "absent";

export type AttendanceInput = {
  attendanceDate: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  sessionType: SessionType;
  status?: AttendanceStatus;
};

export type AttendanceRecord = Required<AttendanceInput>;

export type AttendanceStat = {
  present: number;
  total: number;
  percentage: number;
};

export type AttendanceSummary = {
  overall: AttendanceStat;
  regular: AttendanceStat;
  ct: AttendanceStat;
};

export function attendanceKey(
  record: Pick<
    AttendanceInput,
    "attendanceDate" | "startTime" | "courseCode" | "sessionType"
  >,
) {
  return [
    record.attendanceDate,
    record.startTime,
    record.courseCode,
    record.sessionType,
  ].join("|");
}
