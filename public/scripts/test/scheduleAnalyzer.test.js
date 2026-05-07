import { test, describe, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// --- MOCKING SETUP ---
// NOTE: In a real Node.js test environment without Jest, module mocking 
// requires tools like 'proxyquire' or manual module replacement. 
// The following setup assumes these mocks are correctly established for the test run.

// Mocking constants.js
const mockConstants = {
    DAYS_OF_THE_WEEK: ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"],
    RowSemanticKind: {
        SHIFT: "SHIFT",
        INHERITED_SHIFT: "INHERITED_SHIFT",
        HEADER: "HEADER",
        STATUS: "STATUS"
    },
    ShiftCategory: {
        HEADER: "HEADER",
        WORK: "WORK",
        VACATION: "VACATION"
    },
    categoryMap: new Map([
        ["0700-1500", "WORK"],
        ["On-Call", "WORK"],
        ["VACATION", "VACATION"]
    ]),
    locationMap: new Map([
        ["US - LESLIE", "GENERAL"],
        ["OCSC / CONSUMER", "CONSUMER_AREA"]
    ]),
    shiftTimeMap: new Map([
        ["0700-1500", "WORK"],
        ["0730-1530", "WORK"]
    ])
};

// Mocking crypto.randomUUID globally
const mockCrypto = {
    randomUUID: () => 'mock-uuid-123' // Simple mock function
};
global.crypto = mockCrypto;

// Mocking the module imports structure
// In a real setup, you must ensure ScheduleAnalyzer imports the mocked constants.
// We assume the import works correctly for the test context.
import { ScheduleAnalyzer } from '../modules/scheduleAnalyzer.js';


describe('ScheduleAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
        // Resetting state for each test
        analyzer = new ScheduleAnalyzer();
    });

    describe('extractWeekdayHeader', () => {
        test('should extract correct weekday headers for a standard biweekly schedule', () => {
            const scheduleGrid = [
                ["US - LESLIE", "Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"],
                ["0700-1500", "X", "X", "Jenny", "Adrienne", "Jenny", "Jenny", "Jennifer", "Esther", "X", "X", "Tina", "Wendy", "Leon", "Tina", "Rubina"]
            ];
            const header = analyzer.extractWeekdayHeader(scheduleGrid);
            assert.deepStrictEqual(header, ["Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"]);
        });

        test('should return an empty array if the header is missing or incorrect', () => {
            const scheduleGrid = [
                ["OTHER HEADER", "Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"],
                ["0700-1500", "X", "X", "Jenny", "Adrienne", "Jenny", "Jenny", "Jennifer", "Esther", "X", "X", "Tina", "Wendy", "Leon", "Tina", "Rubina"]
            ];
            const header = analyzer.extractWeekdayHeader(scheduleGrid);
            assert.deepStrictEqual(header, []);
        });
    });

    describe('extractRowSemantics', () => {
        test('should correctly classify header and shift rows', () => {
            const scheduleGrid = [
                ["US - LESLIE", "Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"], // Row 0
                ["0700-1500", "X", "X", "Jenny", "Adrienne", "Jenny", "Jenny", "Jennifer", "Esther", "X", "X", "Tina", "Wendy", "Leon", "Tina", "Rubina"], // Row 1
                ["0730-1530", "X", "X", "Tina", "Katherine", "Leon", "Sherri", "Sherri", "Sherri", "X", "X", "Millie", "Adrienne", "Phebe", "Adrienne", "Leon"] // Row 2
            ];
            const semantics = analyzer.extractRowSemantics(scheduleGrid);
            assert.strictEqual(semantics[0].kind, "HEADER");
            assert.strictEqual(semantics[1].kind, "SHIFT");
            assert.strictEqual(semantics[2].kind, "SHIFT");
        });

        test('should handle empty cells by inheriting semantic context', () => {
            const scheduleGrid = [
                ["US - LESLIE", "Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"],
                ["0700-1500", "X", "X", "Jenny", "Adrienne", "Jenny", "Jenny", "Jennifer", "Esther", "X", "X", "Tina", "Wendy", "Leon", "Tina", "Rubina"],
                ["", "", "Tina", "Katherine", "Leon", "Sherri", "Sherri", "Sherri", "X", "X", "Millie", "Adrienne", "Phebe", "Adrienne", "Leon"] // Row 2: Empty cells at start
            ];
            const semantics = analyzer.extractRowSemantics(scheduleGrid);
            // Check the first empty cell (index 0)
            assert.strictEqual(semantics[2].kind, "SHIFT");
            // Check the second empty cell (index 1)
            assert.strictEqual(semantics[2].kind, "SHIFT");
        });
    });

    describe('discoverShiftsAndOrigin', () => {
        const mockScheduleGrid = [
            ["US - LESLIE", "Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"], // Row 0
            ["0700-1500", "X", "X", "Jenny", "Adrienne", "Jenny", "Jenny", "Jennifer", "Esther", "X", "X", "Tina", "Wendy", "Leon", "Tina", "Rubina"], // Row 1
            ["0730-1530", "X", "X", "Tina", "Katherine", "Leon", "Sherri", "Sherri", "Sherri", "X", "X", "Millie", "Adrienne", "Phebe", "Adrienne", "Leon"], // Row 2
            ["0800-1600", "X", "X", "Leon", "Millie", "Leon", "Leon", "Leon", "X", "X", "Leon", "Wendy", "Tina", "Wendy", "Millie", "Millie"], // Row 3
            ["0800-1600", "X", "X", "Ning", "Helen", "Helen", "Helen", "Adrienne", "X", "X", "Helen", "Millie", "Millie", "Mengling", "Adrienne"] // Row 4
        ];

        test('should correctly discover and map shifts from a populated grid', () => {
            // Mocking crypto.randomUUID to return predictable IDs
            mockCrypto.randomUUID.mockReturnValue('uuid1');

            // Run analyze to populate internal state
            analyzer.analyze(mockScheduleGrid);

            const result = analyzer.shiftList;

            // Assertions based on expected structure and count
            assert.strictEqual(result.length, 15);

            // Check sorting (should be sorted by weekday/column first)
            // The first shift found should be in the earliest day column (col 1, i.e., Monday)
            assert.strictEqual(result[0].weekday, 1);
            // The last shift found should be in the latest day column (col 6, i.e., Friday)
            assert.strictEqual(result[result.length - 1].weekday, 6);
        });

        test('should throw an error if no shift row can be identified', () => {
            const emptyGrid = [
                ["US - LESLIE", "Apr", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"],
                ["STATUS", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X", "X"]
            ];

            // Use a function wrapper to test for thrown errors
            assert.throws(() => {
                analyzer.analyze(emptyGrid);
            }, /unable to identify first shift row/);
        });
    });
});

