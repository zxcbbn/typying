import { courses } from './courses.js'

const $ = (id) => document.getElementById(id)
const input = $('input')
const answerEl = $('answer')
const slotsEl = $('slots')
const translationEl = $('translation')
const progressEl = $('progress')
const selectEl = $('course-select')
const modifierBtn = $('modifier-toggle')
const skeletonBtn = $('skeleton-toggle')
const readingBtn = $('reading-toggle')

// Phrase-starters that signal a modifier (prep phrase, adverbial, relative clause)
const MODIFIER_STARTERS = new Set([
  'in','on','at','for','with','by','of','from','to','into','as','about',
  'over','under','through','between','among','after','before','during',
  'when','where','which','who','whom','whose','although','because',
  'since','if','unless','while','though',
  'suited','something','not','but also',
])

// 用于视觉骨架着色：主干 / 介词短语 / 从句
const PREP_STARTERS = new Set([
  'in','on','at','for','with','by','of','from','to','into','as','about',
  'over','under','through','between','among',
])
const CLAUSE_STARTERS = new Set([
  'when','where','which','who','whom','whose','although','because',
  'since','if','unless','while','though','that','after','before','during',
])

function firstWord(phrase) {
  return phrase.trim().split(/\s+/)[0].toLowerCase().replace(/[,.\-—]+$/, '')
}
function isModifier(phrase) {
  return MODIFIER_STARTERS.has(firstWord(phrase))
}
function chunkType(phrase) {
  const w = firstWord(phrase)
  if (CLAUSE_STARTERS.has(w)) return 'clause'
  if (PREP_STARTERS.has(w)) return 'prep'
  return 'core'
}

const state = {
  courseId: localStorage.getItem('courseId') || courses[0].id,
  lessonIdx: 0,
  phraseIdx: 0,
  typed: '',
  modifierMode: localStorage.getItem('modifierMode') === '1',
  skeletonMode: localStorage.getItem('skeletonMode') === '1',
  readingMode: localStorage.getItem('readingMode') === '1',
  fullStage: false,
  readingFullView: false,
}

