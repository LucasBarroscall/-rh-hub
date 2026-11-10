// Traduz o erro que o banco devolve ao salvar numa mensagem que a pessoa entende.
export function traduzirErroSalvar(erro) {
  const m = (erro && erro.message) || ''
  if (m.includes('DADOS_COLABORADOR_SOMENTE_ENTREVISTADOR3')) return 'Só o Entrevistador 3 e o analista podem preencher matrícula, vale e CHAVE M.'
  if (m.includes('COMPLIANCE_SOMENTE_ANALISTA')) return 'Só o analista altera o resultado do Compliance.'
  if (m.includes('CPF_DUPLICADO_HOJE')) return 'Este CPF já foi cadastrado hoje.'
  const coluna = /Could not find the '([^']+)' column/.exec(m) || /column "?([a-z_]+)"? of relation "?candidatos"? does not exist/i.exec(m)
  if (coluna) return `O banco ainda não tem a coluna "${coluna[1]}". Rode a atualização pendente (SQL) no Supabase e tente de novo.`
  const regra = /violates check constraint "?([a-z_]+)"?/i.exec(m)
  if (regra) return `O banco recusou esse valor (regra "${regra[1]}"). Rode o SQL de correção (rodada_18.sql) no Supabase.`
  return m ? `Não foi possível salvar: ${m}` : 'Não foi possível salvar.'
}
