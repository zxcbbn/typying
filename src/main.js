import { courses } from './courses.js'

const $ = (id) => document.getElementById(id)
const input = $('input')
const answerEl = $('answer')
const slotsEl = $('slots')
const translationEl = $('translation')
const progressEl = $('progress')
const selectEl = $('course-select')
const modifierBtn = $('modifier-toggle')

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
  fullStage: false,
}

function currentCourse() {
  return courses.find((c) => c.id === state.courseId) || courses[0]
}
function currentLesson() {
  return currentCourse().lessons[state.lessonIdx]
}
function currentPhrase() {
  if (state.fullStage) return currentLesson().phrases.join(' ')
  return currentLesson().phrases[state.phraseIdx]
}
function inModifierPause() {
  return state.modifierMode && isModifier(currentPhrase())
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

  // 译文：若有 zhPhrases 就按 chunk 对齐高亮，否则退回整句
  if (lesson.zhPhrases) {
    translationEl.innerHTML = lesson.zhPhrases.map((z, i) => {
      const cls = state.fullStage ? 'zh-done'
        : i === phraseIdx ? 'zh-active'
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
  if (inModifierPause()) { input.value = ''; return }
  state.typed = e.target.value
  render()
  if (state.typed === currentPhrase()) advance()
})

document.addEventListener('keydown', (e) => {
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
  if (e.target !== selectEl && e.target !== modifierBtn) input.focus()
})

selectEl.addEventListener('change', () => {
  state.courseId = selectEl.value
  state.fullStage = false
  loadProgress()
  state.typed = ''
  input.value = ''
  render()
})

// 修饰模式切换
function applyModifierMode() {
  modifierBtn.classList.toggle('active', state.modifierMode)
  modifierBtn.title = state.modifierMode ? '修饰模式：已开启（介词/从句自动跳过）' : '开启修饰模式'
}

modifierBtn.addEventListener('click', () => {
  state.modifierMode = !state.modifierMode
  localStorage.setItem('modifierMode', state.modifierMode ? '1' : '0')
  state.typed = ''
  input.value = ''
  applyModifierMode()
  render()
  input.focus()
})

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
applyModifierMode()
render()
input.focus()
