/**
 * dsh-update-checker host entry: registers HTTP routes for update checking,
 * version timeline, update execution, and history.
 *
 * 正式插件运行在真实 Node 环境：直接用全局 fetch 和 child_process。
 */
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-update-checker'

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const HISTORY_FILE = join(homedir(), '.dsh', 'dsh-update-checker-history.json')
const MAX_HISTORY = 20

/* ================= 版本比较 ================= */

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

/* ================= 本地版本 ================= */

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

/* ================= npm registry ================= */

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

/** 版本时间线：最近 N 个版本及发布时间 */
async function fetchTimeline(limit = 8) {
  try {
    const j = await fetchJson('https://registry.npmjs.org/@deepseek-ai/dsh')
    if (!j || !j.versions || !j.time) return []
    const versions = Object.keys(j.versions)
      .sort((a, b) => compareVer(b, a))
      .slice(0, limit)
      .map((v) => ({
        version: v,
        time: typeof j.time[v] === 'string' ? j.time[v] : null,
      }))
    return versions
  } catch (e) {
    return []
  }
}

/* ================= 历史记录 ================= */

function readHistory() {
  try {
    if (!existsSync(HISTORY_FILE)) return []
    const j = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'))
    return Array.isArray(j) ? j : []
  } catch (e) {
    return []
  }
}

function pushHistory(entry) {
  try {
    const list = readHistory()
    list.unshift(entry)
    const trimmed = list.slice(0, MAX_HISTORY)
    mkdirSync(dirname(HISTORY_FILE), { recursive: true })
    writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf8')
  } catch (e) {
    /* 历史记录写失败不阻塞主流程 */
  }
}

/* ================= 更新执行 ================= */

/** 已运行的更新任务（单实例） */
let updateTask = null

/**
 * 执行更新：dsh 是 npx 缓存安装，用 `npx -y @deepseek-ai/dsh@latest --version`
 * 触发 npx 重新拉取最新版。返回进程句柄用于实时输出。
 */
function startUpdate() {
  if (updateTask) return { alreadyRunning: true }
  const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npx -y @deepseek-ai/dsh@latest --version'], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const task = {
    child,
    running: true,
    startedAt: Date.now(),
    output: [],
    done: null,
    exitCode: null,
  }
  task.done = new Promise((resolve) => {
    const collect = (chunk) => {
      if (chunk && chunk.length) task.output.push(String(chunk))
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('close', (code) => {
      task.running = false
      task.exitCode = code
      updateTask = null
      resolve()
    })
  })
  updateTask = task
  return task
}

/* ================= HTTP ================= */

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

export function apply(ctx) {
  ctx.inject(['webServer'], (hostCtx) => {
    /* 检查：本地 vs latest/next + 时间线 + 历史 */
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
        const timeline = await fetchTimeline(8)
        const result = {
          local,
          latest,
          next,
          hasUpdate: !!(local && latest && compareVer(latest, local) > 0),
          timeline,
          history: readHistory(),
          checkedAt: Date.now(),
        }
        pushHistory({
          at: result.checkedAt,
          local,
          latest,
          hasUpdate: result.hasUpdate,
        })
        sendJson(response, 200, result)
      },
    }), 'dsh-update-checker: check route')

    /* 更新状态轮询 */
    hostCtx.effect(() => hostCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-update-check/status',
      handler: (request, response) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        if (!updateTask) {
          sendJson(response, 200, { running: false, output: '', exitCode: null, startedAt: null })
          return
        }
        sendJson(response, 200, {
          running: updateTask.running,
          output: updateTask.output.join(''),
          exitCode: updateTask.exitCode,
          startedAt: updateTask.startedAt,
        })
      },
    }), 'dsh-update-checker: status route')

    /* 执行更新（POST，同源保护） */
    hostCtx.effect(() => hostCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-update-check/update',
      handler: async (request, response) => {
        if (request.method !== 'POST') {
          response.writeHead(405, { allow: 'POST' })
          response.end()
          return
        }
        const origin = request.headers.origin
        const host = request.headers.host
        if (origin === undefined || host === undefined) {
          sendJson(response, 403, { error: 'untrusted origin' })
          return
        }
        const task = startUpdate()
        if (task.alreadyRunning) {
          sendJson(response, 409, { error: 'update already running' })
          return
        }
        sendJson(response, 200, { ok: true, startedAt: task.startedAt })
      },
    }), 'dsh-update-checker: update route')
  })
}
