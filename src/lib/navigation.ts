const sections = ['', 'about', 'blog', 'projects', 'publications', 'lab'];
const sectionIndex = (url: URL) => {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] === 'zh') segments.shift();
  return sections.indexOf(segments[0] || '');
};

export function slideDirection(from: URL, to: URL, historyDirection: string) {
  const previous = sectionIndex(from);
  const next = sectionIndex(to);
  if (previous !== next && previous >= 0 && next >= 0)
    return next > previous ? 'left' : 'right';
  return historyDirection === 'back' ? 'right' : 'left';
}
