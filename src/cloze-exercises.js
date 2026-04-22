const modules = import.meta.glob('../cloze/*.json', { eager: true })

export const exercises = Object.entries(modules)
  .map(([path, mod]) => {
    const data = mod.default || mod
    const id = path.split('/').pop().replace(/\.json$/, '')
    return { id, ...data }
  })
  .sort((a, b) => a.id.localeCompare(b.id))
