// Resultado FINAL do candidato (entrevista + teste de digitação):
//  - reprovado na entrevista                      => "Reprovado" (o resultado do teste continua guardado, intacto);
//  - aprovado na entrevista e aprovado no teste   => o resultado da regra do teste (ex.: Chat, Voz);
//  - aprovado na entrevista e reprovado no teste  => "Reprovado";
//  - ainda sem os dois resultados                 => pendente.
// O banco mantém a coluna resultado_final por gatilho; esta função serve para pré-visualizar.
export const PENDENTE = 'Pendente'

export function calcularResultadoFinal(c) {
  if (c.aprovado_entrevista === false) return 'Reprovado'
  if (c.teste_realizado === true && c.aprovado_teste != null) return c.aprovado_teste ? c.resultado_teste || 'Aprovado' : 'Reprovado'
  return null
}

// Opções do filtro: resultados aprovados da regra (Chat, Voz…) + os que existem nos dados, depois Reprovado e Pendente.
export function opcoesResultado(dados = [], regras = []) {
  const set = new Set()
  ;(regras || []).filter((r) => r.aprova && r.ativo !== false).forEach((r) => set.add(r.resultado))
  ;(dados || []).forEach((c) => {
    if (c.resultado_final) set.add(c.resultado_final)
  })
  set.delete('Reprovado')
  return [...[...set].sort(), 'Reprovado', PENDENTE]
}

export function estiloResultado(r) {
  const k = String(r || PENDENTE).toLowerCase()
  if (k.includes('chat')) return '#1AB6D8'
  if (k.includes('voz')) return '#2f4c73'
  if (k.includes('reprov')) return '#C1594B'
  if (k.includes('pend')) return '#94a3b8'
  return '#5C8A6E'
}

export function rotuloResultado(r) {
  return r === 'Reprovado' ? 'Reprovado(a)' : r
}
