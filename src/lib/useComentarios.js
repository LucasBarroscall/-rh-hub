import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useComentarios() {
  const [comentarios, setComentarios] = useState({})
  const [titulos, setTitulos] = useState({})

  useEffect(() => {
    let ativo = true
    supabase
      .from('campo_comentarios')
      .select('*')
      .then(({ data, error }) => {
        if (!ativo || error || !data) return
        const mapaComentarios = {}
        const mapaTitulos = {}
        data.forEach((c) => {
          if (c.comentario) mapaComentarios[c.campo] = c.comentario
          if (c.titulo) mapaTitulos[c.campo] = c.titulo
        })
        setComentarios(mapaComentarios)
        setTitulos(mapaTitulos)
      })
    return () => {
      ativo = false
    }
  }, [])

  return comentarios
}

// Hook completo (comentário + título customizado). Mantido separado do
// export acima para não quebrar quem só usa useComentarios() por texto.
export function useComentariosCompleto() {
  const [comentarios, setComentarios] = useState({})
  const [titulos, setTitulos] = useState({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    supabase
      .from('campo_comentarios')
      .select('*')
      .then(({ data, error }) => {
        if (!ativo) return
        if (!error && data) {
          const mapaComentarios = {}
          const mapaTitulos = {}
          data.forEach((c) => {
            if (c.comentario) mapaComentarios[c.campo] = c.comentario
            if (c.titulo) mapaTitulos[c.campo] = c.titulo
          })
          setComentarios(mapaComentarios)
          setTitulos(mapaTitulos)
        }
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  return { comentarios, titulos, carregando }
}
