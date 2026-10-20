import { estaVisivel, respostaVazia } from './camposPersonalizados'
import { dataBRParaISO, isoParaDataBR, validarCPF, validarDataBR, normalizarTexto } from './formatters'

export const OPCOES_TREINAMENTO = ['Manhã', 'Tarde', 'Total']
export const OPCOES_ESCALA = ['6x1', '5x2', 'Ambos']
export const OPCOES_COMPLIANCE = ['Aprovado', 'Reprovado', 'CPF não localizado']

export function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export const CAMPOS_INICIAIS = {
  fonte: '',
  rede_social: '',
  nome_indicador: '',
  nome_completo: '',
  telefone: '',
  rg: '',
  cpf: '',
  data_nascimento: '',
  sexo: '',
  nome_mae: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  email: '',
  disponibilidade_horario_trabalho: '',
  disponibilidade_horario_treinamento: '',
  disponibilidade_jornada: '',
  possui_veiculo: '',
  concorda_turno_treinamento: '',
  possui_ensino_superior: '',
  observacoes: '',
  respostas_extras: {},
}

// Mesmas regras no cadastro público, no "Adicionar candidato" e na edição.
export const VALIDACOES = {
  nome_completo: { teste: (v) => v.trim().length >= 3, mensagem: 'Digite o nome completo do candidato.' },
  nome_mae: { teste: (v) => v.trim().length >= 3, mensagem: 'Digite o nome completo da mãe.' },
  nome_indicador: { teste: (v) => v.trim().length >= 3, mensagem: 'Digite o nome completo de quem indicou.' },
  rg: { teste: (v) => v.trim().length >= 4, mensagem: 'RG inválido — confira os números digitados.' },
  cpf: { teste: (v) => validarCPF(v), mensagem: 'CPF inválido — confira os números digitados.' },
  telefone: { teste: (v) => v.replace(/\D/g, '').length === 11, mensagem: 'Telefone incompleto — informe DDD + número.' },
  email: { teste: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), mensagem: 'E-mail inválido.' },
  data_nascimento: { teste: (v) => validarDataBR(v), mensagem: 'Data de nascimento inválida — use dd/mm/aaaa.' },
  cep: { teste: (v) => v.replace(/\D/g, '').length === 8, mensagem: 'CEP incompleto — informe os 8 números.' },
}

const ROTULOS = {
  nome_completo: 'o nome completo',
  nome_mae: 'o nome da mãe',
  rg: 'o RG',
  cpf: 'o CPF',
  telefone: 'o telefone',
  email: 'o e-mail',
  data_nascimento: 'a data de nascimento',
  cep: 'o CEP',
}

// Devolve { mensagem, campo } do primeiro erro (campo = qual campo marcar em vermelho), ou null.
// estrito = true (cadastro novo): tudo obrigatório. estrito = false (edição):
// só valida o formato do que estiver preenchido (e exige nome + CPF), para não
// travar a edição de cadastros antigos incompletos.
export function validarCadastroDetalhado(form, { fontes = [], customizados = [], ocultos = new Set(), enderecoStatus = 'auto', estrito = true } = {}) {
  const falha = (mensagem, campo) => ({ mensagem, campo })
  const fonte = fontes.find((f) => f.valor === form.fonte)
  if (estrito && !form.fonte) return falha('Selecione a fonte.', 'fonte')
  if (fonte?.tipo_dependencia === 'texto') {
    if (!(form.nome_indicador || '').trim()) {
      if (estrito) return falha(`Preencha o campo "${fonte.rotulo_dependencia || 'detalhe'}".`, 'nome_indicador')
    } else if (!VALIDACOES.nome_indicador.teste(form.nome_indicador)) return falha(VALIDACOES.nome_indicador.mensagem, 'nome_indicador')
  }
  if (estrito && fonte?.tipo_dependencia === 'lista' && !form.rede_social) {
    return falha(`Selecione uma opção em "${fonte.rotulo_dependencia || 'detalhe'}".`, 'fonte')
  }

  const obrigatorios = estrito ? Object.keys(ROTULOS) : ['nome_completo', 'cpf']
  for (const campo of Object.keys(ROTULOS)) {
    const valor = form[campo] || ''
    if (!valor) {
      if (obrigatorios.includes(campo)) return falha(`Preencha ${ROTULOS[campo]}.`, campo)
      continue
    }
    if (!VALIDACOES[campo].teste(valor)) return falha(VALIDACOES[campo].mensagem, campo)
  }

  if (estrito) {
    if (!form.sexo) return falha('Selecione o sexo.', 'sexo')
    if (enderecoStatus === 'pendente' || !form.logradouro || !form.cidade) {
      return falha('Informe um CEP válido para localizar o endereço.', 'cep')
    }
    if (!(form.numero || '').trim()) return falha('Preencha o número do endereço.', 'numero')
    if (!form.disponibilidade_horario_trabalho || form.disponibilidade_horario_trabalho === 'Nenhum horário selecionado') {
      return falha('Selecione ao menos um turno de disponibilidade de trabalho.', 'disponibilidade_horario_trabalho')
    }
    if (!form.disponibilidade_horario_treinamento) return falha('Selecione a disponibilidade para treinamento.', 'disponibilidade_horario_treinamento')
    if (!form.disponibilidade_jornada) return falha('Selecione a escala de trabalho.', 'disponibilidade_jornada')
    for (const c of customizados) {
      if (c.obrigatorio && estaVisivel(c, customizados, form)) {
        const v = (form.respostas_extras || {})[c.chave]
        if (respostaVazia(v)) return falha(`Responda: ${c.rotulo}`, c.chave)
      }
    }
  }
  return null
}

