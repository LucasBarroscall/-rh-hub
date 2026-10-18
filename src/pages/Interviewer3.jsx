import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { buscarTodos } from '../lib/buscarTodos'
import Layout from '../components/Layout'
import RespostasExtras from '../components/RespostasExtras'
import BoolToggle from '../components/BoolToggle'
import DuplicidadeModal from '../components/DuplicidadeModal'
import EditorCandidato from '../components/EditorCandidato'
import DocumentosModal from '../components/DocumentosModal'
import { useDuplicidade } from '../lib/useDuplicidade'
import { useComentarios } from '../lib/useComentarios'
import { useOpcoes } from '../lib/useOpcoes'
import { simNaoOuVazio, etapa3Completa } from '../lib/candidato'
import { statusAtual } from '../lib/status'
import { resumoDocumentos } from '../lib/documentos'
import { OPCOES_COMPLIANCE, hojeISO } from '../lib/cadastro'
import { ClipboardCheck, AlertTriangle, MessageCircle, X, Filter, MessageSquare, Pencil, FileText, CheckCircle2 } from 'lucide-react'

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

function CampoComData({ label, valor, data, onMudarValor, onMudarData, disabled, comentario }) {
  return (
    <div>
      <BoolToggle label={label} value={valor} onChange={onMudarValor} disabled={disabled} comentario={comentario} />
      {valor === true && (
        <div className="mt-2">
          <input type="date" className="field-input py-1.5 text-sm" value={data ?? ''} onChange={(e) => onMudarData(e.target.value || null)} />
        </div>
      )}
    </div>
  )
}

function BadgeDocs({ resumo }) {
  if (resumo.pct == null) return null
  const cor = resumo.pct === 100 ? 'bg-sage-500/15 text-sage-600' : resumo.pct >= 50 ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300' : 'bg-clay-500/15 text-clay-600'
  return <span className={`pill ${cor}`}>Docs {resumo.pct}%</span>
}

