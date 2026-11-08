import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Trash2, Download, Upload, FileDown, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { buscarTodos } from '../../lib/buscarTodos'
import { formatarData, etapaFunil, corEtapa } from '../../lib/candidato'
import { useRegrasTeste } from '../../lib/regrasTeste'
import { COLUNAS_MODELO, converterLinhaImportacao, NOMES_CABECALHO_IMPORTACAO } from '../../lib/importacao'
import { useCamposFormulario } from '../../lib/useCamposFormulario'
import { useOpcoes } from '../../lib/useOpcoes'
import { baixarXlsx, lerAbaComoObjetos, objetosParaAba } from '../../lib/xlsx'
import { opcoesResultado } from '../../lib/resultados'
import EditorCandidato from '../EditorCandidato'
import ChipResultado from '../ChipResultado'
import FiltroResultado from '../FiltroResultado'
import ModalCompliance from './ModalCompliance'

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
  disponibilidade_horario_trabalho: 'MANHÃ | TARDE',
  disponibilidade_horario_treinamento: 'MANHÃ',
  disponibilidade_jornada: '6x1',
  possui_veiculo: 'Sim',
  concorda_turno_treinamento: 'Sim',
  possui_ensino_superior: 'Não',
}

// Mensagens em português para o que o banco devolve ao importar.
function traduzirErroImportacao(erro) {
  const m = (erro && erro.message) || ''
  if (m.includes('CPF_DUPLICADO_HOJE')) return 'CPF já cadastrado hoje (o hub não aceita o mesmo CPF duas vezes no mesmo dia)'
  if (/does not exist|Could not find the .* column/i.test(m)) return 'o banco ainda não foi atualizado para uma das colunas (rode as atualizações pendentes no Supabase)'
  const nulo = /null value in column "([^"]+)"/.exec(m)
  if (nulo) return `campo obrigatório vazio: ${nulo[1]}`
  if (/invalid input syntax/i.test(m)) return `valor inválido em alguma coluna (${m})`
  return m || 'erro desconhecido'
}

