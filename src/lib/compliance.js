import { normalizarCabecalho } from './xlsx'

// A planilha de retorno do Compliance vem com 3 abas; o hub usa só a aba "CANDIDATOS".
export const ABA_RETORNO = 'CANDIDATOS'
export const CABECALHOS_RETORNO = {
  cpf: 'CPF',
  lote: 'LOTE',
  dataImportacao: 'DATA IMPORTACAO',
  dataConsulta: 'DATA CONSULTA ESCAVADOR',
  juridico: 'OK/NOK JURIDICO',
  compliance: 'OK/NOK COMPLIANCE',
  statusFinal: 'STATUS FINAL',
}

export const somenteDigitos = (v) => String(v === null || v === undefined ? '' : v).replace(/\D/g, '')

// CPF no padrão do banco (11 dígitos, com zeros à esquerda). '' = vazio; null = inválido (mais de 11 dígitos).
export function normalizarCpf(v) {
  const d = somenteDigitos(v)
  if (!d) return ''
  if (d.length > 11) return null
  return d.padStart(11, '0')
}

// "2026-10-20" / "2026-10-20 14:30:00" -> "20/10/2026" / "20/10/2026 14:30"; outro texto passa como está.
export function paraDataBR(v) {
  const s = String(v || '').trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s)
  if (!m) return s
  const hora = m[4] && !(m[4] === '00' && m[5] === '00') ? ` ${m[4]}:${m[5]}` : ''
  return `${m[3]}/${m[2]}/${m[1]}${hora}`
}

// Lê as linhas da aba CANDIDATOS e separa:
//  validas   — STATUS FINAL "OK" ou "NOK" (as únicas que gravam no banco)
//  outros    — qualquer outro STATUS FINAL (listado na tela, NÃO grava nada)
//  invalidos — CPF vazio ou com mais de 11 dígitos
export function prepararRetornoCompliance(colunas, linhas) {
  const achar = (esperado) => colunas.find((c) => normalizarCabecalho(c) === normalizarCabecalho(esperado))
  const col = {}
  Object.entries(CABECALHOS_RETORNO).forEach(([k, nome]) => {
    col[k] = achar(nome)
  })
  const faltando = [CABECALHOS_RETORNO.cpf, CABECALHOS_RETORNO.statusFinal].filter((n) => !achar(n))
  if (faltando.length) {
    const lidas = colunas.filter(Boolean).join(', ') || '(nenhuma)'
    return { erro: `Não encontrei na aba a(s) coluna(s) obrigatória(s): ${faltando.join(', ')}. Colunas lidas: ${lidas}.`, validas: [], outros: [], invalidos: [], vazias: 0 }
  }
  const pega = (l, k) => (col[k] ? String(l[col[k]] ?? '').trim() : '')
  const validas = []
  const outros = []
  const invalidos = []
  let vazias = 0
  linhas.forEach((l) => {
    const cpfBruto = pega(l, 'cpf')
    const statusBruto = pega(l, 'statusFinal')
    if (!cpfBruto && !statusBruto) {
      vazias += 1
      return
    }
    const cpf = normalizarCpf(cpfBruto)
    if (!cpf) {
      invalidos.push({ linha: l.__linha, cpf: cpfBruto || '(vazio)', motivo: cpfBruto ? 'CPF com mais de 11 dígitos' : 'CPF vazio', statusFinal: statusBruto })
      return
    }
    const norm = normalizarCabecalho(statusBruto)
    if (norm === 'OK' || norm === 'NOK') {
      validas.push({
        linha: l.__linha,
        cpf,
        status: norm,
        lote: pega(l, 'lote'),
        data_importacao: paraDataBR(pega(l, 'dataImportacao')),
        data_consulta: paraDataBR(pega(l, 'dataConsulta')),
        juridico: pega(l, 'juridico'),
        ok_nok_compliance: pega(l, 'compliance'),
      })
    } else {
      outros.push({ linha: l.__linha, cpf, statusFinal: statusBruto || '(vazio)', lote: pega(l, 'lote') })
    }
  })
  return { erro: null, validas, outros, invalidos, vazias }
}

// ---------- exportação ----------
function dataIsoParaBR(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

// Candidato do banco -> linha do modelo (formatos exigidos pelo Compliance).
export function montarLinhaCompliance(c) {
  const cpfDigitos = somenteDigitos(c.cpf)
  const cpf11 = cpfDigitos ? cpfDigitos.padStart(11, '0') : ''
  const rg = somenteDigitos(c.rg)
  return {
    nome: c.nome_completo || '',
    cpf: cpf11 ? Number(cpf11) : null,
    rg: rg || cpf11, // sem RG no banco: repete o CPF
    nascimento: dataIsoParaBR(c.data_nascimento),
    mae: c.nome_mae || '',
    fone1: somenteDigitos(c.telefone),
    endereco: c.logradouro || '',
    numero: c.numero || '',
    bairro: c.bairro || '',
    cidade: c.cidade || '',
    cep: c.cep || '',
  }
}

function partesBrasilia(data = new Date()) {
  const p = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(data)
  const g = (t) => (p.find((x) => x.type === t) || {}).value || ''
  return { dd: g('day'), mm: g('month'), yyyy: g('year'), hh: g('hour') === '24' ? '00' : g('hour'), mi: g('minute') }
}

export function dataHoraBrasilia(data) {
  const p = partesBrasilia(data)
  return `${p.dd}/${p.mm}/${p.yyyy} às ${p.hh}:${p.mi}`
}

export function nomeArquivoCompliance(data) {
  const p = partesBrasilia(data)
  return `ANALISE COMPLIANCE OPERACIONAL - ARACAJU - ${p.dd}-${p.mm}.xlsx`
}
