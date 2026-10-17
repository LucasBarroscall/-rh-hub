import { useRef, useState } from 'react'
import { useViaCep } from './useViaCep'

// Controla o preenchimento de endereço por CEP (usado no cadastro público, no
// "Adicionar candidato" e na edição). Regras:
//  - CEP encontrado: campos de endereço preenchidos e travados (status "auto");
//  - 1ª tentativa sem sucesso: pede um CEP válido (status continua "pendente");
//  - 2ª tentativa sem sucesso (mesmo CEP ou outro): libera o preenchimento
//    manual (status "manual").
export function useCepEndereco(setForm, statusInicial = 'pendente') {
  const { consultar, carregando } = useViaCep()
  const [status, setStatusState] = useState(statusInicial)
  const [aviso, setAviso] = useState('')
  const statusRef = useRef(statusInicial)
  const tentativas = useRef(0)
  const ultimo = useRef('')
  const numeroRef = useRef(null)
  const consultando = useRef(false)

  function setStatus(novo) {
    statusRef.current = novo
    setStatusState(novo)
  }

  async function consultarCep(valor) {
    const digitos = valor.replace(/\D/g, '')
    if (digitos.length !== 8 || consultando.current) return
    consultando.current = true
    ultimo.current = valor
    const dados = await consultar(valor)
    consultando.current = false
    if (dados) {
      tentativas.current = 0
      setAviso('')
      setForm((f) => ({
        ...f,
        logradouro: dados.logradouro || '',
        bairro: dados.bairro || '',
        cidade: dados.localidade || '',
        estado: dados.uf || '',
      }))
      setStatus('auto')
      setTimeout(() => numeroRef.current?.focus(), 50)
      return
    }
    tentativas.current += 1
    if (statusRef.current !== 'manual') {
      setForm((f) => ({ ...f, logradouro: '', bairro: '', cidade: '', estado: '' }))
    }
    if (tentativas.current >= 2) {
      setStatus('manual')
      setAviso('CEP não localizado novamente. Agora você pode preencher o endereço manualmente.')
    } else {
      setStatus('pendente')
      setAviso('CEP não localizado. Informe um CEP válido e tente novamente.')
    }
  }

  function aoMudarCep(valorMascarado) {
    if (statusRef.current === 'auto') setStatus('pendente') // CEP alterado: refaz a busca
    if (valorMascarado.replace(/\D/g, '').length === 8) consultarCep(valorMascarado)
  }

  function aoSairCep(valorMascarado) {
    if (
      statusRef.current !== 'manual' &&
      valorMascarado.replace(/\D/g, '').length === 8 &&
      valorMascarado !== ultimo.current
    ) {
      consultarCep(valorMascarado)
    }
  }

  return { status, carregando, aviso, numeroRef, aoMudarCep, aoSairCep }
}
