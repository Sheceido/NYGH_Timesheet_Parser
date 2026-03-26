export type Employee = {
    first_name: string;
    str_alias: string;
    abbrev: string;
    gender: "M" | "F";
}

export type Roster = {
    [full_name: string]: Employee;
}

export type Shift = {
    id: string;
    names: string[];
    employee: Employee | null;
    weekday: number;
    date: string;
    location: string;
    shiftTime: string;
    rowKind: RowSemanticKind;
    category: ShiftCategory;
}

export type Weekday = number;

export type StandbyHours = number;

export type StandbyHoursMap = Map<Weekday, StandbyHours>

export type ShiftOrigin = Map<string, { row: number, col: number }>

export type RowSemanticKind =
    | "HEADER"
    | "SHIFT"
    | "STATUS"
    | "INHERITED_SHIFT";


export type RowSemantic = {
    row: number;
    location: string;
    kind: RowSemanticKind;
    value: string;
}

export type AppMode =
    | "#timesheetMakerMode"
    | "#scheduleCheckerMode";

export type ShiftCategory =
    | "DAY"
    | "NOON"
    | "AFTERNOON"
    | "EVENING"
    | "NIGHT"
    | "HEADER"
    | "STATUS"
    | "ABSENT"
    | "ON-CALL"
    | "NOTAVAILABLE"
    | "VACATION";


export type AuditCode =
    | "FTR_OVER_SCHEDULED"
    | "FTR_UNDER_SCHEDULED"
    | "MALE_CONFLICT"
    | "DUPLICATE_EMPLOYEE"
    | "MULTIPLE_NAMES"
    | "NOT_AVAILABLE"
    | "EMPTY_SHIFT"
    | "ON_CALL_MULTIPLE_NAMES";

export type AuditEntry = {
    code: AuditCode;
    severity: "INFO" | "WARNING" | "ERROR";
    employees: Employee[];
    shifts: Shift[];
    message: string;
    expectedShiftCount?: number; //defined for FTR_OVER_SCHEDULED/FTR_UNDER_SCHEDULED only
    duplicateCount?: number; //defined for FTR_OVER_SCHEDULED/FTR_UNDER_SCHEDULED only
}

export type Period = {
    weekday: number;
    hours: number;
}

export type EmployeeMetrics = {
    employee: Employee;
    scheduledShifts: Shift[];
    standbyHrs: StandbyHoursMap | null;
}

export type ScheduleAuditReport = {
    validationIssues: AuditEntry[];
    employeeMetrics: EmployeeMetrics[];
}

export type TimesheetColumn = {
    shiftId: number,
    shiftTime: string,
    standby: number,
    location: string,
}

export type InputError = {
    errorField: string;
    message: string;
}

export type ValidationError = {
    code: string;
    message: string;
}

export type AuditEntriesSet = {
    icon: string;
    header: string;
    auditEntries: AuditEntry[];
}

export type ScheduleRenderDataset = {
    header: string[];
    rowSemantics: RowSemantic[];
    shifts: Shift[];
    shiftOrigin: ShiftOrigin;
}
