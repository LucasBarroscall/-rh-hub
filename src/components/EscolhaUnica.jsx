// Botões de escolha única (nunca mais de uma opção marcada).
export default function EscolhaUnica({ label, opcoes, valor, onChange, comentario, posicaoComentario = 'depois' }) {
  const bloco = comentario && <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />
  return (
    <div>
      {posicaoComentario === 'antes' && bloco}
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op) => (
          <button
            type="button"
            key={op}
            onClick={() => onChange(op)}
            className={`flex-1 min-w-[90px] rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              valor === op
                ? 'border-navy-700 bg-navy-700 text-white'
                : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
            }`}
          >
            {op}
          </button>
        ))}
      </div>
      {posicaoComentario !== 'antes' && bloco}
    </div>
  )
}
