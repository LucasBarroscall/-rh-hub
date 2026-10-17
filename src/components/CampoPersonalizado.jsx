import EscolhaUnica from './EscolhaUnica'

// Renderiza um campo criado pelo analista (Administração → Campos do formulário).
export default function CampoPersonalizado({ campo, valor, onChange }) {
  const rotulo = campo.rotulo + (campo.obrigatorio ? ' *' : '')
  if (campo.tipo === 'sim_nao') {
    return (
      <div>
        <span className="field-label">{rotulo}</span>
        <div className="flex gap-2">
          {['Sim', 'Não'].map((op) => (
            <button
              type="button"
              key={op}
              onClick={() => onChange(op)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                valor === op
                  ? 'border-navy-700 bg-navy-700 text-white'
                  : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
              }`}
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (campo.tipo === 'selecao') {
    return <EscolhaUnica label={rotulo} opcoes={campo.opcoes || []} valor={valor || ''} onChange={onChange} />
  }
  return (
    <div className="flex flex-col">
      <label className="field-label">{rotulo}</label>
      <input
        type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'data' ? 'date' : 'text'}
        className="field-input"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
