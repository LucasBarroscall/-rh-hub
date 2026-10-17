import { useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { normalizarTexto } from '../lib/formatters'

// Campo de texto que sugere, enquanto você digita, valores que já existem no
// banco (rua, bairro ou cidade) — usado no preenchimento manual de endereço.
export default function InputSugestao({ campo, value, onChange, onBlur, className, placeholder }) {
  const id = useId()
  const [opcoes, setOpcoes] = useState([])

  useEffect(() => {
    const termo = normalizarTexto(value || '')
    if (!termo || termo.length < 2) {
      setOpcoes([])
      return undefined
    }
    let ativo = true
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('sugerir_endereco', { p_campo: campo, p_termo: termo })
      if (ativo && data) setOpcoes(data.map((d) => d.valor))
    }, 250)
    return () => {
      ativo = false
      clearTimeout(t)
    }
  }, [value, campo])

  return (
    <>
      <input
        list={id}
        className={className}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={id}>
        {opcoes.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  )
}
