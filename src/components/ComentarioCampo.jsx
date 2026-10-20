import { MessageSquare } from 'lucide-react'

// posicao 'depois' (padrão): comentário logo abaixo do campo.
// posicao 'antes': comentário logo abaixo do TÍTULO e acima da área de resposta
// (quem chama deve renderizá-lo entre o título e o campo).
export default function ComentarioCampo({ texto, posicao = 'depois' }) {
  if (!texto) return null
  // Conteúdo vem do editor rico do Admin (só analista escreve) — renderizado
  // como HTML de propósito, para permitir negrito/itálico/imagem/links.
  return (
    <div className={`flex items-start gap-1.5 ${posicao === 'antes' ? 'mb-2 -mt-0.5' : 'mt-1.5'}`}>
      <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-navy-400" />
      <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: texto }} />
    </div>
  )
}
