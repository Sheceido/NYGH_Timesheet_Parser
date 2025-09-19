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
export const DAYS_OF_THE_WEEK = ["Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri"];

export const WEEKEND_SHIFT_TIMES = [
    "08:00-16:00",
    "08:30-16:30",
    "10:00-18:00",
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
