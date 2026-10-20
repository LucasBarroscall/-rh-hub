import { AlertOctagon } from 'lucide-react'
import { formatarData } from '../lib/candidato'

function motivos(d) {
  const lista = []
  if (d.aprovado_entrevista === false) lista.push({ quando: d.entrevista_em || d.data_entrevista || d.created_at, texto: 'Reprovado na entrevista' })
  if (d.aprovado_teste === false) {
    lista.push({ quando: d.teste_em || d.created_at, texto: `Reprovado no teste de digitação (WPM ${d.wpm ?? '—'}, precisão ${d.precisao ?? '—'}%)` })
  }
  if (d.compliance === 'Reprovado') lista.push({ quando: d.decisao_em || d.created_at, texto: 'Reprovado no compliance' })
  if (d.aprovado_exame === false) lista.push({ quando: d.decisao_em || d.created_at, texto: 'Reprovado no exame' })
  if (d.decisao_final === 'Reprovado') lista.push({ quando: d.decisao_em || d.created_at, texto: 'Reprovado (decisão final)' })
  return lista
}

// Alerta vermelho: este CPF já foi reprovado em um processo anterior (e quando).
export default function AlertaReprovacaoAnterior({ duplicatas }) {
  const itens = []
  ;(duplicatas || []).forEach((d) => motivos(d).forEach((m) => itens.push({ ...m, cadastro: d.created_at })))
  if (itens.length === 0) return null
  return (
    <div role="alert" className="rounded-lg border border-clay-500/40 bg-clay-500/10 px-3.5 py-3 mb-4 text-sm text-clay-600">
      <p className="font-semibold flex items-center gap-1.5">
        <AlertOctagon size={16} /> Candidato reprovado anteriormente
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {itens.map((m, i) => (
          <li key={i}>
            {formatarData(m.quando)} — {m.texto} <span className="opacity-70">(cadastro de {formatarData(m.cadastro)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
