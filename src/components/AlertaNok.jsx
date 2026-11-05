import { ShieldAlert } from 'lucide-react'

// Alerta vermelho discreto ao lado do nome: candidato reprovado no Compliance (NOK).
export default function AlertaNok({ candidato }) {
  if (!candidato || candidato.compliance !== 'Reprovado') return null
  return (
    <span
      title="Candidato NOK — reprovado no Compliance"
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-clay-500/10 text-clay-600 align-middle whitespace-nowrap"
    >
      <ShieldAlert size={10} /> NOK
    </span>
  )
}
