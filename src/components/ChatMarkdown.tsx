import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** Chat uses compact typography; article heading sizes do not apply here. */
export default function ChatMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      skipHtml
      components={{
        table: ({ node: _node, ...props }) => (
          <div className="markdown-table">
            <table {...props} />
          </div>
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
