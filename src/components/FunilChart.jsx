import { formatarNumero } from '../lib/status'

const LARGURA = 220
const ALTURA = 34
const PISO_VISUAL = 0.04 // largura mínima visível mesmo quando o valor é 0

function pontosTrapezio(pctTopo, pctBase) {
  const xTopoEsq = (LARGURA * (1 - pctTopo)) / 2
  const xTopoDir = LARGURA - xTopoEsq
  const xBaseEsq = (LARGURA * (1 - pctBase)) / 2
  const xBaseDir = LARGURA - xBaseEsq
  return `${xTopoEsq},0 ${xTopoDir},0 ${xBaseDir},${ALTURA} ${xBaseEsq},${ALTURA}`
}

export default function FunilChart({ etapas, cores }) {
  const max = etapas[0]?.value || 1

  return (
    <div className="space-y-1">
      {etapas.map((e, i) => {
        const pctTopo = i === 0 ? 1 : Math.max(etapas[i - 1].value / max, PISO_VISUAL)
        const pctBase = Math.max(e.value / max, PISO_VISUAL)
        const pctAnterior = i > 0 && etapas[i - 1].value ? Math.round((e.value / etapas[i - 1].value) * 100) : null
        return (
          <div key={e.name} className="flex items-center gap-3">
            <svg width={LARGURA} height={ALTURA} className="flex-shrink-0">
              <polygon points={pontosTrapezio(pctTopo, pctBase)} fill={cores[i % cores.length]} />
            </svg>
            <div className="text-xs min-w-0">
              <p className="text-navy-700 dark:text-navy-200 font-medium truncate">{e.name}</p>
              <p className="text-navy-400">
                {formatarNumero(e.value)}
                {pctAnterior != null ? ` · ${pctAnterior}% da etapa anterior` : ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
