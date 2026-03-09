// /security?ref=code 로 오는 기존 파트너 추천 링크를 올바른 문의 폼으로 리다이렉트
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ ref?: string }>
}

export default async function SecurityPage({ searchParams }: Props) {
  const params = await searchParams
  const refParam = params.ref ? `?ref=${params.ref}` : ''
  redirect(`/inquiry/hanwha_vision${refParam}`)
}
