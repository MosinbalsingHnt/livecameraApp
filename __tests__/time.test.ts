import { makeSessionId, formatElapsed } from '../src/utils/time';

test('session id format', () => {
  expect(makeSessionId('PCMC-14', new Date(2026, 9, 29, 15, 30, 0))).toBe(
    'PCMC-14_20261029_153000',
  );
});

test('elapsed format', () => {
  expect(formatElapsed(65_000)).toBe('00:01:05');
});
