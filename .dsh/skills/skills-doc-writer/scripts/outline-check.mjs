#!/usr/bin/env node
/**
 * outline-check.mjs — 大纲校验（零依赖）
 *
 * 校验"先出大纲、再在大纲里标引用、最后分章写正文"这条流程有没有被绕过：
 *   - 大纲是否列到三级标题（####）
 *   - 每个三级标题下是否至少有一条 <mark> 黄色引用标记
 *   - 标记是否写到了来源的章节号 / chunk / 条号 / URL，而不是只写一个文件名
 *   - 标记是否为空、是否用"同上""见前文"这类含糊指代
 *   - 是否残留 【待补】/【未核实】，提示这些是交付前必须落实的
 *
 * 不做的事：判断引用是否真实存在（那要人去核），判断内容写得好不好。
 *
 * 用法：
 *   node outline-check.mjs <大纲.md> [更多文件...] [--json] [--strict-title]
 *
 * --strict-title：没有 #### 三级标题直接判失败（默认只在二级标题数 >= 5 时告警）
 *
 * 退出码：0 = 通过；1 = 有错误；2 = 用法错误。
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const MARK_TAG = /<\/?mark[^>]*>/gi
const MARK_CONTENT = /<mark[^>]*>([\s\S]*?)<\/mark>/gi
const LEVEL3 = /^####\s+/
const LEVEL2 = /^###\s+/
const LEVEL2_HEAD = /^##\s+/
const H4_PLUS = /^#{5,}\s+/

/** 允许的标记类型。 */
const MARK_KINDS = ['【引用】', '【摘抄】', '【检索】', '【RAG】', '【假设】', '【数据】', '【待补】']

