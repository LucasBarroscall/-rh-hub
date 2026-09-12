import { useEffect, useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { formatarData, etapaFunil, corEtapa } from '../lib/candidato'
import EditarOpcaoModal from '../components/EditarOpcaoModal'
import EditorRico from '../components/EditorRico'
import EditorCandidato from '../components/EditorCandidato'
import { ShieldCheck, Search, Trash2, Save, Users2, X, UserPlus, ListChecks, MessageSquare, ChevronUp, ChevronDown, Download, Upload, Printer, Pencil, Flag, FileDown } from 'lucide-react'
import { normalizarTexto } from '../lib/formatters'

// Colunas geradas pelo banco — nunca podem ser enviadas em insert/update.
const COLUNAS_GERADAS = ['idade', 'aprovado_teste', 'updated_at', 'created_at']

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

function AbaCandidatos() {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [importando, setImportando] = useState(false)
  const [resultadoImportacao, setResultadoImportacao] = useState(null)
  const [selecionados, setSelecionados] = useState(new Set())
  const inputArquivoRef = useRef(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('candidatos').select('*').order('created_at', { ascending: false })
    if (!error) setDados(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const buscaLimpa = busca.toLowerCase().trim()
  const buscaDigitos = busca.replace(/\D/g, '')
  const filtrados = dados.filter((c) => {
    if (!buscaLimpa) return true
    const nomeBate = c.nome_completo?.toLowerCase().includes(buscaLimpa)
    const cpfBate = buscaDigitos.length >= 3 && c.cpf?.replace(/\D/g, '').includes(buscaDigitos)
    return nomeBate || cpfBate
  })

  function alternarSelecao(id) {
    setSelecionados((s) => {
      const novo = new Set(s)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function alternarSelecionarTodos() {
    if (selecionados.size === filtrados.length) setSelecionados(new Set())
    else setSelecionados(new Set(filtrados.map((c) => c.id)))
  }

  async function excluirSelecionados() {
    if (!confirm(`Excluir definitivamente ${selecionados.size} candidato(s) selecionado(s)? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('candidatos').delete().in('id', [...selecionados])
    if (!error) {
      setSelecionados(new Set())
      carregar()
    }
  }

  function exportarCSV() {
    const linhas = dados.map((c) => {
      const copia = { ...c }
      COLUNAS_GERADAS.forEach((col) => delete copia[col])
      return copia
    })
    const csv = Papa.unparse(linhas)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function baixarModelo() {
    const linhaExemplo = {
      fonte: 'Indicação',
      rede_social: '',
      nome_indicador: 'MARIA SILVA',
      nome_completo: 'JOAO DA SILVA SANTOS',
      telefone: '(11) 9 8888-7777',
      rg: '123456789',
      cpf: '12345678900',
      data_nascimento: '1995-05-20',
      sexo: 'Masculino',
      nome_mae: 'ANA SILVA SANTOS',
      logradouro: 'RUA DAS FLORES',
      numero: '123',
      complemento: 'APTO 45',
      bairro: 'CENTRO',
      cidade: 'ARACAJU',
      estado: 'SE',
      cep: '49000000',
      endereco: 'RUA DAS FLORES, 123 - APTO 45',
      email: 'joao.silva@exemplo.com',
      disponibilidade_horario_trabalho: 'Manhã | Tarde',
      disponibilidade_horario_treinamento: 'Manhã/Tarde',
      disponibilidade_jornada: 'Período integral',
      possui_veiculo: 'true',
      concorda_turno_treinamento: 'true',
      possui_ensino_superior: 'false',
      observacoes: '',
    }
    const csv = Papa.unparse([linhaExemplo])
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao_candidatos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Campos que seguem o padrão "MAIÚSCULA + sem acento/pontuação" do sistema
  const CAMPOS_NORMALIZAR_COMPLETO = ['nome_completo', 'nome_mae', 'nome_indicador', 'logradouro', 'bairro', 'cidade']
  // Campos que só ficam em maiúsculas, mantendo acentuação/pontuação (texto livre)
  const CAMPOS_NORMALIZAR_LEVE = ['observacoes', 'compliance', 'alerta_comportamental', 'complemento']

  function importarCSV(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setImportando(true)
    setResultadoImportacao(null)
    Papa.parse(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: async (resultado) => {
        const linhas = resultado.data.map((linha) => {
          const copia = { ...linha }
          COLUNAS_GERADAS.forEach((col) => delete copia[col])
          if ('id' in copia && !copia.id) delete copia.id
          // Campos vazios viram null em vez de string vazia; texto é
          // normalizado pro mesmo padrão usado no cadastro pelo site.
          Object.keys(copia).forEach((k) => {
            if (copia[k] === '') {
              copia[k] = null
              return
            }
            if (typeof copia[k] !== 'string') return
            if (CAMPOS_NORMALIZAR_COMPLETO.includes(k)) copia[k] = normalizarTexto(copia[k])
            else if (CAMPOS_NORMALIZAR_LEVE.includes(k)) copia[k] = copia[k].toUpperCase()
          })
          return copia
        })
        const { error, count } = await supabase.from('candidatos').insert(linhas, { count: 'exact' })
        setImportando(false)
        if (inputArquivoRef.current) inputArquivoRef.current.value = ''
        if (error) {
          setResultadoImportacao({ ok: false, mensagem: error.message })
        } else {
          setResultadoImportacao({ ok: true, mensagem: `${count ?? linhas.length} candidato(s) importado(s) com sucesso.` })
          carregar()
        }
      },
      error: (err) => {
        setImportando(false)
        setResultadoImportacao({ ok: false, mensagem: err.message })
      },
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            className="field-input pl-9"
            placeholder="Buscar por nome ou CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {selecionados.size > 0 && (
            <button onClick={excluirSelecionados} className="btn-secondary text-clay-600 border-clay-500/30 hover:bg-clay-500/5 flex items-center gap-1.5">
              <Trash2 size={15} /> Excluir {selecionados.size} selecionado(s)
            </button>
          )}
          <button onClick={baixarModelo} className="btn-secondary flex items-center gap-1.5">
            <FileDown size={15} /> Baixar modelo
          </button>
          <button onClick={exportarCSV} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Exportar CSV
          </button>
          <button
            onClick={() => inputArquivoRef.current?.click()}
            disabled={importando}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Upload size={15} /> {importando ? 'Importando…' : 'Importar CSV'}
          </button>
          <input ref={inputArquivoRef} type="file" accept=".csv" onChange={importarCSV} className="hidden" />
        </div>
      </div>

      {resultadoImportacao && (
        <p className={`text-sm mb-4 ${resultadoImportacao.ok ? 'text-sage-600' : 'text-clay-600'}`}>
          {resultadoImportacao.mensagem}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 dark:border-navy-800 text-left text-navy-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={filtrados.length > 0 && selecionados.size === filtrados.length}
                  onChange={alternarSelecionarTodos}
                  className="rounded border-navy-200"
                />
              </th>
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
                <td colSpan={6} className="px-4 py-6 text-center text-navy-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading &&
              filtrados.map((c) => {
                const etapa = etapaFunil(c)
                return (
                  <tr key={c.id} className="border-b border-navy-50 dark:border-navy-800/60 last:border-0 hover:bg-navy-50/50 dark:hover:bg-navy-800/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selecionados.has(c.id)}
                        onChange={() => alternarSelecao(c.id)}
                        className="rounded border-navy-200"
                      />
                    </td>
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
                <td colSpan={6} className="px-4 py-6 text-center text-navy-400">
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
          podeExcluir
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
    ['endereco', 'Endereço'],
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

  const [comentarios, setComentarios] = useState({})
  const [titulos, setTitulos] = useState({})
  const [loading, setLoading] = useState(true)
  const [campoAtivo, setCampoAtivo] = useState(CAMPOS_COMENTAVEIS[0][0])
  const [rascunho, setRascunho] = useState('')
  const [rascunhoTitulo, setRascunhoTitulo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('campo_comentarios').select('*')
    if (!error) {
      const mapa = {}
      const mapaTitulos = {}
      data.forEach((c) => {
        mapa[c.campo] = c.comentario
        if (c.titulo) mapaTitulos[c.campo] = c.titulo
      })
      setComentarios(mapa)
      setTitulos(mapaTitulos)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    setRascunho(comentarios[campoAtivo] || '')
    setRascunhoTitulo(titulos[campoAtivo] || '')
  }, [campoAtivo, comentarios, titulos])

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
          {CAMPOS_COMENTAVEIS.map(([campo, label]) => (
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
                  placeholder={CAMPOS_COMENTAVEIS.find(([c]) => c === campoAtivo)?.[1]}
                  value={rascunhoTitulo}
                  onChange={(e) => setRascunhoTitulo(e.target.value)}
                />
                <p className="text-xs text-navy-400 mt-1">Deixe em branco para usar o título padrão.</p>
              </div>
              <div className="mb-1">
                <label className="field-label">Comentário de apoio</label>
                <EditorRico value={rascunho} onChange={setRascunho} placeholder="Sem comentário para este campo…" />
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

const ROTULO_ACAO = { INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão' }
const ROTULO_TABELA = { candidatos: 'Candidato', profiles: 'Acesso', opcoes_lista: 'Lista de opções' }

function AbaLog() {
  const [linhas, setLinhas] = useState([])
  const [perfis, setPerfis] = useState({})
  const [loading, setLoading] = useState(true)
  const [filtroTabela, setFiltroTabela] = useState('')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const [{ data: logData }, { data: perfilData }] = await Promise.all([
        supabase.from('log_alteracoes').select('*').order('criado_em', { ascending: false }).limit(300),
        supabase.from('profiles').select('id, nome'),
      ])
      const mapaPerfis = {}
      ;(perfilData || []).forEach((p) => (mapaPerfis[p.id] = p.nome))
      setPerfis(mapaPerfis)
      setLinhas(logData || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const filtradas = filtroTabela ? linhas.filter((l) => l.tabela === filtroTabela) : linhas

  function nomeDoRegistro(l) {
    const dados = l.dados_depois || l.dados_antes
    return dados?.nome_completo || dados?.nome || dados?.valor || l.registro_id?.slice(0, 8)
  }

  function exportarCSV() {
    const linhasCsv = filtradas.map((l) => ({
      quando: new Date(l.criado_em).toLocaleString('pt-BR'),
      quem: perfis[l.usuario_id] || 'Sistema',
      acao: ROTULO_ACAO[l.acao],
      tabela: ROTULO_TABELA[l.tabela] || l.tabela,
      registro: nomeDoRegistro(l),
      dados_antes: l.dados_antes ? JSON.stringify(l.dados_antes) : '',
      dados_depois: l.dados_depois ? JSON.stringify(l.dados_depois) : '',
    }))
    const csv = Papa.unparse(linhasCsv)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `log_alteracoes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1 w-fit">
          {[
            ['', 'Tudo'],
            ['candidatos', 'Candidatos'],
            ['profiles', 'Acessos'],
            ['opcoes_lista', 'Listas'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFiltroTabela(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtroTabela === v ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={exportarCSV} className="btn-secondary flex items-center gap-1.5">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 dark:border-navy-800 text-left text-navy-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Quem</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Registro</th>
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
              filtradas.map((l) => (
                <tr key={l.id} className="border-b border-navy-50 dark:border-navy-800/60 last:border-0">
                  <td className="px-4 py-3 text-navy-500 dark:text-navy-400 whitespace-nowrap">
                    {new Date(l.criado_em).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-navy-700 dark:text-navy-200">{perfis[l.usuario_id] || 'Sistema'}</td>
                  <td className="px-4 py-3">
                    <span className="pill bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-200">
                      {ROTULO_ACAO[l.acao]} · {ROTULO_TABELA[l.tabela] || l.tabela}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy-600 dark:text-navy-300">{nomeDoRegistro(l)}</td>
                </tr>
              ))}
            {!loading && filtradas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-navy-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function AbaMetas() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
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
    setNovaMeta('')
    carregar()
  }

  function rotuloMes(mesISO) {
    const [ano, mes] = mesISO.split('-')
    return `${MESES_LABEL[Number(mes) - 1]} de ${ano}`
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
          <input type="month" className="field-input" value={novoMes} onChange={(e) => setNovoMes(e.target.value)} />
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
          {salvando ? 'Salvando…' : 'Salvar meta'}
        </button>
      </form>

      {erro && <p className="text-sm text-clay-600 mb-4">{erro}</p>}

      <div className="card divide-y divide-navy-100 dark:divide-navy-800 max-w-md">
        {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
        {!loading && metas.length === 0 && <p className="p-4 text-sm text-navy-400">Nenhuma meta cadastrada ainda.</p>}
        {!loading &&
          metas.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-navy-800 dark:text-navy-100">{rotuloMes(m.mes)}</span>
              <span className="text-navy-500 dark:text-navy-400">{m.meta_contratacoes} contratações</span>
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
        </div>

        {aba === 'candidatos' && <AbaCandidatos />}
        {aba === 'acessos' && <AbaAcessos />}
        {aba === 'listas' && <AbaListas />}
        {aba === 'comentarios' && <AbaComentarios />}
        {aba === 'log' && <AbaLog />}
        {aba === 'metas' && <AbaMetas />}
      </div>
    </Layout>
  )
}
