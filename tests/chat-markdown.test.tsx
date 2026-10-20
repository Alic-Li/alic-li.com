import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ChatMarkdown from '../src/components/ChatMarkdown';

test('renders headings, ordered lists, GFM tables, code and math without raw HTML', () => {
  const html = renderToStaticMarkup(
    <ChatMarkdown>{`## A compact heading

1. First item
2. Second item

| Model | Size |
| --- | --- |
| RWKV | 3B |

Inline \`code\` and **bold**.

\`\`\`js
const value = 1 < 2;
\`\`\`

$$x^2$$

<script>alert('unsafe')</script>`}</ChatMarkdown>,
  );
  expect(html).toContain('<h2>A compact heading</h2>');
  expect(html).toContain('<ol>');
  expect(html).toContain('class="markdown-table"');
  expect(html).toContain('<td>3B</td>');
  expect(html).toContain('<code class="language-js">');
  expect(html).toContain('1 &lt; 2');
  expect(html).toContain('katex');
  expect(html).not.toContain('<script>');
});
