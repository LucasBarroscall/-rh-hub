import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import BoolToggle from '../components/BoolToggle'
import { formatarData, etapaFunil, corEtapa } from '../lib/candidato'
import { ShieldCheck, Search, Trash2, Save, Users2, X, UserPlus, ListChecks } from 'lucide-react'

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

function EditorCandidato({ candidato, onClose, onSaved }) {
  const [form, setForm] = useState(candidato)
  const [salvando, setSalvando] = useState(false)

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function salvar() {
    setSalvando(true)
    // remove campos calculados/gerados que não podem ser atualizados
    // eslint-disable-next-line no-unused-vars
    const { idade, aprovado_teste, updated_at, ...editavel } = form
    const { error } = await supabase.from('candidatos').update(editavel).eq('id', candidato.id)
    setSalvando(false)
    if (!error) onSaved()
  }

  async function excluir() {
    if (!confirm(`Excluir definitivamente o registro de ${candidato.nome_completo}?`)) return
    setSalvando(true)
    const { error } = await supabase.from('candidatos').delete().eq('id', candidato.id)
    setSalvando(false)
    if (!error) onSaved()
  }

  const campos = [
    ['fonte', 'Fonte'],
    ['nome_indicador', 'Nome de quem indicou'],
    ['nome_completo', 'Nome completo'],
    ['telefone', 'Telefone'],
    ['email', 'E-mail'],
    ['rg', 'RG'],
    ['cpf', 'CPF'],
    ['data_nascimento', 'Data de nascimento', 'date'],
    ['sexo', 'Sexo'],
    ['nome_mae', 'Nome da mãe'],
    ['endereco', 'Endereço'],
    ['bairro', 'Bairro'],
    ['cidade', 'Cidade'],
    ['cep', 'CEP'],
    ['data_entrevista', 'Data da entrevista', 'date'],
    ['compliance', 'Compliance'],
    ['data_exame', 'Data do exame', 'date'],
    ['wpm', 'WPM', 'number'],
    ['precisao', 'Precisão (%)', 'number'],
    ['observacoes', 'Observações'],
  ]

  return (
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Editar candidato</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {campos.map(([campo, label, tipo]) => (
            <div key={campo}>
              <label className="field-label">{label}</label>
              <input
                type={tipo || 'text'}
                className="field-input"
                value={form[campo] ?? ''}
                onChange={(e) => set(campo, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
          <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide mb-4">
            Status do funil — aprovar/reprovar em qualquer etapa
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <BoolToggle
              label="Compareceu na entrevista?"
              value={form.compareceu_entrevista}
              onChange={(v) => set('compareceu_entrevista', v)}
              disabled={salvando}
            />
            <BoolToggle
              label="Aprovado na entrevista?"
              value={form.aprovado_entrevista}
              onChange={(v) => set('aprovado_entrevista', v)}
              disabled={salvando}
              semantic
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <BoolToggle
              label="Realizou o teste de digitação?"
              value={form.teste_realizado}
              onChange={(v) => set('teste_realizado', v)}
              disabled={salvando}
            />
            <div>
              <label className="field-label">Alerta de comportamento</label>
              <input
                className="field-input"
                value={form.alerta_comportamental ?? ''}
                onChange={(e) => set('alerta_comportamental', e.target.value)}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4 mb-4">
            {[
              ['compareceu_exame', 'Compareceu no exame?'],
              ['aprovado_exame', 'Aprovado no exame?'],
              ['enviou_documentacao', 'Enviou documentação?'],
              ['aprovado_documentacao', 'Aprovado na documentação?'],
              ['compareceu_onboarding', 'Compareceu no onboarding?'],
              ['compareceu_treinamento', 'Compareceu no treinamento?'],
            ].map(([campo, label]) => (
              <BoolToggle
                key={campo}
                label={label}
                value={form[campo]}
                onChange={(v) => set(campo, v)}
                disabled={salvando}
              />
            ))}
          </div>
          <div>
            <p className="field-label mb-2">Decisão final</p>
            <div className="grid grid-cols-3 gap-3">
              {['Aprovado', 'Reprovado', 'Pendente'].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={salvando}
                  onClick={() => set('decisao_final', v === 'Pendente' ? null : v)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    (form.decisao_final ?? 'Pendente') === v
                      ? v === 'Aprovado'
                        ? 'border-sage-500 bg-sage-500 text-white'
                        : v === 'Reprovado'
                          ? 'border-clay-500 bg-clay-500 text-white'
                          : 'border-navy-700 bg-navy-700 text-white'
                      : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
          <button onClick={excluir} disabled={salvando} className="flex items-center gap-1.5 text-sm text-clay-600 hover:text-clay-700">
            <Trash2 size={15} /> Excluir registro
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando} className="btn-primary flex items-center gap-1.5">
              <Save size={15} /> {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AbaCandidatos() {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('candidatos').select('*').order('created_at', { ascending: false })
    if (!error) setDados(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = dados.filter((c) => c.nome_completo?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        <input
          className="field-input pl-9"
          placeholder="Buscar por nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 dark:border-navy-800 text-left text-navy-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Etapa</th>
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
              filtrados.map((c) => {
                const etapa = etapaFunil(c)
                return (
                  <tr key={c.id} className="border-b border-navy-50 dark:border-navy-800/60 last:border-0 hover:bg-navy-50/50 dark:hover:bg-navy-800/40">
                    <td className="px-4 py-3 font-medium text-navy-900 dark:text-white">{c.nome_completo}</td>
                    <td className="px-4 py-3 text-navy-500 dark:text-navy-400">{formatarData(c.data_entrevista)}</td>
                    <td className="px-4 py-3 text-navy-500 dark:text-navy-400">{c.fonte}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${corEtapa(etapa)}`}>{etapa}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditando(c)} className="text-navy-500 dark:text-navy-300 hover:text-navy-900 dark:hover:text-white text-xs font-medium">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-navy-400">
                  Nenhum candidato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <EditorCandidato
          candidato={editando}
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

const PERFIL_VAZIO = { id: '', nome: '', email: '', role: 'entrevistador1' }

function NovoAcessoModal({ onClose, onSaved }) {
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
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={salvar} className="card w-full max-w-md p-6">
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
  { chave: 'disponibilidade_horario_trabalho', label: 'Horário de trabalho' },
  { chave: 'disponibilidade_horario_treinamento', label: 'Horário de treinamento' },
  { chave: 'disponibilidade_jornada', label: 'Jornada de trabalho' },
]

function AbaListas() {
  const [campoAtivo, setCampoAtivo] = useState(CAMPOS_LISTA[0].chave)
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoValor, setNovoValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opcoes_lista')
      .select('*')
      .eq('campo', campoAtivo)
      .order('ordem', { ascending: true })
    if (!error) setItens(data)
    setLoading(false)
  }, [campoAtivo])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(e) {
    e.preventDefault()
    if (!novoValor.trim()) return
    setSalvando(true)
    const proximaOrdem = itens.length ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1
    const { error } = await supabase
      .from('opcoes_lista')
      .insert({ campo: campoAtivo, valor: novoValor.trim(), ordem: proximaOrdem })
    setSalvando(false)
    if (!error) {
      setNovoValor('')
      carregar()
    }
  }

  async function remover(item) {
    if (!confirm(`Remover a opção "${item.valor}"? Candidatos já cadastrados com esse valor não são afetados.`)) return
    const { error } = await supabase.from('opcoes_lista').delete().eq('id', item.id)
    if (!error) carregar()
  }

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <ListChecks size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Essas listas alimentam os menus do formulário de cadastro do candidato. Adicionar ou remover
          uma opção aqui muda o site na hora, sem precisar editar código.
        </p>
      </div>

      <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1 mb-5 w-fit flex-wrap">
        {CAMPOS_LISTA.map((c) => (
          <button
            key={c.chave}
            onClick={() => setCampoAtivo(c.chave)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              campoAtivo === c.chave ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <form onSubmit={adicionar} className="flex gap-2 mb-4 max-w-md">
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

      <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-w-md">
        {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
        {!loading && itens.length === 0 && <p className="p-4 text-sm text-navy-400">Nenhuma opção cadastrada.</p>}
        {!loading &&
          itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-navy-800 dark:text-navy-100">{item.valor}</span>
              <button onClick={() => remover(item)} className="text-navy-400 hover:text-clay-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
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

        <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1 mb-6 w-fit">
          <TabButton active={aba === 'candidatos'} onClick={() => setAba('candidatos')}>
            Candidatos
          </TabButton>
          <TabButton active={aba === 'acessos'} onClick={() => setAba('acessos')}>
            Acessos e permissões
          </TabButton>
          <TabButton active={aba === 'listas'} onClick={() => setAba('listas')}>
            Listas
          </TabButton>
        </div>

        {aba === 'candidatos' && <AbaCandidatos />}
        {aba === 'acessos' && <AbaAcessos />}
        {aba === 'listas' && <AbaListas />}
      </div>
    </Layout>
  )
}
