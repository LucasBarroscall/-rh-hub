import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useDuplicidade(selecionado) {
  const [duplicatas, setDuplicatas] = useState([])
  const [dispensadoIds, setDispensadoIds] = useState(new Set())

  useEffect(() => {
    let ativo = true
    if (!selecionado?.cpf || !selecionado?.id) {
      setDuplicatas([])
      return
    }
    supabase
      .from('candidatos')
      .select('*')
      .eq('cpf', selecionado.cpf)
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

  const mostrar = duplicatas.length > 0 && !!selecionado && !dispensadoIds.has(selecionado.id)

  function dispensar() {
    setDispensadoIds((s) => new Set(s).add(selecionado.id))
  }

  return { duplicatas, mostrar, dispensar }
}
