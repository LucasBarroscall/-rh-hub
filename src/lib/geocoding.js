import { supabase } from './supabaseClient'

// Fila global simples para nunca disparar mais de ~1 consulta por segundo
// no Nominatim (política de uso justo do OpenStreetMap).
let filaPromise = Promise.resolve()

function normalizarChave(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

async function consultarNominatim(textoBusca) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(textoBusca)}`
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!resposta.ok) return null
  const dados = await resposta.json()
  if (!dados || dados.length === 0) return null
  return { latitude: parseFloat(dados[0].lat), longitude: parseFloat(dados[0].lon) }
}

// Retorna { latitude, longitude } ou null (não encontrado). Usa o cache do
// Supabase primeiro; só chama o Nominatim para chaves realmente novas, uma
// de cada vez, com um pequeno intervalo entre chamadas.
export async function geocodificar(textoBusca) {
  const chave = normalizarChave(textoBusca)
  if (!chave) return null

  const { data: existente } = await supabase.from('geocache').select('*').eq('chave', chave).maybeSingle()
  if (existente) {
    return existente.encontrado ? { latitude: existente.latitude, longitude: existente.longitude } : null
  }

  const resultado = (filaPromise = filaPromise.then(async () => {
    const r = await consultarNominatim(textoBusca)
    await new Promise((res) => setTimeout(res, 1100))
    return r
  }))

  const r = await resultado
  await supabase.from('geocache').upsert({
    chave,
    latitude: r?.latitude ?? null,
    longitude: r?.longitude ?? null,
    encontrado: !!r,
  })
  return r
}
