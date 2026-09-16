#!/usr/bin/env node
/**
 * doc-lint.mjs — 方案文档文风扫描（零依赖）
 *
 * 只做确定性检查：能机械判定的问题直接报出来，需要理解的判断留给写作者。
 * 检查项：AI 禁用词、词表候选、句式腔调、标点习惯、段落节奏、段落雷同、
 *        总结句式结尾、抽象名词骨架、句长分布。
 *
 * 用法：
 *   node doc-lint.mjs <草稿.md> [更多文件...] [--strict] [--json] [--max-findings=200]
 *
 * 行内抑制指令（用于引用原文、规则表等"本来就要写这些词"的位置）：
 *   <!-- doc-lint-ignore -->     忽略本行词表检查
 *   <!-- doc-lint-disable --> / <!-- doc-lint-enable -->   区间忽略
 *   <!-- doc-lint-rules-only --> 整篇跳过词表检查（写写作规则的文档自身用）
 *
 * 退出码：0 = 无严重项；1 = 有严重项（--strict 下任何项都算失败）；2 = 用法错误。
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const RULES = {
  banned: {
    label: 'AI 禁用词 / 高频套话',
    severity: 'error',
    words: [
      // 时代大帽子式开头
      '在当今', '随着科技的发展', '随着时代的发展', '随着时间的推移', '在...的大背景下',
      // 报告体收束语
      '综上所述', '总而言之', '总的来说', '一言以蔽之', '由此可见', '不难看出',
      '众所周知', '显而易见', '值得注意的是', '值得一提的是', '需要注意的是',
      // 空转的抽象评价
      '不容忽视', '起着至关重要的作用', '扮演着重要角色', '起到了关键作用', '具有重要意义',
      '广阔的应用前景', '具有深远意义',
      // 一眼 AI 的商务热词
      '赋能', '闭环', '抓手', '护航', '纵深推进', '生态体系', '护城河', '底层逻辑',
      '高质量发展', '提质增效', '降本增效', '数字化转型', '数字化赋能', '新引擎',
      '注入新动能', '新篇章', '新高度', '打法', '范式', '组合拳',
      // 无依据的强度副词与承诺口径
      '全方位', '立体化', '多维度', '深层次', '深度剖析', '极大地', '全面提升', '全面提升到',
      '有效地提升', '有效提升', '显著提升', '全面提升效能',
      // AI 引言腔与自述腔
      '本文将从', '接下来我们将', '让我们', '众所周知'
    ]
  },
  cliche: {
    label: '翻译腔 / 抽象名词骨架（改写成具体动作）',
    severity: 'warn',
    words: [
      // 抽象名词 + 进行/作出 骨架
      '进行了', '作出了', '予以', '给予了', '开展了', '实现了', '的过程', '是一个',
      // 空转的动词搭配
      '助力', '致力于', '旨在', '深入贯彻', '深度融合', '有机结合', '深谙', '洞察',
      '重塑', '颠覆', '前所未有的', '深挖', '进行全面', '进行优化', '进行分析',
      // 自夸式总括
      '经过分析', '全面梳理', '系统性', '体系化', '机制化', '常态化', '有力地', '切实',
      '扎实', '高质量'
    ]
  },
  punctuation: {
    label: '标点与节奏习惯',
    severity: 'warn'
  },
  structure: {
    label: '结构雷同',
    severity: 'warn'
  }
}

const THRESHOLDS = {
  sentenceChars: 80,        // 单句字符数上限
  longSentenceRatio: 0.15,  // 长句占比告警线
  paragraphVariation: 0.2,  // 段落长度变异系数下限（越低越像等长排版）
  paragraphMinCount: 8,     // 至少这么多段才做节奏判断
  summaryRatio: 0.2,        // 段落以总结句收尾的占比告警线
  sameStartRatio: 0.4,      // 段落 / 列表项同开头占比告警线
  dashPer1000: 1,           // 破折号密度上限（处/千字）
  emojiInHeadingRatio: 0.5, // 标题含 emoji 占比告警线
  boldMax: 5,               // 全文加粗上限
  contrastMax: 2,           // 「不是……而是……」全文上限
  shortSentenceChars: 15,   // 短句参考线
  longSentenceRef: 30,      // 长短句比例参考线
  factGapChars: 300         // 每多少字应出现一个具体事实（专有名词/数字/日期）
}

/** 一眼就能断定不是人手写进正式文档的残留内容。 */
const RESIDUE_PATTERNS = [
  { pattern: /utm_source=chatgpt\.com/i, detail: 'URL 带 ChatGPT 分享参数' },
  { pattern: /turn\d+search\d+/i, detail: '聊天工具检索残留标记' },
  { pattern: /希望(这篇|本文|这些|以上).{0,6}(对你|对您|有帮助|有所帮助)/, detail: '聊天机器人收尾语' },
  { pattern: /^(以下是|下面是|下面是关于)/, detail: '聊天机器人开场语（"以下是……"）' },
  { pattern: /\bAs an AI\b|\bI cannot\b/, detail: '助手自述残留' }
]

