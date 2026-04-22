// 所有课程通过 Vite 的 import.meta.glob 自动打包
const modules = import.meta.glob('../courses/*.json', { eager: true })

// 兼容两种格式：
//  新格式 { lessons: [{ translation, phrases: [...] }] }
//  旧格式 { statements: [{ english, chinese }] }  → 每句当作单个短语
function normalize(data, id) {
  if (Array.isArray(data.lessons)) {
    return {
      id,
      title: data.title || id,
      lessons: data.lessons.map((l) => ({
        translation: l.translation || '',
        phrases: (l.phrases || []).filter(Boolean),
      })),
    }
  }
  const statements = data.statements || []
  return {
    id,
    title: data.title || id,
    lessons: statements.map((s) => ({
      translation: s.chinese || '',
      phrases: [s.english],
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
