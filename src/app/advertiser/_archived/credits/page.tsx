'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, ArrowUpCircle, ArrowDownCircle, RotateCcw, Clock } from 'lucide-react'

interface Transaction {
  id: string
  type: 'charge' | 'deduct' | 'refund'
  amount: number
  balance_after: number
  description: string | null
  created_by: string | null
  created_at: string
}

const TYPE_CONFIG = {
  charge: { label: '충전', icon: ArrowUpCircle, color: 'text-green-600', bg: 'bg-green-50' },
  deduct: { label: '차감', icon: ArrowDownCircle, color: 'text-red-600', bg: 'bg-red-50' },
  refund: { label: '환불', icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-50' },
}

export default function CreditsPage() {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/advertiser/credits')
        if (res.ok) {
          const data = await res.json()
          setBalance(data.balance)
          setTransactions(data.transactions)
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold text-slate-900">크레딧 관리</h1></div>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">크레딧 관리</h1>
        <p className="text-slate-500 mt-1">충전 잔액과 사용 내역을 확인하세요</p>
      </div>

      {/* 잔액 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">보유 크레딧</p>
                <p className="text-3xl font-bold text-slate-900">
                  ₩{balance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-2">충전 안내</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              아래 계좌로 입금 후 담당자에게 연락주시면 세금계산서 발행과 함께 크레딧이 충전됩니다.
            </p>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-medium">기업은행 000-000000-00-000</p>
              <p className="text-slate-500">예금주: (주)레퍼리오</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 거래 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">거래 내역</CardTitle>
          <CardDescription>최근 50건의 크레딧 거래 내역</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">아직 거래 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const config = TYPE_CONFIG[tx.type]
                const Icon = config.icon
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                    <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tx.description || config.label}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(tx.created_at).toLocaleString('ko-KR')}
                        {tx.created_by && ` · ${tx.created_by}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${config.color}`}>
                        {tx.type === 'deduct' ? '-' : '+'}₩{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        잔액 ₩{tx.balance_after.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
