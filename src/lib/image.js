// Helper de upload de imagem (logos de time, fotos de campeão).
// Lê um arquivo escolhido pelo usuário e devolve uma string base64 (data URL),
// que é o que gravamos no banco. Rejeita arquivos grandes para não estourar o
// tamanho do documento no Supabase.
//
// Uso típico dentro de um onChange de <input type="file">:
//   readImageFile(e.target.files?.[0], (base64) => updateTeam(id, { logo: base64 }))

const MAX_BYTES = 300_000 // 300 KB

export function readImageFile(file, onDone) {
  if (!file) return
  if (file.size > MAX_BYTES) {
    alert('Imagem muito grande (máx 300 KB). Comprima antes de carregar.')
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => onDone(ev.target.result) // ev.target.result = "data:image/...;base64,..."
  reader.readAsDataURL(file)
}

// ── Leitura COM compressão no navegador (canvas) ────────────────────
// Para fotos de caderno/prints (2–8 MB direto do celular): redimensiona
// para caber em `maxDim` e exporta JPEG — vira ~150–400 KB sem o usuário
// precisar comprimir antes. Devolve a data URL via onDone.
export function readImageCompressed(file, onDone, { maxDim = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff' // fundo p/ PNGs transparentes (JPEG não tem alfa)
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      onDone(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}
