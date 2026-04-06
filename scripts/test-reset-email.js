/**
 * test-reset-email.js
 *
 * 비밀번호 재설정 기능 테스트용 스크립트.
 * 최근 90일간 로그인하지 않은 파트너를 조회하거나,
 * 지정한 이메일에 재설정 메일을 발송한다.
 *
 * 실행 방법:
 *   node --env-file=.env.local scripts/test-reset-email.js
 *     → 비활성 파트너 목록만 출력 (기본 조회 모드)
 *
 *   node --env-file=.env.local scripts/test-reset-email.js --send a@b.com c@d.com
 *     → 지정한 이메일들에 재설정 메일 발송
 *
 *   node --env-file=.env.local scripts/test-reset-email.js --batch 5
 *     → 비활성 파트너 상위 5명에게 발송 (최대 10명 제한)
 *
 *   --local  플래그 추가 시 localhost:3000 API 호출 (기본: 운영 서버)
 */

const { createClient } = require('@supabase/supabase-js');

// ── 환경변수 ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY');
  console.error('   실행 시 --env-file=.env.local 플래그를 붙여주세요.');
  process.exit(1);
}

// ── 설정 ─────────────────────────────────────────────────────
const INACTIVE_DAYS = 90;
const BATCH_MAX = 10;
const DELAY_MS = 300;

// ── CLI 인자 파싱 ─────────────────────────────────────────────
const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const BASE_URL = isLocal ? 'http://localhost:3000' : 'https://referio.puzl.co.kr';
const RESET_API = `${BASE_URL}/api/auth/request-reset`;

const sendIdx = args.indexOf('--send');
const batchIdx = args.indexOf('--batch');

let mode = 'list'; // 'list' | 'send' | 'batch'
let sendEmails = [];
let batchCount = 0;

if (sendIdx !== -1) {
  mode = 'send';
  // --send 이후 -- 로 시작하지 않는 인자들을 이메일로 수집
  for (let i = sendIdx + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break;
    sendEmails.push(args[i]);
  }
  if (sendEmails.length === 0) {
    console.error('❌ --send 뒤에 이메일 주소를 1개 이상 입력하세요.');
    console.error('   예: --send a@b.com c@d.com');
    process.exit(1);
  }
} else if (batchIdx !== -1) {
  mode = 'batch';
  batchCount = parseInt(args[batchIdx + 1], 10);
  if (isNaN(batchCount) || batchCount < 1) {
    console.error('❌ --batch 뒤에 양수 숫자를 입력하세요. 예: --batch 5');
    process.exit(1);
  }
  if (batchCount > BATCH_MAX) {
    console.error(`❌ --batch 최대 ${BATCH_MAX}명까지만 허용됩니다. (입력값: ${batchCount})`);
    process.exit(1);
  }
}

// ── Supabase Admin 클라이언트 ─────────────────────────────────
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * auth.users에서 90일 이상 미로그인 유저를 조회한다.
 * listUsers()로 페이지네이션하며 전체를 가져온다.
 * 반환값: Map<auth_user_id, { email, lastSignIn: Date | null }>
 */
async function fetchInactiveAuthUsers() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

  const inactiveMap = new Map(); // auth_user_id → { email, lastSignIn }

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('auth.users 조회 실패:', error.message);
      break;
    }

    const users = data?.users || [];
    for (const u of users) {
      // last_sign_in_at 없거나 cutoff 이전이면 비활성으로 분류
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
      if (!lastSignIn || lastSignIn < cutoff) {
        inactiveMap.set(u.id, { email: u.email, lastSignIn });
      }
    }

    if (users.length < perPage) break;
    page++;
  }

  return inactiveMap;
}

/**
 * partners 테이블에서 비활성 유저에 해당하는 파트너 목록을 조회한다.
 * auth_user_id를 기준으로 inactiveMap과 교차한다.
 */
async function fetchInactivePartners(inactiveMap) {
  const { data: partners, error } = await admin
    .from('partners')
    .select('id, name, email, auth_user_id')
    .not('auth_user_id', 'is', null);

  if (error) {
    console.error('partners 조회 실패:', error.message);
    process.exit(1);
  }

  return partners
    .filter((p) => inactiveMap.has(p.auth_user_id))
    .map((p) => ({
      ...p,
      lastSignIn: inactiveMap.get(p.auth_user_id).lastSignIn,
    }));
}