/** 未替换的占位符（要求带括号或引号，避免误伤"待定"这类正常商务用语）。 */
const PLACEHOLDER_PATTERNS = [
  { pattern: /\[(项目名称|公司名称|待补充|待填|待定|TBD|XX)\]/i, detail: '占位符未替换' },
  { pattern: /[（(【\[]["「]?(待定|待补充|待确认|TBD)["」]?[）)】\]]/, detail: '占位内容未落实' },
  { pattern: /(XX公司|某某公司|XXX|待填|TODO)/, detail: '占位内容未替换' }
]
const MAX_FINDINGS_DEFAULT = 200

function parseArgs(argv) {
  const files = []
  let strict = false
  let json = false
  let maxFindings = MAX_FINDINGS_DEFAULT

  for (const arg of argv) {
    if (arg === '--strict') strict = true
    else if (arg === '--json') json = true
    else if (arg.startsWith('--max-findings=')) {
      const value = Number.parseInt(arg.slice('--max-findings='.length), 10)
      if (!Number.isInteger(value) || value <= 0) throw new UsageError(`--max-findings 需要正整数：${arg}`)
      maxFindings = value
    } else if (arg.startsWith('--')) throw new UsageError(`未知参数：${arg}`)
    else files.push(arg)
  }

  if (files.length === 0) throw new UsageError('缺少输入文件')
  return { files, strict, json, maxFindings }
}

class UsageError extends Error {}

/**
 * 逐行保留行号，同时标记代码块与表格行（这些行不参与散文检查）。
 * 支持两种抑制指令，用于规则表、示例、引用原文等"本来就要写这些词"的位置：
 *   <!-- doc-lint-ignore -->   忽略本行的词表检查
 *   <!-- doc-lint-disable -->  开始忽略；<!-- doc-lint-enable --> 结束忽略
 */
