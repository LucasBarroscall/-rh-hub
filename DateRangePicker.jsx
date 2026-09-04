import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarRange, X } from 'lucide-react'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function mesmoDia(a, b) {
  return a && b && a.toDateString() === b.toDateString()
}

function gerarGrade(mesExibido) {
  const ano = mesExibido.getFullYear()
  const mes = mesExibido.getMonth()
  const primeiroDia = new Date(ano, mes, 1)
  const inicioGrade = new Date(primeiroDia)
  inicioGrade.setDate(primeiroDia.getDate() - primeiroDia.getDay())
  const dias = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioGrade)
    d.setDate(inicioGrade.getDate() + i)
    dias.push(d)
  }
  return dias
}

function formatarCurto(d) {
  if (!d) return null
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function DateRangePicker({ inicio, fim, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [mesExibido, setMesExibido] = useState(() => inicio || new Date())
  const [escolhendoFim, setEscolhendoFim] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  function clicarDia(dia) {
    if (!inicio || (inicio && fim) || !escolhendoFim) {
      onChange({ inicio: dia, fim: null })
      setEscolhendoFim(true)
      return
    }
    if (dia < inicio) {
      onChange({ inicio: dia, fim: inicio })
    } else {
      onChange({ inicio, fim: dia })
    }
    setEscolhendoFim(false)
    setAberto(false)
  }

  function limpar(e) {
    e.stopPropagation()
    onChange({ inicio: null, fim: null })
    setEscolhendoFim(false)
  }

  const dias = gerarGrade(mesExibido)
  const rotulo = inicio ? `${formatarCurto(inicio)} — ${fim ? formatarCurto(fim) : '…'}` : 'Período personalizado'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((a) => !a)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          inicio
            ? 'border-navy-700 bg-navy-700 text-white'
            : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
        }`}
      >
        <CalendarRange size={14} />
        {rotulo}
        {inicio && (
          <span onClick={limpar} className="hover:opacity-70">
            <X size={13} />
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute z-40 mt-2 right-0 card p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() - 1, 1))}
              className="text-navy-400 hover:text-navy-700 dark:hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-medium text-navy-800 dark:text-navy-100">
              {MESES[mesExibido.getMonth()]} {mesExibido.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 1))}
              className="text-navy-400 hover:text-navy-700 dark:hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-navy-400 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dias.map((d, i) => {
              const foraDoMes = d.getMonth() !== mesExibido.getMonth()
              const ehInicio = mesmoDia(d, inicio)
              const ehFim = mesmoDia(d, fim)
              const noIntervalo = inicio && fim && d > inicio && d < fim
              let classe = 'text-navy-700 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
              if (foraDoMes) classe = 'text-navy-200 dark:text-navy-700'
              if (noIntervalo) classe = 'bg-navy-50 dark:bg-navy-800 text-navy-700 dark:text-navy-200'
              if (ehInicio || ehFim) classe = 'bg-navy-700 text-white font-semibold'
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => clicarDia(d)}
                  className={`h-8 w-8 text-xs rounded-md transition-colors ${classe}`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-navy-400 mt-3">
            {!inicio ? 'Clique numa data para começar.' : escolhendoFim ? 'Agora clique na data final.' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
