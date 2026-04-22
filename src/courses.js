// 所有课程通过 Vite 的 import.meta.glob 自动打包
const modules = import.meta.glob('../courses/*.json', { eager: true })

// 兼容两种格式：
//  新格式 { lessons: [{ translation, phrases: [...] }] }
//  旧格式 { statements: [{ english, chinese }] }  → 每句当作单个短语
// 把键盘打不出来的 Unicode 标点换成 ASCII 近似
function asciify(s) {
  return s
    .replace(/[\u2014\u2013]/g, '-')   // — – → -
    .replace(/[\u2018\u2019]/g, "'")    // ' ' → '
    .replace(/[\u201C\u201D]/g, '"')    // " " → "
    .replace(/\u2026/g, '...')          // … → ...
    .replace(/\u00A0/g, ' ')            // nbsp → space
}

function normalize(data, id) {
  if (Array.isArray(data.lessons)) {
    return {
      id,
      title: data.title || id,
      lessons: data.lessons.map((l) => ({
        translation: l.translation || '',
        phrases: (l.phrases || []).filter(Boolean).map(asciify),
      })),
    }
  }
  const statements = data.statements || []
  return {
    id,
    title: data.title || id,
    lessons: statements.map((s) => ({
      translation: s.chinese || '',
      phrases: [asciify(s.english)],
    })),
  }
}

export const courses = Object.entries(modules)
  .map(([path, mod]) => {
    const data = mod.default || mod
    const id = path.split('/').pop().replace(/\.json$/, '')
    return normalize(data, id)
  })
  .sort((a, b) => a.id.localeCompare(b.id))
