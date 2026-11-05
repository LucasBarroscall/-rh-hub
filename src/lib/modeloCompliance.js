import { supabase } from './supabaseClient'
import { validarXlsx } from './xlsx'

const BUCKET = 'modelos'
const PASTA = 'compliance'
const ARQUIVO = 'modelo.xlsx'
const CAMINHO = `${PASTA}/${ARQUIVO}`
const PADRAO = '/modelos/compliance_modelo.xlsx'
export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

async function modeloPadrao() {
  const r = await fetch(PADRAO)
  if (!r.ok) throw new Error('O modelo padrão não foi encontrado no site.')
  return r.arrayBuffer()
}

async function enviar(buffer) {
  const up = await supabase.storage.from(BUCKET).upload(CAMINHO, new Blob([buffer], { type: MIME_XLSX }), { upsert: true, contentType: MIME_XLSX })
  if (up.error) throw new Error(`Não foi possível salvar o modelo no banco: ${up.error.message}`)
}

// O modelo fica salvo no banco (Storage). Se ainda não existir, usa o modelo que acompanha o site
// e já o salva no banco — a partir daí o analista pode baixar/substituir quando quiser.
export async function carregarModelo() {
  const { data, error } = await supabase.storage.from(BUCKET).download(CAMINHO)
  if (!error && data) return { buffer: await data.arrayBuffer(), origem: 'banco' }
  const buffer = await modeloPadrao()
  let salvo = true
  try {
    await enviar(buffer)
  } catch {
    salvo = false
  }
  return { buffer, origem: 'padrao', salvo }
}

export async function substituirModelo(arquivo) {
  const buffer = await arquivo.arrayBuffer()
  await validarXlsx(buffer) // precisa ser um .xlsx de verdade
  await enviar(buffer)
}

export async function restaurarModeloPadrao() {
  await enviar(await modeloPadrao())
}

export async function infoModelo() {
  const { data } = await supabase.storage.from(BUCKET).list(PASTA)
  const f = (data || []).find((x) => x.name === ARQUIVO)
  return f ? { atualizadoEm: f.updated_at || f.created_at || null } : null
}
