import { courses } from './courses.js'

const $ = (id) => document.getElementById(id)
const input = $('input')
const answerEl = $('answer')
const slotsEl = $('slots')
const translationEl = $('translation')
const progressEl = $('progress')
const selectEl = $('course-select')

const state = {
  courseId: localStorage.getItem('courseId') || courses[0].id,
  lessonIdx: 0,
  phraseIdx: 0,
  typed: '',
}

function currentCourse() {
  return courses.find((c) => c.id === state.courseId) || courses[0]
}
function currentLesson() {
  return currentCourse().lessons[state.lessonIdx]
}
function currentPhrase() {
  return currentLesson().phrases[state.phraseIdx]
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

  // 顶部：当前 chunk 的中文注释（来自 translation 字段，只有一条）
  translationEl.textContent = lesson.translation || ''
  progressEl.textContent = `${state.lessonIdx + 1} / ${course.lessons.length}`

  // slots：每个短语一格
  slotsEl.innerHTML = phrases.map((p, i) => {
    let cls = 'slot'
    if (i < phraseIdx) cls += ' slot-done'
    else if (i === phraseIdx) cls += ' slot-active'
    return `<span class="${cls}" style="width:${Math.max(p.length * 9, 32)}px"></span>`
  }).join('')

  // 当前 chunk 逐字符渲染
  const target = currentPhrase()
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

  if (state.phraseIdx < lesson.phrases.length - 1) {
    state.phraseIdx++
  } else if (state.lessonIdx < course.lessons.length - 1) {
    state.lessonIdx++
    state.phraseIdx = 0
    saveProgress()
  } else {
    translationEl.innerHTML = '<span class="done">本课完成！</span>'
    return
  }
  render()
}

input.addEventListener('input', (e) => {
  state.typed = e.target.value
  render()
  if (state.typed === currentPhrase()) advance()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const target = currentPhrase()
    if (state.typed === target || normalize(state.typed) === normalize(target)) advance()
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
  if (e.target !== selectEl) input.focus()
})

selectEl.addEventListener('change', () => {
  state.courseId = selectEl.value
  loadProgress()
  state.typed = ''
  input.value = ''
  render()
})

renderCourses()
loadProgress()
render()
input.focus()
