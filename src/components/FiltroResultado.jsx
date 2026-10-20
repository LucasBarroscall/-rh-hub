import { rotuloResultado } from '../lib/resultados'

// Filtro "Resultado final" usado em todas as telas.
export default function FiltroResultado({ valor, onChange, opcoes, className = '' }) {
  return (
    <select className={`field-select py-1.5 text-xs w-auto ${className}`} value={valor} onChange={(e) => onChange(e.target.value)} title="Resultado final (entrevista + teste)">
      <option value="">Resultado final: todos</option>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {rotuloResultado(o)}
        </option>
      ))}
    </select>
  )
}
