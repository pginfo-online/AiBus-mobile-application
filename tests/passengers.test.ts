import test from "node:test";
import assert from "node:assert/strict";
import {
  availableSeatIndex,
  passengerAge,
  validBirthDate,
  validGstin,
} from "../src/features/passengers/passengerModel.ts";
import { INDIAN_STATES } from "../src/features/passengers/indianStates.ts";
import { translations } from "../src/core/localization/translations.ts";

test("age changes on a birthday, including journey dates in another year", () => {
  const passenger = {
    dateOfBirth: "2000-11-15",
    age: null,
    ageRecordedOn: null,
  };
  assert.equal(passengerAge(passenger, new Date("2026-11-14T12:00:00")), 25);
  assert.equal(passengerAge(passenger, new Date("2026-11-15T12:00:00")), 26);
  assert.equal(
    passengerAge(
      { dateOfBirth: null, age: 28, ageRecordedOn: "2025-11-15" },
      new Date("2026-11-15T12:00:00"),
    ),
    29,
  );
});
test("invalid and future birthdays are rejected", () => {
  assert.equal(validBirthDate("2001-02-29"), false);
  assert.equal(validBirthDate("2000-02-29"), true);
  assert.equal(validBirthDate("2999-01-01"), false);
  assert.equal(validBirthDate(""), false);
});
test("deselection leaves occupied seats in place and finds compatible seats", () => {
  const seats = [
    { requiredGender: "F" as const },
    {},
    { requiredGender: "M" as const },
  ];
  assert.equal(availableSeatIndex(seats, [null, "asha", null], "M"), 2);
  assert.equal(availableSeatIndex(seats, [null, "asha", null], "O"), -1);
  assert.equal(availableSeatIndex(seats, ["asha", null, null], "O"), 1);
  assert.equal(availableSeatIndex(seats, [null, "asha", null], "F"), 0);
});
test("all 28 states and 8 union territories have localized labels and matching placeholders", () => {
  assert.equal(INDIAN_STATES.length, 36);
  for (const language of ["en", "hi", "mr"] as const) {
    for (const state of INDIAN_STATES)
      assert.ok(translations[language][`state.${state}`]);
    for (const key of Object.keys(translations.en).filter((key) =>
      key.startsWith("pax."),
    )) {
      assert.deepEqual(
        translations[language][key].match(/\{[^}]+\}/g)?.sort(),
        translations.en[key].match(/\{[^}]+\}/g)?.sort(),
      );
    }
  }
});
test("GSTIN validates structure rather than only length", () => {
  assert.equal(validGstin("27AAPFU0939F1ZV"), true);
  assert.equal(validGstin("ABCDEFGHIJKLMNO"), false);
});
