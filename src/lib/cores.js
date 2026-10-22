// Paleta usada para dar uma cor a cada documento (Administração → Listas → Documentos).
export const PALETA_DOCUMENTOS = ['#2f4c73', '#2a438c', '#30cff2', '#5C8A6E', '#D4D943', '#E0884B', '#C1594B', '#a64170', '#8B5CF6', '#14B8A6', '#64748B', '#101733']
export const COR_PADRAO_DOCUMENTO = '#94a3b8'

// Texto claro ou escuro, conforme o brilho do fundo.
export function corDoTexto(hex) {
  const h = String(hex || COR_PADRAO_DOCUMENTO).replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminosidade = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminosidade > 0.62 ? '#101733' : '#ffffff'
}
