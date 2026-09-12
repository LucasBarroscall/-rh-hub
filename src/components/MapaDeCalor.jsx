import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Tooltip as MapTooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, RefreshCw } from 'lucide-react'
import { geocodificar } from '../lib/geocoding'
import { formatarNumero } from '../lib/status'

// Cor interpolada de frio (poucos candidatos) a quente (muitos), usando a
// paleta da marca — funciona como escala de calor sem plugin externo.
function corIntensidade(t) {
  const paradas = [
    [48, 207, 242], // cyan-400
    [212, 217, 67], // amber-400
    [166, 65, 112], // clay-500
  ]
  const pos = Math.min(Math.max(t, 0), 1) * (paradas.length - 1)
  const i = Math.floor(pos)
  const frac = pos - i
  const a = paradas[i]
  const b = paradas[Math.min(i + 1, paradas.length - 1)]
  const r = Math.round(a[0] + (b[0] - a[0]) * frac)
  const g = Math.round(a[1] + (b[1] - a[1]) * frac)
  const bl = Math.round(a[2] + (b[2] - a[2]) * frac)
  return `rgb(${r},${g},${bl})`
}

// Raios em metros — bem menores para bairro (distâncias curtas dentro de
// uma cidade) do que para cidade (distâncias entre municípios).
const RAIOS = {
  cidade: { base: 3000, extra: 18000 },
  bairro: { base: 250, extra: 900 },
}

function AjustarLimites({ pontos }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView([pontos[0].latitude, pontos[0].longitude], 13)
      return
    }
    const bounds = L.latLngBounds(pontos.map((p) => [p.latitude, p.longitude]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
  }, [pontos, map])
  return null
}

export default function MapaDeCalor({ contagemPorLocal, nivel }) {
  const [carregando, setCarregando] = useState(false)
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 })
  const [pontos, setPontos] = useState([])
  const [carregadoUmaVez, setCarregadoUmaVez] = useState(false)

  async function carregar() {
    setCarregando(true)
    setProgresso({ feito: 0, total: contagemPorLocal.length })
    const novosPontos = []
    for (let i = 0; i < contagemPorLocal.length; i++) {
      const item = contagemPorLocal[i]
      try {
        const resultado = await geocodificar(`${item.nome}, Brasil`)
        if (resultado) {
          novosPontos.push({ ...resultado, quantidade: item.quantidade, nome: item.nome })
        }
      } catch {
        // segue para o próximo local mesmo se um falhar
      }
      setProgresso({ feito: i + 1, total: contagemPorLocal.length })
    }
    setPontos(novosPontos)
    setCarregando(false)
    setCarregadoUmaVez(true)
  }

  useEffect(() => {
    setPontos([])
    setCarregadoUmaVez(false)
  }, [nivel])

  if (!carregadoUmaVez) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-navy-200 dark:border-navy-700">
        {carregando ? (
          <>
            <RefreshCw size={20} className="animate-spin text-navy-400" />
            <p className="text-sm text-navy-500 dark:text-navy-400">
              Localizando regiões… {progresso.feito}/{progresso.total}
            </p>
            <p className="text-xs text-navy-400">Só demora na primeira vez — depois fica em cache.</p>
          </>
        ) : (
          <>
            <MapPin size={22} className="text-navy-400" />
            <button onClick={carregar} className="btn-primary">
              Carregar mapa de calor
            </button>
            <p className="text-xs text-navy-400">Consulta uma API de geolocalização gratuita (OpenStreetMap).</p>
          </>
        )}
      </div>
    )
  }

  if (pontos.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center rounded-md border border-navy-100 dark:border-navy-800">
        <p className="text-sm text-navy-400">Nenhuma localização encontrada para os filtros atuais.</p>
      </div>
    )
  }

  const maxQuantidade = Math.max(...pontos.map((p) => p.quantidade))
  const totalGeral = pontos.reduce((s, p) => s + p.quantidade, 0)
  const raios = RAIOS[nivel] || RAIOS.cidade

  return (
    <div className="h-80 rounded-md overflow-hidden border border-navy-100 dark:border-navy-800">
      <MapContainer center={[-14.235, -51.9253]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pontos.map((p) => {
          const t = maxQuantidade ? p.quantidade / maxQuantidade : 0
          const raio = raios.base + Math.sqrt(t) * raios.extra
          const pct = totalGeral ? Math.round((p.quantidade / totalGeral) * 100) : 0
          return (
            <Circle
              key={`${p.latitude}-${p.longitude}`}
              center={[p.latitude, p.longitude]}
              radius={raio}
              pathOptions={{ color: corIntensidade(t), fillColor: corIntensidade(t), fillOpacity: 0.55, weight: 1, opacity: 0.7 }}
            >
              <MapTooltip direction="top" opacity={1}>
                <div className="text-xs">
                  <strong>{p.nome}</strong>
                  <br />
                  {formatarNumero(p.quantidade)} candidato{p.quantidade !== 1 ? 's' : ''} · {pct}% do total
                </div>
              </MapTooltip>
            </Circle>
          )
        })}
        <AjustarLimites pontos={pontos} />
      </MapContainer>
    </div>
  )
}
