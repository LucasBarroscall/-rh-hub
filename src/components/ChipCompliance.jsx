// Resultado do Compliance (status final): Aprovado (OK) / Reprovado (NOK) / sem resultado.
export default function ChipCompliance({ status }) {
  if (status === 'Aprovado') return <span className="pill bg-sage-500/15 text-sage-600">Aprovado (OK)</span>
  if (status === 'Reprovado') return <span className="pill bg-clay-500/15 text-clay-600">Reprovado (NOK)</span>
  if (status) return <span className="pill bg-navy-50 dark:bg-navy-800 text-navy-500 dark:text-navy-300">{status}</span>
  return <span className="text-navy-300">—</span>
}
