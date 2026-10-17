import { maskCPF, maskTelefone, maskCEP, normalizarTexto } from './formatters'
import { avaliarTeste } from './regrasTeste'

// Colunas aceitas na importação (as que o banco calcula sozinho — id, idade,
// cpf_digitos, updated_at — nunca são importadas).
export const COLUNAS_IMPORTAVEIS = [
  'created_at', 'fonte', 'nome_indicador', 'nome_completo', 'telefone', 'rg', 'cpf', 'data_nascimento', 'sexo', 'nome_mae',
  'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep', 'email',
  'disponibilidade_horario_trabalho', 'disponibilidade_horario_treinamento', 'disponibilidade_jornada',
  'possui_veiculo', 'concorda_turno_treinamento', 'possui_ensino_superior', 'observacoes',
  'data_entrevista', 'compareceu_entrevista', 'aprovado_entrevista', 'entrevista_em',
  'teste_realizado', 'wpm', 'precisao', 'alerta_comportamental', 'teste_em', 'compliance',
  'data_exame', 'compareceu_exame', 'aprovado_exame', 'enviou_documentacao', 'aprovado_documentacao',
  'compareceu_onboarding', 'compareceu_treinamento', 'decisao_final', 'contatado_whatsapp', 'decisao_em',
  'compareceu_alo', 'tempo_preenchimento_segundos', 'rede_social', 'documentacao_solicitada',
  'data_documentacao_solicitada', 'data_envio_documentacao', 'data_onboarding', 'data_treinamento',
  'data_contato_whatsapp', 'data_alo', 'comentario_entrevistador1', 'produto', 'resultado_teste', 'aprovado_teste',
]

// Colunas que aparecem no modelo para download.
export const COLUNAS_MODELO = COLUNAS_IMPORTAVEIS.filter((c) => !['resultado_teste', 'aprovado_teste'].includes(c))

const BOOLEANAS = [
  'possui_veiculo', 'concorda_turno_treinamento', 'possui_ensino_superior', 'compareceu_entrevista', 'aprovado_entrevista',
  'teste_realizado', 'compareceu_exame', 'aprovado_exame', 'enviou_documentacao', 'aprovado_documentacao',
  'compareceu_onboarding', 'compareceu_treinamento', 'contatado_whatsapp', 'compareceu_alo', 'documentacao_solicitada', 'aprovado_teste',
]
const DATAS = [
  'data_nascimento', 'data_entrevista', 'data_exame', 'data_documentacao_solicitada', 'data_envio_documentacao',
  'data_onboarding', 'data_treinamento', 'data_contato_whatsapp', 'data_alo',
]
const TIMESTAMPS = ['created_at', 'entrevista_em', 'teste_em', 'decisao_em']
const NUMEROS = ['wpm', 'precisao', 'tempo_preenchimento_segundos']
const NORMALIZAR_COMPLETO = ['nome_completo', 'nome_mae', 'nome_indicador', 'logradouro', 'bairro', 'cidade']
const NORMALIZAR_LEVE = ['observacoes', 'compliance', 'alerta_comportamental', 'complemento', 'comentario_entrevistador1']

function parseDataHora(texto) {
  const s = String(texto).trim()
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s)
  if (m) {
    return {
      data: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
      hora: m[4] ? `${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}` : null,
      fuso: null,
    }
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?/.exec(s)
  if (m) return { data: `${m[1]}-${m[2]}-${m[3]}`, hora: m[4] ? `${m[4]}:${m[5]}:${m[6] || '00'}` : null, fuso: m[7] || null }
  return null
}

function parseBool(texto) {
  const s = String(texto).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (['sim', 's', 'true', '1', 'verdadeiro', 'x', 'yes'].includes(s)) return true
  if (['nao', 'n', 'false', '0', 'falso', 'no'].includes(s)) return false
  return null
}

// Converte uma linha do CSV para o formato do banco. Campos vazios ficam de
// fora (null/padrão do banco); texto vira MAIÚSCULO; datas aceitam dd/mm/aaaa.
// created_at vazio => o banco usa a data/hora da importação.
export function converterLinhaImportacao(linha, regras = []) {
  const bruto = {}
  Object.keys(linha).forEach((k) => {
    bruto[String(k).trim().toLowerCase()] = linha[k]
  })
  if (bruto.endereco && !bruto.logradouro) bruto.logradouro = bruto.endereco

  const out = {}
  COLUNAS_IMPORTAVEIS.forEach((col) => {
    let v = bruto[col]
    if (v == null) return
    v = String(v).trim()
    if (v === '') return

    if (BOOLEANAS.includes(col)) {
      const b = parseBool(v)
      if (b !== null) out[col] = b
      return
    }
    if (DATAS.includes(col)) {
      const d = parseDataHora(v)
      if (d) out[col] = d.data
      return
    }
    if (TIMESTAMPS.includes(col)) {
      const d = parseDataHora(v)
      if (d) out[col] = d.fuso ? v : `${d.data}T${d.hora || '12:00:00'}-03:00`
      return
    }
    if (NUMEROS.includes(col)) {
      const n = Number(String(v).replace(',', '.'))
      if (!Number.isNaN(n)) out[col] = Math.round(n)
      return
    }
    if (NORMALIZAR_COMPLETO.includes(col)) out[col] = normalizarTexto(v)
    else if (NORMALIZAR_LEVE.includes(col)) out[col] = v.toUpperCase()
    else if (col === 'estado') out[col] = v.toUpperCase().slice(0, 2)
    else if (col === 'cpf') out[col] = v.replace(/\D/g, '').length === 11 ? maskCPF(v) : v
    else if (col === 'telefone') out[col] = [10, 11].includes(v.replace(/\D/g, '').length) ? maskTelefone(v) : v
    else if (col === 'cep') out[col] = v.replace(/\D/g, '').length === 8 ? maskCEP(v) : v
    else out[col] = v
  })

  if (!out.data_entrevista && out.created_at) {
    out.data_entrevista = new Date(out.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  }
  if (out.wpm != null && out.precisao != null && out.aprovado_teste == null) {
    if (out.teste_realizado == null) out.teste_realizado = true
    const aval = avaliarTeste(out.wpm, out.precisao, regras)
    if (aval) {
      out.aprovado_teste = aval.aprovado
      out.resultado_teste = aval.resultado
    }
  }
  if (!out.nome_completo) return { linha: null, aviso: 'sem nome_completo' }
  return { linha: out, aviso: null }
}
