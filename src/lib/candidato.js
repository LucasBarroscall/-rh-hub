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

import { statusAtual, corStatus } from './status'

// Etapa atual do candidato no funil — usada em filtros e no dashboard.
// (Delegado para lib/status.js, que é a fonte única da sequência oficial.)
export function etapaFunil(c) {
  return statusAtual(c)
}

export function corEtapa(etapa) {
  return corStatus(etapa)
}

export function etapa1Completa(c) {
  return c.compareceu_entrevista === false || (c.compareceu_entrevista === true && (c.aprovado_entrevista === true || c.aprovado_entrevista === false))
}

export function etapa2Completa(c) {
  return c.teste_realizado === false || (c.teste_realizado === true && c.wpm != null && c.precisao != null)
}

export function etapa3Completa(c) {
  return c.decisao_final === 'Aprovado' || c.decisao_final === 'Reprovado'
}

export function faixaEtariaDe(idade) {
  if (idade == null) return null
  if (idade < 18) return '<18'
  if (idade <= 24) return '18-24'
  if (idade <= 34) return '25-34'
  if (idade <= 44) return '35-44'
  return '45+'
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
