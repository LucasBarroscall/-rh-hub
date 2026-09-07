import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import { MapPin, RefreshCw } from 'lucide-react'
import { geocodificar } from '../lib/geocoding'

function CamadaDeCalor({ pontos }) {
  const map = useMap()
  const camadaRef = useRef(null)

  useEffect(() => {
    if (camadaRef.current) {
      map.removeLayer(camadaRef.current)
      camadaRef.current = null
    }
    if (pontos.length === 0) return
    camadaRef.current = L.heatLayer(pontos, { radius: 28, blur: 22, maxZoom: 12 }).addTo(map)
    const bounds = L.latLngBounds(pontos.map((p) => [p[0], p[1]]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 })
    return () => {
      if (camadaRef.current) map.removeLayer(camadaRef.current)
    }
  }, [pontos, map])

  return null
}

export default function MapaDeCalor({ contagemPorLocal, nivel }) {
  // contagemPorLocal: [{ nome, cidade, quantidade }] — para bairro, nome é
  // "bairro, cidade"; para cidade, nome é "cidade, estado".
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
      const resultado = await geocodificar(`${item.nome}, Brasil`)
      if (resultado) {
        // peso repetido conforme a quantidade de candidatos daquele local
        for (let n = 0; n < Math.min(item.quantidade, 50); n++) {
          novosPontos.push([resultado.latitude, resultado.longitude, 0.6])
        }
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

  return (
    <div className="h-80 rounded-md overflow-hidden border border-navy-100 dark:border-navy-800">
      <MapContainer center={[-14.235, -51.9253]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CamadaDeCalor pontos={pontos} />
      </MapContainer>
    </div>
  )
}
