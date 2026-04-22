#!/usr/bin/env node
// 把「顺译法」格式的 Markdown 文件按章节转成 earthworm-lite 课程 JSON
//
// 用法：
//   node tools/md2json.mjs <input.md> [outDir]
//   outDir 默认为 ./courses
//
// 输入格式（顺译法 Markdown）：
//   ### 第一章 歇洛克·福尔摩斯先生
//   ### CHAPTER I. MR. SHERLOCK HOLMES.
//   **In the year 1878** 一八七八年，
//   **I took my degree...** 我拿到了...
//
// 每一行 **英文短语** = 一个练习单元，中文注释作为提示。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

// 在介词/连词/从句词前自动断开，最小块长度 2 个词
// 介词/连词：cur.length >= 2 才切
const SPLIT_PREP = new Set([
  'in','at','on','to','for','of','from','with','by','into','about',
  'through','before','after','during','between','among','under','over',
  'upon','without','within','throughout','across','along','against',
  'and','but','or','nor','so','yet',
  'because','although','though','while','when','if','that','as',
  'which','who','where','whose','whom','until','unless','since',
])

// 谓语动词：cur.length >= 1 就切（捕捉单词主语）
const SPLIT_VERB = new Set([
  'is','are','am','was','were','be','been','being',
  'have','has','had','do','does','did',
  'will','would','shall','should','can','could','may','might','must',
  'said','told','asked','replied','answered','called','cried','thought',
  'went','came','took','gave','got','made','saw','found','knew','left',
  'put','felt','brought','kept','let','became','seemed','looked','turned',
  'stood','heard','ran','walked','showed','appeared','meant','lost',
  'began','fell','held','rose','spoke','wrote','read','led','lay','sat',
  'set','met','sent','built','grew','drew','threw','wore','chose','broke',
  'drove','rode','woke','forgot','forgave','returned','entered','passed',
  'opened','closed','moved','followed','succeeded','attached','removed',
  'started','stopped','noticed','remembered','understood','decided',
])

function autoSplit(phrase) {
  const words = phrase.trim().split(/\s+/)
  if (words.length <= 2) return [phrase]   // 太短不拆
  const chunks = []
  let cur = []
  for (let i = 0; i < words.length; i++) {
    const bare = words[i].replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').toLowerCase()
    const isVerb = SPLIT_VERB.has(bare)
    const isPrep = SPLIT_PREP.has(bare)
    // 不让连词/介词开头的块独立成单词（at least 2 words in chunk before split）
    const minLen = isVerb ? 1 : 2
    if (i > 0 && (isVerb || isPrep) && cur.length >= minLen && !(cur.length === 1 && SPLIT_PREP.has(cur[0].toLowerCase()))) {
      chunks.push(cur.join(' '))
      cur = [words[i]]
    } else {
      cur.push(words[i])
    }
  }
  if (cur.length) chunks.push(cur.join(' '))
  return chunks.length > 1 ? chunks : [phrase]
}

const args = process.argv.slice(2)
if (!args[0] || args.includes('-h') || args.includes('--help')) {
  console.log('用法: node tools/md2json.mjs <input.md> [outDir]')
  process.exit(0)
}

const inputPath = resolve(args[0])
const outDir = resolve(args[1] || 'courses')
mkdirSync(outDir, { recursive: true })

const lines = readFileSync(inputPath, 'utf8').split(/\r?\n/)

// 解析章节
const CHAPTER_ZH = /^###\s+(第.+章.*)$/
const CHAPTER_EN = /^###\s+(CHAPTER\s+.*)$/i
const PHRASE_LINE = /^\*\*(.+?)\*\*\s*(.*)$/

let chapters = []
let current = null
let partNo = 0          // 第一部分 / 第二部分
let chapterZh = ''
let chapterEn = ''
let pendingZh = null    // 中文章节行暂存，等英文行出现后合并

for (const line of lines) {
  // 部分标题
  if (/^##\s+第[一二三四五六七八九十]+部分/.test(line)) {
    partNo++
    continue
  }

  // 中文章节标题
  const mZh = line.match(CHAPTER_ZH)
  if (mZh) {
    chapterZh = mZh[1].trim()
    pendingZh = chapterZh
    continue
  }

  // 英文章节标题（紧跟在中文之后）
  const mEn = line.match(CHAPTER_EN)
  if (mEn) {
    chapterEn = mEn[1].trim()
    const title = `${pendingZh || ''} / ${chapterEn}`
    current = { title, lessons: [] }
    chapters.push(current)
    pendingZh = null
    continue
  }

  // 短语行
  const mP = line.match(PHRASE_LINE)
  if (mP && current) {
    const english = mP[1].trim()
    const chinese = mP[2].trim()
    current.lessons.push({ translation: chinese, phrases: autoSplit(english) })
  }
}

// 输出：每章一个 JSON，文件名带部分和章序号
// 用 index 区分：第一部分第一章 → p1c01，第二部分第一章 → p2c01
const partCounters = {}
chapters.forEach((ch) => {
  // 从标题猜部分：章节数组中的出现顺序
  const key = ch.title.includes('CHAPTER I') ? 'new' : 'continue'
  void key
})

// 直接按出现顺序编号，用部分重置检测（遇到 CHAPTER I 且不是第一个时递增 part）
let part = 1
let chIdx = 0
const usedParts = {}
for (const ch of chapters) {
  if (/CHAPTER I[^IV]|CHAPTER I\./i.test(ch.title) && chIdx > 0) {
    part++
  }
  const key = `p${part}`
  usedParts[key] = (usedParts[key] || 0) + 1
  const num = String(usedParts[key]).padStart(2, '0')
  const filename = `${key}c${num}.json`
  const out = {
    title: ch.title,
    lessons: ch.lessons,
  }
  const outPath = join(outDir, filename)
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
  console.log(`✓ ${filename}  ${ch.lessons.length} 短语  「${ch.title}」`)
  chIdx++
}

console.log(`\n共 ${chapters.length} 章，输出到 ${outDir}`)