/** 证明"写到了具体位置"的锚点：章节号、页码、条号、chunk、URL、具体年份编号。 */
const ANCHOR_PATTERNS = [
  /§\s*\d/,                       // §2.1
  /第\s*[0-9一二三四五六七八九十]+\s*(页|章|节|条|款|部分)/,
  /\d+\.\d+/,                     // 3.2.1
  /(chunk|Chunk|CHUNK)\s*[#：:]?\s*\d+/,
  /https?:\/\//,
  /GB\/?\s?T?\s?\d{3,5}/,
  /[〔\[]\d{4}[〕\]]\s*\d+\s*号/,   // 发改投资规〔2023〕304 号
  /\b\d{4}\b/                      // 年报 / 年份口径
]

const VAGUE_PATTERNS = [
  /见前文/, /见上文/, /如前所述/, /待补充详细内容/,
  // 「同上」后面必须紧跟定位（§/页/条/chunk），否则等于没写
  /同上(?![^。]{0,12}(§|第\s*\d|chunk|\d+\.\d))/,
  /(略)(?![^。]{0,10}(§|第\s*\d|chunk))/
]

function parseArgs(argv) {
  const files = []
  let json = false
  let strictTitle = false
  for (const arg of argv) {
    if (arg === '--json') json = true
    else if (arg === '--strict-title') strictTitle = true
    else if (arg.startsWith('--')) throw new UsageError(`未知参数：${arg}`)
    else files.push(arg)
  }
  if (files.length === 0) throw new UsageError('缺少大纲文件')
  return { files, json, strictTitle }
}

class UsageError extends Error {}

function checkOutline(path, strictTitle) {
  const raw = readFileSync(path, 'utf8')
  const lines = raw.split(/\r?\n/)
  const findings = []

  let inFence = false
  const proseLines = lines.map((text, index) => {
    const trimmed = text.trim()
    if (/^(```|~~~)/.test(trimmed)) inFence = !inFence
    return { number: index + 1, text, isFenceLine: inFence || /^(```|~~~)/.test(trimmed), trimmed }
  })

  const headings = proseLines.filter(line => !line.isFenceLine && /^#{1,6}\s/.test(line.trimmed))
  const level1 = headings.filter(line => LEVEL2_HEAD.test(line.trimmed) && !/^###/.test(line.trimmed))
  const level3 = headings.filter(line => LEVEL3.test(line.trimmed))
  const deeper = headings.filter(line => H4_PLUS.test(line.trimmed))

  // 恰好三级（###）的二级标题
  const l2 = headings.filter(line => LEVEL2.test(line.trimmed) && !LEVEL3.test(line.trimmed) && !H4_PLUS.test(line.trimmed))

  if (headings.length === 0) {
    findings.push({ severity: 'error', line: 0, detail: '大纲里没有任何 Markdown 标题' })
  }
  if (l2.length === 0) {
    findings.push({ severity: 'error', line: 0, detail: '没有二级标题（###），大纲层级不成立' })
  }
  if (level3.length === 0) {
    findings.push({
      severity: strictTitle ? 'error' : (l2.length >= 5 ? 'error' : 'warn'),
      line: 0,
      detail: '没有三级标题（####）：大纲必须列到三级，只列到二级不算完成'
    })
  }
  if (deeper.length > 0) {
    findings.push({
      severity: 'info', line: deeper[0].number,
      detail: `有 ${deeper.length} 个四级及更深标题；大纲到三级即可，更细的内容放到正文里`
    })
  }

  // 逐条三级标题检查其下方（到下一条同级或更高级标题为止）是否标了引用
  const sectionStarts = headings.map(line => line.number)
  const nextHeadingLine = (from) => {
    const next = sectionStarts.find(number => number > from)
    return next ?? Number.MAX_SAFE_INTEGER
  }

  for (const heading of level3) {
    const end = nextHeadingLine(heading.number)
    const body = proseLines
      .filter(line => line.number > heading.number && line.number < end && !line.isFenceLine)
      .map(line => line.text)
      .join('\n')
    const marks = [...body.matchAll(MARK_CONTENT)].map(match => match[1].replace(MARK_TAG, '').trim())
    const title = heading.trimmed.replace(/^#+\s*/, '')

    if (marks.length === 0) {
      findings.push({
        severity: 'error', line: heading.number,
        detail: `三级标题「${title}」下没有任何 <mark> 引用标记`
      })
      continue
    }

    let hasAnchor = false
    let hasPending = false
    for (const mark of marks) {
      const isPending = mark.includes('【待补】') || mark.includes('【未核实】')
      if (isPending) hasPending = true
      if (mark.length < 8) {
        findings.push({ severity: 'error', line: heading.number, detail: `「${title}」的标记内容过短或为空：${mark}` })
        continue
      }
      if (isPending) {
        // 待补项不要求锚点，改由下面的提示项提醒落实
        findings.push({
          severity: 'warn', line: heading.number,
          detail: `「${title}」有未落实的引用：${mark.slice(0, 80)}`
        })
        continue
      }
      const kind = MARK_KINDS.find(item => mark.includes(item))
      if (kind === undefined && !/^【[^】]+】/.test(mark)) {
        findings.push({
          severity: 'warn', line: heading.number,
          detail: `「${title}」的标记没有前缀类型，用【引用】【检索】【RAG】【假设】【数据】之一`
        })
      }
      if (ANCHOR_PATTERNS.some(pattern => pattern.test(mark))) hasAnchor = true
      if (VAGUE_PATTERNS.some(pattern => pattern.test(mark))) {
        findings.push({ severity: 'warn', line: heading.number, detail: `「${title}」的标记用了含糊指代：${mark.slice(0, 60)}` })
      }
    }
    if (!hasAnchor && !hasPending) {
      findings.push({
        severity: 'error', line: heading.number,
        detail: `「${title}」的标记只写了来源名称，没写到章节号 / 页码 / 条号 / chunk：${marks[0].slice(0, 80)}`
      })
    }
  }

  const l3Count = level3.length
  const l2Count = l2.length
  const withMarks = level3.filter((heading) => {
    const end = nextHeadingLine(heading.number)
    const body = proseLines
      .filter(line => line.number > heading.number && line.number < end && !line.isFenceLine)
      .map(line => line.text)
      .join('\n')
    return [...body.matchAll(MARK_CONTENT)].length > 0
  }).length

  return {
    path,
    stats: { l1: level1.length, l2: l2Count, l3: l3Count, l3WithMarks: withMarks },
    findings
  }
}

function formatHuman(report) {
  const out = []
  const { stats, findings } = report
  out.push(`\n=== ${basename(report.path)} ===`)
  out.push(`一级章 ${stats.l1}｜二级节 ${stats.l2}｜三级条 ${stats.l3}｜已标引用 ${stats.l3WithMarks}/${stats.l3}`)
  if (findings.length === 0) {
    out.push('大纲结构合格，三级标题全部标了可核对的引用来源。记得引用是否真实仍要人工核。')
    return out.join('\n')
  }
  const order = { error: 0, warn: 1, info: 2 }
  for (const finding of [...findings].sort((a, b) => order[a.severity] - order[b.severity] || a.line - b.line)) {
    const where = finding.line > 0 ? `L${finding.line}` : '全文'
    out.push(`[${finding.severity.toUpperCase()}] ${where} ${finding.detail}`)
  }
  const errors = findings.filter(finding => finding.severity === 'error').length
  const warns = findings.filter(finding => finding.severity === 'warn').length
  out.push(`\n合计：错误 ${errors} 项，提示 ${warns} 项。`)
  return out.join('\n')
}

function main() {
  const { files, json, strictTitle } = parseArgs(process.argv.slice(2))
  const reports = files.map(path => checkOutline(path, strictTitle))

  if (json) {
    process.stdout.write(`${JSON.stringify({ reports }, null, 2)}\n`)
  } else {
    for (const report of reports) process.stdout.write(`${formatHuman(report)}\n`)
  }

  process.exitCode = reports.some(report => report.findings.some(finding => finding.severity === 'error')) ? 1 : 0
}

try {
  main()
} catch (error) {
  if (error instanceof UsageError) {
    process.stderr.write(`用法错误：${error.message}\n用法：node outline-check.mjs <大纲.md> [更多文件...] [--json] [--strict-title]\n`)
    process.exitCode = 2
  } else {
    process.stderr.write(`校验失败：${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 2
  }
}
