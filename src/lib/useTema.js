import { useEffect, useState } from 'react'

export function useTema() {
  const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
    try {
      localStorage.setItem('rh-hub-tema', escuro ? 'escuro' : 'claro')
    } catch {
      // localStorage indisponível (modo privado, etc.) — tema não persiste, sem problema
    }
  }, [escuro])

  return [escuro, setEscuro]
}
