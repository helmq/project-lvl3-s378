import travisTest from '../src';

test('travis test', () => {
  expect(travisTest(2)).toBe(2);
});