/**
 * 비활성 파트너 목록을 출력한다.
 */
function printInactiveList(partners) {
  console.log(`\n📋 비활성 파트너 목록 (최근 ${INACTIVE_DAYS}일 미로그인)`);
  console.log('────────────────────────────────────────');

  if (partners.length === 0) {
    console.log('  (해당 파트너 없음)');
  } else {
    partners.forEach((p, i) => {
      const lastStr = p.lastSignIn
        ? p.lastSignIn.toISOString().slice(0, 10)
        : '없음';
      console.log(`${i + 1}. ${p.email} (마지막 로그인: ${lastStr})`);
    });
  }

  console.log(`\n총 ${partners.length}명`);
}

/**
 * request-reset API를 호출하여 재설정 메일을 발송한다.
 * API는 { email } 바디를 받는다고 가정한다.
 */
async function sendResetEmail(email) {
  const res = await fetch(RESET_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || body.message || JSON.stringify(body);
    } catch (_) {
      detail = `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }

  return true;
}

/**
 * 이메일 목록에 일괄 발송하고 결과를 출력한다.
 */
async function sendToEmails(emails) {
  console.log(`\n✉️  발송 중... (대상: ${emails.length}명, API: ${RESET_API})`);

  let successCount = 0;
  for (const email of emails) {
    process.stdout.write(`  → ${email} ... `);
    try {
      await sendResetEmail(email);
      process.stdout.write('✅ 성공\n');
      successCount++;
    } catch (err) {
      process.stdout.write(`❌ 실패: ${err.message}\n`);
    }
    if (email !== emails[emails.length - 1]) await sleep(DELAY_MS);
  }

  console.log(`\n완료: ${successCount}/${emails.length} 성공`);
}

// ── 메인 ──────────────────────────────────────────────────────
async function main() {
  console.log(`=== Referio 비밀번호 재설정 메일 테스트 스크립트 ===`);
  console.log(`모드: ${mode === 'list' ? '조회' : mode === 'send' ? '지정 발송' : `배치 발송 (${batchCount}명)`}`);
  if (mode !== 'list') {
    console.log(`서버: ${BASE_URL}`);
  }

  if (mode === 'list') {
    // ── 조회 모드 ────────────────────────────────────────────
    console.log('\n비활성 Auth 유저 조회 중...');
    const inactiveMap = await fetchInactiveAuthUsers();
    console.log(`비활성 Auth 계정: ${inactiveMap.size}명`);

    const partners = await fetchInactivePartners(inactiveMap);
    printInactiveList(partners);

    console.log('\n💡 발송하려면:');
    console.log('   --send email@a.com email@b.com   (지정 이메일)');
    console.log(`   --batch N                         (비활성 파트너 상위 N명, 최대 ${BATCH_MAX}명)`);
    return;
  }

  if (mode === 'send') {
    // ── 지정 발송 모드 ────────────────────────────────────────
    await sendToEmails(sendEmails);
    return;
  }

  if (mode === 'batch') {
    // ── 배치 발송 모드 ────────────────────────────────────────
    console.log('\n비활성 Auth 유저 조회 중...');
    const inactiveMap = await fetchInactiveAuthUsers();

    const partners = await fetchInactivePartners(inactiveMap);
    const targets = partners.slice(0, batchCount);

    if (targets.length === 0) {
      console.log('발송 대상 파트너가 없습니다.');
      return;
    }

    console.log(`\n발송 대상 (${targets.length}명):`);
    targets.forEach((p, i) => {
      const lastStr = p.lastSignIn ? p.lastSignIn.toISOString().slice(0, 10) : '없음';
      console.log(`  ${i + 1}. ${p.email} (마지막 로그인: ${lastStr})`);
    });

    await sendToEmails(targets.map((p) => p.email));
  }
}

main().catch((e) => {
  console.error('\n예기치 않은 오류:', e);
  process.exit(1);
});
