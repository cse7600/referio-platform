'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useEffect, useRef } from 'react'
import { marked } from 'marked'
import type { JSONContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ImageIcon,
} from 'lucide-react'

interface TiptapEditorProps {
  content?: JSONContent | null
  onChange?: (content: JSONContent) => void
  placeholder?: string
}

// Detect if plain text contains Markdown formatting patterns
function hasMarkdownPatterns(text: string): boolean {
  const patterns = [
    /^#{1,6}\s+/m,           // # Heading
    /\*\*[^*]+\*\*/,         // **bold**
    /\*[^*]+\*/,             // *italic*
    /^[-*+]\s+/m,            // - list item
    /^\d+\.\s+/m,            // 1. ordered list
    /^>\s+/m,                // > blockquote
    /`[^`]+`/,               // `inline code`
    /^```/m,                 // ```code block
    /\[([^\]]+)\]\([^)]+\)/, // [link](url)
  ]
  // Need at least 2 pattern matches to confidently identify as Markdown
  let matchCount = 0
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      matchCount++
      if (matchCount >= 2) return true
    }
  }
  return false
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

export default function TiptapEditor({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[200px] px-4 py-3',
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
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        // 1. Handle image paste
        const items = clipboardData.items
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                uploadImage(file).then((url) => {
                  if (url && editorRef.current) {
                    editorRef.current.chain().focus().setImage({ src: url }).run()
                  }
                })
              }
              return true
            }
          }
        }

        // 2. If HTML exists (Google Docs, Word, etc.), let Tiptap handle natively
        //    Tiptap's built-in HTML parsing already converts bold, italic, headings, lists etc.
        const html = clipboardData.getData('text/html')
        if (html && html.trim().length > 0) {
          return false
        }

        // 3. Plain text only — detect Markdown patterns and convert to rich text
        const plainText = clipboardData.getData('text/plain')
        if (plainText && hasMarkdownPatterns(plainText)) {
          event.preventDefault()
          try {
            const convertedHtml = marked.parse(plainText, {
              async: false,
              breaks: true,
            }) as string
            if (editorRef.current && convertedHtml) {
              editorRef.current.chain().focus().insertContent(convertedHtml).run()
            }
            return true
          } catch {
            // On conversion failure, fall through to default paste
            return false
          }
        }

        // 4. Default: let Tiptap handle plain text normally
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON())
    },
  })

  // Keep editorRef in sync
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Sync external content changes
  useEffect(() => {
    if (editor && content && !editor.isFocused) {
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
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [editor, uploadImage]
  )

  if (!editor) return null

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
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

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <ToolbarButton
          title="Heading 1"
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
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
    </div>
  )
}