const valorDaColuna = (linha, nome) => {
  const par = Object.entries(linha).find(([k]) => k.trim().toLowerCase() === nome)
  return par ? par[1] : ''
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
  const [mostrarCompliance, setMostrarCompliance] = useState(false)
  const inputArquivoRef = useRef(null)
  const { regras } = useRegrasTeste()
  const { customizados } = useCamposFormulario()
  const { opcoes } = useOpcoes()

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

  const nomeStamp = () => new Date().toISOString().slice(0, 10)

  async function exportarXLSX() {
    const { data, error } = await buscarTodos(montarQuery(false))
    if (error) return
    const sem = data.map((c) => {
      // eslint-disable-next-line no-unused-vars
      const { idade, updated_at, cpf_digitos, documentos, respostas_extras, compliance_dados, ...resto } = c
      // documentos e campos adicionais viram colunas (no mesmo formato que a importação lê)
      const docs = Object.fromEntries((opcoes.documento || []).map((n) => [n, documentos && documentos[n] === 'enviado' ? 'Enviado' : documentos && documentos[n] === 'na' ? 'Não se aplica' : '']))
      const extras = Object.fromEntries(customizados.map((cf) => [cf.rotulo, (respostas_extras || {})[cf.chave] ?? '']))
      return { ...resto, ...docs, ...extras }
    })
    await baixarXlsx([objetosParaAba('Candidatos', sem)], `candidatos_${nomeStamp()}.xlsx`)
  }

  async function baixarModelo() {
    const cols = [...COLUNAS_MODELO, ...(opcoes.documento || []), ...customizados.map((cf) => cf.rotulo)]
    await baixarXlsx([{ nome: 'Candidatos', linhas: [cols, cols.map((c) => EXEMPLO[c] ?? '')] }], 'modelo_importacao_candidatos.xlsx')
  }

  async function importarXLSX(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setImportando(true)
    setResultado(null)
    try {
      const lido = await lerAbaComoObjetos(await arquivo.arrayBuffer(), {
        cabecalhos: [...NOMES_CABECALHO_IMPORTACAO, ...(opcoes.documento || []), ...customizados.map((cf) => cf.rotulo)],
      })
      if (!lido.encontrada || lido.linhas.length === 0) {
        throw new Error('Não encontrei candidatos na planilha. A primeira linha precisa ter os cabeçalhos das colunas (ex.: nome_completo, cpf…).')
      }
      const validas = []
      const ignoradas = []
      lido.linhas.forEach((linha) => {
        const { linha: dados, aviso } = converterLinhaImportacao(linha, regras, customizados, opcoes.documento || [])
        if (dados) validas.push({ dados, numeroLinha: linha.__linha })
        else ignoradas.push({ linha: linha.__linha, nome: '', cpf: String(valorDaColuna(linha, 'cpf') || ''), motivo: aviso === 'sem nome_completo' ? 'sem nome (a coluna nome_completo é obrigatória)' : aviso })
      })

      // linhas com o mesmo conjunto de colunas preenchidas vão juntas (evita misturar colunas diferentes no mesmo envio)
      const grupos = new Map()
      validas.forEach((v) => {
        const chave = Object.keys(v.dados).sort().join('|')
        if (!grupos.has(chave)) grupos.set(chave, [])
        grupos.get(chave).push(v)
      })
      let inseridas = 0
      const falhas = []
      for (const itens of grupos.values()) {
        for (let i = 0; i < itens.length; i += 100) {
          const lote = itens.slice(i, i + 100)
          const { error } = await supabase.from('candidatos').insert(lote.map((x) => x.dados))
          if (!error) {
            inseridas += lote.length
            continue
          }
          // se o envio em lote falhou, tenta linha a linha para descobrir exatamente qual deu problema
          for (const x of lote) {
            const r = await supabase.from('candidatos').insert(x.dados)
            if (r.error) falhas.push({ linha: x.numeroLinha, nome: x.dados.nome_completo || '', cpf: x.dados.cpf || '', motivo: traduzirErroImportacao(r.error) })
            else inseridas += 1
          }
        }
      }
      setResultado({ inseridas, total: lido.linhas.length, ignoradas, falhas, erroGeral: null })
      carregar()
    } catch (err) {
      setResultado({ inseridas: 0, total: 0, ignoradas: [], falhas: [], erroGeral: err.message || 'Não foi possível ler a planilha.' })
    }
    setImportando(false)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
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
          <button onClick={() => setMostrarCompliance(true)} className="btn-secondary flex items-center gap-1.5">
            <ShieldCheck size={15} /> Compliance
          </button>
          <button onClick={baixarModelo} className="btn-secondary flex items-center gap-1.5">
            <FileDown size={15} /> Baixar modelo
          </button>
          <button onClick={exportarXLSX} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Exportar XLSX
          </button>
          <label className="btn-secondary flex items-center gap-1.5 cursor-pointer">
            <Upload size={15} /> {importando ? 'Importando…' : 'Importar XLSX'}
            <input ref={inputArquivoRef} type="file" accept=".xlsx" onChange={importarXLSX} className="hidden" disabled={importando} />
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
          {resultado.erroGeral ? (
            <p className="text-clay-600">{resultado.erroGeral}</p>
          ) : (
            <p className="font-medium text-navy-800 dark:text-navy-100">
              {resultado.inseridas} de {resultado.total} linha(s) importada(s).
            </p>
          )}
          {[
            ['Não importadas (dados incompletos)', resultado.ignoradas, 'text-amber-700 dark:text-amber-300'],
            ['Não importadas (recusadas pelo banco)', resultado.falhas, 'text-clay-600'],
          ].map(([titulo, itens, cor]) =>
            itens.length > 0 ? (
              <div key={titulo} className="mt-2">
                <p className={`font-medium ${cor}`}>
                  {titulo}: {itens.length}
                </p>
                <ul className="text-xs text-navy-600 dark:text-navy-300 mt-1 space-y-0.5">
                  {itens.slice(0, 8).map((i, n) => (
                    <li key={n}>
                      Linha {i.linha}
                      {i.nome ? ` — ${i.nome}` : ''}
                      {i.cpf ? ` (CPF ${i.cpf})` : ''}: {i.motivo}
                    </li>
                  ))}
                  {itens.length > 8 && <li>…e mais {itens.length - 8}</li>}
                </ul>
              </div>
            ) : null,
          )}
          {resultado.ignoradas.length + resultado.falhas.length > 0 && (
            <button
              className="text-xs underline text-navy-500 hover:text-navy-800 dark:hover:text-white mt-2"
              onClick={() =>
                baixarXlsx(
                  [objetosParaAba('Problemas', [...resultado.ignoradas, ...resultado.falhas].map((i) => ({ Linha: i.linha, Nome: i.nome, CPF: i.cpf, Motivo: i.motivo })))],
                  'importacao_problemas.xlsx',
                )
              }
            >
              Baixar lista de problemas (.xlsx)
            </button>
          )}
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
          {total.toLocaleString('pt-BR')} candidato(s) {buscaAplicada || de || ate || filtroResultado ? 'nos filtros' : 'no banco'}
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
      {mostrarCompliance && (
        <ModalCompliance
          onClose={() => {
            setMostrarCompliance(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}
