import { useEffect, useMemo, useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Search, Download, ChevronLeft, ChevronRight, Database } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { buscarTodos } from '../lib/buscarTodos'
import { useAuth } from '../contexts/AuthContext'
import { useOpcoes } from '../lib/useOpcoes'
import { useCamposFormulario } from '../lib/useCamposFormulario'
import { formatarData, etapaFunil, corEtapa, simNaoOuVazio } from '../lib/candidato'
import { resumoDocumentos } from '../lib/documentos'
import Layout from '../components/Layout'
import EditorCandidato from '../components/EditorCandidato'
import ChipResultado from '../components/ChipResultado'
import FiltroResultado from '../components/FiltroResultado'
import { opcoesResultado } from '../lib/resultados'
import { useRegrasTeste } from '../lib/regrasTeste'

const PALETA = ['#2f4c73', '#30cff2', '#D4D943', '#a64170', '#5C8A6E', '#2a438c', '#C1594B', '#7c93b8']
function corDe(texto) {
  let h = 0
  for (let i = 0; i < String(texto).length; i++) h = (h * 31 + String(texto).charCodeAt(i)) >>> 0
  return PALETA[h % PALETA.length]
}

function Chip({ children, cor }) {
  if (!children) return <span className="text-navy-300">—</span>
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap" style={{ backgroundColor: `${cor}22`, color: cor, border: `1px solid ${cor}55` }}>
      {children}
    </span>
  )
}

const LINHAS_POR_PAGINA = 25

