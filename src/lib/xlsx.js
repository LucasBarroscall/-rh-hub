import JSZip from 'jszip'

// =====================================================================
// Leitura, escrita e preenchimento de planilhas .xlsx (só depende do JSZip).
// O modelo do Compliance é editado direto no XML, só nas células necessárias —
// o resto da planilha fica exatamente como está.
// =====================================================================

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// ---------- utilidades ----------
export function decodificar(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export function escapar(s) {
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function atributo(texto, nome) {
  const m = new RegExp('(?:^|\\s)' + nome + '="([^"]*)"').exec(texto)
  return m ? decodificar(m[1]) : null
}

export function colunaParaIndice(letras) {
  let n = 0
  for (const ch of letras.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function indiceParaColuna(i) {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function serialParaTexto(n) {
  const dias = Math.floor(n)
  const frac = n - dias
  const d = new Date(Date.UTC(1899, 11, 30) + dias * 86400000)
  const iso = d.toISOString().slice(0, 10)
  if (frac > 1e-6) {
    const seg = Math.round(frac * 86400)
    const hh = String(Math.floor(seg / 3600) % 24).padStart(2, '0')
    const mm = String(Math.floor((seg % 3600) / 60)).padStart(2, '0')
    const ss = String(seg % 60).padStart(2, '0')
    return `${iso} ${hh}:${mm}:${ss}`
  }
  return iso
}

// ---------- LEITURA ----------
function lerStringsCompartilhadas(xml) {
  if (!xml) return []
  const lista = []
  for (const m of xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)) {
    const corpo = (m[1] || '').replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
    lista.push([...corpo.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificar(t[1])).join(''))
  }
  return lista
}

function estilosDeData(xml) {
  const estilos = new Set()
  if (!xml) return estilos
  const formatos = {}
  for (const m of xml.matchAll(/<numFmt\b([^>]*?)\/?>/g)) {
    const id = atributo(m[1], 'numFmtId')
    if (id != null) formatos[id] = atributo(m[1], 'formatCode') || ''
  }
  const secao = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)
  if (!secao) return estilos
  let i = 0
  for (const m of secao[1].matchAll(/<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/g)) {
    const id = Number(atributo(m[1], 'numFmtId') || 0)
    let ehData = (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58)
    if (!ehData && formatos[id]) {
      const codigo = formatos[id].replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '')
      ehData = /[dmyhs]/i.test(codigo) && !/general/i.test(codigo)
    }
    if (ehData) estilos.add(i)
    i += 1
  }
  return estilos
}

export async function listarAbas(zip) {
  const wb = await zip.file('xl/workbook.xml')?.async('string')
  if (!wb) throw new Error('Este arquivo não é uma planilha .xlsx válida.')
  const relsXml = (await zip.file('xl/_rels/workbook.xml.rels')?.async('string')) || ''
  const rels = {}
  for (const m of relsXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = atributo(m[1], 'Id')
    if (id) rels[id] = atributo(m[1], 'Target')
  }
  const abas = []
  let n = 0
  for (const m of wb.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    n += 1
    const rid = atributo(m[1], 'r:id')
    let alvo = rels[rid] || `worksheets/sheet${n}.xml`
    alvo = alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo}`
    abas.push({ nome: atributo(m[1], 'name') || `Aba ${n}`, caminho: alvo, oculta: (atributo(m[1], 'state') || 'visible') !== 'visible' })
  }
  return abas
}

export async function validarXlsx(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  return listarAbas(zip)
}

function lerLinhas(xml, strings, datas) {
  const linhas = []
  let proxima = 0
  for (const lm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = atributo(lm[1], 'r')
    const idx = r ? Number(r) - 1 : proxima
    proxima = idx + 1
    const linha = []
    for (const cm of (lm[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atributo(cm[1], 'r') || ''
      const col = colunaParaIndice(ref.replace(/\d+/g, '') || 'A')
      const tipo = atributo(cm[1], 't')
      const estilo = Number(atributo(cm[1], 's') || 0)
      const dentro = cm[2] || ''
      const v = /<v>([\s\S]*?)<\/v>/.exec(dentro)
      let valor = ''
      if (tipo === 's') valor = strings[Number(v && v[1])] ?? ''
      else if (tipo === 'inlineStr') valor = [...dentro.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificar(t[1])).join('')
      else if (tipo === 'str') valor = v ? decodificar(v[1]) : ''
      else if (tipo === 'b') valor = v && v[1] === '1' ? 'true' : 'false'
      else if (tipo === 'e') valor = ''
      else if (v) {
        const num = Number(v[1])
        valor = datas.has(estilo) && Number.isFinite(num) ? serialParaTexto(num) : decodificar(v[1])
      }
      linha[col] = valor
    }
    linhas[idx] = linha
  }
  const maxCol = Math.max(0, ...linhas.map((l) => (l ? l.length : 0)))
  return Array.from(linhas, (l) => Array.from({ length: maxCol }, (_, i) => (l && l[i] != null ? String(l[i]) : '')))
}

// Lê todas as abas: [{ nome, oculta, linhas: string[][] }]. Datas do Excel viram "aaaa-mm-dd".
export async function lerXlsx(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const abas = await listarAbas(zip)
  const strings = lerStringsCompartilhadas(await zip.file('xl/sharedStrings.xml')?.async('string'))
  const datas = estilosDeData(await zip.file('xl/styles.xml')?.async('string'))
  const resultado = []
  for (const aba of abas) {
    const xml = await zip.file(aba.caminho)?.async('string')
    resultado.push({ nome: aba.nome, oculta: aba.oculta, linhas: xml ? lerLinhas(xml, strings, datas) : [] })
  }
  return resultado
}

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const normalizarCabecalho = (s) => semAcento(s).toUpperCase().replace(/[_\s]+/g, ' ').trim()

// Lê UMA aba como objetos { cabeçalho: valor }. Com "aba" informada procura essa aba (sem diferenciar
// maiúsculas/acentos); sem ela, usa a primeira aba visível. Devolve também a lista de abas encontradas.
export async function lerAbaComoObjetos(buffer, { aba } = {}) {
  const abas = await lerXlsx(buffer)
  const nomes = abas.map((a) => a.nome)
  let escolhida = null
  if (aba) escolhida = abas.find((a) => normalizarCabecalho(a.nome) === normalizarCabecalho(aba)) || null
  else escolhida = abas.find((a) => !a.oculta) || abas[0] || null
  if (!escolhida) return { encontrada: false, abas: nomes, nome: null, colunas: [], linhas: [] }
  const linhas = escolhida.linhas
  const iCab = linhas.findIndex((l) => l.filter((c) => String(c).trim() !== '').length >= 2)
  if (iCab < 0) return { encontrada: true, abas: nomes, nome: escolhida.nome, colunas: [], linhas: [] }
  const colunas = linhas[iCab].map((c) => String(c).trim())
  const objetos = []
  for (let i = iCab + 1; i < linhas.length; i++) {
    const l = linhas[i]
    if (!l.some((c) => String(c).trim() !== '')) continue
    const o = { __linha: i + 1 }
    colunas.forEach((nome, j) => {
      if (nome) o[nome] = l[j] != null ? String(l[j]).trim() : ''
    })
    objetos.push(o)
  }
  return { encontrada: true, abas: nomes, nome: escolhida.nome, colunas, linhas: objetos }
}

// ---------- ESCRITA (planilha nova) ----------
function nomeDeAba(nome, usados) {
  const base = String(nome || 'Planilha').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Planilha'
  let final = base
  let n = 2
  while (usados.has(final.toLowerCase())) final = `${base.slice(0, 28)} ${n++}`
  usados.add(final.toLowerCase())
  return final
}

function celulaNova(ref, valor, estilo) {
  if (valor === null || valor === undefined || valor === '') return ''
  const s = estilo != null ? ` s="${estilo}"` : ''
  if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}"${s}><v>${valor}</v></c>`
  let texto = valor
  if (typeof valor === 'boolean') texto = valor ? 'Sim' : 'Não'
  else if (valor instanceof Date) texto = valor.toISOString()
  texto = String(texto).slice(0, 32000)
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapar(texto)}</t></is></c>`
}

// abas: [{ nome, linhas: any[][] }] — a primeira linha é o cabeçalho (negrito, filtro, congelada).
export function montarArquivosXlsx(abas) {
  const usados = new Set()
  const arquivos = {}
  const sheets = abas.map((a) => ({ ...a, nome: nomeDeAba(a.nome, usados) }))
  arquivos['[Content_Types].xml'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    '</Types>'
  arquivos['_rels/.rels'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'
  arquivos['xl/workbook.xml'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sheets.map((s, i) => `<sheet name="${escapar(s.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets></workbook>'
  arquivos['xl/_rels/workbook.xml.rels'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'
  arquivos['xl/styles.xml'] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F4C73"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  sheets.forEach((s, i) => {
    const linhas = s.linhas || []
    const maxCol = Math.max(1, ...linhas.map((l) => l.length))
    const larguras = Array.from({ length: maxCol }, (_, c) => {
      let max = 8
      for (let r = 0; r < Math.min(linhas.length, 200); r++) {
        const v = linhas[r][c]
        if (v !== null && v !== undefined) max = Math.max(max, String(v).length + 2)
      }
      return Math.min(max, 50)
    })
    const corpo = linhas
      .map((l, r) => {
        const celulas = l.map((v, c) => celulaNova(`${indiceParaColuna(c)}${r + 1}`, v, r === 0 ? 1 : null)).join('')
        return `<row r="${r + 1}">${celulas}</row>`
      })
      .join('')
    const ultima = Math.max(1, linhas.length)
    arquivos[`xl/worksheets/sheet${i + 1}.xml`] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<dimension ref="A1:${indiceParaColuna(maxCol - 1)}${ultima}"/>` +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      `<cols>${larguras.map((wd, c) => `<col min="${c + 1}" max="${c + 1}" width="${wd}" customWidth="1"/>`).join('')}</cols>` +
      `<sheetData>${corpo}</sheetData>` +
      `<autoFilter ref="A1:${indiceParaColuna(maxCol - 1)}${ultima}"/>` +
      '</worksheet>'
  })
  return arquivos
}

async function empacotar(arquivos, tipo) {
  const zip = new JSZip()
  Object.entries(arquivos).forEach(([caminho, conteudo]) => zip.file(caminho, conteudo))
  return zip.generateAsync({ type: tipo, mimeType: XLSX_MIME, compression: 'DEFLATE' })
}

export function gerarXlsx(abas, tipo = 'blob') {
  return empacotar(montarArquivosXlsx(abas), tipo)
}

// Objetos -> aba (colunas = união das chaves, na ordem em que aparecem; ou "colunas" informadas)
export function objetosParaAba(nome, objetos, colunas) {
  const cols = colunas || [...new Set(objetos.flatMap((o) => Object.keys(o)))]
  return { nome, linhas: [cols, ...objetos.map((o) => cols.map((c) => (o[c] === undefined ? '' : o[c])))] }
}

export function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}

export async function baixarXlsx(abas, nomeArquivo) {
  baixarBlob(await gerarXlsx(abas, 'blob'), nomeArquivo)
}

// ---------- PREENCHIMENTO DO MODELO DO COMPLIANCE ----------
// Colunas da lista (a partir da linha 19): B vazio, C nome, D CPF (número 00000000000), E RG,
// F nascimento, G mãe, H fone 1, I vazio, J endereço, K número, L bairro, M cidade, N CEP,
// O vazio, P cidade de contratação, Q cargo, R vazio.
export const PRIMEIRA_LINHA_COMPLIANCE = 19
export const CIDADE_CONTRATACAO = 'ARACAJU-SE'
export const CARGO_COMPLIANCE = 'ATENDENTE DE TELEMARKETING'

function lerLinhaXml(brutoLinha) {
  const m = /^<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)$/.exec(brutoLinha)
  const attrs = m ? m[1] : ''
  const celulas = {}
  if (m && m[3]) {
    for (const cm of m[3].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atributo(cm[1], 'r') || ''
      const col = ref.replace(/\d+/g, '')
      celulas[col] = { estilo: atributo(cm[1], 's'), ref, temConteudo: !!(cm[2] && /<v>|<is>/.test(cm[2])), bruto: cm[0] }
    }
  }
  return { attrs, celulas }
}

function montarLinha(num, attrsOriginais, celulas) {
  const attrs = attrsOriginais.replace(/\s*\br="\d+"/, '').replace(/\s*\bspans="[^"]*"/, '')
  const ordenadas = Object.entries(celulas).sort((a, b) => colunaParaIndice(a[0]) - colunaParaIndice(b[0]))
  return `<row r="${num}"${attrs}>${ordenadas.map(([, c]) => c.xml).join('')}</row>`
}

function celulaPreenchida(col, num, estilo, tipo, valor) {
  const ref = `${col}${num}`
  const s = estilo != null ? ` s="${estilo}"` : ''
  if (valor === null || valor === undefined || valor === '') return `<c r="${ref}"${s}/>`
  if (tipo === 'numero') return `<c r="${ref}"${s}><v>${valor}</v></c>`
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`
}

// Edita o XML da aba do modelo: só mexe em C13:C15 e na lista a partir da linha 19.
export function editarPlanilhaCompliance(xml, { responsavel, dataHora, quantidade, candidatos }) {
  const ini = xml.indexOf('<sheetData>')
  const fim = xml.indexOf('</sheetData>')
  if (ini < 0 || fim < 0) throw new Error('Modelo inválido: a aba não tem dados.')
  const antes = xml.slice(0, ini + '<sheetData>'.length)
  const corpo = xml.slice(ini + '<sheetData>'.length, fim)
  const depois = xml.slice(fim)

  const linhas = new Map()
  for (const m of corpo.matchAll(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g)) {
    const num = Number(atributo(m[0].slice(0, m[0].indexOf('>') + 1), 'r'))
    linhas.set(num, m[0])
  }
  const ultimaOriginal = Math.max(...linhas.keys(), PRIMEIRA_LINHA_COMPLIANCE)
  const ultima = Math.max(ultimaOriginal, PRIMEIRA_LINHA_COMPLIANCE + candidatos.length - 1)

  // 1) cabeçalho: C13 responsável (texto), C14 data e hora (texto), C15 quantidade (número)
  const definirC = (num, tipo, valor) => {
    const bruto = linhas.get(num) || `<row r="${num}"/>`
    const { attrs, celulas } = lerLinhaXml(bruto)
    const estilo = celulas.C ? celulas.C.estilo : null
    Object.values(celulas).forEach((c) => {
      c.xml = c.bruto
    })
    celulas.C = { xml: celulaPreenchida('C', num, estilo, tipo, valor) }
    linhas.set(num, montarLinha(num, attrs, celulas))
  }
  definirC(13, 'texto', responsavel)
  definirC(14, 'texto', dataHora)
  definirC(15, 'numero', quantidade)

  // 2) lista de candidatos (linha 19 em diante); linhas novas copiam o estilo da última linha do modelo
  const modelo = lerLinhaXml(linhas.get(ultimaOriginal) || linhas.get(PRIMEIRA_LINHA_COMPLIANCE))
  const colunasModelo = Object.keys(modelo.celulas)
  for (let num = PRIMEIRA_LINHA_COMPLIANCE; num <= ultima; num++) {
    const c = candidatos[num - PRIMEIRA_LINHA_COMPLIANCE]
    const bruto = linhas.get(num)
    const { attrs, celulas: existentes } = bruto ? lerLinhaXml(bruto) : { attrs: modelo.attrs, celulas: {} }
    const colunas = bruto ? Object.keys(existentes) : colunasModelo
    const estiloDe = (col) => (existentes[col] ? existentes[col].estilo : modelo.celulas[col] ? modelo.celulas[col].estilo : null)
    const valores = c
      ? {
          C: ['texto', c.nome],
          D: ['numero', c.cpf],
          E: ['texto', c.rg],
          F: ['texto', c.nascimento],
          G: ['texto', c.mae],
          H: ['texto', c.fone1],
          J: ['texto', c.endereco],
          K: ['texto', c.numero],
          L: ['texto', c.bairro],
          M: ['texto', c.cidade],
          N: ['texto', c.cep],
          P: ['texto', CIDADE_CONTRATACAO],
          Q: ['texto', CARGO_COMPLIANCE],
        }
      : {}
    const celulas = {}
    new Set([...colunas, ...Object.keys(valores)]).forEach((col) => {
      const v = valores[col]
      if (v) celulas[col] = { xml: celulaPreenchida(col, num, estiloDe(col), v[0], v[1]) }
      else if (existentes[col] && !existentes[col].temConteudo) celulas[col] = { xml: existentes[col].bruto }
      else celulas[col] = { xml: celulaPreenchida(col, num, estiloDe(col), 'texto', '') } // limpa sobras do modelo
    })
    linhas.set(num, montarLinha(num, bruto ? attrs : modelo.attrs, celulas))
  }

  const ordenadas = [...linhas.entries()].sort((a, b) => a[0] - b[0]).map(([, x]) => x)
  let novo = antes + ordenadas.join('') + depois
  novo = novo.replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)\d+"\s*\/>/, (_, a, b) => `<dimension ref="${a}:${b}${ultima}"/>`)
  novo = novo.replace(/<autoFilter ref="([A-Z]+\d+):([A-Z]+)\d+"/, (_, a, b) => `<autoFilter ref="${a}:${b}${ultima}"`)
  return { xml: novo, ultimaLinha: ultima }
}

// Gera o arquivo preenchido a partir do modelo (ArrayBuffer/Uint8Array). tipo = 'blob' (navegador) ou 'nodebuffer'.
export async function preencherModeloCompliance(modelo, dados, tipo = 'blob') {
  const zip = await JSZip.loadAsync(modelo)
  const abas = await listarAbas(zip)
  const aba = abas.find((a) => normalizarCabecalho(a.nome) === 'CONSULTA OPERACIONAL') || abas.find((a) => !a.oculta) || abas[0]
  const xml = await zip.file(aba.caminho).async('string')
  const { xml: novo, ultimaLinha } = editarPlanilhaCompliance(xml, dados)
  zip.file(aba.caminho, novo)
  const wb = await zip.file('xl/workbook.xml').async('string')
  const aspas = aba.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wbNovo = wb.replace(/<definedName\b[^>]*_xlnm\._FilterDatabase[^>]*>[^<]*<\/definedName>/g, (bloco) =>
    new RegExp(`^[^>]*>'?${aspas}'?!`).test(bloco) ? bloco.replace(/(\$[A-Z]+\$)\d+(?=<\/definedName>)/, (_, p) => `${p}${ultimaLinha}`) : bloco,
  )
  if (wbNovo !== wb) zip.file('xl/workbook.xml', wbNovo)
  return zip.generateAsync({ type: tipo, mimeType: XLSX_MIME, compression: 'DEFLATE' })
}