function scanLines(raw) {
  const lines = raw.split(/\r?\n/)
  let inFence = false
  let inFrontmatter = false
  let suppressed = false
  // 讲写作规则的文档整篇都是禁用词与反例，用这个指令跳过词表检查，保留节奏/残留/结构检查
  const rulesOnly = /<!--\s*doc-lint-rules-only\s*-->/.test(raw)
  return lines.map((text, index) => {
    const trimmed = text.trim()
    if (trimmed === '<!-- doc-lint-disable -->') {
      suppressed = true
      return { number: index + 1, text, kind: 'meta' }
    }
    if (trimmed === '<!-- doc-lint-enable -->') {
      suppressed = false
      return { number: index + 1, text, kind: 'meta' }
    }
    const lineSuppressed = suppressed || rulesOnly || trimmed === '<!-- doc-lint-ignore -->'
    if (index === 0 && trimmed === '---') inFrontmatter = true
    else if (inFrontmatter && trimmed === '---') inFrontmatter = false
    if (!inFrontmatter && /^(```|~~~)/.test(trimmed)) {
      inFence = !inFence
      return { number: index + 1, text, kind: 'fence' }
    }
    if (inFrontmatter) return { number: index + 1, text, kind: 'meta' }
    if (inFence) return { number: index + 1, text, kind: 'code' }
    if (trimmed === '<!-- doc-lint-ignore -->') return { number: index + 1, text, kind: 'meta' }
    if (trimmed.startsWith('|')) return { number: index + 1, text, kind: 'table', suppressed: lineSuppressed, rulesOnly }
    if (/^#{1,6}\s/.test(trimmed)) return { number: index + 1, text, kind: 'heading', rulesOnly }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(text)) return { number: index + 1, text, kind: 'list', suppressed: lineSuppressed, rulesOnly }
    if (trimmed === '') return { number: index + 1, text, kind: 'blank' }
    return { number: index + 1, text, kind: 'prose', suppressed: lineSuppressed, rulesOnly }
  })
}

/** 去掉 Markdown 标记后再统计，避免把语法当正文。 */
function stripMarkup(text) {
  return text
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*([-*+]|\d+[.)])\s+/, '')
    .replace(/`[^`]*`/g, 'X')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isCjk(char) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(char)
}

function charWidth(text) {
  let width = 0
  for (const char of text) width += isCjk(char) ? 1 : 0.5
  return width
}

/** 中文句读切分：。！？；以及换行；保留引号内内容。 */
function splitSentences(text) {
  const sentences = []
  let buffer = ''
  for (const char of text) {
    buffer += char
    if ('。！？；!?;'.includes(char)) {
      if (stripMarkup(buffer).length > 0) sentences.push(buffer.trim())
      buffer = ''
    }
  }
  if (stripMarkup(buffer).length > 0) sentences.push(buffer.trim())
  return sentences
}

function findWords(lines, ruleKey) {
  const rule = RULES[ruleKey]
  const findings = []
  for (const line of lines) {
    if (line.kind === 'code' || line.kind === 'fence' || line.kind === 'meta') continue
    if (line.suppressed === true) continue
    const plain = stripMarkup(line.text)
    for (const word of rule.words) {
      if (!plain.includes(word)) continue
      findings.push({
        rule: ruleKey,
        severity: rule.severity,
        label: rule.label,
        line: line.number,
        excerpt: plain.slice(0, 80),
        detail: `命中「${word}」`
      })
    }
  }
  return findings
}

function checkPunctuation(lines, stats) {
  const findings = []
  // 写作规则文档里的加粗、「名词：解释」式列表、破折号属于体例本身，不做排版判定
  const rulesOnly = lines.some(line => line.rulesOnly === true)
  const proseText = lines
    .filter(line => (line.kind === 'prose' || line.kind === 'list') && line.rulesOnly !== true)
    .map(line => stripMarkup(line.text))
    .join('\n')

  for (const line of lines) {
    if (line.kind !== 'prose' && line.kind !== 'list') continue
    if (line.rulesOnly === true) continue
    // HTML 注释是指令与说明，不参与标点检查
    if (/^<!--[\s\S]*-->$/.test(line.text.trim())) continue
    const plain = stripMarkup(line.text)
    const dashCount = (plain.match(/——/g) ?? []).length
    if (dashCount >= 2) {
      findings.push({
        rule: 'punctuation', severity: 'error', label: RULES.punctuation.label,
        line: line.number, excerpt: plain.slice(0, 80), detail: `一行内 ${dashCount} 处破折号，删掉其中一处`
      })
    }
    if (/[！!]/.test(plain)) {
      findings.push({
        rule: 'punctuation', severity: 'warn', label: RULES.punctuation.label,
        line: line.number, excerpt: plain.slice(0, 80), detail: '方案正文出现感叹号'
      })
    }
    if (/[\u{1F300}-\u{1FAFF}\u{2705}\u{274C}\u{26A0}\u{2B50}\u{2708}\u{2764}]/u.test(plain)) {
      findings.push({
        rule: 'punctuation', severity: 'warn', label: RULES.punctuation.label,
        line: line.number, excerpt: plain.slice(0, 80), detail: '正文出现 emoji'
      })
    }
    if (/^[^：]{2,12}[：:]/.test(plain) && /^\s*([-*+]|\d+[.)])\s+/.test(line.text) && plain.length > 12) {
      findings.push({
        rule: 'punctuation', severity: 'info', label: RULES.punctuation.label,
        line: line.number, excerpt: plain.slice(0, 80),
        detail: '「名词：解释」式列表项，信息量够就改写成分句'
      })
    }
  }

  const dashTotal = (proseText.match(/——/g) ?? []).length
  const per1000 = stats.chars > 0 ? (dashTotal * 1000) / stats.chars : 0
  if (per1000 > THRESHOLDS.dashPer1000) {
    findings.push({
      rule: 'punctuation', severity: 'warn', label: RULES.punctuation.label,
      line: 0, excerpt: '', detail: `破折号 ${dashTotal} 处（${per1000.toFixed(1)}/千字），超过 ${THRESHOLDS.dashPer1000}/千字`
    })
  }

  if (!rulesOnly && stats.boldCount > THRESHOLDS.boldMax) {
    findings.push({
      rule: 'punctuation', severity: 'info', label: RULES.punctuation.label,
      line: 0, excerpt: '', detail: `全文加粗 ${stats.boldCount} 处，超过 ${THRESHOLDS.boldMax} 处（不含表格）`
    })
  }

  if (stats.contrastCount > THRESHOLDS.contrastMax) {
    findings.push({
      rule: 'punctuation', severity: 'warn', label: RULES.punctuation.label,
      line: stats.contrastLines[0] ?? 0, excerpt: '',
      detail: `「不是……而是」句式出现 ${stats.contrastCount} 次，超过 ${THRESHOLDS.contrastMax} 次，改为正面陈述`
    })
  }

  const headings = lines.filter(line => line.kind === 'heading')
  if (headings.length >= 4) {
    const emojiHeadings = headings.filter(line => /[\u{1F300}-\u{1FAFF}\u{2705}\u{274C}\u{26A0}\u{2B50}\u{2708}\u{2764}]/u.test(line.text))
    if (emojiHeadings.length / headings.length > THRESHOLDS.emojiInHeadingRatio) {
      findings.push({
        rule: 'punctuation', severity: 'warn', label: RULES.punctuation.label,
        line: emojiHeadings[0].number, excerpt: '', detail: '多数标题带 emoji，按正式方案要求应去掉'
      })
    }
  }
  return findings
}

/** 助手残留、占位符、具体事实密度：这三类属于"送审硬伤"，一律按严重处理。 */
function checkResidue(lines, stats) {
  const findings = []
  const rulesOnly = lines.some(line => line.rulesOnly === true)
  for (const line of lines) {
    if (line.kind === 'code' || line.kind === 'fence' || line.kind === 'meta') continue
    const plain = stripMarkup(line.text)
    for (const item of RESIDUE_PATTERNS) {
      if (item.pattern.test(plain)) {
        findings.push({
          rule: 'residue', severity: 'error', label: '助手残留 / 占位内容',
          line: line.number, excerpt: plain.slice(0, 80), detail: item.detail
        })
      }
    }
    for (const item of PLACEHOLDER_PATTERNS) {
      if (item.pattern.test(plain)) {
        findings.push({
          rule: 'residue', severity: 'error', label: '助手残留 / 占位内容',
          line: line.number, excerpt: plain.slice(0, 80), detail: item.detail
        })
      }
    }
  }

  if (!rulesOnly && stats.chars > 600 && stats.factGapRatio > 0.35) {
    findings.push({
      rule: 'residue', severity: 'info', label: '助手残留 / 占位内容',
      line: 0, excerpt: '',
      detail: `${(stats.factGapRatio * 100).toFixed(0)}% 的段落没有数字、日期、单位量词、机构名或标准号，读起来像通用模板`
    })
  }
  return findings
}

function checkStructure(lines, stats) {
  const findings = []

  for (const item of stats.duplicateGroups) {
    findings.push({
      rule: 'structure', severity: 'warn', label: RULES.structure.label,
      line: item.lines[0], excerpt: item.key.slice(0, 80),
      detail: `${item.lines.length} 处段落 / 列表项开头雷同（行 ${item.lines.join('、')}）`
    })
  }

  for (const item of stats.sequenceHits) {
    findings.push({
      rule: 'structure', severity: 'warn', label: RULES.structure.label,
      line: item.line, excerpt: '', detail: item.detail
    })
  }

  if (stats.paragraphCount >= THRESHOLDS.paragraphMinCount) {
    const ratio = stats.paragraphVariation
    if (ratio < THRESHOLDS.paragraphVariation) {
      findings.push({
        rule: 'structure', severity: 'warn', label: RULES.structure.label,
        line: 0, excerpt: '',
        detail: `段落长度变异系数 ${ratio.toFixed(2)}（低于 ${THRESHOLDS.paragraphVariation}），段落近乎等长，像自动排版`
      })
    }
  }

  if (stats.paragraphCount >= 5 && stats.summaryRatio > THRESHOLDS.summaryRatio) {
    findings.push({
      rule: 'structure', severity: 'warn', label: RULES.structure.label,
      line: 0, excerpt: '',
      detail: `${(stats.summaryRatio * 100).toFixed(0)}% 段落以总结句收尾（如"综上所述""从而提升…"），去掉这些句子信息不损失`
    })
  }

  if (stats.sameStartRatio > THRESHOLDS.sameStartRatio && stats.paragraphCount >= THRESHOLDS.paragraphMinCount) {
    findings.push({
      rule: 'structure', severity: 'warn', label: RULES.structure.label,
      line: 0, excerpt: '',
      detail: `${(stats.sameStartRatio * 100).toFixed(0)}% 段落 / 列表项以同样方式开头，节奏机械`
    })
  }

  if (stats.longSentenceRatio > THRESHOLDS.longSentenceRatio) {
    findings.push({
      rule: 'structure', severity: 'info', label: RULES.structure.label,
      line: stats.longestSentenceLine, excerpt: stats.longestSentence.slice(0, 80),
      detail: `${(stats.longSentenceRatio * 100).toFixed(0)}% 的句子超过 ${THRESHOLDS.sentenceChars} 字，建议拆句`
    })
  }

  return findings
}

function analyzeStats(lines) {
  const proseLines = lines.filter(line => line.kind === 'prose' || line.kind === 'list')
  const text = proseLines.map(line => stripMarkup(line.text)).join('\n')
  const chars = charWidth(text)

  const paragraphs = []
  let current = { lines: [], text: [] }
  for (const line of lines) {
    // 一级标题是文档名，不参与事实密度与节奏判断
    if (line.kind === 'heading' && /^#\s/.test(line.text)) continue
    if (line.kind === 'prose' || line.kind === 'list') {
      current.lines.push(line.number)
      current.text.push(stripMarkup(line.text))
      continue
    }
    if (current.text.length > 0) {
      paragraphs.push({ lines: current.lines, text: current.text.join('') })
      current = { lines: [], text: [] }
    }
  }
  if (current.text.length > 0) paragraphs.push({ lines: current.lines, text: current.text.join('') })

  const lengths = paragraphs.map(paragraph => charWidth(paragraph.text))
  const mean = lengths.length > 0 ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0
  const variance = lengths.length > 0
    ? lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lengths.length
    : 0
  const variation = mean > 0 ? Math.sqrt(variance) / mean : 0

  const sentences = []
  for (const line of proseLines) {
    for (const sentence of splitSentences(stripMarkup(line.text))) {
      sentences.push({ text: sentence, line: line.number, width: charWidth(sentence) })
    }
  }
  const longSentences = sentences.filter(sentence => sentence.width > THRESHOLDS.sentenceChars)
  const longest = sentences.reduce((max, item) => (item.width > max.width ? item : max), { text: '', line: 0, width: 0 })
  const shortSentences = sentences.filter(sentence => sentence.width <= THRESHOLDS.shortSentenceChars).length
  const longRefSentences = sentences.filter(sentence => sentence.width >= THRESHOLDS.longSentenceRef).length

  // 具体事实密度：段落里一个数字、日期、单位量词、机构名或标准号都没有，就是通用模板。
  // 注意不要用"系统""平台"这类泛词做判据——通用模板里也满是这些词。
  const factPattern = /\d|[一二三四五六七八九十百千万]+(年|月|日|天|人|台|套|次|条|项|元|万元|人日|人月|小时|分钟|秒)|(省|市|区|县)(级|政府|局|平台|中心)?[^\s，。]{0,4}(局|委|办|中心|公司|院|校)|GB\/?T? ?\d{3,5}|ISO ?\d+|《[^》]{2,40}》|https?:\/\//
  const factGapParagraphs = paragraphs.filter(paragraph => !factPattern.test(paragraph.text)).length

  // 排版习惯统计（不含代码块与表格，避免统计表格表头）
  const proseRaw = lines.filter(line => line.kind === 'prose' || line.kind === 'list' || line.kind === 'heading')
  const boldCount = proseRaw.reduce((sum, line) => sum + ((line.text.match(/\*\*[^*]+\*\*/g) ?? []).length), 0)
  const contrastLines = proseRaw
    .filter(line => /不是[^。；]{1,30}而是|与其说[^。；]{1,20}不如说|重点不在[^。；]{1,20}而在/.test(stripMarkup(line.text)))
    .map(line => line.number)
  const dashTotal = (text.match(/——/g) ?? []).length
  const dashPer1000 = chars > 0 ? (dashTotal * 1000) / chars : 0

  const summaryPattern = /(综上所述|总而言之|总的来说|由此可见|从而|进而|以此|最终实现了?|有效保障了|为.{0,12}提供了有力(支撑|保障)|奠定了.{0,10}基础|具有重要意义)/
  const summaryEnders = paragraphs.filter(paragraph => {
    const sentencesInParagraph = splitSentences(paragraph.text)
    const last = sentencesInParagraph.at(-1)
    return last !== undefined && summaryPattern.test(last)
  })

  const starts = paragraphs.map(paragraph => paragraph.text.slice(0, 8)).filter(value => value.length >= 4)
  const startCounts = new Map()
  for (const start of starts) startCounts.set(start, (startCounts.get(start) ?? 0) + 1)
  const dominant = [...startCounts.values()].filter(count => count >= 3).reduce((sum, count) => sum + count, 0)

  const buckets = new Map()
  for (const item of [...paragraphs.map(paragraph => ({ key: paragraph.text.slice(0, 16), lines: paragraph.lines })), ...groupListItems(proseLines)]) {
    if (item.key.length < 6) continue
    const bucket = buckets.get(item.key) ?? []
    bucket.push(item.lines[0])
    buckets.set(item.key, bucket)
  }
  const duplicateGroups = [...buckets.entries()]
    .filter(([, groupLines]) => groupLines.length >= 3)
    .map(([key, groupLines]) => ({ key, lines: groupLines }))

  const sequencePatterns = [
    { pattern: /首先/, label: '如果全文只是流程清单，用「一、（一）1.」层级更符合方案惯例，不必套「首先/其次/最后」' },
    { pattern: /其次/, label: '「其次」是 AI 段落过渡的典型痕迹，建议换成递进关系或直接陈述' },
    { pattern: /最后需要指出|需要指出的是/, label: '"需要指出的是"式收尾属于口头总结习惯，删掉信息不损失' }
  ]
  const sequenceHits = []
  for (const item of sequencePatterns) {
    const hits = proseLines.filter(line => item.pattern.test(stripMarkup(line.text)))
    if (hits.length >= 3) sequenceHits.push({ line: hits[0].number, detail: item.label })
  }

  return {
    chars,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    paragraphVariation: variation,
    longSentenceRatio: sentences.length > 0 ? longSentences.length / sentences.length : 0,
    longestSentence: longest.text,
    longestSentenceLine: longest.line,
    summaryRatio: paragraphs.length > 0 ? summaryEnders.length / paragraphs.length : 0,
    sameStartRatio: paragraphs.length > 0 ? dominant / paragraphs.length : 0,
    duplicateGroups,
    sequenceHits,
    shortSentences,
    longRefSentences,
    boldCount,
    contrastCount: contrastLines.length,
    contrastLines,
    dashPer1000,
    factGapRatio: paragraphs.length > 0 ? factGapParagraphs / paragraphs.length : 0
  }
}

function groupListItems(proseLines) {
  const groups = new Map()
  for (const line of proseLines) {
    if (line.kind !== 'list') continue
    const plain = stripMarkup(line.text)
    if (plain.length < 8) continue
    const key = plain.slice(0, 12)
    const bucket = groups.get(key) ?? []
    bucket.push(line.number)
    groups.set(key, bucket)
  }
  return [...groups.entries()].map(([key, lines]) => ({ key, lines }))
}

function lintFile(path) {
  const raw = readFileSync(path, 'utf8')
  const lines = scanLines(raw)
  const stats = analyzeStats(lines)
  const findings = [
    ...findWords(lines, 'banned'),
    ...findWords(lines, 'cliche'),
    ...checkPunctuation(lines, stats),
    ...checkResidue(lines, stats),
    ...checkStructure(lines, stats)
  ]
  return { path, stats, findings }
}

function formatHuman(report, maxFindings) {
  const out = []
  const { stats, findings } = report
  out.push(`\n=== ${basename(report.path)} ===`)
  out.push(
    `正文约 ${Math.round(stats.chars)} 字｜段落 ${stats.paragraphCount} 段｜句子 ${stats.sentenceCount} 句` +
    `（短句 ${stats.shortSentences}、30 字以上 ${stats.longRefSentences}）`
  )
  out.push(
    `段落变异系数 ${stats.paragraphVariation.toFixed(2)}｜破折号 ${stats.dashPer1000.toFixed(1)}/千字` +
    `｜加粗 ${stats.boldCount} 处｜总结句结尾 ${(stats.summaryRatio * 100).toFixed(0)}%` +
    `｜无具体事实段落 ${(stats.factGapRatio * 100).toFixed(0)}%`
  )
  if (findings.length === 0) {
    out.push('未发现确定性文风问题。仍请人工核对引用、数字与术语一致性。')
    return out.join('\n')
  }
  const order = { error: 0, warn: 1, info: 2 }
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity] || a.line - b.line)
  for (const finding of sorted.slice(0, maxFindings)) {
    const where = finding.line > 0 ? `L${finding.line}` : '全文'
    const excerpt = finding.excerpt !== '' ? `｜${finding.excerpt}` : ''
    out.push(`[${finding.severity.toUpperCase()}] ${where} ${finding.detail}${excerpt}`)
  }
  if (sorted.length > maxFindings) out.push(`… 另有 ${sorted.length - maxFindings} 条未列出（--max-findings 调整上限）`)
  const errors = findings.filter(finding => finding.severity === 'error').length
  const warns = findings.filter(finding => finding.severity === 'warn').length
  out.push(`\n合计：严重 ${errors} 项，提示 ${warns} 项。提示项需人工判断是否成立。`)
  return out.join('\n')
}

function main() {
  const { files, strict, json, maxFindings } = parseArgs(process.argv.slice(2))
  const reports = files.map(lintFile)

  if (json) {
    process.stdout.write(`${JSON.stringify({ reports }, null, 2)}\n`)
  } else {
    for (const report of reports) process.stdout.write(`${formatHuman(report, maxFindings)}\n`)
  }

  const hasError = reports.some(report => report.findings.some(finding => finding.severity === 'error'))
  const hasWarn = reports.some(report => report.findings.some(finding => finding.severity === 'warn'))
  process.exitCode = hasError || (strict && hasWarn) ? 1 : 0
}

try {
  main()
} catch (error) {
  if (error instanceof UsageError) {
    process.stderr.write(`用法错误：${error.message}\n用法：node doc-lint.mjs <草稿.md> [更多文件...] [--strict] [--json] [--max-findings=200]\n`)
    process.exitCode = 2
  } else {
    process.stderr.write(`扫描失败：${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 2
  }
}
