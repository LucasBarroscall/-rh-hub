// Grupo de checkboxes para campos que aceitam mais de uma opção
// (ex.: horário de trabalho). O valor é guardado como texto único,
// com as opções escolhidas separadas por " | ".
export default function CheckboxGroup({ label, opcoes, valor, onChange, comentario }) {
  const selecionadas = (valor || '').split(' | ').filter(Boolean)

  function alternar(op) {
    const novaLista = selecionadas.includes(op)
      ? selecionadas.filter((v) => v !== op)
      : [...selecionadas, op]
    // mantém a ordem das opções, não a ordem de clique
    const ordenada = opcoes.filter((o) => novaLista.includes(o))
    onChange(ordenada.join(' | '))
  }

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op) => {
          const ativo = selecionadas.includes(op)
          return (
            <button
              type="button"
              key={op}
              onClick={() => alternar(op)}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                ativo
                  ? 'border-navy-700 bg-navy-700 text-white'
                  : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
              }`}
            >
              {op}
            </button>
          )
        })}
      </div>
      {comentario && <p className="text-xs text-navy-500 dark:text-navy-400 mt-1.5">{comentario}</p>}
    </div>
  )
}
