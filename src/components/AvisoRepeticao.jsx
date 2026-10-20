import { Repeat } from 'lucide-react'
import { formatarData } from '../lib/candidato'

// Aviso fixo no canto da tela: o resultado deste candidato foi repetido de um
// cadastro anterior — com opção de mudar de ideia.
export default function AvisoRepeticao({ candidato, duplicatas, onReabrir }) {
  if (!candidato?.resultado_repetido_de) return null
  const origem = (duplicatas || []).find((d) => d.id === candidato.resultado_repetido_de)
  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-xs card-elevated p-3.5 text-sm">
      <p className="text-navy-700 dark:text-navy-200 flex items-start gap-2">
        <Repeat size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <span>
          Resultado repetido do cadastro anterior{origem ? ` de ${formatarData(origem.data_entrevista || origem.created_at)}` : ''}.
        </span>
      </p>
      <button onClick={onReabrir} className="btn-secondary text-xs mt-2.5">
        Mudar de ideia
      </button>
    </div>
  )
}