// Versão simples: só a mensagem (ou null).
export function validarCadastro(form, opcoes) {
  const d = validarCadastroDetalhado(form, opcoes)
  return d ? d.mensagem : null
}

// Monta o objeto que vai para o banco (tudo normalizado/MAIÚSCULO).
export function montarPayload(form, { fontes = [], ocultos = new Set(), customizados = [] } = {}) {
  const fonte = fontes.find((f) => f.valor === form.fonte)
  const p = { ...form }
  p.nome_completo = normalizarTexto(form.nome_completo)
  p.nome_mae = normalizarTexto(form.nome_mae)
  p.nome_indicador = fonte?.tipo_dependencia === 'texto' ? normalizarTexto(form.nome_indicador) : null
  p.rede_social = fonte?.tipo_dependencia === 'lista' ? form.rede_social : null
  p.logradouro = normalizarTexto(form.logradouro)
  p.bairro = normalizarTexto(form.bairro)
  p.cidade = normalizarTexto(form.cidade)
  p.complemento = form.complemento ? normalizarTexto(form.complemento) : null
  p.observacoes = form.observacoes ? form.observacoes.toUpperCase() : null
  p.estado = form.estado ? form.estado.toUpperCase() : null
  p.data_nascimento = dataBRParaISO(form.data_nascimento)
  ;['possui_veiculo', 'concorda_turno_treinamento', 'possui_ensino_superior'].forEach((k) => {
    if (p[k] === '') p[k] = null
  })
  ocultos.forEach((k) => {
    if (k in p) p[k] = null
  })
  // Respostas de campos personalizados: só as dos campos visíveis (condicionais
  // ocultos não são salvos); respostas de campos já excluídos continuam guardadas.
  const extras = {}
  Object.entries(form.respostas_extras || {}).forEach(([k, v]) => {
    if (!customizados.some((c) => c.chave === k)) extras[k] = v
  })
  customizados.forEach((c) => {
    const v = (form.respostas_extras || {})[c.chave]
    if (estaVisivel(c, customizados, form) && !respostaVazia(v)) extras[c.chave] = v
  })
  p.respostas_extras = extras
  return p
}

const CAMPOS_TEXTO = [
  'fonte', 'rede_social', 'nome_indicador', 'nome_completo', 'telefone', 'rg', 'cpf', 'sexo', 'nome_mae',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'email',
  'disponibilidade_horario_trabalho', 'disponibilidade_horario_treinamento', 'disponibilidade_jornada', 'observacoes',
]

// Converte uma linha do banco para o formato dos campos do formulário.
export function candidatoParaForm(c) {
  const f = { ...c }
  CAMPOS_TEXTO.forEach((k) => {
    if (f[k] == null) f[k] = ''
  })
  f.data_nascimento = isoParaDataBR(c.data_nascimento)
  f.respostas_extras = c.respostas_extras || {}
  return f
}
