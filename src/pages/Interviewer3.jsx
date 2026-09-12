import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import BoolToggle from '../components/BoolToggle'
import DuplicidadeModal from '../components/DuplicidadeModal'
import EditorCandidato from '../components/EditorCandidato'
import { useDuplicidade } from '../lib/useDuplicidade'
import { useComentarios } from '../lib/useComentarios'
import { simNaoOuVazio, etapa3Completa } from '../lib/candidato'
import { statusAtual } from '../lib/status'
import { ClipboardCheck, AlertTriangle, MessageCircle, X, Filter, MessageSquare, Pencil } from 'lucide-react'

const FILTROS_ETAPA = [
  { id: '', label: 'Todos' },
  { id: 'Teste de Digitação', label: 'Aguardando contato' },
  { id: 'Contato no WhatsApp', label: 'Contatado (aguardando solicitar doc.)' },
  { id: 'Documentação Solicitada', label: 'Doc. solicitada (aguardando envio)' },
  { id: 'Documentação Enviada', label: 'Doc. enviada (aguardando aprovação)' },
  { id: 'Documentação Aprovada', label: 'Doc. aprovada (aguardando data do exame)' },
  { id: 'Data do Exame', label: 'Exame marcado (aguardando comparecimento)' },
  { id: 'Compareceu no Exame', label: 'Compareceu no exame (aguardando resultado)' },
  { id: 'Aprovado no Exame', label: 'Aprovado no exame (aguardando onboarding)' },
  { id: 'Exame atrasado', label: 'Exame atrasado' },
  { id: 'Data do Onboarding', label: 'Onboarding marcado' },
  { id: 'Onboarding', label: 'Onboarding feito (aguardando treinamento)' },
  { id: 'Data do Treinamento', label: 'Treinamento marcado' },
  { id: 'Treinamento', label: 'Treinamento feito (aguardando Alô)' },
  { id: 'Data do Alô', label: 'Alô marcado' },
  { id: 'Alô', label: 'Alô feito' },
  { id: 'Entrega Realizada', label: 'Entrega realizada' },
  { id: 'Reprovado', label: 'Reprovado' },
]

// Campo booleano + campo de data que aparece quando marcado "Sim".
function CampoComData({ label, valor, data, onMudarValor, onMudarData, disabled, comentario }) {
  return (
    <div>
      <BoolToggle label={label} value={valor} onChange={onMudarValor} disabled={disabled} comentario={comentario} />
      {valor === true && (
        <div className="mt-2">
          <input
            type="date"
            className="field-input py-1.5 text-sm"
            value={data ?? ''}
            onChange={(e) => onMudarData(e.target.value || null)}
          />
        </div>
      )}
    </div>
  )
}

