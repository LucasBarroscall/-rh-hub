// Tipos de campo que o analista pode criar (mesmas famílias dos campos padrão).
export const TIPOS_CAMPO = [
  ['texto', 'Texto curto'],
  ['texto_longo', 'Texto longo'],
  ['numero', 'Número'],
  ['data', 'Data'],
  ['sim_nao', 'Sim / Não'],
  ['selecao', 'Escolha única (botões)'],
  ['lista', 'Lista suspensa'],
  ['multipla', 'Múltipla escolha'],
]
export const TIPOS_COM_OPCOES = ['selecao', 'lista', 'multipla']
export const TIPOS_CONTROLADORES = ['sim_nao', 'selecao', 'lista', 'multipla']

// Valor atual do campo que controla a condição. Campos padrão Sim/Não são
// booleanos no formulário; campos personalizados ficam em respostas_extras.
export function valorDoControlador(chave, lista, form) {
  if (lista.some((c) => c.chave === chave)) return (form.respostas_extras || {})[chave]
  const v = form[chave]
  if (v === true) return 'Sim'
  if (v === false) return 'Não'
  return v
}

// Um campo condicional só aparece quando a resposta do campo "pai" for uma das
// escolhidas — e só se o próprio pai também estiver visível (condições em cadeia).
export function estaVisivel(campo, lista, form, nivel = 0) {
  const cond = campo.condicao
  if (!cond || !cond.campo || nivel > 10) return true
  const pai = lista.find((c) => c.chave === cond.campo)
  if (pai && !estaVisivel(pai, lista, form, nivel + 1)) return false
  const valor = valorDoControlador(cond.campo, lista, form)
  if (valor == null || valor === '') return false
  const escolhidos = String(valor).split(' | ')
  return (cond.valores || []).some((v) => escolhidos.includes(v))
}

export function respostaVazia(v) {
  return v === undefined || v === null || v === ''
}

// Exibição dos campos personalizados para os ENTREVISTADORES (o analista escolhe por campo):
//   modo 'nunca' | 'sempre' (quando houver resposta) | 'quando' (só se a resposta for uma das escolhidas)
//   etapas: em quais etapas (1, 2, 3) aparece.
// Sem configuração: Sim/Não aparece só quando a resposta for "Sim"; os demais tipos não aparecem.
export function exibicaoPadrao(campo) {
  return campo.tipo === 'sim_nao' ? { modo: 'quando', valores: ['Sim'], etapas: [1, 2, 3] } : { modo: 'nunca', valores: [], etapas: [1, 2, 3] }
}

export function exibeParaEntrevistador(campo, valor, etapa) {
  if (respostaVazia(valor)) return false
  const e = campo.exibicao || exibicaoPadrao(campo)
  if (e.modo === 'nunca') return false
  if (etapa && !(e.etapas || [1, 2, 3]).includes(etapa)) return false
  if (e.modo === 'sempre') return true
  const escolhidos = String(valor).split(' | ')
  return (e.valores || []).some((v) => escolhidos.includes(v))
}
