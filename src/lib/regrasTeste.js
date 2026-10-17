import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

// Avalia o teste de digitação pelas regras vigentes (de cima para baixo; vale
// a primeira que bater). Sem nenhuma regra batendo => Reprovado.
// O resultado é GRAVADO no candidato na hora, então mudar a regra depois não
// altera resultados antigos.
export function avaliarTeste(wpm, precisao, regras) {
  if (wpm == null || precisao == null || Number.isNaN(wpm) || Number.isNaN(precisao)) return null
  const ordenadas = [...(regras || [])].filter((r) => r.ativo !== false).sort((a, b) => a.ordem - b.ordem)
  for (const r of ordenadas) {
    const okW = (r.wpm_min == null || wpm >= r.wpm_min) && (r.wpm_max == null || wpm <= r.wpm_max)
    const okP = (r.precisao_min == null || precisao >= r.precisao_min) && (r.precisao_max == null || precisao <= r.precisao_max)
    if (okW && okP) return { resultado: r.resultado, aprovado: !!r.aprova }
  }
  return { resultado: 'Reprovado', aprovado: false }
}

export function useRegrasTeste() {
  const [regras, setRegras] = useState([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const { data } = await supabase.from('regras_teste').select('*').order('ordem', { ascending: true })
    setRegras(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { regras, carregando, recarregar }
}
