import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { formatarData, etapaFunil, corEtapa } from '../lib/candidato'
import { ShieldCheck, Search, Trash2, Save, Users2, X } from 'lucide-react'

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
        active ? 'bg-navy-800 text-white' : 'text-navy-600 hover:bg-navy-50'
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
          <h2 className="text-lg font-semibold text-navy-900">Editar candidato</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700">
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

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-navy-100">
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
            <tr className="border-b border-navy-100 text-left text-navy-400 text-xs uppercase tracking-wide">
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
                  <tr key={c.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50">
                    <td className="px-4 py-3 font-medium text-navy-900">{c.nome_completo}</td>
                    <td className="px-4 py-3 text-navy-500">{formatarData(c.data_entrevista)}</td>
                    <td className="px-4 py-3 text-navy-500">{c.fonte}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${corEtapa(etapa)}`}>{etapa}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditando(c)} className="text-navy-500 hover:text-navy-900 text-xs font-medium">
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

function AbaAcessos() {
  const [perfis, setPerfis] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      <div className="card p-4 mb-5 flex items-start gap-2.5 text-sm text-navy-600">
        <Users2 size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Para criar um novo usuário, cadastre-o em <strong>Authentication → Users</strong> no painel do
          Supabase e depois adicione uma linha aqui com o mesmo ID informando o papel de acesso — veja o
          README do projeto para o passo a passo completo.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 text-left text-navy-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-navy-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading &&
              perfis.map((p) => (
                <tr key={p.id} className="border-b border-navy-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{p.nome}</td>
                  <td className="px-4 py-3 text-navy-500">{p.email}</td>
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
                </tr>
              ))}
          </tbody>
        </table>
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
          <div className="h-10 w-10 rounded-lg bg-navy-800 flex items-center justify-center">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-navy-900">Administração</h1>
            <p className="text-navy-500 text-sm">CRUD completo da base e controle de acessos.</p>
          </div>
        </header>

        <div className="flex gap-1 bg-white rounded-lg border border-navy-100 p-1 mb-6 w-fit">
          <TabButton active={aba === 'candidatos'} onClick={() => setAba('candidatos')}>
            Candidatos
          </TabButton>
          <TabButton active={aba === 'acessos'} onClick={() => setAba('acessos')}>
            Acessos e permissões
          </TabButton>
        </div>

        {aba === 'candidatos' ? <AbaCandidatos /> : <AbaAcessos />}
      </div>
    </Layout>
  )
}
