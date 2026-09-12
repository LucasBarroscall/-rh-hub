import { useEffect, useState } from 'react'

export default function Relogio() {
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(agora)

  const obter = (tipo) => partes.find((p) => p.type === tipo)?.value || ''
  const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

  const diaSemana = capitalizar(obter('weekday'))
  const mes = capitalizar(obter('month'))

  return (
    <p className="text-xs text-navy-400 tabular-nums whitespace-nowrap">
      {diaSemana} {obter('day')} de {mes} de {obter('year')}, {obter('hour')}:{obter('minute')}:{obter('second')}
    </p>
  )
}
