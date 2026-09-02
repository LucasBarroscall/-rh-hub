import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

// Campos cujas opções de formulário vêm do banco (tabela opcoes_lista) em
// vez de estarem fixas no código — assim dá pra adicionar/remover opções
// direto pela tela de Administração, sem precisar mexer no site.
export const CAMPOS_COM_OPCOES = [
  'fonte',
  'sexo',
  'disponibilidade_horario_trabalho',
  'disponibilidade_horario_treinamento',
  'disponibilidade_jornada',
  'rede_social',
]

export function useOpcoes() {
  const [opcoes, setOpcoes] = useState({})
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase.from('opcoes_lista').select('*').order('ordem', { ascending: true })
    if (!error && data) {
      const agrupado = {}
      data.forEach((o) => {
        if (!agrupado[o.campo]) agrupado[o.campo] = []
        agrupado[o.campo].push(o.valor)
      })
      setOpcoes(agrupado)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return { opcoes, carregando, recarregar: carregar }
}
