import { MessageSquare } from 'lucide-react'

export default function ComentarioCampo({ texto }) {
  if (!texto) return null
  return (
    <p className="flex items-start gap-1.5 text-xs text-navy-500 dark:text-navy-400 mt-1.5">
      <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
      {texto}
    </p>
  )
}
