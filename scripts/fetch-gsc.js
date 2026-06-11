/**
 * Google Search Console 데이터 자동 수집 스크립트
 *
 * 이미 GA4 연동에 쓰는 서비스 계정 자격증명을 그대로 재사용한다.
 * (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)
 *
 * 사전 준비 (최초 1회):
 *   1) Google Search Console 속성 설정 > 사용자 및 권한 > 사용자 추가
 *      - 위 서비스 계정 이메일을 "전체" 또는 "제한됨" 권한으로 추가
 *   2) 프로젝트 루트에 .env.local 파일을 만들고 아래 값을 채운다.
 *      GOOGLE_SERVICE_ACCOUNT_EMAIL=...
 *      GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *      GSC_SITE_URL=https://hooninedev.com   (또는 sc-domain:hooninedev.com)
 *
 * 실행:
 *   node scripts/fetch-gsc.js
 *
 * 결과:
 *   .gsc-data/ 폴더에 CSV 4종(query/page × 최근28일/직전28일) 저장
 *   + 콘솔에 Quick Win / Cannibalization 후보 자동 분류 출력
 */

const fs = require('fs')
const path = require('path')
const { GoogleAuth } = require('google-auth-library')

// .env.local 우선 로드 (없으면 .env)
const envLocal = path.join(__dirname, '../.env.local')
const envDefault = path.join(__dirname, '../.env')
if (fs.existsSync(envLocal)) {
  require('dotenv').config({ path: envLocal })
} else if (fs.existsSync(envDefault)) {
  require('dotenv').config({ path: envDefault })
}

const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const siteUrl = process.env.GSC_SITE_URL || 'https://hooninedev.com'

const OUT_DIR = path.join(__dirname, '../.gsc-data')
const SEARCH_ANALYTICS_URL = (site) =>
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    site,
  )}/searchAnalytics/query`

// ---------- 날짜 유틸 ----------
function ymd(date) {
  return date.toISOString().slice(0, 10)
}

// GSC 데이터는 보통 2~3일 지연되므로 종료일을 3일 전으로 잡는다.
function getDateRanges() {
  const end = new Date()
  end.setDate(end.getDate() - 3)

  const recentEnd = new Date(end)
  const recentStart = new Date(end)
  recentStart.setDate(recentStart.getDate() - 27) // 28일

  const prevEnd = new Date(recentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - 27) // 직전 28일

  return {
    recent: { startDate: ymd(recentStart), endDate: ymd(recentEnd) },
    prev: { startDate: ymd(prevStart), endDate: ymd(prevEnd) },
  }
}

// ---------- 인증 ----------
async function getAccessToken() {
  if (!clientEmail || !privateKey) {
    console.error(
      '\n❌ 서비스 계정 자격증명이 없습니다. .env.local에 다음을 설정하세요:\n' +
        '   GOOGLE_SERVICE_ACCOUNT_EMAIL\n' +
        '   GOOGLE_PRIVATE_KEY\n',
    )
    process.exit(1)
  }

  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token
}

// ---------- API 호출 ----------
async function querySearchAnalytics(accessToken, { startDate, endDate, dimension }) {
  const res = await fetch(SEARCH_ANALYTICS_URL(siteUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: 1000,
      dataState: 'final',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC API 오류 (${res.status}): ${text}`)
  }

  const json = await res.json()
  return json.rows || []
}