export default function BancoTalentos() {
  const { profile } = useAuth()
  const { opcoes } = useOpcoes()
  const { customizados } = useCamposFormulario()
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [filtroResultado, setFiltroResultado] = useState('')
  const { regras } = useRegrasTeste()
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState(null)
  const listaDocs = opcoes.documento || []

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await buscarTodos(supabase.from('candidatos').select('*').order('created_at', { ascending: false }).order('id'))
    setDados(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const etapas = useMemo(() => [...new Set(dados.map((c) => etapaFunil(c)))].sort(), [dados])

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    const digitos = busca.replace(/\D/g, '')
    return dados.filter((c) => {
      if (filtroProduto && c.produto !== filtroProduto) return false
      if (filtroEtapa && etapaFunil(c) !== filtroEtapa) return false
      if (filtroResultado && (c.resultado_final || 'Pendente') !== filtroResultado) return false
      if (!termo) return true
      return (
        c.nome_completo?.toLowerCase().includes(termo) ||
        c.cidade?.toLowerCase().includes(termo) ||
        c.bairro?.toLowerCase().includes(termo) ||
        (digitos.length >= 3 && c.cpf?.replace(/\D/g, '').includes(digitos))
      )
    })
  }, [dados, busca, filtroProduto, filtroEtapa, filtroResultado])

  useEffect(() => {
    setPagina(0)
  }, [busca, filtroProduto, filtroEtapa, filtroResultado])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / LINHAS_POR_PAGINA))
  const visiveis = filtrados.slice(pagina * LINHAS_POR_PAGINA, (pagina + 1) * LINHAS_POR_PAGINA)

  function exportar() {
    const linhas = filtrados.map((c) => {
      // eslint-disable-next-line no-unused-vars
      const { idade, updated_at, cpf_digitos, documentos, respostas_extras, ...resto } = c
      return { ...resto, ...Object.fromEntries(listaDocs.map((n) => [n, documentos && documentos[n] === 'enviado' ? 'Enviado' : documentos && documentos[n] === 'na' ? 'Não se aplica' : ''])), ...Object.fromEntries(customizados.map((cf) => [cf.rotulo, (respostas_extras || {})[cf.chave] ?? ''])) }
    })
    const blob = new Blob(['\uFEFF' + Papa.unparse(linhas)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `banco_de_talentos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const colunas = [
    ['Contato', (c) => (
      <div className="text-xs leading-tight">
        <div>{c.telefone}</div>
        <div className="text-navy-400">{c.email}</div>
      </div>
    )],
    ['CPF', (c) => c.cpf],
    ['Idade / Sexo', (c) => `${c.idade ?? '—'} · ${c.sexo ?? '—'}`],
    ['Cidade / Bairro', (c) => (
      <div className="text-xs leading-tight">
        <div>{c.cidade}</div>
        <div className="text-navy-400">{c.bairro}</div>
      </div>
    )],
    ['Fonte', (c) => <Chip cor={corDe(c.fonte)}>{c.fonte}</Chip>],
    ['Status', (c) => <span className={`pill ${corEtapa(etapaFunil(c))}`}>{etapaFunil(c)}</span>],
    ['Produto', (c) => <Chip cor={corDe(c.produto)}>{c.produto}</Chip>],
    ['Entrevista', (c) => (c.compareceu_entrevista === false ? <Chip cor="#7c93b8">Faltou</Chip> : c.aprovado_entrevista == null ? <span className="text-navy-300">—</span> : <Chip cor={c.aprovado_entrevista ? '#5C8A6E' : '#C1594B'}>{c.aprovado_entrevista ? 'Aprovado' : 'Reprovado'}</Chip>)],
    ['Teste', (c) => (c.teste_realizado ? (
      <div className="text-xs leading-tight">
        <Chip cor={c.aprovado_teste ? '#5C8A6E' : '#C1594B'}>{c.resultado_teste || (c.aprovado_teste ? 'Aprovado' : 'Reprovado')}</Chip>
        <div className="text-navy-400 mt-0.5">
          {c.wpm} WPM · {c.precisao}%
        </div>
      </div>
    ) : <span className="text-navy-300">—</span>)],
    ['Resultado final', (c) => <ChipResultado resultado={c.resultado_final} />],
    ['Compliance', (c) => <Chip cor={c.compliance === 'Aprovado' ? '#5C8A6E' : c.compliance === 'Reprovado' ? '#C1594B' : '#D4A017'}>{c.compliance}</Chip>],
    ['Documentos', (c) => {
      const r = resumoDocumentos(c, listaDocs)
      return r.pct == null ? <span className="text-navy-300">—</span> : (
        <div className="w-24">
          <div className="h-1.5 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden">
            <div className="h-full" style={{ width: `${r.pct}%`, backgroundColor: r.pct === 100 ? '#5C8A6E' : '#D4A017' }} />
          </div>
          <span className="text-[11px] text-navy-500">{r.pct}%</span>
        </div>
      )
    }],
    ['Exame', (c) => (c.aprovado_exame == null ? <span className="text-navy-300">{c.data_exame ? formatarData(c.data_exame) : '—'}</span> : <Chip cor={c.aprovado_exame ? '#5C8A6E' : '#C1594B'}>{c.aprovado_exame ? 'Aprovado' : 'Reprovado'}</Chip>)],
    ['Onboarding', (c) => (c.compareceu_onboarding ? <Chip cor="#5C8A6E">Sim</Chip> : <span className="text-navy-300">—</span>)],
    ['Treinamento', (c) => (c.compareceu_treinamento ? <Chip cor="#5C8A6E">Sim</Chip> : <span className="text-navy-300">—</span>)],
    ['Alô', (c) => (c.compareceu_alo ? <Chip cor="#5C8A6E">Realizado</Chip> : <span className="text-navy-300">—</span>)],
    ['Trabalho', (c) => <span className="text-xs">{c.disponibilidade_horario_trabalho}</span>],
    ['Treinamento (turno)', (c) => c.disponibilidade_horario_treinamento],
    ['Escala', (c) => c.disponibilidade_jornada],
    ['Veículo', (c) => simNaoOuVazio(c.possui_veiculo)],
    ['Superior', (c) => simNaoOuVazio(c.possui_ensino_superior)],
    ...customizados.map((cf) => [cf.rotulo, (c) => String((c.respostas_extras || {})[cf.chave] ?? '—')]),
    ['Cadastro', (c) => formatarData(c.created_at)],
  ]

  return (
    <Layout>
      <div className="p-6 lg:p-10">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white flex items-center gap-2">
              <Database size={22} className="text-navy-400" /> Banco de talentos
            </h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">
              Todos os candidatos, um por linha. {filtrados.length.toLocaleString('pt-BR')} de {dados.length.toLocaleString('pt-BR')}. Clique na linha para editar.
            </p>
          </div>
          <button onClick={exportar} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Exportar CSV
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input className="field-input pl-9 py-1.5 text-sm" placeholder="Nome, CPF, cidade ou bairro…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <select className="field-select py-1.5 text-sm w-auto" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)}>
            <option value="">Todos os produtos</option>
            {(opcoes.produto || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="field-select py-1.5 text-sm w-auto" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)}>
            <option value="">Todos os status</option>
            {etapas.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <FiltroResultado valor={filtroResultado} onChange={setFiltroResultado} opcoes={opcoesResultado(dados, regras)} className="text-sm" />
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-navy-500 dark:text-navy-300 bg-navy-50 dark:bg-navy-800">
                <th className="px-4 py-3 sticky left-0 z-10 bg-navy-50 dark:bg-navy-800 min-w-[220px]">Candidato</th>
                {colunas.map(([titulo]) => (
                  <th key={titulo} className="px-3 py-3 whitespace-nowrap font-semibold">
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={colunas.length + 1} className="px-4 py-6 text-navy-400">Carregando…</td>
                </tr>
              )}
              {!loading && visiveis.length === 0 && (
                <tr>
                  <td colSpan={colunas.length + 1} className="px-4 py-6 text-navy-400">Nenhum candidato encontrado.</td>
                </tr>
              )}
              {!loading &&
                visiveis.map((c, i) => {
                  const fundo = i % 2 === 0 ? 'bg-white dark:bg-navy-900' : 'bg-navy-50/50 dark:bg-navy-900/60'
                  return (
                    <tr key={c.id} onClick={() => setEditando(c)} className="cursor-pointer hover:brightness-95">
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${fundo} border-b border-navy-100 dark:border-navy-800 font-medium text-navy-900 dark:text-white`}
                        style={{ borderLeft: `4px solid ${corDe(c.id)}` }}
                      >
                        {c.nome_completo}
                      </td>
                      {colunas.map(([titulo, render]) => (
                        <td key={titulo} className={`px-3 py-2.5 border-b border-navy-100 dark:border-navy-800 text-navy-700 dark:text-navy-200 whitespace-nowrap ${fundo}`}>
                          {render(c)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 text-sm text-navy-500 dark:text-navy-400">
          <button disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="btn-secondary py-1 px-2 disabled:opacity-40">
            <ChevronLeft size={15} />
          </button>
          <span>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)} className="btn-secondary py-1 px-2 disabled:opacity-40">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {editando && (
        <EditorCandidato
          candidato={editando}
          podeExcluir={profile?.role === 'analista'}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            carregar()
          }}
        />
      )}
    </Layout>
  )
}
