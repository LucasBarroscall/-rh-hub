import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useComentarios() {
  const [comentarios, setComentarios] = useState({})

  useEffect(() => {
    let ativo = true
    supabase
      .from('campo_comentarios')
      .select('*')
      .then(({ data, error }) => {
        if (!ativo || error || !data) return
        const mapa = {}
        data.forEach((c) => {
          mapa[c.campo] = c.comentario
        })
        setComentarios(mapa)
      })
    return () => {
      ativo = false
    }
  }, [])

  return comentarios
}
