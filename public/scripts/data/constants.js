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

export const shiftTimeMap = new Map()
    .set("0700-1500", "07:00-15:00")
    .set("0730-1530", "07:30-15:30")
    .set("7:30-3:30", "07:30-15:30")
    .set("0800-1600", "08:00-16:00")
    .set("8:00-4:00", "08:00-16:00")
    .set("NEW! 0800-1600", "08:00-16:00")
    .set("0830-1630", "08:30-16:30")
    .set("0900-1700", "09:00-17:00")
    .set("9:00-5:00", "09:00-17:00")
    .set("9:00- 5:00", "09:00-17:00")
    .set("10:00-6:00PM", "10:00-18:00")
    .set("1100-7:00PM", "11:00-19:00")
    .set("12:00-8:00PM", "12:00-20:00")
    .set(`12:00-8:00PM ON CALL SHIFT`, "12:00-20:00")
    .set("3:00-11:00PM", "15:00-23:00")
    .set("4:00-12:00AM", "16:00-24:00")
    .set("ON-CALL", "ON-CALL");

export const categoryMap = new Map()
    .set("07:00-15:00", ShiftCategory.DAY)
    .set("07:30-15:30", ShiftCategory.DAY)
    .set("07:30-15:30", ShiftCategory.DAY)
    .set("08:00-16:00", ShiftCategory.DAY)
    .set("08:30-16:30", ShiftCategory.DAY)
    .set("09:00-17:00", ShiftCategory.DAY)
    .set("09:00-17:00", ShiftCategory.DAY)
    .set("10:00-18:00", ShiftCategory.DAY)
    .set("11:00-19:00", ShiftCategory.DAY)
    .set("12:00-20:00", ShiftCategory.NOON)

    .set("ON-CALL", ShiftCategory.ONCALL)

    .set("15:00-23:00", ShiftCategory.EVENING)
    .set("16:00-24:00", ShiftCategory.NIGHT)

    .set("VACATION", ShiftCategory.VACATION)
    .set("NOT AVAILABLE", ShiftCategory.NOTAVAILABLE)
    .set("ABSENT", ShiftCategory.ABSENT)

    .set("AVAILABLE", ShiftCategory.STATUS)
    .set("FLOAT", ShiftCategory.STATUS)
    .set("LIEU TIME", ShiftCategory.STATUS)
    .set("ML", ShiftCategory.STATUS)

export const locationMap = new Map()
    .set("BDC / BREAST", "BDC")
    .set("1100-7:00PM", "GENERAL")
    .set("CONSUMERS", "OCSC / CONSUMER")
    .set("AVAILABLE", "GENERAL")

export const cellColorSwatch = new Map()
    .set("BDC", {
        "07:30-15:30": "#FFD9FF",
        "08:00-16:00": "#FFD9FF",
        "09:00-17:00": "#FFD9FF",
    })
    .set("GENERAL", {
        "11:00-19:00": "#CCFFCC",
        "12:00-20:00": "#CCFFFF",
        "15:00-23:00": "#92D050",
        "16:00-24:00": "#99CCFF",
        "AVAILABLE": "#92D050",
        "VACATION": "#CCFFCC",
        "FLOAT": "#FFFF00",
        "LIEU TIME": "#99CCFF",
        "ABSENT": "#FF99CC",
        "NOT AVAILABLE": "#FF9900",
        "ML": "#c7c7c7",
    })

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
    EMPTY_SHIFT: "audit-empty-shifts",
    MULTIPLE_NAMES: "MULTIPLE_NAMES",
    ON_CALL_MULTIPLE_NAMES: "ON_CALL_MULTIPLE_NAMES",
});

export const AuditDescriptors = {
    [AuditCode.FTR_OVER_SCHEDULED]: { icon: "▲", header: "Too Many Shifts" },
    [AuditCode.FTR_UNDER_SCHEDULED]: { icon: "▼", header: "Missing Shifts" },
    [AuditCode.MALE_CONFLICT]: { icon: "♂️", header: "Evening Male Tech Conflicts" },
    [AuditCode.DUPLICATE_EMPLOYEE]: { icon: "⚠️", header: "Dulicate Shifts" },
    [AuditCode.NOT_AVAILABLE]: { icon: "🚫", header: "Not Available Conflicts" },
    [AuditCode.EMPTY_SHIFT]: { icon: "🔲", header: "Empty Shifts" },
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
export const ANALYZE_SCHEDULE = "analyze-schedule-button:analyze";

export const MODAL_CLOSE = "modal-schedule:close";
export const MODAL_OPEN = "modal-schedule:open";


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
export const FRIDAYS = [7, 14];
export const THURSDAYS = [6, 13];

/** DEPRECATING CONSTANTS */
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

