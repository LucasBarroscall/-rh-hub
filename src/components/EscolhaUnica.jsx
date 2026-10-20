// Botões de escolha única (nunca mais de uma opção marcada). Cada botão pode
// ter uma legenda pequena (ex.: o horário do turno), igual ao horário de trabalho.
export default function EscolhaUnica({ label, opcoes, valor, onChange, comentario, posicaoComentario = 'depois', legendas }) {
  const bloco = comentario && <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />
  const temLegenda = opcoes.some((o) => legendas && legendas[o])
  return (
    <div>
      <span className="field-label">{label}</span>
      {posicaoComentario === 'antes' && bloco}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op) => {
          const ativo = valor === op
          return (
            <button
              type="button"
              key={op}
              onClick={() => onChange(op)}
              className={`flex-1 min-w-[90px] rounded-lg border px-4 py-2.5 transition-colors ${temLegenda ? 'text-left' : ''} ${
                ativo
                  ? 'border-navy-700 bg-navy-700 text-white'
                  : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
              }`}
            >
              <span className="block text-sm font-medium">{op}</span>
              {legendas && legendas[op] && <span className={`block text-xs ${ativo ? 'text-white/70' : 'text-navy-400'}`}>{legendas[op]}</span>}
            </button>
          )
        })}
      </div>
      {posicaoComentario !== 'antes' && bloco}
    </div>
  )
}
