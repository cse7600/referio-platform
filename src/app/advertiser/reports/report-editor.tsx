'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { useCallback, useEffect, useRef } from 'react'
import type { JSONContent } from '@tiptap/react'
import { StatBlockNode } from './stat-block-node'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Highlighter,
  Minus,
} from 'lucide-react'

interface ReportEditorProps {
  content?: JSONContent | null
  onChange?: (content: JSONContent) => void
}

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void
  isActive?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export default function ReportEditor({
  content,
  onChange,
}: ReportEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
      Placeholder.configure({ placeholder: '리포트 내용을 작성하세요...' }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'report-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      StatBlockNode,
    ],
    content: content || undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            uploadImage(file).then((url) => {
              if (url) {
                const { schema } = view.state
                const node = schema.nodes.image.create({ src: url })
                const pos = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                })
                if (pos) {
                  const tr = view.state.tr.insert(pos.pos, node)
                  view.dispatch(tr)
                }
              }
            })
            return true
          }
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              uploadImage(file).then((url) => {
                if (url) {
                  const { schema } = view.state
                  const node = schema.nodes.image.create({ src: url })
                  const tr = view.state.tr.replaceSelectionWith(node)
                  view.dispatch(tr)
                }
              })
            }
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON())
    },
  })

  // Sync external content changes (widget/block insertion)
  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON())
      const newJson = JSON.stringify(content)
      if (currentJson !== newJson) {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/board-image', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
    } catch (err) {
      console.error('Image upload failed:', err)
    }
    return null
  }, [])

  const handleImageButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !editor) return

      const url = await uploadImage(file)
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
      e.target.value = ''
    },
    [editor, uploadImage]
  )

  if (!editor) return null

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-slate-50 flex-wrap">
        <ToolbarButton
          title="Bold"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Highlight"
          isActive={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          title="Heading 1"
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          title="Bullet List"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered List"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          title="Align Left"
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align Center"
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align Right"
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          title="Insert Table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal Rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={handleImageButtonClick}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Table-specific styles */}
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
        .report-table .selectedCell {
          background-color: #eef2ff;
        }
        .ProseMirror .tableWrapper {
          overflow-x: auto;
        }
        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #6366f1;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
