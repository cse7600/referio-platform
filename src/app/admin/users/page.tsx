'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserPlus, Mail, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface UserRow {
  id: string
  email: string
  createdAt: string
  lastSignIn: string | null
  confirmed: boolean
  invitedAt: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/invite-user')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('이메일을 입력해주세요')
      return
    }

    setInviting(true)
    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`${inviteEmail}로 초대 이메일을 발송했습니다`)
        setInviteEmail('')
        fetchUsers()
      } else {
        toast.error(data.error || '초대 발송에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setInviting(false)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">유저 관리</h1>
        <p className="text-gray-500 mt-1">플랫폼 사용자 초대 및 관리</p>
      </div>

      {/* 유저 초대 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            새 유저 초대
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            이메일 주소로 초대장을 발송합니다. 초대받은 유저는 이메일의 링크를 통해 비밀번호를 설정하고 가입을 완료합니다.
          </p>
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="초대할 이메일 주소"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="max-w-sm"
            />
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              {inviting ? '발송 중...' : '초대장 발송'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 유저 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">전체 유저 ({users.length}명)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">유저가 없습니다</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>초대일</TableHead>
                  <TableHead>마지막 로그인</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      {u.confirmed ? (
                        <Badge className="bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          가입 완료
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          초대 대기
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(u.invitedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(u.lastSignIn)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