function fullZh(lesson) {
  // 优先：句末整句自然翻译
  if (lesson.fullZh) return lesson.fullZh
  // 次选：清理过的 translation（AD/IELTS/Reviews 的 lesson 本身就是一句）
  let s = lesson.translation || ''
  s = s.replace(/\[[^\]]*\]\s*/g, '')
  s = s.replace(/【[^】]*】\s*/g, '')
  s = s.replace(/^[^？。.]*？→\s*/, '')
  s = s.replace(/→\s*/g, '')
  s = s.trim()
  if (s) return s
  // 兜底：拼接 zhPhrases（可能略显生硬）
  if (lesson.zhPhrases && lesson.zhPhrases.length) return lesson.zhPhrases.join('')
  return ''
}
function fullEn(lesson) {
  // 优先：跨多课的完整英文句
  if (lesson.fullEn) return lesson.fullEn
  return lesson.phrases.join(' ')
}
function isSentenceEndLesson(lesson) {
  // 如果 lesson 自带 fullZh 说明它是一句的结尾（或本身就是一句）
  if (lesson.fullZh) return true
  const last = lesson.phrases[lesson.phrases.length - 1] || ''
  return /[.!?](["')”’]*)?\s*$/.test(last)
}

function currentCourse() {
  return courses.find((c) => c.id === state.courseId) || courses[0]
}
function currentLesson() {
  return currentCourse().lessons[state.lessonIdx]
}
function rawChunk() {
  return currentLesson().phrases[state.phraseIdx]
}
function firstWordWithTail(s) {
  const m = s.trim().match(/^\S+/)
  return m ? m[0] : s
}
function inSkeletonHint() {
  if (state.fullStage || !state.skeletonMode) return false
  const t = chunkType(rawChunk())
  return t === 'prep' || t === 'clause'
}
function currentPhrase() {
  if (state.fullStage) return currentLesson().phrases.join(' ')
  const raw = rawChunk()
  if (inSkeletonHint()) return firstWordWithTail(raw)
  return raw
}
function inModifierPause() {
  // 整句阶段不参与修饰判断，避免句首 prep/clause 词被当作可跳过
  if (state.fullStage) return false
  return state.modifierMode && isModifier(rawChunk())
}

function loadProgress() {
  const raw = localStorage.getItem(`progress:${state.courseId}`)
  if (raw) {
    try {
      const p = JSON.parse(raw)
      const total = currentCourse().lessons.length
      state.lessonIdx = Math.min(Math.max(+p.lessonIdx || 0, 0), total - 1)
    } catch { state.lessonIdx = 0 }
  } else {
    state.lessonIdx = 0
  }
  state.phraseIdx = 0
}

function saveProgress() {
  localStorage.setItem('courseId', state.courseId)
  localStorage.setItem(`progress:${state.courseId}`, JSON.stringify({ lessonIdx: state.lessonIdx }))
}

function renderCourses() {
  selectEl.innerHTML = courses
    .map((c) => `<option value="${c.id}">${c.title}</option>`)
    .join('')
  selectEl.value = state.courseId
}

function render() {
  const course = currentCourse()
  const lesson = currentLesson()
  const phrases = lesson.phrases
  const phraseIdx = state.phraseIdx

  // 阅读模式：一次一块 chunk 高亮显示，← → 切换
  if (state.readingMode) {
    progressEl.textContent = `${state.lessonIdx + 1} / ${course.lessons.length}`

    // 整句整合视图：跑完所有 chunk 后一次性呈现完整中英文
    if (state.readingFullView) {
      translationEl.innerHTML =
        `<span class="full-tag">整句</span><span class="zh-full">${escapeHtml(fullZh(lesson))}</span>`
      slotsEl.innerHTML = phrases.map((p) => {
        const cls = `slot slot-type-${chunkType(p)} slot-done`
        return `<span class="${cls}" style="width:${Math.max(p.length * 9, 32)}px"></span>`
      }).join('')
      answerEl.innerHTML = `<span class="reading-chunk-full">${escapeHtml(fullEn(lesson))}</span>`
      input.value = ''
      state.typed = ''
      return
    }

    // 译文按 chunk 对齐高亮
    if (lesson.zhPhrases) {
      translationEl.innerHTML = lesson.zhPhrases.map((z, i) => {
        const cls = i === phraseIdx ? 'zh-active' : 'zh-pending'
        return `<span class="${cls}">${escapeHtml(z)}</span>`
      }).join('')
    } else {
      translationEl.textContent = lesson.translation || ''
    }

    // slots 同打字模式，指示骨架与当前位置
    slotsEl.innerHTML = phrases.map((p, i) => {
      let cls = `slot slot-type-${chunkType(p)}`
      if (i < phraseIdx) cls += ' slot-done'
      else if (i === phraseIdx) cls += ' slot-active'
      return `<span class="${cls}" style="width:${Math.max(p.length * 9, 32)}px"></span>`
    }).join('')

    // 句内高亮当前 chunk
    answerEl.innerHTML =
      phrases.map((p, i) => {
        const cls = i === phraseIdx ? 'reading-chunk-active'
          : i < phraseIdx ? 'reading-chunk-done'
          : 'reading-chunk-pending'
        return `<span class="${cls}">${escapeHtml(p)}</span>`
      }).join(' ')

    input.value = ''
    state.typed = ''
    return
  }

  // 译文：整句阶段显示整合后的完整中文；非整句阶段 chunk 对齐高亮
  if (state.fullStage) {
    translationEl.innerHTML = `<span class="zh-full">${escapeHtml(fullZh(lesson))}</span>`
  } else if (lesson.zhPhrases) {
    translationEl.innerHTML = lesson.zhPhrases.map((z, i) => {
      const cls = i === phraseIdx ? 'zh-active'
        : i < phraseIdx ? 'zh-done'
        : 'zh-pending'
      return `<span class="${cls}">${escapeHtml(z)}</span>`
    }).join('')
  } else {
    translationEl.textContent = lesson.translation || ''
  }
  progressEl.textContent = `${state.lessonIdx + 1} / ${course.lessons.length}`

  // slots — 按 chunk 类型着色。整句阶段全标记完成
  slotsEl.innerHTML = phrases.map((p, i) => {
    let cls = `slot slot-type-${chunkType(p)}`
    if (state.fullStage || i < phraseIdx) cls += ' slot-done'
    else if (i === phraseIdx) {
      cls += state.modifierMode && isModifier(p) ? ' slot-modifier' : ' slot-active'
    }
    return `<span class="${cls}" style="width:${Math.max(p.length * 9, 32)}px"></span>`
  }).join('')

  const target = currentPhrase()

  if (inModifierPause()) {
    // Show the modifier phrase with a label — no typing needed
    answerEl.innerHTML =
      `<span class="modifier-tag">修饰</span> ` +
      target.split('').map(ch =>
        `<span class="modifier-phrase">${ch === ' ' ? '&nbsp;' : escapeHtml(ch)}</span>`
      ).join('') +
      `<span class="modifier-hint"> Space / ↵</span>`
    input.value = ''
    state.typed = ''
    return
  }

  // Normal typing render (分块 & 整句阶段共用)
  const typed = state.typed
  let html = ''
  for (let i = 0; i < target.length; i++) {
    const ch = target[i]
    if (i < typed.length) {
      html += `<span class="${typed[i] === ch ? 'ok' : 'err'}">${ch === ' ' ? '&nbsp;' : escapeHtml(ch)}</span>`
    } else if (i === typed.length) {
      html += `<span class="caret"></span><span class="pending">${ch === ' ' ? '&nbsp;' : escapeHtml(ch)}</span>`
    } else {
      html += `<span class="pending">${ch === ' ' ? '&nbsp;' : escapeHtml(ch)}</span>`
    }
  }
  if (state.fullStage) {
    html = `<span class="full-tag">整句</span>` + html + `<span class="modifier-hint"> ↵ 跳过</span>`
  } else if (inSkeletonHint()) {
    const raw = rawChunk()
    const first = firstWordWithTail(raw)
    const rest = raw.slice(first.length)
    html = `<span class="skeleton-tag">骨架</span>` + html +
      `<span class="skeleton-rest">${escapeHtml(rest)}</span>`
  }
  answerEl.innerHTML = html
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

function normalize(s) {
  return s.replace(/[\s.!?,;:"']+$/g, '').trim()
}

function readingStep(dir) {
  const course = currentCourse()
  const lesson = currentLesson()

  // 处于整句整合视图
  if (state.readingFullView) {
    if (dir > 0) {
      // 前进 → 下一课
      if (state.lessonIdx < course.lessons.length - 1) {
        state.lessonIdx++
        state.phraseIdx = 0
        state.readingFullView = false
        saveProgress()
        render()
      }
    } else {
      // 回退 → 回到最后一个 chunk
      state.readingFullView = false
      state.phraseIdx = lesson.phrases.length - 1
      render()
    }
    return
  }

  const nextPhrase = state.phraseIdx + dir
  if (nextPhrase >= 0 && nextPhrase < lesson.phrases.length) {
    state.phraseIdx = nextPhrase
    render()
    return
  }
  // 前进过最后一个 chunk：仅在句末 lesson 才展示整合视图，否则直接进入下一课
  if (dir > 0) {
    if (isSentenceEndLesson(lesson)) {
      state.readingFullView = true
      render()
      return
    }
    if (state.lessonIdx < course.lessons.length - 1) {
      state.lessonIdx++
      state.phraseIdx = 0
      saveProgress()
      render()
    }
    return
  }
  // 回退跨课
  if (dir < 0 && state.lessonIdx > 0) {
    state.lessonIdx--
    const prev = currentLesson()
    state.phraseIdx = prev.phrases.length - 1
    state.readingFullView = isSentenceEndLesson(prev)
    saveProgress()
    render()
  }
}

function advance() {
  state.typed = ''
  input.value = ''
  const lesson = currentLesson()
  const course = currentCourse()

  // 整句阶段完成 → 进入下一句
  if (state.fullStage) {
    state.fullStage = false
    if (state.lessonIdx < course.lessons.length - 1) {
      state.lessonIdx++
      state.phraseIdx = 0
      saveProgress()
      render()
      input.focus()
    } else {
      translationEl.innerHTML = '<span class="done">本课完成！</span>'
    }
    return
  }

  // 还没到最后一个 chunk
  if (state.phraseIdx < lesson.phrases.length - 1) {
    state.phraseIdx++
    render()
    return
  }

  // 最后一个 chunk 完成 → 进入整句阶段（可打字，回车跳过）
  state.fullStage = true
  render()
  input.focus()
}

input.addEventListener('input', (e) => {
  if (state.readingMode) { input.value = ''; return }
  if (inModifierPause()) { input.value = ''; return }
  state.typed = e.target.value
  render()
  if (state.typed === currentPhrase()) advance()
})

document.addEventListener('keydown', (e) => {
  if (state.readingMode) {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      readingStep(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      readingStep(-1)
    }
    return
  }
  if (inModifierPause()) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      advance()
      if (!inModifierPause()) input.focus()
    }
    return
  }

  if (e.key === 'Enter') {
    const target = currentPhrase()
    // 整句阶段允许直接回车跳过；普通阶段仍需近似正确
    if (state.fullStage || state.typed === target || normalize(state.typed) === normalize(target)) advance()
  } else if (e.key === 'Escape') {
    state.typed = ''
    input.value = ''
    render()
  } else if (e.key === 'Tab') {
    e.preventDefault()
    const target = currentPhrase()
    if (state.typed.length < target.length) {
      state.typed = target.slice(0, state.typed.length + 1)
      input.value = state.typed
      render()
    }
  }
  input.focus()
})

document.addEventListener('click', (e) => {
  const navBtns = [selectEl, modifierBtn, skeletonBtn, readingBtn]
  if (navBtns.includes(e.target)) return
  if (state.readingMode) {
    readingStep(e.clientX < window.innerWidth / 2 ? -1 : 1)
    return
  }
  input.focus()
})

selectEl.addEventListener('change', () => {
  state.courseId = selectEl.value
  state.fullStage = false
  state.readingFullView = false
  loadProgress()
  state.typed = ''
  input.value = ''
  render()
})

// 修饰 / 骨架 / 阅读 三个模式互斥
function applyModes() {
  modifierBtn.classList.toggle('active', state.modifierMode)
  modifierBtn.title = state.modifierMode ? '修饰模式：已开启（介词/从句自动跳过）' : '开启修饰模式'
  skeletonBtn.classList.toggle('active', state.skeletonMode)
  skeletonBtn.title = state.skeletonMode ? '骨架模式：已开启（修饰只打首词）' : '开启骨架模式'
  readingBtn.classList.toggle('active', state.readingMode)
  readingBtn.title = state.readingMode ? '阅读模式：已开启（← → 翻页）' : '开启阅读模式'
  document.body.classList.toggle('reading-active', state.readingMode)
}

function setMode(key) {
  // 点击激活的切回关闭；点击未激活的则独占
  const next = !state[key]
  state.modifierMode = false
  state.skeletonMode = false
  state.readingMode = false
  state[key] = next
  state.fullStage = false
  state.readingFullView = false
  localStorage.setItem('modifierMode', state.modifierMode ? '1' : '0')
  localStorage.setItem('skeletonMode', state.skeletonMode ? '1' : '0')
  localStorage.setItem('readingMode', state.readingMode ? '1' : '0')
  state.typed = ''
  input.value = ''
  applyModes()
  render()
  input.focus()
}

modifierBtn.addEventListener('click', () => setMode('modifierMode'))
skeletonBtn.addEventListener('click', () => setMode('skeletonMode'))
readingBtn.addEventListener('click', () => setMode('readingMode'))

// 主题切换
const themeBtn = document.getElementById('theme-toggle')
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light')
  themeBtn.textContent = '🌙'
}
themeBtn.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light')
  themeBtn.textContent = isLight ? '🌙' : '☀'
  localStorage.setItem('theme', isLight ? 'light' : 'dark')
})

renderCourses()
loadProgress()
applyModes()
render()
input.focus()
