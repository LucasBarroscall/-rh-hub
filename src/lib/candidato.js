// Regras de negócio e formatação compartilhadas entre as páginas.

export const FONTES = ['Redes Sociais', 'Indicação', 'Outros']

export const SEXOS = ['Feminino', 'Masculino', 'Outro', 'Prefiro não informar']

export const DISPONIBILIDADES_TRABALHO = [
  'Manhã',
  'Tarde',
  'Noite',
  'Manhã/Tarde',
  'Tarde/Noite',
  'Flexível',
]

export const DISPONIBILIDADES_TREINAMENTO = ['Manhã/Tarde', 'Tarde/Noite']

export const DISPONIBILIDADES_JORNADA = ['Meio período', 'Período integral', 'Escala 6x1', 'Escala 5x2']

// Etapa atual do candidato no funil — usada em filtros e no dashboard.
export function etapaFunil(c) {
  if (c.decisao_final === 'Aprovado' && c.contatado_whatsapp) return 'Contratação em andamento'
  if (c.decisao_final === 'Reprovado') return 'Reprovado'
  if (c.aprovado_entrevista === false) return 'Reprovado na entrevista'
  if (c.aprovado_entrevista === true && c.teste_realizado !== true) return 'Aguardando teste'
  if (c.aprovado_teste === false) return 'Reprovado no teste'
  if (c.aprovado_teste === true && !c.decisao_final) return 'Aguardando decisão final'
  if (c.compareceu_entrevista === null || c.compareceu_entrevista === undefined) return 'Aguardando entrevista'
  return 'Em andamento'
}

export function corEtapa(etapa) {
  const mapa = {
    'Aguardando entrevista': 'bg-navy-100 text-navy-700',
    'Em andamento': 'bg-navy-100 text-navy-700',
    'Reprovado na entrevista': 'bg-clay-500/15 text-clay-600',
    'Aguardando teste': 'bg-amber-400/20 text-amber-600',
    'Reprovado no teste': 'bg-clay-500/15 text-clay-600',
    'Aguardando decisão final': 'bg-amber-400/20 text-amber-600',
    Reprovado: 'bg-clay-500/15 text-clay-600',
    'Contratação em andamento': 'bg-sage-500/15 text-sage-600',
  }
  return mapa[etapa] || 'bg-navy-100 text-navy-700'
}

export function simNaoOuVazio(v) {
  if (v === true) return 'Sim'
  if (v === false) return 'Não'
  return '—'
}

export function formatarData(d) {
  if (!d) return '—'
  const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''))
  return dt.toLocaleDateString('pt-BR')
}

export function formatarDataHora(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}
