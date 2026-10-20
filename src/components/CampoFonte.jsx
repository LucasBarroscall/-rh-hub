export default function CampoFonte({
  fontes,
  fonteValor,
  onFonteChange,
  detalheValor,
  onDetalheChange,
  onDetalheBlur,
  onDetalheFocus,
  detalheInvalido,
  subValor,
  onSubChange,
  comentario,
  posicaoComentario = 'depois',
  rotulo,
}) {
  const selecionada = fontes.find((f) => f.valor === fonteValor)
  const blocoComentario = comentario && (
    <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />
  )

  return (
    <>
      <div>
        <label className="field-label">{rotulo || 'Fonte'}</label>
        {posicaoComentario === 'antes' && blocoComentario}
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
        {posicaoComentario !== 'antes' && blocoComentario}
      </div>

      {selecionada?.tipo_dependencia === 'texto' && (
        <div>
          <label className="field-label">{selecionada.rotulo_dependencia || 'Detalhe'}</label>
          <input
            required
            className={`field-input ${detalheInvalido ? 'border-clay-500 ring-2 ring-clay-500/20' : ''}`}
            value={detalheValor}
            onBlur={onDetalheBlur}
            onFocus={onDetalheFocus}
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
