// Padrão único dos horários (cadastro, edição, importação e exportação):
//  - disponibilidade_horario_trabalho: só as opções, em maiúsculas, da mais cedo para a mais tarde e unidas por " | ":
//      "MANHÃ" | "TARDE" | "NOITE" | "MADRUGADA" | "MANHÃ | TARDE | NOITE | MADRUGADA" (e qualquer combinação, sempre nessa ordem)
//  - disponibilidade_horario_treinamento: "MANHÃ" | "TARDE" | "MANHÃ | TARDE"
// As descrições de horário (ex.: "Das 06:00 às 18:00 (Manhã e Tarde)") existem só na tela do site.
export const TURNOS_ORDEM = ['MANHÃ', 'TARDE', 'NOITE', 'MADRUGADA']

const VAZIO = { manha: false, tarde: false, noite: false, madrugada: false }
const TODOS = { manha: true, tarde: true, noite: true, madrugada: true }

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Texto exibido na tela (feedback em tempo real e detalhes do candidato) — NÃO é gravado no banco.
export function calcularTextoTurnos({ manha, tarde, noite, madrugada }) {
  if (!manha && !tarde && !noite && !madrugada) {
    return 'Nenhum horário selecionado'
  }
  if (manha && tarde && noite && madrugada) {
    return 'Disponibilidade Total (24 horas por dia)'
  }

  // Blocos contínuos de 2 ou 3 turnos
  if (madrugada && manha && !tarde && !noite) return 'Das 00:00 às 12:00 (Madrugada e Manhã)'
  if (manha && tarde && !noite && !madrugada) return 'Das 06:00 às 18:00 (Manhã e Tarde)'
  if (tarde && noite && !manha && !madrugada) return 'Das 12:00 às 00:00 (Tarde e Noite)'
  if (noite && madrugada && !manha && !tarde) return 'Das 18:00 (Noite) até às 06:00 do dia seguinte'

  if (madrugada && manha && tarde && !noite) return 'Das 00:00 às 18:00 (abrangendo Madrugada, Manhã e Tarde)'
  if (manha && tarde && noite && !madrugada) return 'Das 06:00 às 00:00 (abrangendo Manhã, Tarde e Noite)'
  if (tarde && noite && madrugada && !manha)
    return 'Das 12:00 (Tarde) até às 06:00 do dia seguinte (abrangendo Tarde, Noite e Madrugada)'
  if (noite && madrugada && manha && !tarde)
    return 'Das 18:00 (Noite) até às 12:00 do dia seguinte (abrangendo Noite, Madrugada e Manhã)'

  // Turnos individuais puros
  if (manha && !tarde && !noite && !madrugada) return 'Das 06:00 às 12:00 (Apenas Manhã)'
  if (tarde && !manha && !noite && !madrugada) return 'Das 12:00 às 18:00 (Apenas Tarde)'
  if (noite && !manha && !tarde && !madrugada) return 'Das 18:00 às 00:00 (Apenas Noite)'
  if (madrugada && !manha && !tarde && !noite) return 'Das 00:00 às 06:00 (Apenas Madrugada)'

  // Horários picados (ordenados cronologicamente por quem começa mais cedo)
  const partes = []
  if (madrugada) partes.push('00:00 às 06:00 (Madrugada)')
  if (manha) partes.push('06:00 às 12:00 (Manhã)')
  if (tarde) partes.push('12:00 às 18:00 (Tarde)')
  if (noite) partes.push('18:00 às 00:00 (Noite)')
  return `Disponibilidade: ${partes.join(' e/ou ')}`
}

// Entende o valor atual, venha como vier: padrão novo, "Total", frases antigas, "Manhã/Tarde"…
export function interpretarTurnos(valor) {
  if (!valor) return VAZIO
  for (let i = 0; i < 16; i++) {
    const s = { manha: !!(i & 1), tarde: !!(i & 2), noite: !!(i & 4), madrugada: !!(i & 8) }
    if (calcularTextoTurnos(s) === valor) return s
  }
  const t = semAcento(valor)
  if (t.includes('total') || t.includes('24 horas')) return TODOS
  const sel = { manha: t.includes('manha'), tarde: t.includes('tarde'), noite: t.includes('noite'), madrugada: t.includes('madrugada') }
  // frase antiga "Das 18:00 (Noite) até às 06:00 do dia seguinte" = Noite + Madrugada
  if (sel.noite && !sel.madrugada && t.includes('ate as 06:00 do dia seguinte') && !t.includes('abrangendo')) sel.madrugada = true
  return sel
}

export function turnosParaValor(sel) {
  return TURNOS_ORDEM.filter((_, i) => [sel.manha, sel.tarde, sel.noite, sel.madrugada][i]).join(' | ')
}

export function normalizarTurnosTrabalho(texto) {
  if (texto === null || texto === undefined || String(texto).trim() === '') return ''
  const v = turnosParaValor(interpretarTurnos(String(texto).trim()))
  return v || String(texto).trim().toUpperCase()
}

export function normalizarTurnosTreinamento(texto) {
  if (texto === null || texto === undefined || String(texto).trim() === '') return ''
  const t = semAcento(texto)
  const manha = t.includes('manha')
  const tarde = t.includes('tarde')
  if ((manha && tarde) || t.includes('total')) return 'MANHÃ | TARDE'
  if (manha) return 'MANHÃ'
  if (tarde) return 'TARDE'
  return String(texto).trim().toUpperCase()
}

// Descrição para mostrar na tela (nunca vai para o banco nem para as planilhas).
export function descricaoTurnos(valor) {
  if (!valor) return '—'
  const sel = interpretarTurnos(valor)
  return turnosParaValor(sel) ? calcularTextoTurnos(sel) : valor
}
