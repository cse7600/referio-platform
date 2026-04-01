'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dynamic from 'next/dynamic'

const TiptapViewer = dynamic(
  () => import('@/components/editor/TiptapViewer'),
  { ssr: false, loading: () => <div className="h-10 animate-pulse bg-gray-100 rounded" /> }
)

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Tiptap JSON인지 판별
function isTiptapJSON(content: string): boolean {
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' && parsed.type === 'doc'
  } catch {
    return false
  }
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Tiptap JSON content is rendered natively via TiptapViewer
  // to avoid GFM strikethrough misinterpretation (e.g. "100만원~300만원" → strikethrough)
  if (isTiptapJSON(content)) {
    return (
      <div className={`markdown-content ${className}`}>
        <TiptapViewer content={content} />
      </div>
    )
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-gray-900 mt-5 mb-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3 first:mt-0 pb-1 border-b border-gray-100">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-gray-700 mt-2 mb-1">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-gray-700 leading-7 mb-3 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 mb-4 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-4 pl-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => {
            // Check if content starts with emoji — skip bullet if so
            const text = Array.isArray(children) ? children[0] : children
            const startsWithEmoji = typeof text === 'string' && /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}✅❌⚠️💡🚀🎯💰🏆📊💳📢✔️👥📱💬🔄🎯]/u.test(text)
            if (startsWithEmoji) {
              return (
                <li className="text-sm text-gray-700 leading-7 list-none">
                  <span>{children}</span>
                </li>
              )
            }
            return (
              <li className="flex items-start gap-2 text-sm text-gray-700 leading-7">
                <span className="text-gray-400 shrink-0 mt-0.5">•</span>
                <span>{children}</span>
              </li>
            )
          },
          // 테이블
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-lg border border-gray-200">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-gray-700">{children}</td>
          ),
          // 코드
          code: ({ children, className: codeClass }) => {
            const isBlock = codeClass?.includes('language-')
            return isBlock ? (
              <code className="block bg-gray-900 text-green-400 rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto mb-3">
                {children}
              </code>
            ) : (
              <code className="bg-gray-100 text-indigo-600 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>
            )
          },
          pre: ({ children }) => (
            <pre className="mb-3">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-300 bg-indigo-50 pl-4 py-2 rounded-r-lg mb-3 text-sm text-indigo-800 italic">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="border-gray-200 my-4" />
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="rounded-lg max-w-full h-auto my-3 border border-gray-100"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
