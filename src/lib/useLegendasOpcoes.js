import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

// Legendas exibidas dentro dos botões de opção (ex.: horário de cada turno).
// Formato: { campo: { opcao: 'legenda' } }
export function useLegendasOpcoes() {
  const [legendas, setLegendas] = useState({})

  const recarregar = useCallback(async () => {
    const { data } = await supabase.from('legendas_opcoes').select('*')
    const mapa = {}
    ;(data || []).forEach((l) => {
      if (!mapa[l.campo]) mapa[l.campo] = {}
      mapa[l.campo][l.opcao] = l.legenda
    })
    setLegendas(mapa)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { legendas, recarregar }
}