export default function Interviewer3() {
  const [fila, setFila] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [busca, setBusca] = useState('')
  const [mostrarEditor, setMostrarEditor] = useState(false)
  const [mostrarDocs, setMostrarDocs] = useState(false)
  const [dataExame, setDataExame] = useState('')
  const { duplicatas, mostrar: mostrarDuplicidade, dispensar } = useDuplicidade(selecionado)
  const comentarios = useComentarios()
  const { opcoes } = useOpcoes()
  const listaDocs = opcoes.documento || []

  const carregar = useCallback(async () => {
    setLoading(true)
    // Só chega aqui quem foi aprovado na entrevista E no teste de digitação.
    let query = supabase
      .from('candidatos')
      .select('*')
      .eq('aprovado_entrevista', true)
      .eq('aprovado_teste', true)
      .order('teste_em', { ascending: true })
    if (!mostrarTodos) {
      query = query.is('decisao_final', null).or('compareceu_alo.is.null,compareceu_alo.eq.false')
    }
    const { data, error } = await buscarTodos(query.order('id'))
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
  }, [selecionado])

  async function atualizar(campos, { avancar = false } = {}) {
    if (!selecionado) return
    setSalvando(true)
    const { data, error } = await supabase.from('candidatos').update(campos).eq('id', selecionado.id).select().single()
    setSalvando(false)
    if (!error) {
      setSelecionado(avancar && !mostrarTodos && etapa3Completa(data) ? null : data)
      carregar()
    }
    return !error
  }

  function reprovar() {
    const reprovado = selecionado.decisao_final === 'Reprovado'
    atualizar(
      { decisao_final: reprovado ? null : 'Reprovado', decisao_em: reprovado ? null : new Date().toISOString() },
      { avancar: true },
    )
  }

  function marcarContato(v) {
    atualizar({ contatado_whatsapp: v, data_contato_whatsapp: v ? hojeISO() : null })
  }

  // Alô realizado = processo finalizado com sucesso (não existe mais "aprovação final").
  function marcarAlo(v) {
    atualizar({ compareceu_alo: v, data_alo: v ? hojeISO() : null }, { avancar: true })
  }

  async function salvarDocumentos(docs) {
    const resumo = resumoDocumentos({ documentos: docs }, listaDocs)
    const completo = resumo.aplicaveis > 0 && resumo.enviados === resumo.aplicaveis
    const ok = await atualizar({
      documentos: docs,
      enviou_documentacao: completo ? true : null,
      data_envio_documentacao: completo ? selecionado.data_envio_documentacao || hojeISO() : null,
    })
    if (ok) setMostrarDocs(false)
  }

  const filaFiltrada = useMemo(() => {
    let f = fila
    if (filtroEtapa) f = f.filter((c) => statusAtual(c) === filtroEtapa)
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      const digitos = busca.replace(/\D/g, '')
      f = f.filter((c) => c.nome_completo?.toLowerCase().includes(termo) || (digitos.length >= 3 && c.cpf?.replace(/\D/g, '').includes(digitos)))
    }
    return f
  }, [fila, filtroEtapa, busca])

  const resumoSel = selecionado ? resumoDocumentos(selecionado, listaDocs) : null

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Etapa 3 · Decisão</h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">Candidatos aprovados na entrevista e no teste de digitação.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
            <input type="checkbox" checked={mostrarTodos} onChange={(e) => setMostrarTodos(e.target.checked)} className="rounded border-navy-200" />
            Mostrar já finalizados
          </label>
        </header>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input className="field-input py-1.5 text-xs w-48" placeholder="Buscar nome ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Filter size={14} className="text-navy-400" />
          <select className="field-select py-1.5 text-xs w-auto" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)}>
            {FILTROS_ETAPA.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-h-[70vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
            {!loading && filaFiltrada.length === 0 && <p className="p-4 text-sm text-navy-400">Nenhum candidato encontrado.</p>}
            {filaFiltrada.map((c) => {
              const r = resumoDocumentos(c, listaDocs)
              return (
                <button
                  key={c.id}
                  onClick={() => setSelecionado(c)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    selecionado?.id === c.id ? 'bg-navy-50 dark:bg-navy-800' : 'hover:bg-navy-50/60 dark:hover:bg-navy-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-navy-900 dark:text-white flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{c.nome_completo}</span>
                      {c.alerta_comportamental && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />}
                    </p>
                    <BadgeDocs resumo={r} />
                  </div>
                  <p className="text-xs text-navy-400 mt-0.5">
                    WPM {c.wpm ?? '—'} · Precisão {c.precisao ?? '—'}%{c.resultado_teste ? ` · ${c.resultado_teste}` : ''}
                  </p>
                  {r.aplicaveis > 0 && r.faltantes.length > 0 && (
                    <p className="text-[11px] text-clay-600 mt-0.5 truncate">
                      Faltam: {r.faltantes.slice(0, 2).join(', ')}
                      {r.faltantes.length > 2 ? ` +${r.faltantes.length - 2}` : ''}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {selecionado ? (
            <div className="card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck size={19} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2 flex-wrap">
                      {selecionado.nome_completo}
                      {duplicatas.length > 0 && <AlertTriangle size={15} className="text-amber-500" title="CPF já cadastrado antes" />}
                      <BadgeDocs resumo={resumoSel} />
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

              {selecionado.compareceu_alo === true && (
                <div className="flex items-center gap-2 rounded-lg bg-sage-500/10 text-sage-600 px-3.5 py-3 mb-6 text-sm font-medium">
                  <CheckCircle2 size={16} /> Processo finalizado com sucesso (Alô realizado).
                </div>
              )}
              {selecionado.decisao_final === 'Reprovado' && (
                <div className="flex items-center gap-2 rounded-lg bg-clay-500/10 text-clay-600 px-3.5 py-3 mb-6 text-sm font-medium">
                  <AlertTriangle size={16} /> Candidato reprovado.
                </div>
              )}

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

              <RespostasExtras candidato={selecionado} />
              <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="text-navy-400">Entrevista: </span>
                  <span className="font-medium text-sage-600">Aprovado</span>
                </div>
                <div>
                  <span className="text-navy-400">Teste de digitação: </span>
                  <span className="font-medium text-sage-600">
                    {selecionado.resultado_teste || 'Aprovado'} (WPM {selecionado.wpm}, {selecionado.precisao}%)
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
                <div className="sm:col-span-2">
                  <span className="text-navy-400">Endereço: </span>
                  <span className="text-navy-700 dark:text-navy-200">
                    {selecionado.logradouro}, {selecionado.numero}
                    {selecionado.complemento ? ` - ${selecionado.complemento}` : ''}, {selecionado.bairro}, {selecionado.cidade}
                  </span>
                </div>
              </dl>

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
              </div>

              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">2. Documentação</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CampoComData
                    label="Documentação solicitada?"
                    valor={selecionado.documentacao_solicitada}
                    data={selecionado.data_documentacao_solicitada}
                    onMudarValor={(v) => atualizar({ documentacao_solicitada: v, data_documentacao_solicitada: v ? hojeISO() : null })}
                    onMudarData={(d) => atualizar({ data_documentacao_solicitada: d })}
                    disabled={salvando}
                    comentario={comentarios.documentacao_solicitada}
                  />
                  <BoolToggle
                    label="Aprovado na documentação?"
                    value={selecionado.aprovado_documentacao}
                    onChange={(v) => atualizar({ aprovado_documentacao: v })}
                    disabled={salvando}
                    semantic
                    comentario={comentarios.aprovado_documentacao}
                  />
                </div>

                <div className="rounded-lg border border-navy-100 dark:border-navy-800 p-3.5 mt-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-navy-800 dark:text-navy-100">Documentos enviados</p>
                    <button onClick={() => setMostrarDocs(true)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                      <FileText size={13} /> Gerenciar
                    </button>
                  </div>
                  <div className="h-2 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden mb-1.5">
                    <div className="h-full bg-navy-700 transition-all" style={{ width: `${resumoSel.pct || 0}%` }} />
                  </div>
                  <p className="text-xs text-navy-500 dark:text-navy-400">
                    {resumoSel.pct == null
                      ? 'Nenhum documento aplicável.'
                      : `${resumoSel.enviados} de ${resumoSel.aplicaveis} (${resumoSel.pct}%)${
                          resumoSel.faltantes.length ? ` · Faltam: ${resumoSel.faltantes.join(', ')}` : ' · Tudo enviado'
                        }`}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="field-label mb-1.5">Compliance</p>
                  <div className="grid grid-cols-3 gap-2">
                    {OPCOES_COMPLIANCE.map((op) => (
                      <button
                        key={op}
                        type="button"
                        disabled={salvando}
                        onClick={() => atualizar({ compliance: selecionado.compliance === op ? null : op })}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                          selecionado.compliance === op
                            ? op === 'Aprovado'
                              ? 'border-sage-500 bg-sage-500 text-white'
                              : op === 'Reprovado'
                                ? 'border-clay-500 bg-clay-500 text-white'
                                : 'border-amber-500 bg-amber-400 text-navy-900'
                            : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

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
                  <BoolToggle label="Compareceu no exame?" value={selecionado.compareceu_exame} onChange={(v) => atualizar({ compareceu_exame: v })} disabled={salvando} comentario={comentarios.compareceu_exame} />
                  <BoolToggle label="Aprovado no exame?" value={selecionado.aprovado_exame} onChange={(v) => atualizar({ aprovado_exame: v })} disabled={salvando} semantic comentario={comentarios.aprovado_exame} />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">4. Onboarding e treinamento</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CampoComData
                    label="Compareceu no onboarding?"
                    valor={selecionado.compareceu_onboarding}
                    data={selecionado.data_onboarding}
                    onMudarValor={(v) => atualizar({ compareceu_onboarding: v, data_onboarding: v ? hojeISO() : null })}
                    onMudarData={(d) => atualizar({ data_onboarding: d })}
                    disabled={salvando}
                    comentario={comentarios.compareceu_onboarding}
                  />
                  <CampoComData
                    label="Compareceu no treinamento?"
                    valor={selecionado.compareceu_treinamento}
                    data={selecionado.data_treinamento}
                    onMudarValor={(v) => atualizar({ compareceu_treinamento: v, data_treinamento: v ? hojeISO() : null })}
                    onMudarData={(d) => atualizar({ data_treinamento: d })}
                    disabled={salvando}
                    comentario={comentarios.compareceu_treinamento}
                  />
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
                <p className="field-label mb-3">5. Produto e Alô (entrega final)</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Produto do candidato</label>
                    <select
                      className="field-select"
                      value={selecionado.produto || ''}
                      disabled={salvando}
                      onChange={(e) => atualizar({ produto: e.target.value || null })}
                    >
                      <option value="">Selecione o produto</option>
                      {(opcoes.produto || []).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {(opcoes.produto || []).length === 0 && (
                      <p className="text-xs text-navy-400 mt-1">O analista cadastra os produtos em Administração → Listas → Produto.</p>
                    )}
                  </div>
                  <CampoComData
                    label="Alô realizado? (finaliza o processo com sucesso)"
                    valor={selecionado.compareceu_alo}
                    data={selecionado.data_alo}
                    onMudarValor={marcarAlo}
                    onMudarData={(d) => atualizar({ data_alo: d })}
                    disabled={salvando}
                    comentario={comentarios.compareceu_alo}
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-navy-100 dark:border-navy-800">
                <button
                  disabled={salvando}
                  onClick={reprovar}
                  className={`w-full rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                    selecionado.decisao_final === 'Reprovado'
                      ? 'border-clay-500 bg-clay-500 text-white'
                      : 'border-clay-500/40 text-clay-600 bg-white dark:bg-navy-900 hover:bg-clay-500/5'
                  }`}
                >
                  {selecionado.decisao_final === 'Reprovado' ? 'Reprovado ✓ (clique para desfazer)' : 'Reprovar candidato'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-navy-400 text-sm">Selecione um candidato na lista ao lado.</div>
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
        {mostrarDocs && selecionado && (
          <DocumentosModal candidato={selecionado} lista={listaDocs} salvando={salvando} onClose={() => setMostrarDocs(false)} onSalvar={salvarDocumentos} />
        )}
      </div>
    </Layout>
  )
}
