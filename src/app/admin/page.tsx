import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  FileCheck,
  Wallet,
  TrendingUp,
  Clock,
} from 'lucide-react';

export default async function AdminDashboardPage() {
  // Server-side auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  // Use service_role client — bypasses RLS
  const admin = createAdminClient();

  const [partnersRes, referralsRes, settlementsRes] = await Promise.all([
    admin.from('partners').select('id, status'),
    admin.from('referrals').select('id, is_valid, contract_status'),
    admin.from('settlements').select('id, status, amount'),
  ]);

  const partners = partnersRes.data || [];
  const referrals = referralsRes.data || [];
  const settlements = settlementsRes.data || [];

  const stats = {
    totalPartners: partners.length,
    pendingPartners: partners.filter(p => p.status === 'pending').length,
    approvedPartners: partners.filter(p => p.status === 'approved').length,
    totalReferrals: referrals.length,
    validReferrals: referrals.filter(r => r.is_valid === true).length,
    contractedReferrals: referrals.filter(r => r.contract_status === 'completed').length,
    totalSettlements: settlements.length,
    pendingSettlements: settlements.filter(s => s.status === 'pending').length,
    completedSettlements: settlements.filter(s => s.status === 'completed').length,
    totalSettlementAmount: settlements.reduce((sum, s) => sum + (s.amount || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-gray-500 mt-1">전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* 파트너 현황 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          파트너 현황
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">전체 파트너</p>
                  <p className="text-2xl font-bold">{stats.totalPartners}명</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">승인 대기</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingPartners}명</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">승인 완료</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approvedPartners}명</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 피추천인 현황 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-600" />
          피추천인 현황
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">전체 DB</p>
                  <p className="text-2xl font-bold">{stats.totalReferrals}건</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">유효 DB</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.validReferrals}건</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">계약 완료</p>
                  <p className="text-2xl font-bold text-green-600">{stats.contractedReferrals}건</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 정산 현황 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-orange-600" />
          정산 현황
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">전체 정산</p>
                  <p className="text-2xl font-bold">{stats.totalSettlements}건</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">대기 중</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingSettlements}건</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">완료</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedSettlements}건</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-500">총 정산액</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₩{(stats.totalSettlementAmount || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
