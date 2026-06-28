import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  formatDateTime,
  formatDateLocal,
  DATE_TIME_FORMAT,
} from './format-date.ts';

/**
 * #174 regression: the formatter must be deterministic regardless of the
 * runtime timezone, otherwise SSR (UTC) and the browser (local) disagree near
 * midnight and React throws #418.
 *
 * We can only *fully* prove timezone-independence by running under a non-UTC
 * zone. `node --test` inherits TZ from the environment, so these assertions are
 * written to hold under ANY zone: a late-evening UTC timestamp must still render
 * its UTC calendar day, never the local one.
 */

const LATE_NIGHT_UTC = '2026-06-26T23:30:00.000Z'; // 26 Jun in UTC; 27 Jun in UTC+1

test('formatDate pins UTC: a late-UTC timestamp keeps its UTC calendar day', () => {
  // es-ES short date is D/M/Y. The day must be 26 (UTC), never 27 (UTC+).
  assert.equal(formatDate(LATE_NIGHT_UTC, 'es'), '26/6/2026');
});

test('formatDate maps en → en-GB (D/M/Y order)', () => {
  assert.equal(formatDate(LATE_NIGHT_UTC, 'en'), '26/06/2026');
});

test('formatDate keeps the UTC day even when caller overrides other options', () => {
  // Override format options but NOT timeZone → still UTC.
  const out = formatDate('2026-01-05T23:45:00.000Z', 'es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  assert.equal(out, '05/01/2026');
});

test('formatDate honours an explicit timeZone override', () => {
  // Caller explicitly asks for a +14 zone → day rolls to the 27th.
  const out = formatDate(LATE_NIGHT_UTC, 'es', {
    timeZone: 'Pacific/Kiritimati', // UTC+14
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  assert.equal(out, '27/6/2026');
});

test('formatDateTime renders deterministic UTC date + 24h time', () => {
  // 23:30 UTC → "26 jun, 23:30" (es), never the next local day.
  const out = formatDateTime(LATE_NIGHT_UTC, 'es');
  assert.match(out, /^26 \w+,?\.? 23:30$/);
});

test('formatDateTime uses the shared DATE_TIME_FORMAT preset (UTC, 24h)', () => {
  assert.equal(DATE_TIME_FORMAT.timeZone, 'UTC');
  assert.equal(DATE_TIME_FORMAT.hour12, false);
});

test('invalid input is returned verbatim (both UTC and local helpers)', () => {
  assert.equal(formatDate('not-a-date', 'es'), 'not-a-date');
  assert.equal(formatDateTime('', 'en'), '');
  assert.equal(formatDateLocal('nope', 'es'), 'nope');
});

test('formatDateLocal formats a valid date (zone is the runtime local zone)', () => {
  // We do not assert the exact day (depends on the runner's TZ); we only assert
  // it produced a D/M/Y-looking string and did not echo the raw ISO.
  const out = formatDateLocal('2026-06-26T12:00:00.000Z', 'es');
  assert.match(out, /^\d{1,2}\/\d{1,2}\/\d{4}$/);
  assert.notEqual(out, '2026-06-26T12:00:00.000Z');
});
