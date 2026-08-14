window.__ModuleLoader__.load({ id: "dsh-update-checker", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
'use strict'

/**
 * dsh-update-checker client: sidebar footer button that checks DeepSeek
 * Harness for updates via the host route /dsh-update-check.
 * Hand-authored CJS bundle (no build step); externals come from the loader
 * module table: react, @deepseek-ai/cordis.
 */
const React = require('react')
const h = React.createElement
const { useState, useEffect } = React

exports.name = 'dsh-update-checker'
exports.inject = ['slots']
exports.apply = function apply(ctx) {
  const css = `
    .upd-btn {
      border: none;
      background: none;
      color: var(--dsw-alias-label-secondary, #888);
      cursor: pointer;
      font-size: 13px;
      padding: 2px 5px;
      border-radius: 6px;
      line-height: 1.2;
    }
    .upd-btn:hover {
      background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.14));
      color: var(--dsw-alias-label-primary, #333);
    }
    .upd-pop {
      position: fixed;
      right: 18px;
      bottom: 64px;
      z-index: 10001;
      width: 290px;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      border-radius: 14px;
      background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.97));
      border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.35));
      box-shadow: 0 12px 32px rgba(0,0,0,0.25);
      color: var(--dsw-alias-label-primary, #222);
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      font-size: 12px;
      padding: 14px;
    }
    .upd-pop h4 {
      margin: 0 0 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .upd-pop .upd-close {
      border: none;
      background: none;
      cursor: pointer;
      color: var(--dsw-alias-label-secondary, #888);
      font-size: 13px;
      padding: 0 2px;
    }
    .upd-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,0.2));
    }
    .upd-row:last-of-type { border-bottom: none; }
    .upd-row .k { color: var(--dsw-alias-label-secondary, #888); }
    .upd-row .v { font-variant-numeric: tabular-nums; font-weight: 600; }
    .upd-badge {
      margin-top: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
    }
    .upd-badge[data-new='true'] {
      background: rgba(74, 222, 128, 0.18);
      color: var(--dsw-alias-state-success-primary, #16a34a);
    }
    .upd-badge[data-new='false'] {
      background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12));
      color: var(--dsw-alias-label-secondary, #888);
    }
    .upd-badge[data-err='true'] {
      background: rgba(248, 113, 113, 0.15);
      color: var(--dsw-alias-state-error-primary, #dc2626);
    }
    .upd-foot {
      margin-top: 8px;
      font-size: 10px;
      color: var(--dsw-alias-label-secondary, #888);
      text-align: center;
    }
  `
  function injectStyles() {
    if (document.querySelector('style[data-plugin-css="dsh-update-checker"]') !== null) return
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-update-checker'
    tag.dataset.pluginCss = 'dsh-update-checker'
    tag.textContent = css
    document.head.appendChild(tag)
  }
  ctx.effect(() => {
    injectStyles()
    return () => {
      const tag = document.querySelector('style[data-plugin-css="dsh-update-checker"]')
      if (tag) tag.remove()
    }
  }, 'dsh-update-checker: styles')

  function fmtTime(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
  }

  function UpdateButton() {
    const [open, setOpen] = useState(false)
    const [state, setState] = useState({ phase: 'idle', data: null })

    const check = () => {
      if (state.phase === 'busy') return
      setState({ phase: 'busy', data: null })
      fetch('/dsh-update-check', { headers: { accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
        .then((data) => setState({ phase: 'done', data }))
        .catch(() => setState({ phase: 'error', data: null }))
    }

    useEffect(() => {
      const t = setTimeout(check, 1500)
      return () => clearTimeout(t)
    }, [])

    const toggle = () => {
      const next = !open
      setOpen(next)
      if (next && state.phase === 'idle') check()
    }

    const d = state.data
    const badgeNew = d && d.hasUpdate
    const badgeErr = state.phase === 'error'
    const busy = state.phase === 'busy'

    return h('div', { style: { display: 'inline-flex', position: 'relative' } },
      h('button', {
        className: 'upd-btn',
        title: '检查 DeepSeek Harness 更新',
        onClick: toggle,
        style: { fontSize: 14 },
      }, busy ? '…' : (badgeNew ? '⬆' : (badgeErr ? '⚠' : '⟳'))),
      open && h('div', { className: 'upd-pop' },
        h('h4', null,
          '🔍 DeepSeek Harness 更新检查',
          h('button', { className: 'upd-close', onClick: () => setOpen(false) }, '✕')),
        busy
          ? h('div', { className: 'upd-foot' }, '检查中…')
          : badgeErr
            ? h('div', { className: 'upd-badge', 'data-err': 'true' }, '检查失败：无法连接或解析')
            : d && h('div', null,
                h('div', { className: 'upd-row' }, h('span', { className: 'k' }, '当前版本'), h('span', { className: 'v' }, d.local || '未知')),
                h('div', { className: 'upd-row' }, h('span', { className: 'k' }, '最新版本'), h('span', { className: 'v' }, d.latest || '未知')),
                h('div', { className: 'upd-row' }, h('span', { className: 'k' }, 'next 通道'), h('span', { className: 'v' }, d.next || '—')),
                h('div', { className: 'upd-badge', 'data-new': String(!!badgeNew) },
                  d.hasUpdate ? '⬆ 发现新版本，可以去更新啦！' : '✓ 已是最新版本'),
                h('div', { className: 'upd-foot' }, '检查时间 ' + fmtTime(d.checkedAt))),
        h('div', { style: { marginTop: 10, textAlign: 'center' } },
          h('button', {
            className: 'upd-btn',
            onClick: check,
            disabled: busy,
            style: { border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.4))', padding: '3px 12px' },
          }, busy ? '检查中…' : '重新检查')))
    )
  }

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'dsh-update-check',
    order: 6,
    label: '更新检查',
  }, () => h(UpdateButton, null)))
}

return module.exports; } });
