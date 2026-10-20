import { useEffect, useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { buscarTodos } from '../../lib/buscarTodos'

const ROTULO_ACAO = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu' }
const ROTULO_TABELA = {
  candidatos: 'Candidato',
  legendas_opcoes: 'Legenda de botão (horário)',
  profiles: 'Acesso (usuário)',
  opcoes_lista: 'Lista de opções',
  opcoes_sublista: 'Sub-lista',
  campo_comentarios: 'Título/comentário de campo',
  metas: 'Meta mensal',
  config_formulario: 'Capa do formulário',
  campos_formulario: 'Campo personalizado',
  config_campos: 'Visibilidade de campo padrão',
  regras_teste: 'Regra do teste de digitação',
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—'
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.length > 90 ? `${s.slice(0, 90)}…` : s
}

// Lista de campos alterados (antes → depois). Em criação mostra os valores
// preenchidos; em exclusão, os valores que existiam.
export function calcularAlteracoes(l) {
  const a = l.dados_antes || {}
  const b = l.dados_depois || {}
  if (l.acao === 'UPDATE') {
    const chaves = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    return chaves
      .filter((k) => k !== 'updated_at' && JSON.stringify(a[k]) !== JSON.stringify(b[k]))
      .map((k) => ({ campo: k, antes: a[k], depois: b[k] }))
  }
  const base = l.acao === 'INSERT' ? b : a
  return Object.entries(base)
    .filter(([k, v]) => v !== null && v !== '' && !['id', 'updated_at', 'created_at', 'criado_em'].includes(k) && !(typeof v === 'object' && Object.keys(v).length === 0))
    .map(([k, v]) => ({ campo: k, antes: l.acao === 'DELETE' ? v : undefined, depois: l.acao === 'INSERT' ? v : undefined }))
}

function nomeRegistro(l) {
  const d = l.dados_depois || l.dados_antes || {}
  return d.nome_completo || d.nome || d.valor || d.rotulo || d.campo || d.resultado || d.mes || l.registro_chave || ''
}

export default function AbaLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [perfis, setPerfis] = useState({})
  const [pagina, setPagina] = useState(0)
  const [tabela, setTabela] = useState('')
  const [abertos, setAbertos] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const porPagina = 30

  const montar = useCallback(
    (contagem) => {
      let q = supabase.from('log_alteracoes').select('*', contagem ? { count: 'exact' } : undefined).order('criado_em', { ascending: false }).order('id')
      if (tabela) q = q.eq('tabela', tabela)
      return q
    },
    [tabela],
  )

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nome')
      .then(({ data }) => setPerfis(Object.fromEntries((data || []).map((p) => [p.id, p.nome]))))
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, count } = await montar(true).range(pagina * porPagina, pagina * porPagina + porPagina - 1)
    setLogs(data || [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [montar, pagina])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function exportar() {
    const { data } = await buscarTodos(montar(false))
    const linhas = (data || []).map((l) => ({
      quando: new Date(l.criado_em).toLocaleString('pt-BR'),
      quem: perfis[l.usuario_id] || '',
      acao: ROTULO_ACAO[l.acao] || l.acao,
      onde: ROTULO_TABELA[l.tabela] || l.tabela,
      registro: nomeRegistro(l),
      alteracoes: calcularAlteracoes(l)
        .map((a) => (l.acao === 'UPDATE' ? `${a.campo}: ${fmt(a.antes)} → ${fmt(a.depois)}` : `${a.campo}: ${fmt(a.antes ?? a.depois)}`))
        .join(' | '),
    }))
    const blob = new Blob(['\uFEFF' + Papa.unparse(linhas)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `log_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function alternar(id) {
    setAbertos((s) => {
      const novo = new Set(s)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className="field-select py-1.5 text-sm w-auto" value={tabela} onChange={(e) => { setTabela(e.target.value); setPagina(0) }}>
          <option value="">Tudo</option>
          {Object.entries(ROTULO_TABELA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button onClick={exportar} className="btn-secondary flex items-center gap-1.5 ml-auto">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div className="card divide-y divide-navy-100 dark:divide-navy-800">
        {loading && <p className="p-4 text-sm text-navy-400">Carregando…</p>}
        {!loading && logs.length === 0 && <p className="p-4 text-sm text-navy-400">Nenhum registro.</p>}
        {!loading &&
          logs.map((l) => {
            const alteracoes = calcularAlteracoes(l)
            const aberto = abertos.has(l.id)
            return (
              <div key={l.id} className="px-4 py-3 text-sm">
                <button onClick={() => alternar(l.id)} className="w-full flex items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="text-navy-900 dark:text-white">
                      <span className="font-medium">{perfis[l.usuario_id] || 'Sistema'}</span> {(ROTULO_ACAO[l.acao] || l.acao).toLowerCase()}{' '}
                      <span className="text-navy-500 dark:text-navy-300">{ROTULO_TABELA[l.tabela] || l.tabela}</span>
                      {nomeRegistro(l) && <span className="text-navy-700 dark:text-navy-100 font-medium"> · {nomeRegistro(l)}</span>}
                    </p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      {new Date(l.criado_em).toLocaleString('pt-BR')} · {alteracoes.length} campo(s) {l.acao === 'UPDATE' ? 'alterado(s)' : 'registrado(s)'}
                    </p>
                  </div>
                  {aberto ? <ChevronUp size={16} className="text-navy-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-navy-400 flex-shrink-0" />}
                </button>
                {aberto && (
                  <div className="mt-3 rounded-md bg-navy-50 dark:bg-navy-800 p-3 space-y-1.5">
                    {alteracoes.length === 0 && <p className="text-xs text-navy-400">Sem diferenças registradas.</p>}
                    {alteracoes.map((a) => (
                      <p key={a.campo} className="text-xs text-navy-700 dark:text-navy-200">
                        <span className="font-semibold">{a.campo}:</span>{' '}
                        {l.acao === 'UPDATE' ? (
                          <>
                            <span className="text-clay-600 line-through">{fmt(a.antes)}</span> → <span className="text-sage-600 font-medium">{fmt(a.depois)}</span>
                          </>
                        ) : (
                          <span>{fmt(a.antes ?? a.depois)}</span>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
  )
}
