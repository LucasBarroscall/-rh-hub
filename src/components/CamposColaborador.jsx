import { useState } from 'react'

const BOTAO = (ativo) =>
  `rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    ativo
      ? 'border-navy-700 bg-navy-700 text-white'
      : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
  }`

// Matrícula, Vale (VA ou VR) com 1ª/2ª via e CHAVE M — preenchidos a partir do Entrevistador 3.
export default function CamposColaborador({ valores, onChange, desabilitado }) {
  const [matricula, setMatricula] = useState(valores.matricula || '')
  const [chaveM, setChaveM] = useState(valores.chave_m || '')

  function salvarTexto(campo, texto, setTexto, atual) {
    const v = texto.trim().toUpperCase()
    setTexto(v)
    if ((v || null) !== (atual || null)) onChange({ [campo]: v || null })
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">Matrícula</label>
          <input
            className="field-input"
            value={matricula}
            disabled={desabilitado}
            onChange={(e) => setMatricula(e.target.value)}
            onBlur={() => salvarTexto('matricula', matricula, setMatricula, valores.matricula)}
          />
        </div>
        <div>
          <label className="field-label">CHAVE M</label>
          <input
            className="field-input"
            value={chaveM}
            disabled={desabilitado}
            onChange={(e) => setChaveM(e.target.value)}
            onBlur={() => salvarTexto('chave_m', chaveM, setChaveM, valores.chave_m)}
          />
        </div>
      </div>
      <div>
        <span className="field-label">Vale</span>
        <div className="grid grid-cols-2 gap-2 max-w-xs">
          {['VA', 'VR'].map((op) => (
            <button
              key={op}
              type="button"
              disabled={desabilitado}
              onClick={() => onChange(valores.vale === op ? { vale: null, vale_via: null } : { vale: op })}
              className={BOTAO(valores.vale === op)}
            >
              {op}
            </button>
          ))}
        </div>
      </div>
      {valores.vale && (
        <div>
          <span className="field-label">Via do vale ({valores.vale})</span>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            {['1ª via', '2ª via'].map((op) => (
              <button key={op} type="button" disabled={desabilitado} onClick={() => onChange({ vale_via: valores.vale_via === op ? null : op })} className={BOTAO(valores.vale_via === op)}>
                {op}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
