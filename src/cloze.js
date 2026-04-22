import { exercises } from './cloze-exercises.js'

const $ = (id) => document.getElementById(id)

const selectScreen = $('cloze-select-screen')
const exerciseScreen = $('cloze-exercise')
const listEl = $('cloze-list')
const roundTabsEl = $('round-tabs')
const roundDescEl = $('round-desc')
const roundContentEl = $('round-content')
const progressEl = $('cloze-progress')
const backBtn = $('back-to-list')

let current = null   // { exercise, roundIdx }

// ── 列表页 ──────────────────────────────────────────────────────────────
function renderList() {
  if (exercises.length === 0) {
    listEl.innerHTML = '<p class="cloze-hint muted">还没有填空练习。把文章发给 Claude，它会生成 JSON 存到 cloze/ 目录里。</p>'
    return
  }
  listEl.innerHTML = exercises.map((ex) => `
    <button class="cloze-card" data-id="${ex.id}">
      <span class="cloze-card-title">${ex.title || ex.id}</span>
      <span class="cloze-card-meta">${ex.rounds?.length ?? 0} 轮</span>
    </button>
  `).join('')

  listEl.querySelectorAll('.cloze-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ex = exercises.find((e) => e.id === btn.dataset.id)
      if (ex) openExercise(ex)
    })
  })
}

// ── 练习页 ──────────────────────────────────────────────────────────────
function openExercise(ex) {
  current = { exercise: ex, roundIdx: 0 }
  selectScreen.classList.add('hidden')
  exerciseScreen.classList.remove('hidden')
  renderRoundTabs()
  renderRound(0)
}

function renderRoundTabs() {
  const rounds = current.exercise.rounds
  roundTabsEl.innerHTML = rounds.map((r, i) => `
    <button class="round-tab${i === current.roundIdx ? ' active' : ''}" data-i="${i}">
      ${r.name}
    </button>
  `).join('')
  roundTabsEl.querySelectorAll('.round-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      current.roundIdx = +btn.dataset.i
      renderRoundTabs()
      renderRound(current.roundIdx)
    })
  })
}

function renderRound(idx) {
  const round = current.exercise.rounds[idx]
  roundDescEl.textContent = round.description || ''

  // 渲染 tokens：text 直接输出，blank 渲染 input
  let html = '<p class="cloze-text">'
  let blankIdx = 0
  for (const tok of round.tokens) {
    if (tok.t === 'text') {
      html += escapeHtml(tok.v).replace(/\n/g, '<br>')
    } else {
      const w = Math.max((tok.answer?.length ?? 4) * 11 + 8, 40)
      html += `<input class="blank" data-answer="${escapeAttr(tok.answer)}" data-idx="${blankIdx}"
        placeholder="${escapeAttr(tok.hint || tok.answer[0])}"
        style="width:${w}px" autocomplete="off" spellcheck="false" autocapitalize="off" />`
      blankIdx++
    }
  }
  html += '</p>'
  roundContentEl.innerHTML = html

  const blanks = roundContentEl.querySelectorAll('.blank')
  const total = blanks.length

  function updateProgress() {
    const done = [...blanks].filter((b) => b.classList.contains('correct')).length
    progressEl.textContent = `${done} / ${total}`
  }

  blanks.forEach((input, i) => {
    function normalize(s) {
      return s.trim().replace(/[.,!?;:"']+$/g, '').toLowerCase()
    }
    input.addEventListener('input', () => {
      const typed = input.value
      const answer = input.dataset.answer
      if (normalize(typed) === normalize(answer)) {
        input.classList.add('correct')
        input.classList.remove('wrong')
        input.disabled = true
        updateProgress()
        // 跳到下一个未完成的空
        const next = [...blanks].find((b, j) => j > i && !b.classList.contains('correct'))
        if (next) next.focus()
      }
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const typed = input.value.trim()
        const answer = input.dataset.answer
        if (normalize(typed) === normalize(answer)) {
          input.classList.add('correct')
          input.classList.remove('wrong')
          input.disabled = true
          updateProgress()
          const next = [...blanks].find((b, j) => j > i && !b.classList.contains('correct'))
          if (next) next.focus()
        } else {
          input.classList.add('wrong')
          input.classList.remove('correct')
          setTimeout(() => {
            input.classList.remove('wrong')
            input.value = ''
          }, 600)
        }
      }
    })
  })

  updateProgress()
  if (blanks.length) blanks[0].focus()
}

backBtn.addEventListener('click', () => {
  exerciseScreen.classList.add('hidden')
  selectScreen.classList.remove('hidden')
  current = null
})

// ── Tab 切换（跟打/填空）──────────────────────────────────────────────
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'))
    document.querySelectorAll('.page').forEach((p) => p.classList.add('hidden'))
    btn.classList.add('active')
    document.getElementById(`page-${btn.dataset.tab}`).classList.remove('hidden')
    if (btn.dataset.tab === 'cloze') renderList()
  })
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function escapeAttr(s) {
  return String(s ?? '').replace(/"/g, '&quot;')
}
