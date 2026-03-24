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
import { ShieldCheck, Mail, CheckCircle, Clock, Crown, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  email: string
  createdAt: string
  lastSignIn: string | null
  confirmed: boolean
  invitedAt: string | null
  isMaster: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
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
        if (data.existing) {
          toast.success(`${inviteEmail} 계정에 어드민 액세스를 부여했습니다`)
        } else {
          toast.success(`${inviteEmail}로 어드민 초대 이메일을 발송했습니다`)
        }
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

  const handleRevoke = async (userId: string, email: string) => {
    if (!confirm(`${email}의 어드민 액세스를 취소하시겠습니까?`)) return

    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('어드민 액세스가 취소되었습니다')
        fetchUsers()
      } else {
        toast.error(data.error || '액세스 취소에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
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
        <h1 className="text-2xl font-bold">어드민 액세스 관리</h1>
        <p className="text-gray-500 mt-1">Referio 마스터 패널 접근 권한을 관리합니다</p>
      </div>

      {/* 어드민 초대 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            어드민 초대
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            이메일 주소로 어드민 액세스를 부여합니다. 신규 이메일은 초대장을 발송하고, 기존 계정은 즉시 어드민 권한이 부여됩니다.
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
              {inviting ? '처리 중...' : '액세스 부여'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 어드민 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">어드민 목록 ({users.length}명)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">어드민이 없습니다</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>액세스 부여일</TableHead>
                  <TableHead>마지막 로그인</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      {u.isMaster ? (
                        <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1 w-fit">
                          <Crown className="w-3 h-3" />
                          마스터
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3" />
                          어드민
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.confirmed ? (
                        <Badge className="bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          활성
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          초대 대기
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(u.invitedAt || u.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(u.lastSignIn)}
                    </TableCell>
                    <TableCell>
                      {!u.isMaster && (
                        <button
                          onClick={() => handleRevoke(u.id, u.email || '')}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                          title="액세스 취소"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          취소
                        </button>
                      )}
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
