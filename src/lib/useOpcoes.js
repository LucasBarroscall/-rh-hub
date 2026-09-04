import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

// Campos "simples" (uma lista plana de valores).
export const CAMPOS_SIMPLES = [
  'sexo',
  'disponibilidade_horario_trabalho',
  'disponibilidade_horario_treinamento',
  'disponibilidade_jornada',
]

export function useOpcoes() {
  const [opcoes, setOpcoes] = useState({})
  const [fontes, setFontes] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [{ data: listaData, error: listaErro }, { data: subData, error: subErro }] = await Promise.all([
      supabase.from('opcoes_lista').select('*').order('ordem', { ascending: true }),
      supabase.from('opcoes_sublista').select('*').order('ordem', { ascending: true }),
    ])

    if (!listaErro && listaData) {
      const agrupado = {}
      CAMPOS_SIMPLES.forEach((c) => (agrupado[c] = []))
      listaData
        .filter((o) => CAMPOS_SIMPLES.includes(o.campo))
        .forEach((o) => agrupado[o.campo].push(o.valor))
      setOpcoes(agrupado)

      const subPorPai = {}
      if (!subErro && subData) {
        subData.forEach((s) => {
          if (!subPorPai[s.opcao_pai_id]) subPorPai[s.opcao_pai_id] = []
          subPorPai[s.opcao_pai_id].push(s.valor)
        })
      }

      setFontes(
        listaData
          .filter((o) => o.campo === 'fonte')
          .map((o) => ({ ...o, subopcoes: subPorPai[o.id] || [] })),
      )
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return { opcoes, fontes, carregando, recarregar: carregar }
}
