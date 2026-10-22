import { COR_PADRAO_DOCUMENTO, corDoTexto } from '../lib/cores'

// Nome do documento com a cor de fundo escolhida pelo analista.
export default function ChipDocumento({ nome, cor, pequeno = false }) {
  const fundo = cor || COR_PADRAO_DOCUMENTO
  return (
    <span
      className={`inline-block rounded font-medium whitespace-nowrap ${pequeno ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'}`}
      style={{ backgroundColor: fundo, color: corDoTexto(fundo) }}
    >
      {nome}
    </span>
  )
}
