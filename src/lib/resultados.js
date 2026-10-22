// Resultado FINAL do candidato (entrevista + teste de digitação). Só existem 4 formas:
//   "Aprovado(a) - Chat" / "Aprovado(a) - Voz" (aprovado na entrevista E no teste; o tipo vem da regra do teste),
//   "Reprovado(a)" (reprovado na entrevista OU no teste — o resultado do teste continua guardado, intacto),
//   "Pendente" (ainda sem os dois resultados).
// O banco mantém a coluna resultado_final por gatilho; estas funções servem para pré-visualizar e filtrar.
export const PENDENTE = 'Pendente'
export const REPROVADO = 'Reprovado(a)'

export function rotuloAprovado(resultadoTeste) {
  const r = String(resultadoTeste || '').trim()
  if (!r || ['aprovado', 'aprovado(a)'].includes(r.toLowerCase())) return 'Aprovado(a)'
  return `Aprovado(a) - ${r}`
}

export function calcularResultadoFinal(c) {
  if (c.aprovado_entrevista === false) return REPROVADO
  if (c.teste_realizado === true && c.aprovado_teste != null) return c.aprovado_teste ? rotuloAprovado(c.resultado_teste) : REPROVADO
  return null
}

// Opções do filtro: aprovados da regra (Aprovado(a) - Chat…) + os que existem nos dados, depois Reprovado(a) e Pendente.
export function opcoesResultado(dados = [], regras = []) {
  const set = new Set()
  ;(regras || []).filter((r) => r.aprova && r.ativo !== false).forEach((r) => set.add(rotuloAprovado(r.resultado)))
  ;(dados || []).forEach((c) => {
    if (c.resultado_final && c.resultado_final !== REPROVADO && c.resultado_final !== 'Reprovado') set.add(c.resultado_final)
  })
  return [...[...set].sort(), REPROVADO, PENDENTE]
}

export function estiloResultado(r) {
  const k = String(r || PENDENTE).toLowerCase()
  if (k.includes('reprov')) return '#C1594B'
  if (k.includes('chat')) return '#1AB6D8'
  if (k.includes('voz')) return '#2f4c73'
  if (k.includes('pend')) return '#94a3b8'
  return '#5C8A6E'
}

export function rotuloResultado(r) {
  return r === 'Reprovado' ? REPROVADO : r
}
