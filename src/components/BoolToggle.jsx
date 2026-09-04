// Botão duplo Sim/Não que permite desmarcar: clicar na opção já
// selecionada limpa a resposta (volta para null) — usado nas 3 telas
// de entrevistador para todo campo booleano do funil.
export default function BoolToggle({ label, value, onChange, disabled, semantic, comentario }) {
  function clicar(v) {
    onChange(value === v ? null : v)
  }

  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex gap-2">
        {[true, false].map((v) => {
          const ativo = value === v
          let classe = 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200 dark:hover:bg-navy-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-navy-900 disabled:cursor-not-allowed'
          if (ativo) {
            if (semantic) {
              classe = v
                ? 'border-sage-500 bg-sage-500 text-white'
                : 'border-clay-500 bg-clay-500 text-white'
            } else {
              classe = 'border-navy-700 bg-navy-700 text-white'
            }
          }
          return (
            <button
              key={String(v)}
              type="button"
              disabled={disabled}
              onClick={() => clicar(v)}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${classe}`}
            >
              {v ? 'Sim' : 'Não'}
            </button>
          )
        })}
      </div>
      {(value === true || value === false) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="mt-1.5 text-xs text-navy-400 hover:text-navy-700 dark:text-navy-500 dark:hover:text-navy-200"
        >
          limpar resposta
        </button>
      )}
      {comentario && <p className="text-xs text-navy-500 dark:text-navy-400 mt-1.5">{comentario}</p>}
    </div>
  )
}
