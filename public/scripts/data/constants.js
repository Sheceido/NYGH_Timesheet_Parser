/** @type {import("../types.d.ts").AppMode} */
export const AppMode = Object.freeze({
    TIMESHEET: "#timesheetMakerMode",
    SCHEDULE_CHECK: "#scheduleCheckerMode",
});

/** @type {import("../types.d.ts").ShiftCategory} */
export const ShiftCategory = Object.freeze({
    DAY: "DAY",
    NOON: "NOON",
    AFTERNOON: "AFTERNOON",
    EVENING: "EVENING",
    NIGHT: "NIGHT",
    HEADER: "HEADER",
    STATUS: "STATUS",
    ABSENT: "ABSENT",
    ONCALL: "ON-CALL",
    NOTAVAILABLE: "NOTAVAILABLE",
    VACATION: "VACATION",
});

/** @type {import("../types.d.ts").AuditCode} */
export const AuditCode = Object.freeze({
    FTR_OVER_SCHEDULED: "FTR_OVER_SCHEDULED",
    FTR_UNDER_SCHEDULED: "FTR_UNDER_SCHEDULED",
    MALE_CONFLICT: "MALE_CONFLICT",
    DUPLICATE_EMPLOYEE: "DUPLICATE_EMPLOYEE",
    MULTIPLE_NAMES: "MULTIPLE_NAMES",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    EMPTY_SHIFT: "EMPTY_SHIFT",
    ON_CALL_MULTIPLE_NAMES: "ON_CALL_MULTIPLE_NAMES",
});

export const AuditEntryElementRefs = Object.freeze({
    FTR_OVER_SCHEDULED: "audit-employee-shift-count",
    FTR_UNDER_SCHEDULED: "audit-employee-shift-count",
    MALE_CONFLICT: "audit-shift-conflict",
    DUPLICATE_EMPLOYEE: "audit-shift-conflict",
    NOT_AVAILABLE: "audit-availability",
    EMPTY_SHIFT: "EMPTY_SHIFT",
    MULTIPLE_NAMES: "MULTIPLE_NAMES",
    ON_CALL_MULTIPLE_NAMES: "ON_CALL_MULTIPLE_NAMES",
});

export const AuditDescriptors = {
    [AuditCode.FTR_OVER_SCHEDULED]: { icon: "▲", header: "Too Many Shifts" },
    [AuditCode.FTR_UNDER_SCHEDULED]: { icon: "▼", header: "Missing Shifts" },
    [AuditCode.MALE_CONFLICT]: { icon: "♂️", header: "Evening Male Tech Conflicts" },
    [AuditCode.DUPLICATE_EMPLOYEE]: { icon: "⚠️", header: "Dulicate Shifts" },
    [AuditCode.NOT_AVAILABLE]: { icon: "🚫", header: "Not Available Conflicts" },
    [AuditCode.EMPTY_SHIFT]: { icon: "x", header: "Empty Shifts" },
    [AuditCode.MULTIPLE_NAMES]: { icon: "x", header: "Multiple Names in Cell" },
    [AuditCode.ON_CALL_MULTIPLE_NAMES]: { icon: "x", header: "Multiple Names in On-Call" },
}

/** @type {import("../types.d.ts").RowSemanticKind} */
export const RowSemanticKind = Object.freeze({
    HEADER: "HEADER",
    SHIFT: "SHIFT",
    INHERITED_SHIFT: "INHERITED_SHIFT",
    STATUS: "STATUS",
});

export const ErrorFieldsId = Object.freeze({
    TEXT_AREA: "#textAreaError",
    HOLIDAYS: "#holidaysError",
});

//Custom Event definitions
export const WARNING_BOX_CLICKED = "warning-box:click";
export const SHIFT_ERROR_CLICKED = "shift-error:click";

export const MODE_SELECTION_CHANGE = "mode-select-tab:change";
export const SYNC_PASTE_AREA = "paste-area:sync";
export const ANALYZE_SCHEDULE = "analyze-schedule-button:analyze";

export const WARNING_COLORS = {
    "red": "#FF0000",
    "lightRed": "#FACDCD",
    "lightYellow": "#FFFAC7",
    "vibrantYellow": "#FFF075",
    "lightBlue": "#72C0FF",
    "pastelTeal": "#B7FFEC",
};

export const NAMED_WARNING_COLORS = {
    "duplicate": "#FFF075",
    "unavailable": "#FACDCD",
    "evening": "#80BFF2",
}


export const FTR_HRS = 10;
export const BIWEEKLY = 14;
export const DAYS_OF_THE_WEEK = ["Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri"];

export const WEEKEND_LOCATIONS = [
    "GENERAL",
];

export const WEEKEND_SHIFT_TIMES = [
    "08:00-16:00",
    "08:30-16:30",
    "10:00-18:00",
    "16:00-24:00",
    "ON-CALL",
];

export const WEEKDAY_SHIFT_TIMES = [
    "07:00-15:00",
    "07:30-15:30",
    "08:00-16:00",
    "08:30-16:30",
    "09:00-17:00",
    "11:00-19:00",
    "12:00-20:00",
    "15:00-23:00",
    "16:00-24:00",
    "ON-CALL",
];

export const WEEKEND_DAYS = [1, 2, 8, 9];

export const DEFINED_SHIFTS_SET = new Set([
    "07:00-15:00",
    "07:30-15:30",
    "08:00-16:00",
    "08:30-16:30",
    "09:00-17:00",
    "10:00-18:00",
    "11:00-19:00",
    "12:00-20:00",
    "15:00-23:00",
    "16:00-24:00",
    "ON-CALL",
]);
