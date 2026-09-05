// Máscaras e validações de campos brasileiros usados no cadastro do candidato.

export function maskRG(value) {
  return (value || '').replace(/\D/g, '').slice(0, 14)
}

export function maskCPF(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 11)
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`
  return d
}

export function validarCPF(cpf) {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // todos os dígitos iguais

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(d[i], 10) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(d[9], 10)) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(d[i], 10) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(d[10], 10)) return false

  return true
}

// Formato pedido: (00) 0 0000-0000
export function maskTelefone(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 11)
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length > 3) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length > 0) return `(${d}`
  return d
}

export function maskCEP(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 8)
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`
  return d
}

export function maskDataBR(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 8)
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`
  return d
}

export function dataBRParaISO(dataBR) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBR || '')
  if (!m) return null
  const [, dia, mes, ano] = m
  return `${ano}-${mes}-${dia}`
}

export function isoParaDataBR(iso) {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return ''
  const [, ano, mes, dia] = m
  return `${dia}/${mes}/${ano}`
}

export function validarDataBR(dataBR) {
  const iso = dataBRParaISO(dataBR)
  if (!iso) return false
  const [ano, mes, dia] = iso.split('-').map(Number)
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return false
  if (d.getFullYear() !== ano || d.getMonth() + 1 !== mes || d.getDate() !== dia) return false
  if (ano < 1900) return false
  if (d > new Date()) return false
  return true
}

// Deixa o texto num padrão único, tipo MAIÚSCULA()+ARRUMAR() do Excel,
// mas removendo também acentuação e pontuação. Usado em nome, endereço etc.
export function normalizarTexto(str) {
  if (!str) return str
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[.,/\\#!$%^&*;:{}=\-_`~()"']/g, '') // remove pontuação
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Junta as opções escolhidas de disponibilidade num resultado "limpo":
// quebra cada opção composta (ex.: "Manhã/Tarde") nos períodos atômicos,
// remove repetições e, se cobrir todos os períodos possíveis, diz "Total".
export function normalizarDisponibilidade(selecionadas, todasOpcoes) {
  const universo = []
  ;(todasOpcoes || []).forEach((op) => {
    op.split('/')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        if (!universo.includes(t)) universo.push(t)
      })
  })

  const escolhidosSet = new Set()
  ;(selecionadas || []).forEach((op) => {
    op.split('/')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => escolhidosSet.add(t))
  })

  const escolhidosOrdenados = universo.filter((t) => escolhidosSet.has(t))
  if (universo.length > 0 && escolhidosOrdenados.length === universo.length) return 'Total'
  return escolhidosOrdenados.join(' | ')
}

