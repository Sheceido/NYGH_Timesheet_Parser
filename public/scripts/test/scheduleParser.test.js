import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ScheduleParser } from '../modules/scheduleParser.js';

describe("scheduleParser Test:", () => {
    describe("String Grid Sizing", () => {
        it("returns 3 rows 3 columns when given 3x3 tsv string value", () => {
            const schedStr = "1\t2\t3\n1\t2\t3\n1\t2\t3"

            const parser = new ScheduleParser(schedStr);
            assert.deepEqual(parser.schedule,
                [["1", "2", "3",],
                ["1", "2", "3",],
                ["1", "2", "3",]]
            );
        });
    });

    describe("String cleaning/normalization", () => {
        it("Uppercases all strings in each cell", () => {
            const schedStr = `a\tb\tc\naba\taBa\tCaC`;

            const parser = new ScheduleParser(schedStr);
            assert.deepEqual(parser.schedule,
                [["A", "B", "C"],
                ["ABA", "ABA", "CAC"]]
            );
        });

        it("Removes unnecessary whitespaces", () => {
            const schedStr = `   a  \t      b      \tc      \na a\tb  b\tc   c  `;

            const parser = new ScheduleParser(schedStr);
            assert.deepEqual(parser.schedule,
                [["A", "B", "C"],
                ["A A", "B  B", "C   C"]]
            );
        });

        it("Replaces any newlines within quotations as a space, removes quotations", () => {
            const schedStr = `1\t2\n1"a\nb"\t2`;

            const parser = new ScheduleParser(schedStr);
            assert.deepEqual(parser.schedule,
                [["1", "2",],
                ["1A B", "2"]]
            );
        });
    });
});
