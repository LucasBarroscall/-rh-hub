import { useCamposFormulario } from '../lib/useCamposFormulario'
import { respostaVazia } from '../lib/camposPersonalizados'

// Mostra, de forma resumida, as respostas dos campos personalizados do candidato.
export default function RespostasExtras({ candidato }) {
  const { customizados } = useCamposFormulario()
  const extras = candidato?.respostas_extras || {}
  const itens = customizados.filter((c) => !respostaVazia(extras[c.chave]))
  if (itens.length === 0) return null
  return (
    <div className="rounded-lg bg-navy-50 dark:bg-navy-800 px-3.5 py-3 mb-4 text-sm">
      <p className="font-medium text-navy-700 dark:text-navy-200 mb-1">Respostas adicionais</p>
      {itens.map((c) => (
        <p key={c.id} className="text-navy-600 dark:text-navy-300">
          <span className="text-navy-400">{c.rotulo}: </span>
          {String(extras[c.chave])}
        </p>
      ))}
    </div>
  )
}
