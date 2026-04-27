import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";
import "./MessageRenderer.css";

export default function MessageRenderer({ content, isUser }) {
  if (isUser) {
    return <p className="md-user-text">{content}</p>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ node, ...props }) => <h1 className="md-h1" {...props} />,
        h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
        h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
        p: ({ node, ...props }) => <p className="md-p" {...props} />,
        ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
        ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
        li: ({ node, ...props }) => <li className="md-li" {...props} />,
        strong: ({ node, ...props }) => <strong className="md-strong" {...props} />,
        em: ({ node, ...props }) => <em className="md-em" {...props} />,
        code: ({ node, inline, className, ...props }) =>
          inline ? (
            <code className="md-inline-code" {...props} />
          ) : (
            <code className={`md-block-code ${className || ""}`} {...props} />
          ),
        blockquote: ({ node, ...props }) => <blockquote className="md-blockquote" {...props} />,
        table: ({ node, ...props }) => (
          <div className="md-table-wrap">
            <table className="md-table" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => <thead className="md-thead" {...props} />,
        th: ({ node, ...props }) => <th className="md-th" {...props} />,
        td: ({ node, ...props }) => <td className="md-td" {...props} />,
        hr: ({ node, ...props }) => <hr className="md-hr" {...props} />,
        a: ({ node, ...props }) => <a className="md-link" target="_blank" rel="noopener noreferrer" {...props} />,
      }}
    >
      {String(content || "")}
    </ReactMarkdown>
  );
}
