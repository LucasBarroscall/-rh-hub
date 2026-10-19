import { useFecharComEsc, aoClicarFora } from '../lib/useModal'
import { useEffect, useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import AbaCandidatos from '../components/admin/AbaCandidatos'
import AbaLog from '../components/admin/AbaLog'
import AbaCamposFormulario from '../components/admin/AbaCamposFormulario'
import AbaRegraTeste from '../components/admin/AbaRegraTeste'
import { formatarData, etapaFunil, corEtapa } from '../lib/candidato'
import EditarOpcaoModal from '../components/EditarOpcaoModal'
import EditorRico from '../components/EditorRico'
import EditorCandidato from '../components/EditorCandidato'
import { ShieldCheck, Search, Trash2, Save, Users2, X, UserPlus, ListChecks, MessageSquare, ChevronUp, ChevronDown, Download, Upload, Printer, Pencil, Flag, FileDown, Image as ImageIcon } from 'lucide-react'
import { normalizarTexto } from '../lib/formatters'

// Colunas geradas pelo banco — nunca podem ser enviadas em insert/update.
const COLUNAS_GERADAS = ['idade', 'aprovado_teste', 'updated_at']

const ROLES = [
  { id: 'entrevistador1', label: 'Entrevistador 1' },
  { id: 'entrevistador2', label: 'Entrevistador 2' },
  { id: 'entrevistador3', label: 'Entrevistador 3' },
  { id: 'analista', label: 'Analista de People Analytics' },
]

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
      }`}
    >
      {children}
    </button>
  )
}

const PERFIL_VAZIO = { id: '', nome: '', email: '', role: 'entrevistador1' }

function NovoAcessoModal({ onClose, onSaved }) {
  useFecharComEsc(onClose)
  const [form, setForm] = useState(PERFIL_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const { error } = await supabase.from('profiles').insert(form)
    setSalvando(false)
    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe um perfil com esse ID.'
          : 'Não foi possível salvar. Confira se o ID é o UUID exato do usuário criado no Supabase.',
      )
      return
    }
    onSaved()
  }

  return (
    <div {...aoClicarFora(onClose)} className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={salvar} className="card-elevated w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Adicionar acesso</h2>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="field-label">ID do usuário (UUID do Supabase Auth)</label>
            <input
              required
              className="field-input font-mono text-sm"
              placeholder="ex.: c845f3ed-0aa1-4d9b-808b-92106e8f48cc"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.trim() }))}
            />
            <p className="text-xs text-navy-400 mt-1">
              Crie o login primeiro em Supabase → Authentication → Users, depois cole o UUID dele aqui.
            </p>
          </div>
          <div>
            <label className="field-label">Nome</label>
            <input
              required
              className="field-input"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">E-mail</label>
            <input
              type="email"
              required
              className="field-input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Papel</label>
            <select
              className="field-select"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {erro && <p className="text-sm text-clay-600 mt-4">{erro}</p>}

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando…' : 'Adicionar acesso'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AbaAcessos() {
  const [perfis, setPerfis] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarNovo, setMostrarNovo] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (!error) setPerfis(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function atualizarPerfil(id, campos) {
    const { error } = await supabase.from('profiles').update(campos).eq('id', id)
    if (!error) carregar()
  }

  async function removerPerfil(p) {
    if (
      !confirm(
        `Remover o acesso de ${p.nome}? Isso tira o acesso ao sistema (o login do Supabase continua existindo, se quiser apagar de vez, remova também em Authentication → Users).`,
      )
    )
      return
    const { error } = await supabase.from('profiles').delete().eq('id', p.id)
    if (!error) carregar()
  }

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <Users2 size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Para dar acesso a alguém, cadastre o login em <strong>Authentication → Users</strong> no painel do
          Supabase, copie o UUID gerado e use o botão "Adicionar acesso" abaixo para vincular o papel dele
          no sistema.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setMostrarNovo(true)} className="btn-primary flex items-center gap-1.5">
          <UserPlus size={16} /> Adicionar acesso
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 dark:border-navy-800 text-left text-navy-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-navy-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading &&
              perfis.map((p) => (
                <tr key={p.id} className="border-b border-navy-50 dark:border-navy-800/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900 dark:text-white">{p.nome}</td>
                  <td className="px-4 py-3 text-navy-500 dark:text-navy-400">{p.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="field-select py-1.5 text-xs w-auto"
                      value={p.role}
                      onChange={(e) => atualizarPerfil(p.id, { role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => atualizarPerfil(p.id, { ativo: !p.ativo })}
                      className={`pill ${p.ativo ? 'bg-sage-500/15 text-sage-600' : 'bg-clay-500/15 text-clay-600'}`}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removerPerfil(p)}
                      title="Remover acesso"
                      className="text-navy-400 hover:text-clay-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && perfis.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-navy-400">
                  Nenhum acesso cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarNovo && (
        <NovoAcessoModal
          onClose={() => setMostrarNovo(false)}
          onSaved={() => {
            setMostrarNovo(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}

const CAMPOS_LISTA = [
  { chave: 'fonte', label: 'Fonte' },
  { chave: 'sexo', label: 'Sexo' },
  { chave: 'produto', label: 'Produto' },
  { chave: 'documento', label: 'Documentos' },
]

function AbaListas() {
  const [campoAtivo, setCampoAtivo] = useState(CAMPOS_LISTA[0].chave)
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoValor, setNovoValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opcoes_lista')
      .select('*')
      .eq('campo', campoAtivo)
      .order('ordem', { ascending: true })
    if (!error) setItens(data)
    else setErro(`Não foi possível carregar as opções: ${error.message}`)
    setLoading(false)
  }, [campoAtivo])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(e) {
    e.preventDefault()
    if (!novoValor.trim()) return
    setErro('')
    setSalvando(true)
    const proximaOrdem = itens.length ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1
    const { error } = await supabase
      .from('opcoes_lista')
      .insert({ campo: campoAtivo, valor: novoValor.trim(), ordem: proximaOrdem })
    setSalvando(false)
    if (!error) {
      setNovoValor('')
      carregar()
    } else if (error.code === '23505') {
      setErro('Essa opção já existe nessa lista.')
    } else if (error.code === '42501' || error.message?.includes('row-level security')) {
      setErro('Sem permissão para editar essa lista — confira se seu usuário está com o papel "analista".')
    } else if (error.code === '42P17' || error.message?.includes('does not exist')) {
      setErro('A tabela de listas ainda não existe ou está desatualizada no seu banco — rode o SQL da Rodada 3 no Supabase (SQL Editor) e tente de novo.')
    } else {
      setErro(`Não foi possível adicionar: ${error.message}`)
    }
  }

  async function remover(item) {
    if (!confirm(`Remover a opção "${item.valor}"? Candidatos já cadastrados com esse valor não são afetados.`)) return
    setErro('')
    const { error } = await supabase.from('opcoes_lista').delete().eq('id', item.id)
    if (!error) carregar()
    else setErro(`Não foi possível remover: ${error.message}`)
  }

  async function mover(index, direcao) {
    const alvo = index + direcao
    if (alvo < 0 || alvo >= itens.length) return
    setErro('')
    const a = itens[index]
    const b = itens[alvo]
    const { error } = await supabase.from('opcoes_lista').update({ ordem: b.ordem }).eq('id', a.id)
    const { error: error2 } = !error
      ? await supabase.from('opcoes_lista').update({ ordem: a.ordem }).eq('id', b.id)
      : { error: null }
    if (error || error2) setErro(`Não foi possível reordenar: ${(error || error2).message}`)
    carregar()
  }

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <ListChecks size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Essas listas alimentam os menus do formulário de cadastro do candidato. Adicionar, remover ou
          reordenar uma opção aqui muda o site na hora, sem precisar editar código.
        </p>
      </div>

      <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1 mb-5 w-fit flex-wrap">
        {CAMPOS_LISTA.map((c) => (
          <button
            key={c.chave}
            onClick={() => {
              setErro('')
              setCampoAtivo(c.chave)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              campoAtivo === c.chave ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <form onSubmit={adicionar} className="flex gap-2 mb-2 max-w-md">
        <input
          className="field-input"
          placeholder="Nova opção…"
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
        />
        <button type="submit" disabled={salvando} className="btn-primary flex-shrink-0">
          Adicionar
        </button>
      </form>

      {erro && <p className="text-sm text-clay-600 mb-4 max-w-md">{erro}</p>}

      <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-w-md">
        {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
        {!loading && itens.length === 0 && <p className="p-4 text-sm text-navy-400">Nenhuma opção cadastrada.</p>}
        {!loading &&
          itens.map((item, i) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <span className="text-sm text-navy-800 dark:text-navy-100 flex items-center gap-2">
                {item.valor}
                {campoAtivo === 'fonte' && item.tipo_dependencia && item.tipo_dependencia !== 'nenhum' && (
                  <span className="pill bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300 text-[10px]">
                    {item.tipo_dependencia === 'texto' ? 'Texto' : 'Lista'}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  title="Mover para cima"
                  className="text-navy-400 hover:text-navy-700 dark:hover:text-white disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => mover(i, 1)}
                  disabled={i === itens.length - 1}
                  title="Mover para baixo"
                  className="text-navy-400 hover:text-navy-700 dark:hover:text-white disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
                <button onClick={() => setEditando(item)} title="Editar" className="text-navy-400 hover:text-navy-700 dark:hover:text-white ml-1">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remover(item)} title="Remover" className="text-navy-400 hover:text-clay-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
      </div>

      {editando && (
        <EditarOpcaoModal
          opcao={editando}
          campo={campoAtivo}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

function AbaComentarios() {
  const [extrasCampos, setExtrasCampos] = useState([])
  useEffect(() => {
    supabase
      .from('campos_formulario')
      .select('chave, rotulo')
      .order('ordem', { ascending: true })
      .then(({ data }) => setExtrasCampos((data || []).map((x) => [x.chave, `${x.rotulo} (personalizado)`])))
  }, [])
  const CAMPOS_COMENTAVEIS = [
    ['fonte', 'Fonte'],
    ['rede_social', 'Rede social'],
    ['nome_indicador', 'Quem indicou'],
    ['nome_completo', 'Nome completo'],
    ['data_nascimento', 'Data de nascimento'],
    ['sexo', 'Sexo'],
    ['rg', 'RG'],
    ['cpf', 'CPF'],
    ['nome_mae', 'Nome da mãe'],
    ['telefone', 'Telefone'],
    ['email', 'E-mail'],
    ['logradouro', 'Rua / Logradouro'],
    ['bairro', 'Bairro'],
    ['cidade', 'Cidade'],
    ['cep', 'CEP'],
    ['disponibilidade_horario_trabalho', 'Horário de trabalho'],
    ['disponibilidade_horario_treinamento', 'Horário de treinamento'],
    ['disponibilidade_jornada', 'Jornada de trabalho'],
    ['possui_veiculo', 'Possui veículo próprio'],
    ['possui_ensino_superior', 'Possui ensino superior'],
    ['concorda_turno_treinamento', 'Concorda com turno de treinamento'],
    ['observacoes', 'Observações'],
    ['compareceu_entrevista', 'Compareceu na entrevista? (Etapa 1)'],
    ['aprovado_entrevista', 'Aprovado na entrevista? (Etapa 1)'],
    ['wpm', 'WPM (Etapa 2)'],
    ['precisao', 'Precisão % (Etapa 2)'],
    ['contatado_whatsapp', 'Contatado via WhatsApp? (Etapa 3)'],
    ['documentacao_solicitada', 'Documentação solicitada? (Etapa 3)'],
    ['enviou_documentacao', 'Enviou documentação? (Etapa 3)'],
    ['aprovado_documentacao', 'Aprovado na documentação? (Etapa 3)'],
    ['compareceu_exame', 'Compareceu no exame? (Etapa 3)'],
    ['aprovado_exame', 'Aprovado no exame? (Etapa 3)'],
    ['compareceu_onboarding', 'Compareceu no onboarding? (Etapa 3)'],
    ['compareceu_treinamento', 'Compareceu no treinamento? (Etapa 3)'],
    ['compareceu_alo', 'Alô realizado? (Etapa 3)'],
  ]
  const listaCampos = [...CAMPOS_COMENTAVEIS, ...extrasCampos]

  const [comentarios, setComentarios] = useState({})
  const [titulos, setTitulos] = useState({})
  const [posicoes, setPosicoes] = useState({})
  const [loading, setLoading] = useState(true)
  const [campoAtivo, setCampoAtivo] = useState(CAMPOS_COMENTAVEIS[0][0])
  const [rascunho, setRascunho] = useState('')
  const [rascunhoTitulo, setRascunhoTitulo] = useState('')
  const [rascunhoPosicao, setRascunhoPosicao] = useState('depois')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('campo_comentarios').select('*')
    if (!error) {
      const mapa = {}
      const mapaTitulos = {}
      const mapaPosicoes = {}
      data.forEach((c) => {
        mapa[c.campo] = c.comentario
        if (c.titulo) mapaTitulos[c.campo] = c.titulo
        mapaPosicoes[c.campo] = c.posicao || 'depois'
      })
      setComentarios(mapa)
      setTitulos(mapaTitulos)
      setPosicoes(mapaPosicoes)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    setRascunho(comentarios[campoAtivo] || '')
    setRascunhoTitulo(titulos[campoAtivo] || '')
    setRascunhoPosicao(posicoes[campoAtivo] || 'depois')
  }, [campoAtivo, comentarios, titulos, posicoes])

  async function salvar() {
    setSalvando(true)
    const texto = (rascunho || '').trim()
    const vazio = texto === '' || texto === '<p><br></p>'
    const tituloLimpo = rascunhoTitulo.trim() || null
    if (!vazio || tituloLimpo) {
      await supabase.from('campo_comentarios').upsert({
        campo: campoAtivo,
        comentario: vazio ? null : texto,
        titulo: tituloLimpo,
        posicao: rascunhoPosicao,
        atualizado_em: new Date().toISOString(),
      })
    } else {
      await supabase.from('campo_comentarios').delete().eq('campo', campoAtivo)
    }
    setSalvando(false)
    carregar()
  }

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <MessageSquare size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Troque o título exibido do campo e/ou escreva um comentário de apoio — ambos aparecem no
          cadastro do candidato (formulário público e "Adicionar candidato"). O comentário aceita
          negrito, itálico, listas, links e imagens.
        </p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-5">
        <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-h-[560px] overflow-y-auto">
          {listaCampos.map(([campo, label]) => (
            <button
              key={campo}
              onClick={() => setCampoAtivo(campo)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                campoAtivo === campo ? 'bg-navy-50 dark:bg-navy-800 text-navy-900 dark:text-white font-medium' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50/60 dark:hover:bg-navy-800/60'
              }`}
            >
              <span className="truncate">{titulos[campo] || label}</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                {titulos[campo] && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Título customizado" />}
                {comentarios[campo] && <span className="h-1.5 w-1.5 rounded-full bg-navy-700 dark:bg-navy-300" title="Tem comentário" />}
              </span>
            </button>
          ))}
        </div>

        <div className="card p-5">
          {loading ? (
            <p className="text-sm text-navy-400">Carregando…</p>
          ) : (
            <>
              <div className="mb-4">
                <label className="field-label">Título do campo</label>
                <input
                  className="field-input"
                  placeholder={listaCampos.find(([c]) => c === campoAtivo)?.[1]}
                  value={rascunhoTitulo}
                  onChange={(e) => setRascunhoTitulo(e.target.value)}
                />
                <p className="text-xs text-navy-400 mt-1">Deixe em branco para usar o título padrão.</p>
              </div>
              <div className="mb-1">
                <label className="field-label">Comentário de apoio</label>
                <EditorRico value={rascunho} onChange={setRascunho} placeholder="Sem comentário para este campo…" />
              </div>
              <div className="mb-1 mt-4">
                <p className="field-label mb-2">Onde o comentário aparece</p>
                <div className="flex gap-2">
                  {[
                    ['antes', 'Antes do campo'],
                    ['depois', 'Depois do campo'],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRascunhoPosicao(v)}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        rascunhoPosicao === v
                          ? 'border-navy-700 bg-navy-700 text-white'
                          : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={salvar} disabled={salvando} className="btn-primary">
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function AbaMetas() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [novoMes, setNovoMes] = useState(new Date().toISOString().slice(0, 7))
  const [novaMeta, setNovaMeta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('metas').select('*').order('mes', { ascending: false })
    if (!error) setMetas(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function rotuloMes(mesISO) {
    const [ano, mes] = mesISO.split('-')
    return `${MESES_LABEL[Number(mes) - 1]} de ${ano}`
  }

  function iniciarEdicao(m) {
    setEditandoId(m.id)
    setNovoMes(m.mes.slice(0, 7))
    setNovaMeta(String(m.meta_contratacoes))
    setErro('')
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setNovoMes(new Date().toISOString().slice(0, 7))
    setNovaMeta('')
    setErro('')
  }

  async function salvar(e) {
    e.preventDefault()
    if (!novaMeta || Number(novaMeta) <= 0) return
    setErro('')
    setSalvando(true)
    const { error } = await supabase
      .from('metas')
      .upsert({ mes: `${novoMes}-01`, meta_contratacoes: Number(novaMeta) }, { onConflict: 'mes' })
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    cancelarEdicao()
    carregar()
  }

  async function excluir(m) {
    if (!confirm(`Excluir a meta de ${rotuloMes(m.mes)}?`)) return
    const { error } = await supabase.from('metas').delete().eq('id', m.id)
    if (error) {
      setErro(error.message)
      return
    }
    if (editandoId === m.id) cancelarEdicao()
    carregar()
  }

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <Flag size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>Defina quantas contratações (Entrega Realizada) são a meta de cada mês — o dashboard mostra o progresso automaticamente.</p>
      </div>

      <form onSubmit={salvar} className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="field-label">Mês</label>
          <input
            type="month"
            className="field-input"
            value={novoMes}
            onChange={(e) => setNovoMes(e.target.value)}
            disabled={editandoId !== null}
          />
        </div>
        <div>
          <label className="field-label">Meta de contratações</label>
          <input
            type="number"
            min="1"
            className="field-input w-32"
            value={novaMeta}
            onChange={(e) => setNovaMeta(e.target.value)}
          />
        </div>
        <button type="submit" disabled={salvando} className="btn-primary">
          {salvando ? 'Salvando…' : editandoId ? 'Salvar alteração' : 'Salvar meta'}
        </button>
        {editandoId && (
          <button type="button" onClick={cancelarEdicao} className="btn-secondary">
            Cancelar
          </button>
        )}
      </form>

      {erro && <p className="text-sm text-clay-600 mb-4">{erro}</p>}

      <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-w-md">
        {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
        {!loading && metas.length === 0 && <p className="p-4 text-sm text-navy-400">Nenhuma meta cadastrada ainda.</p>}
        {!loading &&
          metas.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-navy-800 dark:text-navy-100">{rotuloMes(m.mes)}</span>
              <div className="flex items-center gap-3">
                <span className="text-navy-500 dark:text-navy-400">{m.meta_contratacoes} contratações</span>
                <button onClick={() => iniciarEdicao(m)} className="text-navy-400 hover:text-navy-700 dark:hover:text-white" title="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => excluir(m)} className="text-navy-400 hover:text-clay-600" title="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function AbaFormulario() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('config_formulario').select('*').eq('id', 1).maybeSingle()
    setConfig(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function enviarImagem(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem.')
      return
    }
    setErro('')
    setEnviando(true)
    const nomeArquivo = `capa-${Date.now()}.${arquivo.name.split('.').pop()}`
    const { error: erroUpload } = await supabase.storage.from('formulario').upload(nomeArquivo, arquivo, { upsert: true })
    if (erroUpload) {
      setEnviando(false)
      setErro(`Não foi possível enviar a imagem: ${erroUpload.message}`)
      return
    }
    const { data: urlData } = supabase.storage.from('formulario').getPublicUrl(nomeArquivo)
    const { error: erroSalvar } = await supabase
      .from('config_formulario')
      .upsert({ id: 1, capa_url: urlData.publicUrl, atualizado_em: new Date().toISOString() })
    setEnviando(false)
    if (inputRef.current) inputRef.current.value = ''
    if (erroSalvar) {
      setErro(erroSalvar.message)
      return
    }
    carregar()
  }

  async function remover() {
    if (!confirm('Remover a imagem de capa do formulário?')) return
    const { error } = await supabase.from('config_formulario').upsert({ id: 1, capa_url: null, atualizado_em: new Date().toISOString() })
    if (!error) carregar()
  }

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <ImageIcon size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Essa imagem aparece no topo do formulário público de cadastro do candidato, como uma capa
          (estilo Google Forms/Microsoft Forms). Use uma imagem larga (ex.: 1600×400) para melhor resultado.
        </p>
      </div>

      <div className="card p-5 max-w-xl">
        {loading ? (
          <p className="text-sm text-navy-400">Carregando…</p>
        ) : config?.capa_url ? (
          <div>
            <img src={config.capa_url} alt="Capa do formulário" className="w-full h-40 object-cover rounded-md border border-navy-100 dark:border-navy-800 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => inputRef.current?.click()} disabled={enviando} className="btn-secondary">
                {enviando ? 'Enviando…' : 'Trocar imagem'}
              </button>
              <button onClick={remover} className="btn-secondary text-clay-600 border-clay-500/30 hover:bg-clay-500/5">
                Remover
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} disabled={enviando} className="btn-primary">
            {enviando ? 'Enviando…' : 'Enviar imagem de capa'}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={enviarImagem} className="hidden" />
        {erro && <p className="text-sm text-clay-600 mt-3">{erro}</p>}
      </div>
    </div>
  )
}

export default function Admin() {
  const [aba, setAba] = useState('candidatos')

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-navy-700 flex items-center justify-center">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Administração</h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm">CRUD completo da base e controle de acessos.</p>
          </div>
        </header>

        <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1 mb-6 w-fit flex-wrap">
          <TabButton active={aba === 'candidatos'} onClick={() => setAba('candidatos')}>
            Candidatos
          </TabButton>
          <TabButton active={aba === 'acessos'} onClick={() => setAba('acessos')}>
            Acessos e permissões
          </TabButton>
          <TabButton active={aba === 'listas'} onClick={() => setAba('listas')}>
            Listas
          </TabButton>
          <TabButton active={aba === 'comentarios'} onClick={() => setAba('comentarios')}>
            Comentários
          </TabButton>
          <TabButton active={aba === 'log'} onClick={() => setAba('log')}>
            Log de alterações
          </TabButton>
          <TabButton active={aba === 'metas'} onClick={() => setAba('metas')}>
            Metas
          </TabButton>
          <TabButton active={aba === 'campos'} onClick={() => setAba('campos')}>
            Campos do formulário
          </TabButton>
          <TabButton active={aba === 'regra'} onClick={() => setAba('regra')}>
            Regra do teste
          </TabButton>
          <TabButton active={aba === 'formulario'} onClick={() => setAba('formulario')}>
            Capa do formulário
          </TabButton>
        </div>

        {aba === 'candidatos' && <AbaCandidatos />}
        {aba === 'acessos' && <AbaAcessos />}
        {aba === 'listas' && <AbaListas />}
        {aba === 'comentarios' && <AbaComentarios />}
        {aba === 'log' && <AbaLog />}
        {aba === 'metas' && <AbaMetas />}
        {aba === 'formulario' && <AbaFormulario />}
        {aba === 'campos' && <AbaCamposFormulario />}
        {aba === 'regra' && <AbaRegraTeste />}
      </div>
    </Layout>
  )
}
