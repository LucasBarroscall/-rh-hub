import { useEffect, useRef } from 'react'

// Pilha de "coisas que ESC fecha": com vários modais abertos, ESC fecha só o
// do topo (maior prioridade; em empate, o aberto por último).
const pilha = []

export function useFecharComEsc(aoFechar, { ativo = true, prioridade = 10 } = {}) {
  const ref = useRef(aoFechar)
  ref.current = aoFechar

  useEffect(() => {
    if (!ativo) return undefined
    const item = { prioridade, fechar: () => ref.current && ref.current() }
    pilha.push(item)
    const aoTecla = (e) => {
      if (e.key !== 'Escape') return
      const maior = Math.max(...pilha.map((p) => p.prioridade))
      const topo = [...pilha].reverse().find((p) => p.prioridade === maior)
      if (topo === item) item.fechar()
    }
    window.addEventListener('keydown', aoTecla)
    return () => {
      window.removeEventListener('keydown', aoTecla)
      const i = pilha.indexOf(item)
      if (i >= 0) pilha.splice(i, 1)
    }
  }, [ativo, prioridade])
}

// Props para o fundo escuro do modal: clicar FORA da janela fecha. (Só conta se
// o clique começou no fundo, então selecionar texto e soltar fora não fecha.)
export function aoClicarFora(fechar) {
  return {
    onMouseDown: (e) => {
      if (e.target === e.currentTarget) fechar()
    },
  }
}