export default function Interviewer3() {
  const [fila, setFila] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [mostrarEditor, setMostrarEditor] = useState(false)
  const [busca, setBusca] = useState('')
  const [dataExame, setDataExame] = useState('')
  const [compliance, setCompliance] = useState('')
  const { duplicatas, mostrar: mostrarDuplicidade, dispensar } = useDuplicidade(selecionado)
  const comentarios = useComentarios()

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
      setSelecionado((sel) => (sel && data.some((c) => c.id === sel.id) ? sel : null))
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

  function marcarContato(v) {
    atualizar({
      contatado_whatsapp: v,
      data_contato_whatsapp: v ? new Date().toISOString().slice(0, 10) : null,
    })
  }

  function marcarAlo(v) {
    atualizar({
      compareceu_alo: v,
      data_alo: v ? new Date().toISOString().slice(0, 10) : null,
    })
  }

  const filaFiltrada = useMemo(() => {
    let f = fila
    if (filtroEtapa) {
      f = f.filter((c) => statusAtual(c) === filtroEtapa)
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      const digitos = busca.replace(/\D/g, '')
      f = f.filter(
        (c) => c.nome_completo?.toLowerCase().includes(termo) || (digitos.length >= 3 && c.cpf?.replace(/\D/g, '').includes(digitos)),
      )
    }
    return f
  }, [fila, filtroEtapa, busca])

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

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            className="field-input py-1.5 text-xs w-48"
            placeholder="Buscar nome ou CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Filter size={14} className="text-navy-400" />
          <select
            className="field-select py-1.5 text-xs w-auto"
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
          >
            {FILTROS_ETAPA.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
            {!loading && filaFiltrada.length === 0 && (
              <p className="p-4 text-sm text-navy-400">Nenhum candidato encontrado.</p>
            )}
            {filaFiltrada.map((c) => (
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
                    <h2 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-1.5">
                      {selecionado.nome_completo}
                      {duplicatas.length > 0 && <AlertTriangle size={15} className="text-amber-500" title="CPF já cadastrado antes" />}
                    </h2>
                    <p className="text-sm text-navy-500 dark:text-navy-400">
                      {selecionado.telefone} · {selecionado.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => setMostrarEditor(true)} className="text-navy-400 hover:text-navy-700 dark:hover:text-white" title="Editar todos os campos do candidato">
                    <Pencil size={17} />
                  </button>
                  <button onClick={() => setSelecionado(null)} title="Fechar sem alterar" className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {selecionado.comentario_entrevistador1 && (
                <div className="flex items-start gap-2 rounded-lg bg-navy-50 dark:bg-navy-800 px-3.5 py-3 mb-4 text-sm">
                  <MessageSquare size={15} className="text-navy-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-navy-700 dark:text-navy-200">Comentário do Entrevistador 1</p>
                    <p className="text-navy-600 dark:text-navy-300">{selecionado.comentario_entrevistador1}</p>
                  </div>
                </div>
              )}

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

              {/* 1. Contato via WhatsApp */}
              <div className="pt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-2">1. Contato via WhatsApp</p>
                <button
                  disabled={salvando}
                  onClick={() => marcarContato(!selecionado.contatado_whatsapp)}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    selecionado.contatado_whatsapp
                      ? 'border-sage-500 bg-sage-500/10 text-sage-600'
                      : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                  }`}
                >
                  <MessageCircle size={16} />
                  {selecionado.contatado_whatsapp ? 'Contato já feito' : 'Marcar como contatado via WhatsApp'}
                </button>
                {selecionado.contatado_whatsapp && (
                  <input
                    type="date"
                    className="field-input py-1.5 text-sm mt-2"
                    value={selecionado.data_contato_whatsapp ?? ''}
                    onChange={(e) => atualizar({ data_contato_whatsapp: e.target.value || null })}
                  />
                )}
                {comentarios.contatado_whatsapp && (
                  <p className="text-xs text-navy-500 dark:text-navy-400 mt-1.5">{comentarios.contatado_whatsapp}</p>
                )}
              </div>

              {/* 2. Documentação */}
              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">2. Documentação</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CampoComData
                    label="Documentação solicitada?"
                    valor={selecionado.documentacao_solicitada}
                    data={selecionado.data_documentacao_solicitada}
                    onMudarValor={(v) => atualizar({ documentacao_solicitada: v, data_documentacao_solicitada: v ? new Date().toISOString().slice(0, 10) : null })}
                    onMudarData={(d) => atualizar({ data_documentacao_solicitada: d })}
                    disabled={salvando}
                    comentario={comentarios.documentacao_solicitada}
                  />
                  <CampoComData
                    label="Enviou documentação?"
                    valor={selecionado.enviou_documentacao}
                    data={selecionado.data_envio_documentacao}
                    onMudarValor={(v) => atualizar({ enviou_documentacao: v, data_envio_documentacao: v ? new Date().toISOString().slice(0, 10) : null })}
                    onMudarData={(d) => atualizar({ data_envio_documentacao: d })}
                    disabled={salvando}
                    comentario={comentarios.enviou_documentacao}
                  />
                  <BoolToggle
                    label="Aprovado na documentação?"
                    value={selecionado.aprovado_documentacao}
                    onChange={(v) => atualizar({ aprovado_documentacao: v })}
                    disabled={salvando}
                    semantic
                    comentario={comentarios.aprovado_documentacao}
                  />
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
              </div>

              {/* 3. Exame */}
              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">3. Exame</p>
                <div className="grid sm:grid-cols-2 gap-4">
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
                  <BoolToggle
                    label="Compareceu no exame?"
                    value={selecionado.compareceu_exame}
                    onChange={(v) => atualizar({ compareceu_exame: v })}
                    disabled={salvando}
                    comentario={comentarios.compareceu_exame}
                  />
                  <BoolToggle
                    label="Aprovado no exame?"
                    value={selecionado.aprovado_exame}
                    onChange={(v) => atualizar({ aprovado_exame: v })}
                    disabled={salvando}
                    semantic
                    comentario={comentarios.aprovado_exame}
                  />
                </div>
              </div>

              {/* 4. Onboarding e treinamento */}
              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">4. Onboarding e treinamento</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CampoComData
                    label="Compareceu no onboarding?"
                    valor={selecionado.compareceu_onboarding}
                    data={selecionado.data_onboarding}
                    onMudarValor={(v) => atualizar({ compareceu_onboarding: v, data_onboarding: v ? new Date().toISOString().slice(0, 10) : null })}
                    onMudarData={(d) => atualizar({ data_onboarding: d })}
                    disabled={salvando}
                    comentario={comentarios.compareceu_onboarding}
                  />
                  <CampoComData
                    label="Compareceu no treinamento?"
                    valor={selecionado.compareceu_treinamento}
                    data={selecionado.data_treinamento}
                    onMudarValor={(v) => atualizar({ compareceu_treinamento: v, data_treinamento: v ? new Date().toISOString().slice(0, 10) : null })}
                    onMudarData={(d) => atualizar({ data_treinamento: d })}
                    disabled={salvando}
                    comentario={comentarios.compareceu_treinamento}
                  />
                </div>
              </div>

              {/* 5. Alô (entrega final) */}
              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">5. Alô (entrega final)</p>
                <CampoComData
                  label="Alô realizado?"
                  valor={selecionado.compareceu_alo}
                  data={selecionado.data_alo}
                  onMudarValor={marcarAlo}
                  onMudarData={(d) => atualizar({ data_alo: d })}
                  disabled={salvando}
                  comentario={comentarios.compareceu_alo}
                />
              </div>

              <div className="pt-6 mt-6 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-2">Decisão final (Entrega para Treinamento)</p>
                <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-navy-400 text-sm">
              Selecione um candidato na lista ao lado.
            </div>
          )}
        </div>

        {mostrarDuplicidade && (
          <DuplicidadeModal
            candidatoAtual={selecionado}
            duplicatas={duplicatas}
            onFechar={dispensar}
            onRepetido={() => {
              dispensar()
              carregar()
            }}
          />
        )}

        {mostrarEditor && selecionado && (
          <EditorCandidato
            candidato={selecionado}
            onClose={() => setMostrarEditor(false)}
            onSaved={() => {
              setMostrarEditor(false)
              carregar()
            }}
          />
        )}
      </div>
    </Layout>
  )
}
