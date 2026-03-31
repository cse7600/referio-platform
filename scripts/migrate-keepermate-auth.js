/**
 * migrate-keepermate-auth.js
 *
 * 한화비전 키퍼메이트 파트너 96명에 대해:
 * 1. Supabase Auth 계정 생성 (email_confirm: true, 비밀번호 없음)
 * 2. partners.auth_user_id 연결
 *
 * 실행: node --env-file=.env.local scripts/migrate-keepermate-auth.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   실행 방법: node --env-file=.env.local scripts/migrate-keepermate-auth.js');
  process.exit(1);
}
const KEEPERMATE_ADVERTISER_ID = 'ab7da1e1-2bef-4065-8c84-88c037f2b4dc';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('=== 한화비전 키퍼메이트 파트너 Auth 마이그레이션 시작 ===\n');

  // 1. auth_user_id가 없는 파트너 전체 조회
  const { data: partners, error: fetchError } = await admin
    .from('partners')
    .select('id, name, email')
    .in(
      'id',
      // partner_programs에서 한화비전 파트너 ID만 필터
      (
        await admin
          .from('partner_programs')
          .select('partner_id')
          .eq('advertiser_id', KEEPERMATE_ADVERTISER_ID)
      ).data.map((r) => r.partner_id)
    )
    .is('auth_user_id', null);

  if (fetchError) {
    console.error('파트너 조회 실패:', fetchError.message);
    process.exit(1);
  }

  console.log(`대상 파트너: ${partners.length}명\n`);

  const results = { ok: [], alreadyExists: [], failed: [] };

  for (const partner of partners) {
    process.stdout.write(`처리 중: ${partner.name} (${partner.email}) ... `);

    // 2. Supabase Auth 계정 생성 (email_confirm: true)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: partner.email,
      email_confirm: true,  // 이메일 인증 완료 처리 (파스워드 재설정 메일 수신 가능하게)
      user_metadata: { name: partner.name },
    });

    let authUserId = null;

    if (createError) {
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        // 이미 Auth 계정이 있는 경우 → 기존 계정 찾아서 연결
        const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = existingList?.users?.find((u) => u.email === partner.email);
        if (existing) {
          authUserId = existing.id;
          results.alreadyExists.push({ name: partner.name, email: partner.email, authUserId });
          process.stdout.write(`기존 계정 연결 (${authUserId})\n`);
        } else {
          results.failed.push({ name: partner.name, email: partner.email, reason: '계정 조회 실패' });
          process.stdout.write(`실패 (기존 계정 찾을 수 없음)\n`);
          continue;
        }
      } else {
        results.failed.push({ name: partner.name, email: partner.email, reason: createError.message });
        process.stdout.write(`실패 (${createError.message})\n`);
        continue;
      }
    } else {
      authUserId = created.user.id;
      results.ok.push({ name: partner.name, email: partner.email, authUserId });
      process.stdout.write(`생성 완료 (${authUserId})\n`);
    }

    // 3. partners.auth_user_id 업데이트
    const { error: updateError } = await admin
      .from('partners')
      .update({ auth_user_id: authUserId })
      .eq('id', partner.id);

    if (updateError) {
      console.error(`  → auth_user_id 업데이트 실패: ${updateError.message}`);
    }
  }

  // 결과 요약
  console.log('\n=== 마이그레이션 완료 ===');
  console.log(`✅ 신규 생성: ${results.ok.length}명`);
  console.log(`🔗 기존 연결: ${results.alreadyExists.length}명`);
  console.log(`❌ 실패: ${results.failed.length}명`);

  if (results.failed.length > 0) {
    console.log('\n실패 목록:');
    results.failed.forEach((f) => console.log(`  - ${f.name} (${f.email}): ${f.reason}`));
  }
}

main().catch((e) => {
  console.error('예기치 않은 오류:', e);
  process.exit(1);
});
