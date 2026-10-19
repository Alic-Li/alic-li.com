import { expect, test } from 'bun:test';
import { slideDirection } from '../src/lib/navigation';
const url = (path: string) => new URL(path, 'https://alic-li.com');

test('workspace slides follow section order in both locales and on history navigation', () => {
  expect(slideDirection(url('/about'), url('/projects'), 'forward')).toBe(
    'left',
  );
  expect(slideDirection(url('/projects'), url('/about'), 'forward')).toBe(
    'right',
  );
  expect(slideDirection(url('/zh/lab/chat'), url('/zh/blog'), 'back')).toBe(
    'right',
  );
  expect(slideDirection(url('/'), url('/zh/projects'), 'forward')).toBe('left');
});
test('nested pages and unknown routes use browser history direction', () => {
  expect(slideDirection(url('/blog/article'), url('/blog'), 'back')).toBe(
    'right',
  );
  expect(slideDirection(url('/blog'), url('/zh/blog'), 'forward')).toBe('left');
  expect(slideDirection(url('/missing'), url('/'), 'back')).toBe('right');
});
