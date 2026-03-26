'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PartnerProgram, Partner } from '@/types/database'

interface ProgramWithAdvertiser extends PartnerProgram {
  advertisers: {
    id: string
    company_name: string
    program_name: string | null
    logo_url: string | null
    primary_color: string | null
    landing_url: string | null
  }
}

interface ProgramContextType {
  partner: Partner | null
  programs: ProgramWithAdvertiser[]
  selectedProgram: ProgramWithAdvertiser | null
  selectProgram: (programId: string) => void
  loading: boolean
  refresh: () => Promise<void>
}

const ProgramContext = createContext<ProgramContextType>({
  partner: null,
  programs: [],
  selectedProgram: null,
  selectProgram: () => {},
  loading: true,
  refresh: async () => {},
})

// partner + programs를 한 번에 가져와서 공유 — 중복 DB 조회 제거
export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [programs, setPrograms] = useState<ProgramWithAdvertiser[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // partner 조회 후 programs 병렬 조회 가능한 구조로
    const { data: partnerData } = await supabase
      .from('partners')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    setPartner(partnerData as Partner | null)

    if (partnerData) {
      const { data: progs } = await supabase
        .from('partner_programs')
        .select(`
          *,
          advertisers!inner(
            id,
            company_name,
            program_name,
            logo_url,
            primary_color,
            landing_url
          )
        `)
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false })

      if (progs) setPrograms(progs as unknown as ProgramWithAdvertiser[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // localStorage에서 선택된 프로그램 복원
  useEffect(() => {
    const saved = localStorage.getItem('selectedProgramId')
    if (saved) setSelectedProgramId(saved)
  }, [])

  // 프로그램 로드 후 선택 유효성 확인
  useEffect(() => {
    if (programs.length > 0 && selectedProgramId) {
      const valid = programs.find(p => p.id === selectedProgramId)
      if (!valid) {
        const approved = programs.find(p => p.status === 'approved')
        const newId = approved?.id || programs[0].id
        setSelectedProgramId(newId)
        localStorage.setItem('selectedProgramId', newId)
      }
    } else if (programs.length > 0 && !selectedProgramId) {
      const approved = programs.find(p => p.status === 'approved')
      if (approved) {
        setSelectedProgramId(approved.id)
        localStorage.setItem('selectedProgramId', approved.id)
      }
    }
  }, [programs, selectedProgramId])

  const selectProgram = (programId: string) => {
    setSelectedProgramId(programId)
    localStorage.setItem('selectedProgramId', programId)
  }

  const selectedProgram = programs.find(p => p.id === selectedProgramId) || null

  return (
    <ProgramContext.Provider
      value={{ partner, programs, selectedProgram, selectProgram, loading, refresh: fetchAll }}
    >
      {children}
    </ProgramContext.Provider>
  )
}

export function useProgram() {
  return useContext(ProgramContext)
}
