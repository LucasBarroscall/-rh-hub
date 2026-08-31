import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { formatarData, formatarDataHora, simNaoOuVazio } from '../lib/candidato'
import { UserCheck, Phone, MapPin, Calendar } from 'lucide-react'

export default function Interviewer1() {
  const [fila, setFila] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('candidatos').select('*').order('created_at', { ascending: true })
    if (!mostrarTodos) query = query.is('compareceu_entrevista', null)
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

  async function salvar(campos) {
    if (!selecionado) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('candidatos')
      .update({ ...campos, entrevista_em: new Date().toISOString() })
      .eq('id', selecionado.id)
      .select()
      .single()
    setSalvando(false)
    if (!error) {
      setSelecionado(data)
      carregar()
    }
  }

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900">Etapa 1 · Entrevista</h1>
            <p className="text-navy-500 text-sm mt-1">
              Candidatos na ordem em que preencheram o cadastro.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-600">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => setMostrarTodos(e.target.checked)}
              className="rounded border-navy-200"
            />
            Mostrar já entrevistados
          </label>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="card divide-y divide-navy-100 max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
            {!loading && fila.length === 0 && (
              <p className="p-4 text-sm text-navy-400">Nenhum candidato na fila.</p>
            )}
            {fila.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelecionado(c)}
                className={`w-full text-left px-4 py-3.5 transition-colors ${
                  selecionado?.id === c.id ? 'bg-navy-50' : 'hover:bg-navy-50/60'
                }`}
              >
                <p className="text-sm font-medium text-navy-900">{c.nome_completo}</p>
                <p className="text-xs text-navy-400 mt-0.5">
                  {formatarData(c.data_entrevista)} · {c.fonte}
                </p>
              </button>
            ))}
          </div>

          {selecionado ? (
            <div className="card p-6 sm:p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="h-11 w-11 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0">
                  <UserCheck size={19} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{selecionado.nome_completo}</h2>
                  <p className="text-sm text-navy-500">
                    {selecionado.idade ? `${selecionado.idade} anos · ` : ''}
                    {selecionado.sexo}
                  </p>
                </div>
              </div>

              <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="flex items-start gap-2">
                  <Phone size={15} className="text-navy-400 mt-0.5" />
                  <span className="text-navy-700">{selecionado.telefone || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-navy-400 mt-0.5" />
                  <span className="text-navy-700">
                    {selecionado.bairro}, {selecionado.cidade}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={15} className="text-navy-400 mt-0.5" />
                  <span className="text-navy-700">Cadastro: {formatarData(selecionado.data_entrevista)}</span>
                </div>
                <div>
                  <span className="text-navy-400">Origem: </span>
                  <span className="text-navy-700">
                    {selecionado.fonte}
                    {selecionado.fonte === 'Indicação' ? ` (${selecionado.nome_indicador})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-navy-400">Disponibilidade de trabalho: </span>
                  <span className="text-navy-700">{selecionado.disponibilidade_horario_trabalho}</span>
                </div>
                <div>
                  <span className="text-navy-400">Disponibilidade de treinamento: </span>
                  <span className="text-navy-700">{selecionado.disponibilidade_horario_treinamento}</span>
                </div>
                <div>
                  <span className="text-navy-400">Jornada: </span>
                  <span className="text-navy-700">{selecionado.disponibilidade_jornada}</span>
                </div>
                <div>
                  <span className="text-navy-400">Veículo próprio: </span>
                  <span className="text-navy-700">{simNaoOuVazio(selecionado.possui_veiculo)}</span>
                </div>
                <div>
                  <span className="text-navy-400">Ensino superior: </span>
                  <span className="text-navy-700">{simNaoOuVazio(selecionado.possui_ensino_superior)}</span>
                </div>
              </dl>

              {selecionado.observacoes && (
                <p className="text-sm bg-navy-50 rounded-lg p-3.5 mb-6 text-navy-700">
                  <span className="font-medium">Observações do candidato: </span>
                  {selecionado.observacoes}
                </p>
              )}

              {selecionado.compareceu_entrevista !== null && selecionado.compareceu_entrevista !== undefined && (
                <p className="text-xs text-navy-400 mb-4">
                  Última atualização: {formatarDataHora(selecionado.entrevista_em)}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-navy-100">
                <div className="pt-4">
                  <p className="field-label">Compareceu na entrevista?</p>
                  <div className="flex gap-2">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        disabled={salvando}
                        onClick={() => salvar({ compareceu_entrevista: v })}
                        className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          selecionado.compareceu_entrevista === v
                            ? 'border-navy-800 bg-navy-800 text-white'
                            : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50'
                        }`}
                      >
                        {v ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4">
                  <p className="field-label">Aprovado na entrevista?</p>
                  <div className="flex gap-2">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        disabled={salvando}
                        onClick={() => salvar({ aprovado_entrevista: v })}
                        className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          selecionado.aprovado_entrevista === v
                            ? v
                              ? 'border-sage-500 bg-sage-500 text-white'
                              : 'border-clay-500 bg-clay-500 text-white'
                            : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50'
                        }`}
                      >
                        {v ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>
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
