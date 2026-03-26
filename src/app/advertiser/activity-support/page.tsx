'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Megaphone, LayoutList, Plus, Trash2, Eye, EyeOff, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import type { JSONContent } from '@tiptap/react'

const TiptapEditor = dynamic(
  () => import('@/components/editor/TiptapEditor'),
  { ssr: false, loading: () => <div className="h-[200px] border rounded-lg bg-slate-50 animate-pulse" /> }
)

const MarkdownRenderer = dynamic(
  () => import('@/components/editor/MarkdownRenderer'),
  { ssr: false, loading: () => <div className="h-10 animate-pulse bg-gray-100 rounded" /> }
)

interface Post {
  id: string
  title: string
  content: string
  post_type: 'announcement' | 'board'
  is_published: boolean
  created_at: string
}

export default function ActivitySupportPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'announcement' | 'board'>('announcement')
  const [composing, setComposing] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState<JSONContent | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/advertiser/activity-posts')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const filteredPosts = posts.filter((p) => p.post_type === activeTab)

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }

    // Check editor content is not empty
    const hasContent = editorContent?.content?.some(
      (node) => node.type !== 'paragraph' || (node.content && node.content.length > 0)
    )
    if (!editorContent || !hasContent) {
      toast.error('내용을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/advertiser/activity-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: JSON.stringify(editorContent),
          post_type: activeTab,
          is_published: true,
        }),
      })

      if (res.ok) {
        toast.success(activeTab === 'announcement' ? '공지사항이 등록되었습니다' : '게시글이 등록되었습니다')
        setNewTitle('')
        setEditorContent(null)
        setComposing(false)
        fetchPosts()
      } else {
        const data = await res.json()
        toast.error(data.error || '등록에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async (post: Post) => {
    try {
      const res = await fetch(`/api/advertiser/activity-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !post.is_published }),
      })

      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, is_published: !p.is_published } : p
          )
        )
        toast.success(post.is_published ? '비공개로 변경했습니다' : '공개로 변경했습니다')
      }
    } catch {
      toast.error('변경에 실패했습니다')
    }
  }

  const handleEditStart = (post: Post) => {
    setEditingId(post.id)
    setEditTitle(post.title)
    try {
      setEditContent(JSON.parse(post.content))
    } catch {
      setEditContent(null)
    }
    setExpandedId(null)
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle('')
    setEditContent(null)
  }

  const handleUpdate = async () => {
    if (!editingId || !editTitle.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    setUpdating(true)
    try {
      const res = await fetch(`/api/advertiser/activity-posts/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: JSON.stringify(editContent),
        }),
      })
      if (res.ok) {
        toast.success('수정되었습니다')
        setEditingId(null)
        setEditTitle('')
        setEditContent(null)
        fetchPosts()
      } else {
        const data = await res.json()
        toast.error(data.error || '수정에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/advertiser/activity-posts/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
        toast.success('삭제되었습니다')
      }
    } catch {
      toast.error('삭제에 실패했습니다')
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">파트너 활동 지원</h1>
        <p className="text-slate-500 mt-1">공지사항과 게시판을 통해 파트너에게 필요한 정보를 제공하세요</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as 'announcement' | 'board')
          setComposing(false)
          setNewTitle('')
          setEditorContent(null)
        }}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="announcement" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              공지사항
              {posts.filter((p) => p.post_type === 'announcement').length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {posts.filter((p) => p.post_type === 'announcement').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="board" className="flex items-center gap-2">
              <LayoutList className="w-4 h-4" />
              게시판
              {posts.filter((p) => p.post_type === 'board').length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {posts.filter((p) => p.post_type === 'board').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {!composing && (
            <Button
              onClick={() => setComposing(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'announcement' ? '공지 작성' : '게시글 작성'}
            </Button>
          )}
        </div>

        {/* Compose form with Tiptap */}
        {composing && (
          <Card className="mt-4 border-indigo-200">
            <CardHeader>
              <CardTitle className="text-base">
                {activeTab === 'announcement' ? '새 공지사항 작성' : '새 게시글 작성'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">제목</label>
                <Input
                  placeholder={activeTab === 'announcement' ? '공지사항 제목을 입력하세요' : '게시글 제목을 입력하세요'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">내용</label>
                <TiptapEditor
                  content={editorContent}
                  onChange={setEditorContent}
                  placeholder={activeTab === 'announcement'
                    ? '파트너에게 전달할 공지 내용을 입력하세요'
                    : '파트너에게 공유할 정보나 자료를 입력하세요'
                  }
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setComposing(false)
                    setNewTitle('')
                    setEditorContent(null)
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={saving || !newTitle.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {saving ? '저장 중...' : '등록'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <TabsContent value="announcement" className="mt-4">
          <PostList
            posts={filteredPosts}
            loading={loading}
            emptyText="등록된 공지사항이 없습니다"
            onTogglePublish={handleTogglePublish}
            onDelete={handleDelete}
            onEditStart={handleEditStart}
            formatDate={formatDate}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
            editingId={editingId}
            editTitle={editTitle}
            editContent={editContent}
            onEditTitleChange={setEditTitle}
            onEditContentChange={setEditContent}
            onEditCancel={handleEditCancel}
            onEditSave={handleUpdate}
            updating={updating}
          />
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <PostList
            posts={filteredPosts}
            loading={loading}
            emptyText="등록된 게시글이 없습니다"
            onTogglePublish={handleTogglePublish}
            onDelete={handleDelete}
            onEditStart={handleEditStart}
            formatDate={formatDate}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
            editingId={editingId}
            editTitle={editTitle}
            editContent={editContent}
            onEditTitleChange={setEditTitle}
            onEditContentChange={setEditContent}
            onEditCancel={handleEditCancel}
            onEditSave={handleUpdate}
            updating={updating}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PostList({
  posts,
  loading,
  emptyText,
  onTogglePublish,
  onDelete,
  onEditStart,
  formatDate,
  expandedId,
  onToggleExpand,
  editingId,
  editTitle,
  editContent,
  onEditTitleChange,
  onEditContentChange,
  onEditCancel,
  onEditSave,
  updating,
}: {
  posts: Post[]
  loading: boolean
  emptyText: string
  onTogglePublish: (post: Post) => void
  onDelete: (id: string) => void
  onEditStart: (post: Post) => void
  formatDate: (d: string) => string
  expandedId: string | null
  onToggleExpand: (id: string | null) => void
  editingId: string | null
  editTitle: string
  editContent: JSONContent | null
  onEditTitleChange: (v: string) => void
  onEditContentChange: (v: JSONContent | null) => void
  onEditCancel: () => void
  onEditSave: () => void
  updating: boolean
}) {
  if (loading) {
    return <div className="text-center py-12 text-slate-500">로딩 중...</div>
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">{emptyText}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const isExpanded = expandedId === post.id
        const isEditing = editingId === post.id
        return (
          <Card
            key={post.id}
            className={`${!isEditing ? 'cursor-pointer' : ''} ${!post.is_published ? 'opacity-60' : ''}`}
            onClick={() => !isEditing && onToggleExpand(isExpanded ? null : post.id)}
          >
            <CardContent className="p-4">
              {isEditing ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">제목</label>
                    <Input
                      value={editTitle}
                      onChange={(e) => onEditTitleChange(e.target.value)}
                      placeholder="제목을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">내용</label>
                    <TiptapEditor
                      content={editContent}
                      onChange={onEditContentChange}
                      placeholder="내용을 입력하세요"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={onEditCancel}>취소</Button>
                    <Button
                      size="sm"
                      onClick={onEditSave}
                      disabled={updating || !editTitle.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {updating ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">{post.title}</h3>
                        {!post.is_published && (
                          <Badge variant="secondary" className="text-xs shrink-0">비공개</Badge>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-slate-500 line-clamp-1">
                          {tryExtractPlainText(post.content)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">{formatDate(post.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEditStart(post)}
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onTogglePublish(post)}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title={post.is_published ? '비공개로 전환' : '공개로 전환'}
                      >
                        {post.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onDelete(post.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <MarkdownRenderer content={post.content} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Extract plain text from JSON content for preview
function tryExtractPlainText(content: string): string {
  try {
    const json = JSON.parse(content)
    const texts: string[] = []
    const walk = (node: { type?: string; text?: string; content?: unknown[] }) => {
      if (node.text) texts.push(node.text)
      if (node.content) (node.content as typeof node[]).forEach(walk)
    }
    walk(json)
    return texts.join(' ').slice(0, 100)
  } catch {
    return content.slice(0, 100)
  }
}
