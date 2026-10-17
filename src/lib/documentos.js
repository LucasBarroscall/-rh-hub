// Resumo da checklist de documentos de um candidato.
// documentos = { "CTPS": "enviado" | "na" }  (ausente = pendente)
// "na" (não se aplica) sai do cálculo do percentual.
export function resumoDocumentos(candidato, lista) {
  const docs = (candidato && candidato.documentos) || {}
  const ativos = (lista || []).filter(Boolean)
  const aplicaveis = ativos.filter((d) => docs[d] !== 'na')
  const enviados = aplicaveis.filter((d) => docs[d] === 'enviado')
  const faltantes = aplicaveis.filter((d) => docs[d] !== 'enviado')
  return {
    total: ativos.length,
    aplicaveis: aplicaveis.length,
    enviados: enviados.length,
    faltantes,
    pct: aplicaveis.length ? Math.round((enviados.length / aplicaveis.length) * 100) : null,
  }
}
