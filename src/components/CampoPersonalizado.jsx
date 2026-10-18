import EscolhaUnica from './EscolhaUnica'
import CheckboxGroup from './CheckboxGroup'
import ComentarioCampo from './ComentarioCampo'

// Renderiza um campo criado pelo analista, com o mesmo comportamento dos
// campos padrão: título editável, comentário com formatação e posição.
export default function CampoPersonalizado({ campo, valor, onChange, titulo, comentario, posicao = 'depois' }) {
  const rotulo = (titulo || campo.rotulo) + (campo.obrigatorio ? ' *' : '')
  const opcoes = campo.opcoes || []

  if (campo.tipo === 'sim_nao') {
    const bloco = comentario && <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />
    return (
      <div>
        {posicao === 'antes' && bloco}
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
        {posicao !== 'antes' && bloco}
      </div>
    )
  }
  if (campo.tipo === 'selecao') {
    return <EscolhaUnica label={rotulo} opcoes={opcoes} valor={valor || ''} onChange={onChange} comentario={comentario} posicaoComentario={posicao} />
  }
  if (campo.tipo === 'multipla') {
    return <CheckboxGroup label={rotulo} opcoes={opcoes} valor={valor || ''} onChange={onChange} comentario={comentario} posicaoComentario={posicao} />
  }

  let controle
  if (campo.tipo === 'lista') {
    controle = (
      <select className="field-select" value={valor || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Selecione
        </option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  } else if (campo.tipo === 'texto_longo') {
    controle = <textarea rows={3} className="field-input" placeholder={campo.placeholder || ''} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} />
  } else {
    controle = (
      <input
        type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'data' ? 'date' : 'text'}
        className="field-input"
        placeholder={campo.placeholder || ''}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <div className="flex flex-col">
      <label className="field-label">{rotulo}</label>
      {controle}
      <ComentarioCampo texto={comentario} posicao={posicao} />
    </div>
  )
}
