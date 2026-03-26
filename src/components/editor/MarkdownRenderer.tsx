'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

// Tiptap JSON → plain text 변환 (react-markdown 렌더링용)
function tiptapToMarkdown(content: string): string {
  try {
    const json = JSON.parse(content)
    const lines: string[] = []
    const walk = (node: { type?: string; text?: string; marks?: { type: string }[]; content?: unknown[]; attrs?: Record<string, unknown> }) => {
      if (node.type === 'heading') {
        const level = (node.attrs?.level as number) || 1
        const prefix = '#'.repeat(level)
        const texts: string[] = []
        if (node.content) (node.content as typeof node[]).forEach(n => n.text && texts.push(n.text as string))
        lines.push(`${prefix} ${texts.join('')}`)
      } else if (node.type === 'paragraph') {
        const texts: string[] = []
        if (node.content) (node.content as typeof node[]).forEach(n => {
          if (n.text) {
            const marks = (n.marks || []) as { type: string }[]
            let t = n.text as string
            if (marks.some((m) => m.type === 'bold')) t = `**${t}**`
            if (marks.some((m) => m.type === 'italic')) t = `*${t}*`
            texts.push(t)
          }
        })
        lines.push(texts.join('') || '')
      } else if (node.type === 'bulletList') {
        if (node.content) (node.content as typeof node[]).forEach(item => {
          const texts: string[] = []
          if (item.content) (item.content as typeof node[]).forEach(p => {
            if (p.content) (p.content as typeof node[]).forEach(n => n.text && texts.push(n.text as string))
          })
          lines.push(`- ${texts.join('')}`)
        })
      } else if (node.type === 'orderedList') {
        if (node.content) (node.content as typeof node[]).forEach((item, i) => {
          const texts: string[] = []
          if (item.content) (item.content as typeof node[]).forEach(p => {
            if (p.content) (p.content as typeof node[]).forEach(n => n.text && texts.push(n.text as string))
          })
          lines.push(`${i + 1}. ${texts.join('')}`)
        })
      } else if (node.type === 'blockquote') {
        if (node.content) (node.content as typeof node[]).forEach(n => {
          lines.push(`> ${(n as { text?: string }).text || ''}`)
        })
      } else if (node.type === 'horizontalRule') {
        lines.push('---')
      } else if (node.content) {
        (node.content as typeof node[]).forEach(walk)
      }
    }
    if (json.content) json.content.forEach(walk)
    return lines.join('\n\n')
  } catch {
    return content
  }
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Tiptap JSON이면 마크다운으로 변환 후 렌더링, 아니면 그대로 렌더링
  const markdown = isTiptapJSON(content) ? tiptapToMarkdown(content) : content

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
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
