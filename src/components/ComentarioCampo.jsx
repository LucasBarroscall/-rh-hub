import { MessageSquare } from 'lucide-react'

// posicao: 'antes' põe o comentário antes do label/input (requer que o
// container pai use flex flex-col), 'depois' (padrão) mantém o comportamento
// de sempre — o comentário aparece logo abaixo do campo.
export default function ComentarioCampo({ texto, posicao = 'depois' }) {
  if (!texto) return null
  // Conteúdo vem do editor rico do Admin (só analista escreve) — renderizado
  // como HTML de propósito, para permitir negrito/itálico/imagem/links.
  return (
    <div className={`flex items-start gap-1.5 mt-1.5 ${posicao === 'antes' ? 'order-first mb-1.5 mt-0' : ''}`}>
      <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-navy-400" />
      <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: texto }} />
    </div>
  )
}
