import { useCamposFormulario } from '../lib/useCamposFormulario'
import { exibeParaEntrevistador } from '../lib/camposPersonalizados'

// Respostas dos campos criados pelo analista, no MESMO formato dos demais dados do
// candidato — e só quando o analista permitiu que apareçam para o entrevistador.
export default function CamposAdicionaisCandidato({ candidato, etapa, comGrade = false }) {
  const { customizados } = useCamposFormulario()
  const extras = (candidato && candidato.respostas_extras) || {}
  const itens = customizados.filter((c) => exibeParaEntrevistador(c, extras[c.chave], etapa))
  if (itens.length === 0) return null
  const linhas = itens.map((c) => (
    <div key={c.id}>
      <span className="text-navy-400">{c.rotulo}: </span>
      <span className="text-navy-700 dark:text-navy-200">{String(extras[c.chave])}</span>
    </div>
  ))
  return comGrade ? <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">{linhas}</dl> : linhas
}
