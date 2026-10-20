import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Outros cadastros com o mesmo CPF. O aviso (modal) aparece SEMPRE que o
// candidato é aberto — mesmo que antes se tenha clicado em "seguir normalmente" —
// exceto quando o resultado dele já foi repetido de um cadastro anterior; nesse
// caso só aparece um aviso no canto da tela, com opção de mudar de ideia.
export function useDuplicidade(selecionado) {
  const [duplicatas, setDuplicatas] = useState([])
  const [dispensado, setDispensado] = useState(false)
  const [reabrir, setReabrir] = useState(false)

  useEffect(() => {
    setDispensado(false)
    setReabrir(false)
  }, [selecionado?.id])

  useEffect(() => {
    let ativo = true
    const digitos = (selecionado?.cpf || '').replace(/\D/g, '')
    if (!digitos || !selecionado?.id) {
      setDuplicatas([])
      return undefined
    }
    supabase
      .from('candidatos')
      .select('*')
      .eq('cpf_digitos', digitos)
      .neq('id', selecionado.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!ativo) return
        if (!error) setDuplicatas(data || [])
      })
    return () => {
      ativo = false
    }
  }, [selecionado?.id, selecionado?.cpf])

  const jaRepetido = !!selecionado?.resultado_repetido_de
  const mostrarAuto = duplicatas.length > 0 && !!selecionado && !dispensado && !jaRepetido
  const mostrar = mostrarAuto || (reabrir && duplicatas.length > 0)

  function dispensar() {
    setDispensado(true)
    setReabrir(false)
  }
  function reabrirOpcoes() {
    setReabrir(true)
  }

  return { duplicatas, mostrar, dispensar, jaRepetido, reabrirOpcoes }
}
