'use client'

// 키퍼메이트 파트너 전용 공지 모달 — 개발 서버에서만 노출
// 조건: NODE_ENV=development + 한화비전(키퍼메이트) 프로그램 소속 파트너

import { useState, useEffect } from 'react'
import { useProgram } from '@/app/dashboard/ProgramContext'
import { X, ExternalLink, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

const STORAGE_KEY = 'referio_keeper_trend_2026_v1_seen'

export function KeeperTrendModal() {
  const { programs, loading } = useProgram()
  const [open, setOpen] = useState(false)

  // 개발 서버 + 키퍼메이트 파트너 + 미확인 시에만 표시
  useEffect(() => {
    if (loading) return
    if (process.env.NODE_ENV !== 'development') return

    const keeperProgram = programs.find(
      p => (p.advertisers as { company_name: string }).company_name === '한화비전'
    )
    if (!keeperProgram) return

    const alreadySeen = localStorage.getItem(STORAGE_KEY)
    if (alreadySeen) return

    setOpen(true)
  }, [loading, programs])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const keeperProgram = programs.find(
    p => (p.advertisers as { company_name: string }).company_name === '한화비전'
  )
  const referralCode = keeperProgram?.referral_code || ''
  const reportUrl = `https://keeper.ceo/2026-trend-report?REF=${referralCode}`

  return (
    <>
      {/* 딤 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md pointer-events-auto rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#111111' }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 상단 배지 */}
          <div className="px-6 pt-6 pb-0">
            <div className="inline-flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-orange-400 text-xs font-semibold">키퍼메이트 파트너 전용 공지</span>
            </div>

            <h2 className="text-white text-xl font-bold leading-tight mb-1">
              지금 가장 잘 되는 콘텐츠,
            </h2>
            <h2 className="text-orange-400 text-xl font-bold leading-tight mb-3">
              2026 창업 트렌드 리포트
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              이 리포트는 창업을 이미 고민 중인 분들이 찾아보는 콘텐츠입니다.
              내 추천 링크로 공유하면 <strong className="text-white">자연스럽게 실적이 쌓입니다.</strong>
            </p>
          </div>

          {/* 데이터 카드 */}
          <div className="px-6 mb-5">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-green-400 text-xs font-semibold mb-0.5">↑ 지금 뜨는 업종</p>
                  <p className="text-gray-200 text-sm">피부관리실 +28.8% · 무인매장 +22.3% · 특수음식점 +18.5%</p>
                </div>
              </div>
              <div className="border-t border-white/10" />
              <div className="flex items-start gap-3">
                <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-400 text-xs font-semibold mb-0.5">↓ 피해야 할 업종</p>
                  <p className="text-gray-200 text-sm">호프/주점 -12.4% · PC방 -9.7% · 세탁소 -8.2%</p>
                </div>
              </div>
              <div className="border-t border-white/10" />
              <div className="flex items-start gap-3">
                <BarChart3 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-purple-400 text-xs font-semibold mb-0.5">창업 5년 내 누적 폐업률 70%</p>
                  <p className="text-gray-200 text-sm">생존율은 업종보다 상권 선택이 결정</p>
                </div>
              </div>
            </div>
          </div>

          {/* 내 추천 링크 */}
          <div className="px-6 mb-5">
            <p className="text-gray-500 text-xs mb-2">📎 내 추천 코드가 담긴 링크</p>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="text-orange-300 text-xs font-mono truncate">
                keeper.ceo/2026-trend-report?REF=<strong className="text-yellow-300">{referralCode}</strong>
              </span>
              <button
                onClick={() => navigator.clipboard?.writeText(reportUrl)}
                className="text-gray-500 hover:text-orange-300 transition-colors shrink-0 text-xs"
              >
                복사
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6 flex gap-3">
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 transition-colors text-white text-sm font-bold py-3 rounded-xl"
            >
              리포트 열기
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={handleClose}
              className="flex-1 bg-white/5 hover:bg-white/10 transition-colors text-gray-400 text-sm py-3 rounded-xl"
            >
              나중에 보기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
