/**
 * Referio GTM Automated Setup Script
 *
 * Creates and publishes GTM configuration via API:
 *   - GA4 Configuration tag (All Pages)
 *   - 5 custom event triggers + GA4 Event tags
 *
 * Prerequisite: Add http://localhost:3001/callback to Google Cloud Console
 *   Console URL: https://console.cloud.google.com/apis/credentials
 *   → OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI에 추가
 */

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment before running
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.publish',
  'https://www.googleapis.com/auth/tagmanager.readonly',
].join(' ');

const GTM_CONTAINER_PUBLIC_ID = 'GTM-K7NZSXZ3';
const GA4_MEASUREMENT_ID = 'G-52G9C0DC1K';

// Referio core events
const EVENTS = [
  { name: 'inquiry_submit',       label: '상담 신청 제출 (핵심 전환)' },
  { name: 'partner_signup',       label: '파트너 신규 가입' },
  { name: 'partner_login',        label: '파트너 로그인' },
  { name: 'referral_link_copy',   label: '추천 링크 복사' },
  { name: 'advertiser_signup',    label: '광고주 가입' },
];

// ── OAuth2 flow ──────────────────────────────────────────────────────────────

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:3001');
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>인증 실패</h1><p>' + error + '</p>');
        server.close();
        reject(new Error('OAuth 거부됨: ' + error));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end('No code');
        server.close();
        reject(new Error('코드 없음'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h1 style="color:#22c55e">✅ 인증 완료!</h1>
          <p>터미널로 돌아가세요. GTM 설정이 자동으로 진행됩니다.</p>
        </body></html>
      `);
      server.close();

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });
        const tokens = await tokenRes.json();
        if (tokens.error) {
          reject(new Error(tokens.error_description || tokens.error));
          return;
        }
        resolve(tokens.access_token);
      } catch (err) {
        reject(err);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error('포트 3001이 이미 사용 중입니다. 다른 프로세스를 종료 후 다시 시도하세요.'));
      } else {
        reject(err);
      }
    });

    server.listen(3001, () => {
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log('\n🔐 브라우저에서 Google 계정으로 GTM 권한을 승인하세요.');
      console.log('   URL이 자동으로 열리지 않으면 아래 주소를 복사해 브라우저에 붙여넣으세요:\n');
      console.log('  ', authUrl, '\n');

      exec(`open "${authUrl}"`, (err) => {
        if (err) console.log('  (브라우저를 수동으로 열어주세요)');
      });
    });
  });
}

// ── GTM API helper ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function gtm(method, path, body, token, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`https://www.googleapis.com/tagmanager/v2${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const wait = attempt * 15000; // 15s, 30s, 45s
      console.log(`  ⏳ 요청 한도 초과. ${wait / 1000}초 대기 후 재시도 (${attempt}/${retries})...`);
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GTM API ${method} ${path} → ${res.status}\n${text}`);
    }

    // Polite delay between successful calls (stay under 30 req/min)
    await sleep(2500);
    return res.json();
  }
  throw new Error(`GTM API ${method} ${path} → 재시도 초과`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Referio GTM 자동 설정 스크립트 v1.0');
  console.log('═══════════════════════════════════════════');

  // 1. OAuth
  const token = await getAccessToken();
  console.log('✅ OAuth 인증 완료\n');

  // 2. Find container
  console.log('🔍 GTM 계정 및 컨테이너 검색 중...');
  const { account: accounts = [] } = await gtm('GET', '/accounts', null, token);

  let accountId, containerId;
  for (const acc of accounts) {
    const { container: containers = [] } = await gtm(
      'GET', `/accounts/${acc.accountId}/containers`, null, token
    );
    const found = containers.find(c => c.publicId === GTM_CONTAINER_PUBLIC_ID);
    if (found) {
      accountId = acc.accountId;
      containerId = found.containerId;
      break;
    }
  }

  if (!accountId) {
    throw new Error(
      `컨테이너 ${GTM_CONTAINER_PUBLIC_ID}를 찾을 수 없습니다.\n` +
      `이 Google 계정이 해당 GTM 컨테이너에 접근 권한이 있는지 확인하세요.`
    );
  }
  console.log(`✅ 컨테이너 발견 (account: ${accountId}, container: ${containerId})\n`);

  const base = `/accounts/${accountId}/containers/${containerId}`;

  // 3. Get default workspace
  const { workspace: workspaces = [] } = await gtm('GET', `${base}/workspaces`, null, token);
  if (!workspaces.length) throw new Error('워크스페이스를 찾을 수 없습니다.');
  const wsId = workspaces[0].workspaceId;
  const ws = `${base}/workspaces/${wsId}`;
  console.log(`📁 워크스페이스: ${workspaces[0].name} (${wsId})\n`);

  // 4. Cleanup existing [Referio] tags and triggers
  console.log('🧹 기존 [Referio] 태그/트리거 정리 중...');
  const { tag: existingTags = [] } = await gtm('GET', `${ws}/tags`, null, token);
  for (const t of existingTags.filter(t => t.name.startsWith('[Referio]'))) {
    console.log(`  삭제: ${t.name}`);
    await gtm('DELETE', `${ws}/tags/${t.tagId}`, null, token);
  }
  const { trigger: existingTriggers = [] } = await gtm('GET', `${ws}/triggers`, null, token);
  for (const t of existingTriggers.filter(t => t.name.startsWith('[Referio]'))) {
    console.log(`  삭제: ${t.name}`);
    await gtm('DELETE', `${ws}/triggers/${t.triggerId}`, null, token);
  }
  console.log('  ✅ 정리 완료\n');

  // 5. GA4 Configuration tag (fires on All Pages = built-in trigger 2147479553)
  console.log('🏷️  GA4 Configuration 태그 생성 중...');
  const configTag = await gtm('POST', `${ws}/tags`, {
    name: '[Referio] GA4 Configuration',
    type: 'gaawc',
    parameter: [
      { type: 'TEMPLATE', key: 'measurementId', value: GA4_MEASUREMENT_ID },
      { type: 'BOOLEAN',  key: 'sendPageView',   value: 'true' },
    ],
    firingTriggerId: ['2147479553'], // All Pages (built-in)
  }, token);
  console.log(`  ✅ ${configTag.name}\n`);

  // 6. Custom event triggers + GA4 Event tags
  for (const evt of EVENTS) {
    console.log(`🎯 ${evt.label} (${evt.name})`);

    // Trigger: Custom Event matching event name
    const trigger = await gtm('POST', `${ws}/triggers`, {
      name: `[Referio] Trigger - ${evt.name}`,
      type: 'CUSTOM_EVENT',
      customEventFilter: [
        {
          type: 'EQUALS',
          parameter: [
            { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
            { type: 'TEMPLATE', key: 'arg1', value: evt.name },
          ],
        },
      ],
    }, token);

    // GA4 Event tag
    const tag = await gtm('POST', `${ws}/tags`, {
      name: `[Referio] GA4 Event - ${evt.name}`,
      type: 'gaawe',
      parameter: [
        { type: 'TEMPLATE', key: 'measurementIdOverride', value: GA4_MEASUREMENT_ID },
        { type: 'TEMPLATE', key: 'eventName',             value: evt.name },
      ],
      firingTriggerId: [trigger.triggerId],
    }, token);

    console.log(`  Trigger: ${trigger.name} (id: ${trigger.triggerId})`);
    console.log(`  Tag:     ${tag.name}\n`);
  }

  // 7. Create version from workspace
  console.log('📦 컨테이너 버전 생성 중...');
  const versionResult = await gtm(
    'POST',
    `${ws}:create_version`,
    {
      name: 'v1.0 — Referio 핵심 이벤트',
      notes:
        'GA4 Configuration + 5 custom events:\n' +
        EVENTS.map(e => `  · ${e.name}`).join('\n'),
    },
    token
  );

  const versionId = versionResult.containerVersion?.containerVersionId;
  if (!versionId) throw new Error('버전 생성 실패: ' + JSON.stringify(versionResult));
  console.log(`✅ 버전 생성 완료 (version: ${versionId})\n`);

  // 8. Publish
  console.log('🚀 게시(Publish) 중...');
  await gtm('POST', `${base}/versions/${versionId}:publish`, null, token);

  console.log('\n═══════════════════════════════════════════');
  console.log('  ✅ GTM 설정 및 게시 완료!');
  console.log('═══════════════════════════════════════════');
  console.log(`  컨테이너:  ${GTM_CONTAINER_PUBLIC_ID}`);
  console.log(`  GA4 ID:    ${GA4_MEASUREMENT_ID}`);
  console.log(`  이벤트:`);
  for (const e of EVENTS) console.log(`    · ${e.name}`);
  console.log('\n  GA4 → 보고서 → 실시간에서 이벤트 수집을 확인하세요.');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
