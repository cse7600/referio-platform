'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import type { JSONContent } from '@tiptap/react'

interface TiptapViewerProps {
  content: JSONContent | string
}

export default function TiptapViewer({ content }: TiptapViewerProps) {
  // Parse string content (JSON stored as TEXT in DB)
  let jsonContent: JSONContent | undefined
  if (typeof content === 'string') {
    try {
      jsonContent = JSON.parse(content)
    } catch {
      // Plain text fallback — wrap in a paragraph
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
        heading: { levels: [1, 2] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
    ],
    content: jsonContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none',
      },
    },
  })

  if (!editor) return null

  return <EditorContent editor={editor} />
}
