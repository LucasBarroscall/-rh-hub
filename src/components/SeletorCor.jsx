import { PALETA_DOCUMENTOS } from '../lib/cores'

export default function SeletorCor({ valor, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PALETA_DOCUMENTOS.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          title={cor}
          className={`h-6 w-6 rounded-full border-2 transition-transform ${valor === cor ? 'border-navy-900 dark:border-white scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: cor }}
        />
      ))}
    </div>
  )
}
