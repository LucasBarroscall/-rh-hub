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
