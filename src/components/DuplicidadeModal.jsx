import { useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
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
  'data_alo', 'compareceu_alo',
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
  const [aplicandoId, setAplicandoId] = useState(null)

  async function repetirResultado(origem) {
    setAplicandoId(origem.id)
    const campos = {}
    CAMPOS_REPETIVEIS.forEach((c) => {
      campos[c] = origem[c] ?? null
    })
    const { error } = await supabase.from('candidatos').update(campos).eq('id', candidatoAtual.id)
    setAplicandoId(null)
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
              {duplicatas.length > 1 ? 'vezes anteriormente' : 'vez anteriormente'} no sistema. Clique num
              cadastro abaixo para repetir o resultado dele, ou siga normalmente.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto mb-5">
          {duplicatas.map((d) => (
            <button
              key={d.id}
              onClick={() => repetirResultado(d)}
              disabled={aplicandoId !== null}
              className="w-full text-left rounded-lg border border-navy-100 dark:border-navy-800 p-3 text-sm hover:border-navy-700 hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-navy-800 dark:text-navy-100">
                  {formatarData(d.data_entrevista)} — {statusAtual(d)}
                </p>
                {aplicandoId === d.id ? (
                  <span className="text-xs text-navy-400 flex-shrink-0">Aplicando…</span>
                ) : (
                  <ArrowRight size={14} className="text-navy-300 group-hover:text-navy-700 dark:group-hover:text-white flex-shrink-0" />
                )}
              </div>
              <p className="text-navy-500 dark:text-navy-400 text-xs mt-1">{resultadoResumo(d)}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button onClick={onFechar} className="btn-secondary">
            Seguir com o processo normalmente
          </button>
        </div>
      </div>
    </div>
  )
}
