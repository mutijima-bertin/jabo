/* eslint-disable @typescript-eslint/no-unused-vars -- react-markdown v10 custom
   components receive a `node` prop that must be destructured out before the
   remaining props are spread onto the DOM element (documented pattern); the
   destructured `node` is intentionally unused. */
import ReactMarkdown from "react-markdown";

/**
 * Renders admin-authored markdown (body of a blog post) styled for the
 * cream/ink/brass design language. react-markdown does NOT emit raw HTML
 * unless rehype-raw is added, so unknown tags / scripts are escaped by
 * default — no extra sanitizer needed for admin-authored content.
 */
export function PostBody({ content }: { content: string }) {
  return (
    <div className="space-y-4">
      <ReactMarkdown
        components={{
          h2: ({ node, ...props }) => <h2 className="font-serif text-2xl font-semibold text-ink" {...props} />,
          h3: ({ node, ...props }) => <h3 className="font-serif text-xl font-semibold text-ink" {...props} />,
          h4: ({ node, ...props }) => <h4 className="font-serif text-lg font-semibold text-ink" {...props} />,
          p: ({ node, ...props }) => <p className="leading-relaxed text-ink/75" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc space-y-1.5 pl-5 text-ink/75" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal space-y-1.5 pl-5 text-ink/75" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          a: ({ node, ...props }) => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brass underline decoration-brass/40 underline-offset-2 transition hover:text-brass-dark"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => <strong className="font-semibold text-ink" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-brass/40 pl-4 italic text-ink/60" {...props} />
          ),
          code: ({ node, ...props }) => (
            <code className="rounded bg-cream-alt px-1.5 py-0.5 font-mono text-[0.875em] text-brass-dark" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="overflow-x-auto rounded-xl border border-ink/10 bg-cream-alt p-4 font-mono text-sm" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="border-ink/10" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}