'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export default function PlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">요금제</h1>
        <p className="text-slate-500 mt-1">도입 관련 문의</p>
      </div>

      <Card className="max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            요금제는 별도 문의로 안내드립니다
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            비즈니스 규모와 운영 방식에 맞는 조건을 담당자가 직접 안내드립니다.
            아래 이메일로 문의해주세요.
          </p>
          <a href="mailto:referio@puzl.co.kr">
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <MessageSquare className="w-4 h-4" />
              referio@puzl.co.kr 문의하기
            </Button>
          </a>
          <p className="text-slate-400 text-xs mt-4">평일 09:00–18:00, 24시간 내 회신</p>
        </CardContent>
      </Card>
    </div>
  )
}
