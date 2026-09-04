// Sequência oficial do funil (nessa ordem) — usada no funil do dashboard,
// no cálculo de status atual e no tempo entre etapas.
export const ETAPAS_FUNIL = [
  { chave: 'cadastro', label: 'Cadastro', dataCampo: 'created_at', alcancado: () => true },
  { chave: 'entrevista', label: 'Entrevista', dataCampo: 'entrevista_em', alcancado: (c) => c.compareceu_entrevista === true },
  { chave: 'teste', label: 'Teste de Digitação', dataCampo: 'teste_em', alcancado: (c) => c.teste_realizado === true },
  { chave: 'contato', label: 'Contato no WhatsApp', dataCampo: 'data_contato_whatsapp', alcancado: (c) => c.contatado_whatsapp === true },
  { chave: 'doc_solicitada', label: 'Documentação Solicitada', dataCampo: 'data_documentacao_solicitada', alcancado: (c) => c.documentacao_solicitada === true },
  { chave: 'doc_enviada', label: 'Documentação Enviada', dataCampo: 'data_envio_documentacao', alcancado: (c) => c.enviou_documentacao === true },
  { chave: 'doc_aprovada', label: 'Documentação Aprovada', dataCampo: null, alcancado: (c) => c.aprovado_documentacao === true },
  { chave: 'exame_marcado', label: 'Data do Exame', dataCampo: 'data_exame', alcancado: (c) => !!c.data_exame },
  { chave: 'exame_compareceu', label: 'Compareceu no Exame', dataCampo: null, alcancado: (c) => c.compareceu_exame === true },
  { chave: 'exame_aprovado', label: 'Aprovado no Exame', dataCampo: null, alcancado: (c) => c.aprovado_exame === true },
  { chave: 'onboarding_data', label: 'Data do Onboarding', dataCampo: 'data_onboarding', alcancado: (c) => !!c.data_onboarding },
  { chave: 'onboarding', label: 'Onboarding', dataCampo: null, alcancado: (c) => c.compareceu_onboarding === true },
  { chave: 'treinamento_data', label: 'Data do Treinamento', dataCampo: 'data_treinamento', alcancado: (c) => !!c.data_treinamento },
  { chave: 'treinamento', label: 'Treinamento', dataCampo: null, alcancado: (c) => c.compareceu_treinamento === true },
  { chave: 'alo_data', label: 'Data do Alô', dataCampo: 'data_alo', alcancado: (c) => !!c.data_alo },
  { chave: 'alo', label: 'Alô', dataCampo: null, alcancado: (c) => c.compareceu_alo === true },
  { chave: 'entrega', label: 'Entrega Realizada', dataCampo: null, alcancado: (c) => c.compareceu_alo === true },
]

// Etapas "de marco" usadas no funil visual do dashboard (uma barra por
// marco, não uma por sub-passo de data) — evita um funil de 17 barras.
export const MARCOS_FUNIL = [
  'cadastro',
  'entrevista',
  'teste',
  'contato',
  'doc_enviada',
  'doc_aprovada',
  'exame_compareceu',
  'exame_aprovado',
  'onboarding',
  'treinamento',
  'alo',
]

export function exameAtrasado(c) {
  if (!c.data_exame || c.compareceu_exame === true) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(c.data_exame + 'T00:00:00') < hoje
}

export function statusAtual(c) {
  if (c.aprovado_entrevista === false) return 'Reprovado na entrevista'
  if (c.aprovado_teste === false) return 'Reprovado no teste'
  if (c.decisao_final === 'Reprovado') return 'Reprovado'
  if (exameAtrasado(c)) return 'Exame atrasado'

  let atual = ETAPAS_FUNIL[0]
  for (const etapa of ETAPAS_FUNIL) {
    if (etapa.alcancado(c)) atual = etapa
    else break
  }
  return atual.label
}

export function corStatus(status) {
  if (status.includes('Reprovado')) return 'bg-clay-500/15 text-clay-600'
  if (status === 'Exame atrasado') return 'bg-clay-500/15 text-clay-600'
  if (status === 'Entrega Realizada') return 'bg-sage-500/15 text-sage-600'
  if (status === 'Cadastro') return 'bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-200'
  return 'bg-amber-400/20 text-amber-700 dark:text-amber-300'
}

// ---- Formatação PT-BR ----

export function formatarNumero(n, casas = 0) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function formatarDuracaoCurta(segundos) {
  if (segundos == null) return '—'
  if (segundos < 60) return `${Math.round(segundos)} s`
  const min = Math.floor(segundos / 60)
  const seg = Math.round(segundos % 60)
  if (min < 60) return `${min} min${seg ? ` e ${seg} s` : ''}`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h} h${m ? ` e ${m} min` : ''}`
}

// Recebe uma duração em milissegundos e devolve algo como
// "3 dias e 4 horas" ou "5 horas e 12 minutos".
export function formatarDuracaoLonga(ms) {
  if (ms == null || ms < 0) return '—'
  const minutos = Math.round(ms / 60000)
  if (minutos < 60) return `${formatarNumero(minutos)} min`
  const horas = Math.floor(minutos / 60)
  const minRestantes = minutos % 60
  if (horas < 24) return `${horas} h${minRestantes ? ` e ${minRestantes} min` : ''}`
  const dias = Math.floor(horas / 24)
  const horasRestantes = horas % 24
  return `${dias} dia${dias !== 1 ? 's' : ''}${horasRestantes ? ` e ${horasRestantes} h` : ''}`
}
