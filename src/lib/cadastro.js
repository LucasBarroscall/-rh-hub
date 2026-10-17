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

// Devolve a primeira mensagem de erro, ou null se estiver tudo certo.
// estrito = true (cadastro novo): tudo obrigatório. estrito = false (edição):
// só valida o formato do que estiver preenchido (e exige nome + CPF), para não
// travar a edição de cadastros antigos incompletos.
export function validarCadastro(form, { fontes = [], customizados = [], ocultos = new Set(), enderecoStatus = 'auto', estrito = true } = {}) {
  const fonte = fontes.find((f) => f.valor === form.fonte)
  if (estrito && !form.fonte) return 'Selecione a fonte.'
  if (fonte?.tipo_dependencia === 'texto') {
    if (!(form.nome_indicador || '').trim()) {
      if (estrito) return `Preencha o campo "${fonte.rotulo_dependencia || 'detalhe'}".`
    } else if (!VALIDACOES.nome_indicador.teste(form.nome_indicador)) return VALIDACOES.nome_indicador.mensagem
  }
  if (estrito && fonte?.tipo_dependencia === 'lista' && !form.rede_social) {
    return `Selecione uma opção em "${fonte.rotulo_dependencia || 'detalhe'}".`
  }

  const obrigatorios = estrito ? Object.keys(ROTULOS) : ['nome_completo', 'cpf']
  for (const campo of Object.keys(ROTULOS)) {
    const valor = form[campo] || ''
    if (!valor) {
      if (obrigatorios.includes(campo)) return `Preencha ${ROTULOS[campo]}.`
      continue
    }
    if (!VALIDACOES[campo].teste(valor)) return VALIDACOES[campo].mensagem
  }

  if (estrito) {
    if (!form.sexo) return 'Selecione o sexo.'
    if (enderecoStatus === 'pendente' || !form.logradouro || !form.cidade) {
      return 'Informe um CEP válido para localizar o endereço.'
    }
    if (!(form.numero || '').trim()) return 'Preencha o número do endereço.'
    if (!form.disponibilidade_horario_trabalho || form.disponibilidade_horario_trabalho === 'Nenhum horário selecionado') {
      return 'Selecione ao menos um turno de disponibilidade de trabalho.'
    }
    if (!form.disponibilidade_horario_treinamento) return 'Selecione a disponibilidade para treinamento.'
    if (!form.disponibilidade_jornada) return 'Selecione a escala de trabalho.'
    for (const c of customizados) {
      if (c.obrigatorio) {
        const v = (form.respostas_extras || {})[c.chave]
        if (v === undefined || v === null || v === '') return `Responda: ${c.rotulo}`
      }
    }
  }
  return null
}

// Monta o objeto que vai para o banco (tudo normalizado/MAIÚSCULO).
export function montarPayload(form, { fontes = [], ocultos = new Set() } = {}) {
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
