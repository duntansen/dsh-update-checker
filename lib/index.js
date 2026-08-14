/**
 * dsh-update-checker host entry: registers an HTTP route `/dsh-update-check`
 * returning local dsh version vs npm registry latest/next.
 *
 * 正式插件运行在真实 Node 环境：直接用全局 fetch 和 child_process，
 * 不需要 ctx.shell / 沙箱策略（那是动态插件沙箱的限制）。
 */
import { execFileSync } from 'node:child_process'

export const name = 'dsh-update-checker'

/** 简单语义化版本比较：正确处理 rc 预发布段 */
function parseVer(v) {
  const s = String(v || '').trim()
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(s)
  if (!m) return null
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [] }
}

function cmpPre(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y)
    if (xn && yn) return +x - +y
    if (xn) return -1
    if (yn) return 1
    return x < y ? -1 : 1
  }
  return 0
}

function compareVer(a, b) {
  const pa = parseVer(a), pb = parseVer(b)
  if (!pa || !pb) return 0
  if (pa.major !== pb.major) return pa.major - pb.major
  if (pa.minor !== pb.minor) return pa.minor - pb.minor
  if (pa.patch !== pb.patch) return pa.patch - pb.patch
  if (pa.pre.length && !pb.pre.length) return -1
  if (!pa.pre.length && pb.pre.length) return 1
  return cmpPre(pa.pre, pb.pre)
}

/** 本地版本：dsh --version（Windows 上是 dsh.ps1/cmd 包装，用 shell:true 执行命令字符串） */
function readLocal() {
  try {
    const out = execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'dsh --version'], {
      encoding: 'utf8',
      timeout: 20000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const t = String(out || '').trim()
    return t.split(/\r?\n/)[0].trim() || null
  } catch (e) {
    return null
  }
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'dsh-update-checker' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return null
  return res.json()
}

async function fetchLatest() {
  try {
    const j = await fetchJson('https://registry.npmjs.org/@deepseek-ai/dsh/latest')
    return j && typeof j.version === 'string' ? j.version : null
  } catch (e) {
    return null
  }
}

async function fetchNext() {
  try {
    const j = await fetchJson('https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags')
    return j && typeof j.next === 'string' ? j.next : null
  } catch (e) {
    return null
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

export function apply(ctx) {
  ctx.inject(['webServer'], (hostCtx) => {
    hostCtx.effect(() => hostCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-update-check',
      handler: async (request, response) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        const local = readLocal()
        const latest = await fetchLatest()
        const next = await fetchNext()
        sendJson(response, 200, {
          local,
          latest,
          next,
          hasUpdate: !!(local && latest && compareVer(latest, local) > 0),
          checkedAt: Date.now(),
        })
      },
    }), 'dsh-update-checker: route')
  })
}
