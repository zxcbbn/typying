#!/usr/bin/env node
// 把文章转成 earthworm-lite 课程 JSON（意群/短语格式）
//
// 用法：
//   node tools/text2json.mjs <input.txt> [output.json] [--title="课程标题"]
//
// 输入语法（每行一个整句，格式）：
//
//   英文短语1 / 英文短语2 / 英文短语3 | 整句中译
//
//   - 英文部分用 " / " 分隔短语（意群）
//   - "|" 后面是整句中文翻译（可选）
//   - 空行会被忽略
//   - 以 # 开头的行是注释
//
// 示例：
//   I want to / go to the park / tomorrow. | 我明天想去公园。
//   How / are you? | 你好吗？
//
// 如果某行不含 "/"，会自动把整句作为一个短语。
//
// 输出：
//   {
//     "title": "...",
//     "lessons": [
//       { "translation": "...", "phrases": ["...", "..."] }
//     ]
//   }

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(
    `用法: node tools/text2json.mjs <input.txt> [output.json] [--title="课程标题"]\n` +
    `\n语法: 英文短语1 / 英文短语2 / 英文短语3 | 整句中译`
  )
  process.exit(0)
}

let title = null
const positional = []
for (const a of args) {
  if (a.startsWith('--title=')) title = a.slice('--title='.length)
  else positional.push(a)
}

const inputPath = resolve(positional[0])
const defaultOut = join(
  resolve('courses'),
  basename(inputPath).replace(/\.[^.]+$/, '') + '.json'
)
const outputPath = positional[1] ? resolve(positional[1]) : defaultOut

const raw = readFileSync(inputPath, 'utf8')
const lessons = []

for (const rawLine of raw.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue

  const [enPart, zhPart = ''] = line.split('|').map((s) => s.trim())
  const phrases = enPart
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)

  if (phrases.length === 0) continue
  lessons.push({ translation: zhPart, phrases })
}

const out = {
  title: title || basename(inputPath).replace(/\.[^.]+$/, ''),
  lessons,
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(`✓ ${lessons.length} 句（共 ${lessons.reduce((a, l) => a + l.phrases.length, 0)} 短语）已写入 ${outputPath}`)
