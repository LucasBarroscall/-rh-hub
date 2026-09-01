import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import BoolToggle from '../components/BoolToggle'
import { formatarData, formatarDataHora, simNaoOuVazio, etapa1Completa } from '../lib/candidato'
import { UserCheck, Phone, MapPin, Calendar, X } from 'lucide-react'

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
      // Se o candidato ficou com essa etapa completa e a fila só mostra
      // pendentes, ele vai sumir da lista — então já avançamos para o
      // próximo, em vez de deixar a tela travada nele.
      setSelecionado(!mostrarTodos && etapa1Completa(data) ? null : data)
      carregar()
    }
  }

  function onCompareceu(v) {
    const campos = { compareceu_entrevista: v }
    if (v === null) campos.aprovado_entrevista = null
    salvar(campos)
  }

  function onAprovado(v) {
    salvar({ aprovado_entrevista: v })
  }

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Etapa 1 · Entrevista</h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">
              Candidatos na ordem em que preencheram o cadastro.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
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
          <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
            {!loading && fila.length === 0 && (
              <p className="p-4 text-sm text-navy-400">Nenhum candidato na fila.</p>
            )}
            {fila.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelecionado(c)}
                className={`w-full text-left px-4 py-3.5 transition-colors ${
                  selecionado?.id === c.id ? 'bg-navy-50 dark:bg-navy-800' : 'hover:bg-navy-50/60 dark:hover:bg-navy-800/60'
                }`}
              >
                <p className="text-sm font-medium text-navy-900 dark:text-white">{c.nome_completo}</p>
                <p className="text-xs text-navy-400 mt-0.5">
                  {formatarData(c.data_entrevista)} · {c.fonte}
                </p>
              </button>
            ))}
          </div>

          {selecionado ? (
            <div className="card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0">
                    <UserCheck size={19} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{selecionado.nome_completo}</h2>
                    <p className="text-sm text-navy-500 dark:text-navy-400">
                      {selecionado.idade ? `${selecionado.idade} anos · ` : ''}
                      {selecionado.sexo}
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

              <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="flex items-start gap-2">
                  <Phone size={15} className="text-navy-400 mt-0.5" />
                  <span className="text-navy-700 dark:text-navy-200">{selecionado.telefone || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-navy-400 mt-0.5" />
                  <span className="text-navy-700 dark:text-navy-200">
                    {selecionado.bairro}, {selecionado.cidade}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={15} className="text-navy-400 mt-0.5" />
                  <span className="text-navy-700 dark:text-navy-200">Cadastro: {formatarData(selecionado.data_entrevista)}</span>
                </div>
                <div>
                  <span className="text-navy-400">Origem: </span>
                  <span className="text-navy-700 dark:text-navy-200">
                    {selecionado.fonte}
                    {selecionado.fonte === 'Indicação' ? ` (${selecionado.nome_indicador})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-navy-400">Disponibilidade de trabalho: </span>
                  <span className="text-navy-700 dark:text-navy-200">{selecionado.disponibilidade_horario_trabalho}</span>
                </div>
                <div>
                  <span className="text-navy-400">Disponibilidade de treinamento: </span>
                  <span className="text-navy-700 dark:text-navy-200">{selecionado.disponibilidade_horario_treinamento}</span>
                </div>
                <div>
                  <span className="text-navy-400">Jornada: </span>
                  <span className="text-navy-700 dark:text-navy-200">{selecionado.disponibilidade_jornada}</span>
                </div>
                <div>
                  <span className="text-navy-400">Veículo próprio: </span>
                  <span className="text-navy-700 dark:text-navy-200">{simNaoOuVazio(selecionado.possui_veiculo)}</span>
                </div>
                <div>
                  <span className="text-navy-400">Ensino superior: </span>
                  <span className="text-navy-700 dark:text-navy-200">{simNaoOuVazio(selecionado.possui_ensino_superior)}</span>
                </div>
              </dl>

              {selecionado.observacoes && (
                <p className="text-sm bg-navy-50 dark:bg-navy-800 rounded-lg p-3.5 mb-6 text-navy-700 dark:text-navy-200">
                  <span className="font-medium">Observações do candidato: </span>
                  {selecionado.observacoes}
                </p>
              )}

              {(selecionado.compareceu_entrevista === true || selecionado.compareceu_entrevista === false) && (
                <p className="text-xs text-navy-400 mb-4">
                  Última atualização: {formatarDataHora(selecionado.entrevista_em)}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-navy-100 dark:border-navy-800">
                <div className="pt-4">
                  <BoolToggle
                    label="Compareceu na entrevista?"
                    value={selecionado.compareceu_entrevista}
                    onChange={onCompareceu}
                    disabled={salvando}
                  />
                </div>
                <div className="pt-4">
                  <BoolToggle
                    label="Aprovado na entrevista?"
                    value={selecionado.aprovado_entrevista}
                    onChange={onAprovado}
                    disabled={salvando || selecionado.compareceu_entrevista !== true}
                    semantic
                  />
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
