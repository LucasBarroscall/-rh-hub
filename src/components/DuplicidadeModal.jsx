import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatarData } from '../lib/candidato'
import { statusAtual } from '../lib/status'

// Campos do funil que fazem sentido "repetir" de um cadastro anterior —
// não inclui dados pessoais, que já vêm do novo cadastro em si.
const CAMPOS_REPETIVEIS = [
  'compareceu_entrevista', 'aprovado_entrevista',
  'teste_realizado', 'wpm', 'precisao', 'alerta_comportamental',
  'contatado_whatsapp', 'data_contato_whatsapp',
  'documentacao_solicitada', 'data_documentacao_solicitada',
  'enviou_documentacao', 'data_envio_documentacao', 'aprovado_documentacao',
  'data_exame', 'compareceu_exame', 'aprovado_exame',
  'data_onboarding', 'compareceu_onboarding',
  'data_treinamento', 'compareceu_treinamento',
  'compliance', 'decisao_final',
]

function resultadoResumo(d) {
  const partes = []
  partes.push(`Entrevista: ${d.aprovado_entrevista === true ? 'aprovado' : d.aprovado_entrevista === false ? 'reprovado' : 'não avaliado'}`)
  if (d.teste_realizado) {
    partes.push(`Teste: ${d.aprovado_teste ? 'aprovado' : 'reprovado'} (WPM ${d.wpm ?? '—'}, ${d.precisao ?? '—'}%)`)
  }
  if (d.decisao_final) partes.push(`Decisão final: ${d.decisao_final}`)
  return partes.join(' · ')
}

export default function DuplicidadeModal({ candidatoAtual, duplicatas, onFechar, onRepetido }) {
  const [aplicando, setAplicando] = useState(false)

  async function repetirResultado() {
    const maisRecente = duplicatas[0]
    setAplicando(true)
    const campos = {}
    CAMPOS_REPETIVEIS.forEach((c) => {
      campos[c] = maisRecente[c] ?? null
    })
    const { error } = await supabase.from('candidatos').update(campos).eq('id', candidatoAtual.id)
    setAplicando(false)
    if (!error) onRepetido()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-[70]">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white">CPF já cadastrado antes</h2>
            <p className="text-sm text-navy-500 dark:text-navy-400 mt-1">
              {candidatoAtual.nome_completo} já apareceu {duplicatas.length}{' '}
              {duplicatas.length > 1 ? 'vezes anteriormente' : 'vez anteriormente'} no sistema.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto mb-5">
          {duplicatas.map((d) => (
            <div key={d.id} className="rounded-lg border border-navy-100 dark:border-navy-800 p-3 text-sm">
              <p className="font-medium text-navy-800 dark:text-navy-100">
                {formatarData(d.data_entrevista)} — {statusAtual(d)}
              </p>
              <p className="text-navy-500 dark:text-navy-400 text-xs mt-1">{resultadoResumo(d)}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onFechar} className="btn-secondary">
            Seguir com o processo normalmente
          </button>
          <button onClick={repetirResultado} disabled={aplicando} className="btn-primary">
            {aplicando ? 'Aplicando…' : 'Repetir resultado mais recente'}
          </button>
        </div>
      </div>
    </div>
  )
}
