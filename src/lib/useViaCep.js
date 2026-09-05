import { useState } from 'react'

// Consulta o ViaCEP e devolve { logradouro, bairro, localidade, uf } ou
// null se não encontrado. Lança em caso de erro de rede.
async function buscarCep(cepLimpo) {
  const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
  if (!resposta.ok) throw new Error('Falha na consulta do CEP')
  const dados = await resposta.json()
  if (dados.erro) return null
  return dados
}

export function useViaCep() {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function consultar(cep) {
    const digitos = (cep || '').replace(/\D/g, '')
    if (digitos.length !== 8) return null
    setErro('')
    setCarregando(true)
    try {
      const dados = await buscarCep(digitos)
      setCarregando(false)
      if (!dados) {
        setErro('CEP não localizado. Preencha o endereço manualmente.')
        return null
      }
      return dados
    } catch {
      setCarregando(false)
      setErro('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.')
      return null
    }
  }

  return { consultar, carregando, erro, limparErro: () => setErro('') }
}
