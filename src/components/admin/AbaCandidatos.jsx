import { useEffect, useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { Search, Trash2, Download, Upload, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { buscarTodos } from '../../lib/buscarTodos'
import { formatarData, etapaFunil, corEtapa } from '../../lib/candidato'
import { useRegrasTeste } from '../../lib/regrasTeste'
import { useCamposFormulario } from '../../lib/useCamposFormulario'
import { COLUNAS_MODELO, converterLinhaImportacao } from '../../lib/importacao'
import EditorCandidato from '../EditorCandidato'
import ChipResultado from '../ChipResultado'
import FiltroResultado from '../FiltroResultado'
import { opcoesResultado } from '../../lib/resultados'

const EXEMPLO = {
  fonte: 'Indicação',
  nome_indicador: 'MARIA SILVA',
  nome_completo: 'JOAO DA SILVA SANTOS',
  telefone: '(11) 9 8888-7777',
  rg: '123456789',
  cpf: '123.456.789-00',
  data_nascimento: '20/05/1995',
  sexo: 'Masculino',
  nome_mae: 'ANA SILVA SANTOS',
  logradouro: 'RUA DAS FLORES',
  numero: '123',
  complemento: 'APTO 45',
  bairro: 'CENTRO',
  cidade: 'ARACAJU',
  estado: 'SE',
  cep: '49000-000',
  email: 'joao.silva@exemplo.com',
  created_at: '15/03/2026',
  disponibilidade_horario_trabalho: 'Das 06:00 às 18:00 (Manhã e Tarde)',
  disponibilidade_horario_treinamento: 'Manhã',
  disponibilidade_jornada: '6x1',
  possui_veiculo: 'Sim',
  concorda_turno_treinamento: 'Sim',
  possui_ensino_superior: 'Não',
}

function baixarArquivo(conteudo, nome) {
  const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export default function AbaCandidatos() {
  const [linhas, setLinhas] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPagina] = useState(25)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [filtroResultado, setFiltroResultado] = useState('')
  const [selecionados, setSelecionados] = useState(new Set())
  const [editando, setEditando] = useState(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const inputArquivoRef = useRef(null)
  const { regras } = useRegrasTeste()
  const { customizados } = useCamposFormulario()

  // A busca e os filtros valem para TODO o banco (não só para a página atual).
  const montarQuery = useCallback(
    (comContagem) => {
      let q = supabase
        .from('candidatos')
        .select('*', comContagem ? { count: 'exact' } : undefined)
        .order('created_at', { ascending: false })
        .order('id')
      const termo = buscaAplicada.replace(/[,()%*]/g, ' ').trim()
      if (termo) {
        const digitos = termo.replace(/\D/g, '')
        const partes = [`nome_completo.ilike.%${termo}%`]
        if (digitos.length >= 3) partes.push(`cpf_digitos.ilike.%${digitos}%`)
        q = q.or(partes.join(','))
      }
      if (de) q = q.gte('created_at', `${de}T00:00:00-03:00`)
      if (ate) q = q.lte('created_at', `${ate}T23:59:59.999-03:00`)
      if (filtroResultado) q = filtroResultado === 'Pendente' ? q.is('resultado_final', null) : q.eq('resultado_final', filtroResultado)
      return q
    },
    [buscaAplicada, de, ate, filtroResultado],
  )

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await montarQuery(true).range(pagina * porPagina, pagina * porPagina + porPagina - 1)
    if (!error) {
      setLinhas(data)
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [montarQuery, pagina, porPagina])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAplicada(busca)
      setPagina(0)
    }, 400)
    return () => clearTimeout(t)
  }, [busca])

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  function alternar(id) {
    setSelecionados((s) => {
      const novo = new Set(s)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const todosDaPaginaMarcados = linhas.length > 0 && linhas.every((c) => selecionados.has(c.id))
  function alternarPagina() {
    setSelecionados((s) => {
      const novo = new Set(s)
      linhas.forEach((c) => (todosDaPaginaMarcados ? novo.delete(c.id) : novo.add(c.id)))
      return novo
    })
  }

  async function excluirSelecionados() {
    if (!confirm(`Excluir definitivamente ${selecionados.size} candidato(s)?`)) return
    const { error } = await supabase.from('candidatos').delete().in('id', [...selecionados])
    if (!error) {
      setSelecionados(new Set())
      carregar()
    }
  }

  async function exportarCSV() {
    const { data, error } = await buscarTodos(montarQuery(false))
    if (error) return
    const sem = data.map((c) => {
      // eslint-disable-next-line no-unused-vars
      const { idade, updated_at, cpf_digitos, ...resto } = c
      return resto
    })
    baixarArquivo(Papa.unparse(sem), `candidatos_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function baixarModelo() {
    const linha = Object.fromEntries([...COLUNAS_MODELO, ...customizados.map((cf) => cf.rotulo)].map((c) => [c, EXEMPLO[c] ?? '']))
    baixarArquivo(Papa.unparse([linha]), 'modelo_importacao_candidatos.csv')
  }

  function importarCSV(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setImportando(true)
    setResultado(null)
    Papa.parse(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const validas = []
        const avisos = []
        res.data.forEach((linha, i) => {
          const { linha: ok, aviso } = converterLinhaImportacao(linha, regras, customizados)
          if (ok) validas.push(ok)
          else avisos.push(`Linha ${i + 2}: ${aviso}`)
        })
        let inseridas = 0
        const erros = []
        for (let i = 0; i < validas.length; i += 200) {
          const lote = validas.slice(i, i + 200)
          const { error } = await supabase.from('candidatos').insert(lote)
          if (error) erros.push(`Linhas ${i + 2} a ${i + lote.length + 1}: ${error.message}`)
          else inseridas += lote.length
        }
        setImportando(false)
        if (inputArquivoRef.current) inputArquivoRef.current.value = ''
        setResultado({ inseridas, avisos, erros })
        carregar()
      },
      error: (err) => {
        setImportando(false)
        setResultado({ inseridas: 0, avisos: [], erros: [err.message] })
      },
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input className="field-input pl-9" placeholder="Buscar por nome ou CPF em todo o banco…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Cadastrados de</label>
          <input type="date" className="field-input py-1.5" value={de} onChange={(e) => { setDe(e.target.value); setPagina(0) }} />
        </div>
        <div>
          <label className="field-label">até</label>
          <input type="date" className="field-input py-1.5" value={ate} onChange={(e) => { setAte(e.target.value); setPagina(0) }} />
        </div>
        <div>
          <label className="field-label">Resultado final</label>
          <FiltroResultado valor={filtroResultado} onChange={(v) => { setFiltroResultado(v); setPagina(0) }} opcoes={opcoesResultado([], regras)} className="py-2 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap ml-auto">
          <button onClick={baixarModelo} className="btn-secondary flex items-center gap-1.5">
            <FileDown size={15} /> Baixar modelo
          </button>
          <button onClick={exportarCSV} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Exportar CSV
          </button>
          <label className="btn-secondary flex items-center gap-1.5 cursor-pointer">
            <Upload size={15} /> {importando ? 'Importando…' : 'Importar CSV'}
            <input ref={inputArquivoRef} type="file" accept=".csv" onChange={importarCSV} className="hidden" disabled={importando} />
          </label>
          {selecionados.size > 0 && (
            <button onClick={excluirSelecionados} className="btn-secondary text-clay-600 border-clay-500/30 flex items-center gap-1.5">
              <Trash2 size={15} /> Excluir ({selecionados.size})
            </button>
          )}
        </div>
      </div>

      {resultado && (
        <div className="card p-4 mb-4 text-sm">
          <p className="font-medium text-navy-800 dark:text-navy-100">{resultado.inseridas} candidato(s) importado(s).</p>
          {resultado.avisos.length > 0 && <p className="text-amber-700 dark:text-amber-300 mt-1">Ignoradas: {resultado.avisos.slice(0, 5).join(' · ')}{resultado.avisos.length > 5 ? ' …' : ''}</p>}
          {resultado.erros.length > 0 && <p className="text-clay-600 mt-1">Erros: {resultado.erros.join(' · ')}</p>}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-navy-400 uppercase tracking-wide border-b border-navy-100 dark:border-navy-800">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={todosDaPaginaMarcados} onChange={alternarPagina} />
              </th>
              <th className="px-4 py-3">Candidato</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Resultado final</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-navy-400">Carregando…</td>
              </tr>
            )}
            {!loading && linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-navy-400">Nenhum candidato encontrado.</td>
              </tr>
            )}
            {!loading &&
              linhas.map((c) => {
                const etapa = etapaFunil(c)
                return (
                  <tr key={c.id} className="hover:bg-navy-50/60 dark:hover:bg-navy-800/50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => alternar(c.id)} />
                    </td>
                    <td className="px-4 py-3 font-medium text-navy-900 dark:text-white">{c.nome_completo}</td>
                    <td className="px-4 py-3 text-navy-500 dark:text-navy-300">{c.cpf}</td>
                    <td className="px-4 py-3 text-navy-500 dark:text-navy-300">{c.cidade}</td>
                    <td className="px-4 py-3 text-navy-500 dark:text-navy-300">{formatarData(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${corEtapa(etapa)}`}>{etapa}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ChipResultado resultado={c.resultado_final} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditando(c)} className="text-xs text-navy-500 hover:text-navy-900 dark:hover:text-white underline">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-navy-500 dark:text-navy-400">
        <span>
          {total.toLocaleString('pt-BR')} candidato(s) {buscaAplicada || de || ate ? 'nos filtros' : 'no banco'}
        </span>
        <div className="flex items-center gap-3">
          <select className="field-select py-1 text-xs w-auto" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0) }}>
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
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
          podeExcluir
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
