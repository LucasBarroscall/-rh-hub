export default function CampoFonte({
  fontes,
  fonteValor,
  onFonteChange,
  detalheValor,
  onDetalheChange,
  subValor,
  onSubChange,
  comentario,
}) {
  const selecionada = fontes.find((f) => f.valor === fonteValor)

  return (
    <>
      <div>
        <label className="field-label">Fonte</label>
        <select className="field-select" required value={fonteValor} onChange={(e) => onFonteChange(e.target.value)}>
          <option value="" disabled>
            Selecione
          </option>
          {fontes.map((f) => (
            <option key={f.id} value={f.valor}>
              {f.valor}
            </option>
          ))}
        </select>
        {comentario && <p className="text-xs text-navy-500 dark:text-navy-400 mt-1.5">{comentario}</p>}
      </div>

      {selecionada?.tipo_dependencia === 'texto' && (
        <div>
          <label className="field-label">{selecionada.rotulo_dependencia || 'Detalhe'}</label>
          <input
            required
            className="field-input"
            value={detalheValor}
            onChange={(e) => onDetalheChange(e.target.value)}
            placeholder={selecionada.placeholder_dependencia || ''}
          />
        </div>
      )}

      {selecionada?.tipo_dependencia === 'lista' && (
        <div>
          <label className="field-label">{selecionada.rotulo_dependencia || 'Selecione'}</label>
          <select required className="field-select" value={subValor} onChange={(e) => onSubChange(e.target.value)}>
            <option value="" disabled>
              Selecione
            </option>
            {selecionada.subopcoes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
