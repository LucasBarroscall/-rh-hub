import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

// Campos personalizados criados pelo analista + campos padrão que ele ocultou.
export const CAMPOS_PADRAO_OCULTAVEIS = [
  ['possui_veiculo', 'Possui veículo próprio?'],
  ['possui_ensino_superior', 'Possui ensino superior?'],
  ['concorda_turno_treinamento', 'Concorda com o turno de treinamento fora da jornada?'],
  ['observacoes', 'Observações'],
]

export function useCamposFormulario() {
  const [customizados, setCustomizados] = useState([])
  const [ocultos, setOcultos] = useState(new Set())
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const [{ data: cs }, { data: cf }] = await Promise.all([
      supabase.from('campos_formulario').select('*').order('ordem', { ascending: true }),
      supabase.from('config_campos').select('*'),
    ])
    setCustomizados(cs || [])
    setOcultos(new Set((cf || []).filter((x) => x.oculto).map((x) => x.campo)))
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { customizados, ocultos, carregando, recarregar }
}
