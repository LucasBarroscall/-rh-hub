import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { formatarData } from '../lib/candidato'
import { Keyboard, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

export default function Interviewer2() {
  const [fila, setFila] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const [wpm, setWpm] = useState('')
  const [precisao, setPrecisao] = useState('')
  const [alerta, setAlerta] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('candidatos')
      .select('*')
      .eq('aprovado_entrevista', true)
      .order('entrevista_em', { ascending: true })
    if (!mostrarTodos) query = query.is('teste_realizado', null)
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
    setWpm(selecionado?.wpm ?? '')
    setPrecisao(selecionado?.precisao ?? '')
    setAlerta(selecionado?.alerta_comportamental ?? '')
  }, [selecionado])

  async function marcarNaoRealizado() {
    if (!selecionado) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('candidatos')
      .update({ teste_realizado: false, teste_em: new Date().toISOString() })
      .eq('id', selecionado.id)
      .select()
      .single()
    setSalvando(false)
    if (!error) {
      setSelecionado(data)
      carregar()
    }
  }

  async function salvarResultado(e) {
    e.preventDefault()
    if (!selecionado) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('candidatos')
      .update({
        teste_realizado: true,
        wpm: wpm === '' ? null : Number(wpm),
        precisao: precisao === '' ? null : Number(precisao),
        alerta_comportamental: alerta || null,
        teste_em: new Date().toISOString(),
      })
      .eq('id', selecionado.id)
      .select()
      .single()
    setSalvando(false)
    if (!error) {
      setSelecionado(data)
      carregar()
    }
  }

  const aprovadoPreview =
    wpm !== '' && precisao !== '' ? Number(wpm) >= 20 && Number(precisao) >= 95 : null

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900">Etapa 2 · Teste de digitação</h1>
            <p className="text-navy-500 text-sm mt-1">
              Aprovação automática: WPM ≥ 20 e Precisão ≥ 95%.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-600">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={(e) => setMostrarTodos(e.target.checked)}
              className="rounded border-navy-200"
            />
            Mostrar já testados
          </label>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="card divide-y divide-navy-100 max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
            {!loading && fila.length === 0 && (
              <p className="p-4 text-sm text-navy-400">Nenhum candidato aprovado aguardando teste.</p>
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
                <p className="text-xs text-navy-400 mt-0.5">{formatarData(c.data_entrevista)}</p>
              </button>
            ))}
          </div>

          {selecionado ? (
            <div className="card p-6 sm:p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="h-11 w-11 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0">
                  <Keyboard size={19} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{selecionado.nome_completo}</h2>
                  <p className="text-sm text-navy-500">Aprovado(a) na entrevista</p>
                </div>
              </div>

              <button
                onClick={marcarNaoRealizado}
                disabled={salvando}
                className="btn-secondary mb-6 text-clay-600 border-clay-500/30 hover:bg-clay-500/5"
              >
                Marcar como "não realizou o teste"
              </button>

              <form onSubmit={salvarResultado} className="space-y-5 pt-2 border-t border-navy-100">
                <div className="grid sm:grid-cols-2 gap-4 pt-5">
                  <div>
                    <label className="field-label">WPM (palavras por minuto)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="field-input"
                      value={wpm}
                      onChange={(e) => setWpm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Precisão (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="field-input"
                      value={precisao}
                      onChange={(e) => setPrecisao(e.target.value)}
                    />
                  </div>
                </div>

                {aprovadoPreview !== null && (
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                      aprovadoPreview ? 'bg-sage-500/10 text-sage-600' : 'bg-clay-500/10 text-clay-600'
                    }`}
                  >
                    {aprovadoPreview ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {aprovadoPreview ? 'Será aprovado no teste' : 'Será reprovado no teste'}
                  </div>
                )}

                <div>
                  <label className="field-label flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Alerta de comportamento (opcional)
                  </label>
                  <textarea
                    rows={3}
                    className="field-input"
                    placeholder="Descreva qualquer comportamento observado que justifique reprovação, mesmo com bom resultado no teste."
                    value={alerta}
                    onChange={(e) => setAlerta(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={salvando} className="btn-primary w-full">
                  {salvando ? 'Salvando…' : 'Salvar resultado do teste'}
                </button>
              </form>
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
