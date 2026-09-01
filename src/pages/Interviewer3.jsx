import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import BoolToggle from '../components/BoolToggle'
import { simNaoOuVazio, etapa3Completa } from '../lib/candidato'
import { ClipboardCheck, AlertTriangle, MessageCircle, X } from 'lucide-react'

const BOOL_FIELDS = [
  ['compareceu_exame', 'Compareceu no exame?'],
  ['aprovado_exame', 'Aprovado no exame?'],
  ['enviou_documentacao', 'Enviou documentação?'],
  ['aprovado_documentacao', 'Aprovado na documentação?'],
  ['compareceu_onboarding', 'Compareceu no onboarding?'],
  ['compareceu_treinamento', 'Compareceu no treinamento?'],
]

export default function Interviewer3() {
  const [fila, setFila] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [dataExame, setDataExame] = useState('')
  const [compliance, setCompliance] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('candidatos')
      .select('*')
      .eq('aprovado_entrevista', true)
      .eq('teste_realizado', true)
      .order('teste_em', { ascending: true })
    if (!mostrarTodos) query = query.is('decisao_final', null)
    const { data, error } = await query
    if (!error) {
      setFila(data)
      setSelecionado((sel) => sel ?? data[0] ?? null)
    }
    setLoading(false)
  }, [mostrarTodos])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    setDataExame(selecionado?.data_exame ?? '')
    setCompliance(selecionado?.compliance ?? '')
  }, [selecionado])

  async function atualizar(campos, { avancar = false } = {}) {
    if (!selecionado) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('candidatos')
      .update(campos)
      .eq('id', selecionado.id)
      .select()
      .single()
    setSalvando(false)
    if (!error) {
      setSelecionado(avancar && !mostrarTodos && etapa3Completa(data) ? null : data)
      carregar()
    }
  }

  function decidir(valor) {
    const novoValor = selecionado.decisao_final === valor ? null : valor
    atualizar(
      { decisao_final: novoValor, decisao_em: novoValor ? new Date().toISOString() : null },
      { avancar: true },
    )
  }

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Etapa 3 · Decisão final</h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">
              Candidatos aprovados na entrevista e no teste de digitação.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => setMostrarTodos(e.target.checked)}
              className="rounded border-navy-200"
            />
            Mostrar já decididos
          </label>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
            {!loading && fila.length === 0 && (
              <p className="p-4 text-sm text-navy-400">Nenhum candidato pronto para decisão.</p>
            )}
            {fila.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelecionado(c)}
                className={`w-full text-left px-4 py-3.5 transition-colors ${
                  selecionado?.id === c.id ? 'bg-navy-50 dark:bg-navy-800' : 'hover:bg-navy-50/60 dark:hover:bg-navy-800/60'
                }`}
              >
                <p className="text-sm font-medium text-navy-900 dark:text-white flex items-center gap-1.5">
                  {c.nome_completo}
                  {c.alerta_comportamental && <AlertTriangle size={13} className="text-amber-500" />}
                </p>
                <p className="text-xs text-navy-400 mt-0.5">
                  WPM {c.wpm ?? '—'} · Precisão {c.precisao ?? '—'}%
                </p>
              </button>
            ))}
          </div>

          {selecionado ? (
            <div className="card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck size={19} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{selecionado.nome_completo}</h2>
                    <p className="text-sm text-navy-500 dark:text-navy-400">
                      {selecionado.telefone} · {selecionado.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelecionado(null)}
                  title="Fechar sem alterar"
                  className="text-navy-400 hover:text-navy-700 dark:hover:text-white flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {selecionado.alerta_comportamental && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-400/10 text-amber-700 dark:text-amber-300 px-3.5 py-3 mb-6 text-sm">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Alerta do Entrevistador 2</p>
                    <p>{selecionado.alerta_comportamental}</p>
                  </div>
                </div>
              )}

              <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="text-navy-400">Entrevista: </span>
                  <span className="text-navy-700 dark:text-navy-200 font-medium text-sage-600">Aprovado</span>
                </div>
                <div>
                  <span className="text-navy-400">Teste de digitação: </span>
                  <span className={`font-medium ${selecionado.aprovado_teste ? 'text-sage-600' : 'text-clay-600'}`}>
                    {selecionado.aprovado_teste ? 'Aprovado' : 'Reprovado'} (WPM {selecionado.wpm}, {selecionado.precisao}%)
                  </span>
                </div>
                <div>
                  <span className="text-navy-400">Veículo próprio: </span>
                  <span className="text-navy-700 dark:text-navy-200">{simNaoOuVazio(selecionado.possui_veiculo)}</span>
                </div>
                <div>
                  <span className="text-navy-400">Ensino superior: </span>
                  <span className="text-navy-700 dark:text-navy-200">{simNaoOuVazio(selecionado.possui_ensino_superior)}</span>
                </div>
                <div>
                  <span className="text-navy-400">Endereço: </span>
                  <span className="text-navy-700 dark:text-navy-200">
                    {selecionado.endereco}, {selecionado.bairro}, {selecionado.cidade}
                  </span>
                </div>
              </dl>

              <div className="grid sm:grid-cols-2 gap-4 pt-5 border-t border-navy-100 dark:border-navy-800">
                <div>
                  <label className="field-label">Data do exame</label>
                  <input
                    type="date"
                    className="field-input"
                    value={dataExame}
                    onChange={(e) => setDataExame(e.target.value)}
                    onBlur={() => atualizar({ data_exame: dataExame || null })}
                  />
                </div>
                <div>
                  <label className="field-label">Compliance</label>
                  <input
                    className="field-input"
                    value={compliance}
                    onChange={(e) => setCompliance(e.target.value)}
                    onBlur={() => atualizar({ compliance })}
                    placeholder="Observação do compliance"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5 pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                {BOOL_FIELDS.map(([campo, label]) => (
                  <BoolToggle
                    key={campo}
                    label={label}
                    value={selecionado[campo]}
                    onChange={(v) => atualizar({ [campo]: v })}
                    disabled={salvando}
                  />
                ))}
              </div>

              <div className="pt-6 mt-6 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-2">Decisão final</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    disabled={salvando}
                    onClick={() => decidir('Aprovado')}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      selecionado.decisao_final === 'Aprovado'
                        ? 'border-sage-500 bg-sage-500 text-white'
                        : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    {selecionado.decisao_final === 'Aprovado' ? 'Aprovado ✓ (clique para desfazer)' : 'Aprovar candidato'}
                  </button>
                  <button
                    disabled={salvando}
                    onClick={() => decidir('Reprovado')}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      selecionado.decisao_final === 'Reprovado'
                        ? 'border-clay-500 bg-clay-500 text-white'
                        : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    {selecionado.decisao_final === 'Reprovado' ? 'Reprovado ✓ (clique para desfazer)' : 'Reprovar candidato'}
                  </button>
                </div>

                {selecionado.decisao_final === 'Aprovado' && (
                  <button
                    disabled={salvando}
                    onClick={() => atualizar({ contatado_whatsapp: !selecionado.contatado_whatsapp })}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      selecionado.contatado_whatsapp
                        ? 'border-sage-500 bg-sage-500/10 text-sage-600'
                        : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    <MessageCircle size={16} />
                    {selecionado.contatado_whatsapp
                      ? 'Contato via WhatsApp já feito'
                      : 'Marcar como contatado via WhatsApp'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-navy-400 text-sm">
              Selecione um candidato na lista ao lado.
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
