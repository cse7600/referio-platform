'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import type { JSONContent } from '@tiptap/react'

interface ReportViewerProps {
  content: JSONContent | string
}

export default function ReportViewer({ content }: ReportViewerProps) {
  let jsonContent: JSONContent | undefined
  if (typeof content === 'string') {
    try {
      jsonContent = JSON.parse(content)
    } catch {
      jsonContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: content }],
          },
        ],
      }
    }
  } else {
    jsonContent = content
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        HTMLAttributes: { class: 'report-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: jsonContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none',
      },
    },
  })

  if (!editor) return null

  return (
    <>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .report-table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        .report-table td,
        .report-table th {
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          min-width: 80px;
          vertical-align: top;
        }
        .report-table th {
          background-color: #f8fafc;
          font-weight: 600;
          text-align: left;
        }
      `}</style>
    </>
  )
}
