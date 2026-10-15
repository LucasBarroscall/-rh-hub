import { supabase } from './supabaseClient'

function normalizarChave(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function consultarNominatim(textoBusca) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(textoBusca)}`
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!resposta.ok) throw new Error('Falha na consulta de geolocalização')
  const dados = await resposta.json()
  if (!dados || dados.length === 0) return null
  return { latitude: parseFloat(dados[0].lat), longitude: parseFloat(dados[0].lon) }
}

// Geocodifica uma lista de locais. Primeiro lê TODO o cache do Supabase em
// poucas consultas em bloco (rápido — é o caso normal depois da 1ª vez) e só
// então consulta a API externa, um local por vez (~1/s), para os que ainda
// não são conhecidos. Os resultados vão aparecendo conforme ficam prontos.
export async function geocodificarLote(itens, { aoResolver, aoProgredir, cancelado } = {}) {
  const total = itens.length
  const chaves = itens.map((i) => normalizarChave(`${i.nome}, Brasil`))

  const cache = {}
  for (let i = 0; i < chaves.length; i += 40) {
    const { data } = await supabase.from('geocache').select('*').in('chave', chaves.slice(i, i + 40))
    ;(data || []).forEach((c) => (cache[c.chave] = c))
    if (cancelado?.()) return
  }

  const doCache = []
  const pendentes = []
  itens.forEach((item, i) => {
    const hit = cache[chaves[i]]
    if (hit) {
      if (hit.encontrado) doCache.push({ ...item, latitude: hit.latitude, longitude: hit.longitude })
    } else {
      pendentes.push({ item, chave: chaves[i] })
    }
  })

  let feitos = total - pendentes.length
  if (doCache.length) aoResolver?.(doCache)
  aoProgredir?.(feitos, total)

  for (const { item, chave } of pendentes) {
    if (cancelado?.()) return
    let resultado = null
    let consultou = false
    try {
      resultado = await consultarNominatim(`${item.nome}, Brasil`)
      consultou = true
    } catch {
      consultou = false // falha de rede: não grava no cache, tenta de novo outra vez
    }
    if (consultou) {
      await supabase.from('geocache').upsert({
        chave,
        latitude: resultado?.latitude ?? null,
        longitude: resultado?.longitude ?? null,
        encontrado: !!resultado,
      })
    }
    if (resultado) aoResolver?.([{ ...item, ...resultado }])
    feitos++
    aoProgredir?.(feitos, total)
    await dormir(1100)
  }
}