// query+page 2차원 (cannibalization 탐지용)
async function queryByQueryAndPage(accessToken, { startDate, endDate }) {
  const res = await fetch(SEARCH_ANALYTICS_URL(siteUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 5000,
      dataState: 'final',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC API 오류 (${res.status}): ${text}`)
  }
  const json = await res.json()
  return json.rows || []
}

// ---------- CSV ----------
function toCsv(rows, dimensionName) {
  const header = `${dimensionName},impressions,clicks,ctr,position`
  const lines = rows.map((r) => {
    const key = (r.keys?.[0] || '').replace(/"/g, '""')
    return `"${key}",${r.impressions},${r.clicks},${(r.ctr * 100).toFixed(
      2,
    )},${r.position.toFixed(1)}`
  })
  return [header, ...lines].join('\n')
}

function writeCsv(filename, content) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const filePath = path.join(OUT_DIR, filename)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

// ---------- 분석 ----------
function analyzeQuickWins(queryRows) {
  // position 5~20 + 노출 높음 + CTR 낮음
  return queryRows
    .filter(
      (r) =>
        r.position >= 5 &&
        r.position <= 20 &&
        r.impressions >= 10 &&
        r.ctr < 0.05,
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
}

function analyzeCannibalization(queryPageRows) {
  // 같은 query에 URL 2개 이상 노출
  const byQuery = new Map()
  for (const r of queryPageRows) {
    const q = r.keys?.[0]
    const p = r.keys?.[1]
    if (!q || !p) continue
    if (!byQuery.has(q)) byQuery.set(q, [])
    byQuery.get(q).push({ page: p, impressions: r.impressions, position: r.position })
  }
  const result = []
  for (const [q, pages] of byQuery) {
    if (pages.length >= 2) {
      const totalImp = pages.reduce((s, x) => s + x.impressions, 0)
      if (totalImp >= 10) {
        result.push({ query: q, pages, totalImpressions: totalImp })
      }
    }
  }
  return result.sort((a, b) => b.totalImpressions - a.totalImpressions).slice(0, 15)
}

function fmtPct(n) {
  return `${(n * 100).toFixed(1)}%`
}

// ---------- 메인 ----------
async function main() {
  console.log('🔑 서비스 계정으로 GSC 인증 중...')
  const accessToken = await getAccessToken()

  const ranges = getDateRanges()
  console.log(`📊 사이트: ${siteUrl}`)
  console.log(
    `   최근 28일: ${ranges.recent.startDate} ~ ${ranges.recent.endDate}`,
  )
  console.log(`   직전 28일: ${ranges.prev.startDate} ~ ${ranges.prev.endDate}\n`)

  // 4종 + cannibalization용 1종 수집
  const [
    recentQuery,
    prevQuery,
    recentPage,
    prevPage,
    recentQueryPage,
  ] = await Promise.all([
    querySearchAnalytics(accessToken, { ...ranges.recent, dimension: 'query' }),
    querySearchAnalytics(accessToken, { ...ranges.prev, dimension: 'query' }),
    querySearchAnalytics(accessToken, { ...ranges.recent, dimension: 'page' }),
    querySearchAnalytics(accessToken, { ...ranges.prev, dimension: 'page' }),
    queryByQueryAndPage(accessToken, ranges.recent),
  ])

  // CSV 저장
  const files = [
    writeCsv('query_recent28.csv', toCsv(recentQuery, 'query')),
    writeCsv('query_prev28.csv', toCsv(prevQuery, 'query')),
    writeCsv('page_recent28.csv', toCsv(recentPage, 'page')),
    writeCsv('page_prev28.csv', toCsv(prevPage, 'page')),
  ]
  console.log('💾 CSV 저장 완료:')
  files.forEach((f) => console.log(`   ${path.relative(process.cwd(), f)}`))

  // ----- Quick Win -----
  const quickWins = analyzeQuickWins(recentQuery)
  console.log('\n🎯 Quick Win 후보 (position 5~20, 노출↑, CTR<5%):')
  if (quickWins.length === 0) {
    console.log('   (해당 없음 — 노출이 더 쌓여야 함)')
  } else {
    quickWins.forEach((r, i) => {
      console.log(
        `   ${i + 1}. "${r.keys[0]}" | 노출 ${r.impressions} | 클릭 ${
          r.clicks
        } | CTR ${fmtPct(r.ctr)} | 순위 ${r.position.toFixed(1)}`,
      )
    })
  }

  // ----- Cannibalization -----
  const canni = analyzeCannibalization(recentQueryPage)
  console.log('\n⚠️  Cannibalization 후보 (한 쿼리에 URL 2개+):')
  if (canni.length === 0) {
    console.log('   (해당 없음 — 글 수가 적어 정상)')
  } else {
    canni.forEach((c, i) => {
      console.log(`   ${i + 1}. "${c.query}" (총 노출 ${c.totalImpressions})`)
      c.pages
        .sort((a, b) => b.impressions - a.impressions)
        .forEach((p) =>
          console.log(
            `        - ${p.page} (노출 ${p.impressions}, 순위 ${p.position.toFixed(
              1,
            )})`,
          ),
        )
    })
  }

  // ----- 추이 요약 -----
  const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0)
  const recClicks = sum(recentQuery, 'clicks')
  const prevClicks = sum(prevQuery, 'clicks')
  const recImp = sum(recentQuery, 'impressions')
  const prevImp = sum(prevQuery, 'impressions')
  const delta = (a, b) =>
    b === 0 ? 'N/A' : `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(1)}%`

  console.log('\n📈 28일 추이 (최근 vs 직전):')
  console.log(
    `   클릭: ${recClicks} vs ${prevClicks} (${delta(recClicks, prevClicks)})`,
  )
  console.log(
    `   노출: ${recImp} vs ${prevImp} (${delta(recImp, prevImp)})`,
  )

  console.log('\n✅ 완료. .gsc-data/ 의 CSV를 확인하거나, 이 출력을 그대로 분석에 활용하세요.\n')
}

main().catch((err) => {
  console.error('\n❌ 실패:', err.message)
  if (/403|permission|forbidden/i.test(err.message)) {
    console.error(
      '\n👉 서비스 계정이 GSC 속성에 추가되지 않았을 수 있습니다.\n' +
        '   Search Console > 설정 > 사용자 및 권한 에서\n' +
        `   ${clientEmail} 를 사용자로 추가하세요.\n`,
    )
  }
  process.exit(1)
})
