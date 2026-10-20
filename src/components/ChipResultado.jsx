import { estiloResultado, rotuloResultado, PENDENTE } from '../lib/resultados'

// Etiqueta colorida do resultado final (Voz, Chat, Reprovado(a), Pendente…).
export default function ChipResultado({ resultado }) {
  const r = resultado || PENDENTE
  const cor = estiloResultado(r)
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `${cor}22`, color: cor, border: `1px solid ${cor}55` }}
    >
      {rotuloResultado(r)}
    </span>
  )
}
