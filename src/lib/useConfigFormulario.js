import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

export function useConfigFormulario() {
  const [config, setConfig] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase.from('config_formulario').select('*').eq('id', 1).maybeSingle()
    setConfig(data)
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return { config, carregando, recarregar: carregar }
}
