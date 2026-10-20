// Grupo de checkboxes para campos que aceitam mais de uma opção
// (ex.: múltipla escolha). O valor é guardado como texto único, com as
// opções escolhidas separadas por " | ". Cada botão pode ter uma legenda.
export default function CheckboxGroup({ label, opcoes, valor, onChange, comentario, posicaoComentario = 'depois', legendas }) {
  const selecionadas = (valor || '').split(' | ').filter(Boolean)
  const blocoComentario = comentario && (
    <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />
  )
  const temLegenda = opcoes.some((o) => legendas && legendas[o])

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
      {posicaoComentario === 'antes' && blocoComentario}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op) => {
          const ativo = selecionadas.includes(op)
          return (
            <button
              type="button"
              key={op}
              onClick={() => alternar(op)}
              className={`rounded-lg border px-3.5 py-2 transition-colors ${temLegenda ? 'text-left' : ''} ${
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
      {posicaoComentario !== 'antes' && blocoComentario}
    </div>
  )
}
