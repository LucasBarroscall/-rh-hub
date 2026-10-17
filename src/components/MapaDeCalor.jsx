import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip as MapTooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { geocodificarLote } from '../lib/geocoding'
import { formatarNumero } from '../lib/status'

const GRADIENTE = 'linear-gradient(90deg, rgb(48,207,242), rgb(212,217,67), rgb(166,65,112))'

// Cor de frio (poucos candidatos) a quente (muitos), na paleta da marca.
function corIntensidade(t) {
  const paradas = [
    [48, 207, 242],
    [212, 217, 67],
    [166, 65, 112],
  ]
  const pos = Math.min(Math.max(t, 0), 1) * (paradas.length - 1)
  const i = Math.floor(pos)
  const frac = pos - i
  const a = paradas[i]
  const b = paradas[Math.min(i + 1, paradas.length - 1)]
  const mix = (k) => Math.round(a[k] + (b[k] - a[k]) * frac)
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`
}

function Controle({ alvo, pontos, finalizado, interativo, aoAtivar, aoDesativar }) {
  const map = useMap()

  useMapEvents({ click: aoAtivar, mouseout: aoDesativar })

  useEffect(() => {
    if (interativo) map.scrollWheelZoom.enable()
    else map.scrollWheelZoom.disable()
  }, [interativo, map])

  useEffect(() => {
    if (alvo) map.flyTo([alvo.latitude, alvo.longitude], Math.max(map.getZoom(), 12), { duration: 0.8 })
  }, [alvo, map])

  useEffect(() => {
    if (!finalizado || pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView([pontos[0].latitude, pontos[0].longitude], 12)
      return
    }
    map.fitBounds(L.latLngBounds(pontos.map((p) => [p.latitude, p.longitude])), { padding: [40, 40], maxZoom: 13 })
  }, [finalizado]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function MapaDeCalor({ contagemPorLocal, nivel, onSelecionar }) {
  const [pontos, setPontos] = useState([])
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 })
  const [carregando, setCarregando] = useState(false)
  const [finalizado, setFinalizado] = useState(false)
  const [interativo, setInterativo] = useState(false)
  const [alvo, setAlvo] = useState(null)
  const [selecionadoNome, setSelecionadoNome] = useState(null)

  const limite = nivel === 'bairro' ? 40 : 60
  const itens = useMemo(
    () => [...contagemPorLocal].sort((a, b) => b.quantidade - a.quantidade).slice(0, limite),
    [contagemPorLocal, limite],
  )
  const assinatura = itens.map((i) => `${i.nome}:${i.quantidade}`).join('|')
  const totalGeral = contagemPorLocal.reduce((s, i) => s + i.quantidade, 0)

  useEffect(() => {
    let cancelado = false
    setPontos([])
    setFinalizado(false)
    setAlvo(null)
    setSelecionadoNome(null)
    if (itens.length === 0) {
      setCarregando(false)
      setFinalizado(true)
      return undefined
    }
    setCarregando(true)
    setProgresso({ feito: 0, total: itens.length })
    const acumulado = []
    geocodificarLote(itens, {
      aoResolver: (lista) => {
        if (cancelado) return
        acumulado.push(...lista)
        setPontos([...acumulado])
      },
      aoProgredir: (feito, total) => {
        if (!cancelado) setProgresso({ feito, total })
      },
      cancelado: () => cancelado,
    }).finally(() => {
      if (!cancelado) {
        setCarregando(false)
        setFinalizado(true)
      }
    })
    return () => {
      cancelado = true
    }
  }, [assinatura]) // eslint-disable-line react-hooks/exhaustive-deps

  const maxQuantidade = pontos.length ? Math.max(...pontos.map((p) => p.quantidade)) : 1
  const totalMapeado = pontos.reduce((s, p) => s + p.quantidade, 0)
  const cobertura = totalGeral ? Math.round((totalMapeado / totalGeral) * 100) : 0
  const ranking = [...pontos].sort((a, b) => b.quantidade - a.quantidade).slice(0, 10)
  const selecionado = pontos.find((p) => p.nome === selecionadoNome)
  const nomeFiltro = selecionado ? selecionado.nome.split(',')[0].trim() : null
  const pctProgresso = progresso.total ? Math.round((progresso.feito / progresso.total) * 100) : 0
  const escuro = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const tiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  function escolher(p) {
    setSelecionadoNome(p.nome)
    setAlvo({ ...p })
  }

  return (
    <div>
      {carregando && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-navy-500 dark:text-navy-400 mb-1">
            <span>
              Localizando regiões… {progresso.feito}/{progresso.total}
            </span>
            <span>Os locais já conhecidos aparecem na hora</span>
          </div>
          <div className="h-1.5 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden">
            <div className="h-full bg-navy-700 transition-all" style={{ width: `${pctProgresso}%` }} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="relative h-[440px] rounded-md overflow-hidden border border-navy-100 dark:border-navy-800">
          <MapContainer center={[-14.235, -51.9253]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer attribution="&copy; OpenStreetMap" url={tiles} className="tiles-mapa" />
            {pontos.map((p) => {
              const t = maxQuantidade ? p.quantidade / maxQuantidade : 0
              const pct = totalGeral ? Math.round((p.quantidade / totalGeral) * 100) : 0
              const ativo = p.nome === selecionadoNome
              return (
                <CircleMarker
                  key={p.nome}
                  center={[p.latitude, p.longitude]}
                  radius={9 + Math.sqrt(t) * 22}
                  pathOptions={{
                    color: ativo ? '#101733' : corIntensidade(t),
                    fillColor: corIntensidade(t),
                    fillOpacity: 0.6,
                    weight: ativo ? 3 : 1,
                  }}
                  eventHandlers={{ click: () => setSelecionadoNome(p.nome) }}
                >
                  <MapTooltip direction="top" opacity={1}>
                    <div style={{ fontSize: 12 }}>
                      <strong>{p.nome}</strong>
                      <br />
                      {formatarNumero(p.quantidade)} candidato{p.quantidade !== 1 ? 's' : ''} · {pct}% do total
                    </div>
                  </MapTooltip>
                </CircleMarker>
              )
            })}
            <Controle
              alvo={alvo}
              pontos={pontos}
              finalizado={finalizado}
              interativo={interativo}
              aoAtivar={() => setInterativo(true)}
              aoDesativar={() => setInterativo(false)}
            />
          </MapContainer>

          {!interativo && pontos.length > 0 && (
            <div className="absolute left-3 bottom-3 z-[500] pointer-events-none rounded bg-white/90 dark:bg-navy-900/90 px-2 py-1 text-[11px] text-navy-500 dark:text-navy-300">
              Clique no mapa para ativar o zoom com a roda do mouse
            </div>
          )}
          <div className="absolute right-3 bottom-3 z-[500] pointer-events-none rounded bg-white/90 dark:bg-navy-900/90 px-2.5 py-1.5">
            <div className="h-2 w-28 rounded-full" style={{ background: GRADIENTE }} />
            <div className="flex justify-between text-[10px] text-navy-500 dark:text-navy-300 mt-0.5">
              <span>Poucos</span>
              <span>Muitos</span>
            </div>
          </div>
          {finalizado && pontos.length === 0 && (
            <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-white/80 dark:bg-navy-900/80">
              <MapPin size={22} className="text-navy-400" />
              <p className="text-sm text-navy-500 dark:text-navy-300">Nenhuma localização encontrada para os filtros atuais.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-navy-50 dark:bg-navy-800 p-3">
              <p className="text-xs text-navy-400">Locais no mapa</p>
              <p className="text-lg font-semibold text-navy-900 dark:text-white">
                {pontos.length}
                <span className="text-xs text-navy-400 font-normal"> de {contagemPorLocal.length}</span>
              </p>
            </div>
            <div className="rounded-md bg-navy-50 dark:bg-navy-800 p-3">
              <p className="text-xs text-navy-400">Candidatos cobertos</p>
              <p className="text-lg font-semibold text-navy-900 dark:text-white">
                {formatarNumero(totalMapeado)}
                <span className="text-xs text-navy-400 font-normal"> ({cobertura}%)</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-navy-500 dark:text-navy-400 mb-2">Maiores concentrações — clique para ir até o local</p>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
              {ranking.length === 0 && <p className="text-xs text-navy-400">Aguardando localizações…</p>}
              {ranking.map((p, i) => {
                const t = maxQuantidade ? p.quantidade / maxQuantidade : 0
                const pct = totalGeral ? Math.round((p.quantidade / totalGeral) * 100) : 0
                return (
                  <button
                    key={p.nome}
                    onClick={() => escolher(p)}
                    className={`w-full text-left rounded-md px-2.5 py-1.5 transition-colors ${
                      p.nome === selecionadoNome ? 'bg-navy-50 dark:bg-navy-800' : 'hover:bg-navy-50/70 dark:hover:bg-navy-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-navy-700 dark:text-navy-200 truncate">
                        {i + 1}. {p.nome}
                      </span>
                      <span className="text-navy-400 flex-shrink-0 ml-2">
                        {formatarNumero(p.quantidade)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy-50 dark:bg-navy-800 mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(t * 100, 4)}%`, backgroundColor: corIntensidade(t) }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {onSelecionar && nomeFiltro && (
            <button onClick={() => onSelecionar(nomeFiltro)} className="btn-secondary w-full text-xs">
              Filtrar o dashboard por {nomeFiltro}
            </button>
          )}
          {contagemPorLocal.length > itens.length && (
            <p className="text-[11px] text-navy-400">
              Mostrando as {itens.length} maiores localidades de {contagemPorLocal.length} (para o mapa carregar rápido).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
