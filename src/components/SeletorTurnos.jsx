import { useState } from 'react'

const TURNOS = [
  { id: 'madrugada', label: 'Madrugada', horario: '00:00 - 06:00' },
  { id: 'manha', label: 'Manhã', horario: '06:00 - 12:00' },
  { id: 'tarde', label: 'Tarde', horario: '12:00 - 18:00' },
  { id: 'noite', label: 'Noite', horario: '18:00 - 00:00' },
]

export function calcularTextoTurnos({ manha, tarde, noite, madrugada }) {
  if (!manha && !tarde && !noite && !madrugada) {
    return 'Nenhum horário selecionado'
  }
  if (manha && tarde && noite && madrugada) {
    return 'Disponibilidade Total (24 horas por dia)'
  }

  // Blocos contínuos de 2 ou 3 turnos
  if (madrugada && manha && !tarde && !noite) return 'Das 00:00 às 12:00 (Madrugada e Manhã)'
  if (manha && tarde && !noite && !madrugada) return 'Das 06:00 às 18:00 (Manhã e Tarde)'
  if (tarde && noite && !manha && !madrugada) return 'Das 12:00 às 00:00 (Tarde e Noite)'
  if (noite && madrugada && !manha && !tarde) return 'Das 18:00 (Noite) até às 06:00 do dia seguinte'

  if (madrugada && manha && tarde && !noite) return 'Das 00:00 às 18:00 (abrangendo Madrugada, Manhã e Tarde)'
  if (manha && tarde && noite && !madrugada) return 'Das 06:00 às 00:00 (abrangendo Manhã, Tarde e Noite)'
  if (tarde && noite && madrugada && !manha)
    return 'Das 12:00 (Tarde) até às 06:00 do dia seguinte (abrangendo Tarde, Noite e Madrugada)'
  if (noite && madrugada && manha && !tarde)
    return 'Das 18:00 (Noite) até às 12:00 do dia seguinte (abrangendo Noite, Madrugada e Manhã)'

  // Turnos individuais puros
  if (manha && !tarde && !noite && !madrugada) return 'Das 06:00 às 12:00 (Apenas Manhã)'
  if (tarde && !manha && !noite && !madrugada) return 'Das 12:00 às 18:00 (Apenas Tarde)'
  if (noite && !manha && !tarde && !madrugada) return 'Das 18:00 às 00:00 (Apenas Noite)'
  if (madrugada && !manha && !tarde && !noite) return 'Das 00:00 às 06:00 (Apenas Madrugada)'

  // Horários picados (ordenados cronologicamente por quem começa mais cedo)
  const partes = []
  if (madrugada) partes.push('00:00 às 06:00 (Madrugada)')
  if (manha) partes.push('06:00 às 12:00 (Manhã)')
  if (tarde) partes.push('12:00 às 18:00 (Tarde)')
  if (noite) partes.push('18:00 às 00:00 (Noite)')
  return `Disponibilidade: ${partes.join(' e/ou ')}`
}

const VAZIO = { manha: false, tarde: false, noite: false, madrugada: false }

export default function SeletorTurnos({ label, onChange, comentario, posicaoComentario = 'depois' }) {
  const [selecionados, setSelecionados] = useState(VAZIO)

  const totalAtivo = selecionados.manha && selecionados.tarde && selecionados.noite && selecionados.madrugada
  const texto = calcularTextoTurnos(selecionados)

  function aplicar(novo) {
    setSelecionados(novo)
    onChange(calcularTextoTurnos(novo))
  }

  // Se "Total" estava ativo e qualquer turno é desmarcado, "Total" apaga
  // sozinho (porque deixa de ter os 4 marcados). Se os 4 forem marcados
  // manualmente, "Total" acende sozinho — ambos derivam do mesmo estado.
  function alternarTurno(id) {
    aplicar({ ...selecionados, [id]: !selecionados[id] })
  }

  function alternarTotal() {
    aplicar(totalAtivo ? VAZIO : { manha: true, tarde: true, noite: true, madrugada: true })
  }

  const blocoComentario = comentario && <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />

  return (
    <div>
      {posicaoComentario === 'antes' && blocoComentario}
      <span className="field-label">{label}</span>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {TURNOS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => alternarTurno(t.id)}
            className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
              selecionados[t.id]
                ? 'border-navy-700 bg-navy-700 text-white'
                : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
            }`}
          >
            <span className="block text-sm font-medium">{t.label}</span>
            <span className={`block text-xs ${selecionados[t.id] ? 'text-white/70' : 'text-navy-400'}`}>{t.horario}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={alternarTotal}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors mb-2.5 ${
          totalAtivo
            ? 'border-amber-500 bg-amber-400 text-navy-900'
            : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
        }`}
      >
        Total (24 horas)
      </button>
      <div className="rounded-lg bg-navy-50 dark:bg-navy-800 px-3.5 py-2.5">
        <p className="text-xs font-medium text-navy-500 dark:text-navy-400 mb-0.5">Horário de disponibilidade selecionado:</p>
        <p className="text-sm text-navy-800 dark:text-navy-100 font-medium">{texto}</p>
      </div>
      {posicaoComentario !== 'antes' && blocoComentario}
    </div>
  )
}
