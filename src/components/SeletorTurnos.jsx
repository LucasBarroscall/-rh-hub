import { useState } from 'react'
import { calcularTextoTurnos, interpretarTurnos, turnosParaValor } from '../lib/turnos'

export { calcularTextoTurnos }

const TURNOS = [
  { id: 'madrugada', label: 'Madrugada', horario: '00:00 - 06:00' },
  { id: 'manha', label: 'Manhã', horario: '06:00 - 12:00' },
  { id: 'tarde', label: 'Tarde', horario: '12:00 - 18:00' },
  { id: 'noite', label: 'Noite', horario: '18:00 - 00:00' },
]

const VAZIO = { manha: false, tarde: false, noite: false, madrugada: false }
const TODOS = { manha: true, tarde: true, noite: true, madrugada: true }

// O que vai para o banco é só a lista de turnos (ex.: "MANHÃ | TARDE"); a frase com horários abaixo é só para a tela.
export default function SeletorTurnos({ label, onChange, valorInicial = '', comentario, posicaoComentario = 'depois' }) {
  const [selecionados, setSelecionados] = useState(() => interpretarTurnos(valorInicial))

  const totalAtivo = selecionados.manha && selecionados.tarde && selecionados.noite && selecionados.madrugada
  const texto = calcularTextoTurnos(selecionados)

  function aplicar(novo) {
    setSelecionados(novo)
    onChange(turnosParaValor(novo))
  }

  // "Total" acende sozinho quando os 4 estão marcados e apaga se qualquer um for desmarcado.
  function alternarTurno(id) {
    aplicar({ ...selecionados, [id]: !selecionados[id] })
  }

  function alternarTotal() {
    aplicar(totalAtivo ? VAZIO : TODOS)
  }

  const bloco = comentario && <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />

  return (
    <div>
      <span className="field-label">{label}</span>
      {posicaoComentario === 'antes' && bloco}
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
      {posicaoComentario !== 'antes' && bloco}
    </div>
  )
}
