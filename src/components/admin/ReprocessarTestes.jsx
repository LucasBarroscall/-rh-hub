import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { buscarTodos } from '../../lib/buscarTodos'
import { avaliarTeste } from '../../lib/regrasTeste'
import { formatarData } from '../../lib/candidato'
import ChipResultado from '../ChipResultado'

const POR_PAGINA = 50

// Reprocessa o resultado do teste de candidatos JÁ avaliados com a regra vigente.
// Escolha quais (e quantos) — ou não faça nada, e a regra nova vale só para os próximos testes.
export default function ReprocessarTestes({ regras }) {
  const [lista, setLista] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [atual, setAtual] = useState('')
  const [soMudam, setSoMudam] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [selecionados, setSelecionados] = useState(new Set())
  const [processando, setProcessando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  async function carregar() {
    setCarregando(true)
    setMensagem('')
    const { data } = await buscarTodos(
      supabase
        .from('candidatos')
        .select('id, nome_completo, cpf, wpm, precisao, aprovado_teste, resultado_teste, aprovado_entrevista, resultado_final, teste_em, created_at')
        .eq('teste_realizado', true)
        .not('wpm', 'is', null)
        .not('precisao', 'is', null)
        .order('teste_em', { ascending: false })
        .order('id'),
    )
    setLista(data || [])
    setSelecionados(new Set())
    setPagina(0)
    setCarregando(false)
  }

  const linhas = useMemo(
    () =>
      (lista || []).map((c) => {
        const novo = avaliarTeste(c.wpm, c.precisao, regras)
        const muda = !!novo && (novo.resultado !== c.resultado_teste || novo.aprovado !== c.aprovado_teste)
        return { ...c, novo, muda }
      }),
    [lista, regras],
  )

  const filtradas = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    const digitos = busca.replace(/\D/g, '')
    return linhas.filter((c) => {
      if (soMudam && !c.muda) return false
      if (atual && (c.resultado_teste || 'Sem resultado') !== atual) return false
      const dia = (c.teste_em || c.created_at || '').slice(0, 10)
      if (de && dia < de) return false
      if (ate && dia > ate) return false
      if (!termo) return true
      return c.nome_completo?.toLowerCase().includes(termo) || (digitos.length >= 3 && c.cpf?.replace(/\D/g, '').includes(digitos))
    })
  }, [linhas, busca, de, ate, atual, soMudam])

  const resultadosAtuais = useMemo(() => [...new Set((lista || []).map((c) => c.resultado_teste || 'Sem resultado'))].sort(), [lista])
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const visiveis = filtradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const selecionadosValidos = filtradas.filter((c) => selecionados.has(c.id) && c.novo)
  const mudariam = selecionadosValidos.filter((c) => c.muda).length

  function alternar(id) {
    setSelecionados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const todosMarcados = filtradas.length > 0 && filtradas.every((c) => selecionados.has(c.id))
  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(filtradas.map((c) => c.id)))
  }

  async function reprocessar() {
    if (selecionadosValidos.length === 0) return
    if (!confirm(`Reprocessar ${selecionadosValidos.length} candidato(s) com a regra atual? (${mudariam} mudam de resultado). O resultado final é recalculado automaticamente e a alteração fica registrada no log.`)) return
    setProcessando(true)
    setMensagem('')
    const grupos = {}
    selecionadosValidos.forEach((c) => {
      const k = `${c.novo.aprovado}|${c.novo.resultado}`
      if (!grupos[k]) grupos[k] = { aprovado: c.novo.aprovado, resultado: c.novo.resultado, ids: [] }
      grupos[k].ids.push(c.id)
    })
    let ok = 0
    const erros = []
    for (const g of Object.values(grupos)) {
      for (let i = 0; i < g.ids.length; i += 100) {
        const ids = g.ids.slice(i, i + 100)
        const { error } = await supabase.from('candidatos').update({ aprovado_teste: g.aprovado, resultado_teste: g.resultado }).in('id', ids)
        if (error) erros.push(error.message)
        else ok += ids.length
      }
    }
    setProcessando(false)
    setMensagem(`${ok} candidato(s) reprocessado(s).${erros.length ? ` Erros: ${erros.join(' · ')}` : ''}`)
    carregar()
  }

  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-1 flex items-center gap-2">
        <RefreshCw size={16} className="text-navy-400" /> Reprocessar candidatos com a regra atual
      </h3>
      <p className="text-xs text-navy-500 dark:text-navy-400 mb-4">
        Mudou a regra? Por padrão ela vale <strong>só para os próximos testes</strong> — quem já foi avaliado continua como está. Para aplicar a regra atual a
        candidatos já avaliados, carregue a lista, escolha quais (ou todos) e reprocesse. O WPM e a Precisão não mudam; o resultado final é recalculado
        (quem foi reprovado na entrevista continua reprovado).
      </p>

      {lista === null ? (
        <button onClick={carregar} disabled={carregando} className="btn-secondary">
          {carregando ? 'Carregando…' : 'Carregar candidatos já testados'}
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <input className="field-input py-1.5 text-sm w-52" placeholder="Buscar nome ou CPF…" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0) }} />
            <div>
              <label className="field-label">Testados de</label>
              <input type="date" className="field-input py-1.5 text-sm" value={de} onChange={(e) => { setDe(e.target.value); setPagina(0) }} />
            </div>
            <div>
              <label className="field-label">até</label>
              <input type="date" className="field-input py-1.5 text-sm" value={ate} onChange={(e) => { setAte(e.target.value); setPagina(0) }} />
            </div>
            <div>
              <label className="field-label">Resultado atual</label>
              <select className="field-select py-1.5 text-sm" value={atual} onChange={(e) => { setAtual(e.target.value); setPagina(0) }}>
                <option value="">Todos</option>
                {resultadosAtuais.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-navy-600 dark:text-navy-300 pb-2">
              <input type="checkbox" checked={soMudam} onChange={(e) => { setSoMudam(e.target.checked); setPagina(0) }} /> Só os que mudariam
            </label>
            <button onClick={carregar} disabled={carregando} className="btn-secondary text-xs ml-auto">
              Atualizar lista
            </button>
          </div>

          <div className="overflow-x-auto rounded-md border border-navy-100 dark:border-navy-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-navy-400 bg-navy-50 dark:bg-navy-800">
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} title={`Selecionar os ${filtradas.length} listados`} />
                  </th>
                  <th className="px-3 py-2">Candidato</th>
                  <th className="px-3 py-2">Testado em</th>
                  <th className="px-3 py-2">WPM</th>
                  <th className="px-3 py-2">Precisão</th>
                  <th className="px-3 py-2">Resultado atual</th>
                  <th className="px-3 py-2">Com a regra atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-navy-400">
                      Nenhum candidato nesse filtro.
                    </td>
                  </tr>
                )}
                {visiveis.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => alternar(c.id)} />
                    </td>
                    <td className="px-3 py-2 font-medium text-navy-900 dark:text-white">{c.nome_completo}</td>
                    <td className="px-3 py-2 text-navy-500">{formatarData(c.teste_em || c.created_at)}</td>
                    <td className="px-3 py-2">{c.wpm}</td>
                    <td className="px-3 py-2">{c.precisao}%</td>
                    <td className="px-3 py-2">
                      <ChipResultado resultado={c.resultado_teste || 'Sem resultado'} />
                    </td>
                    <td className="px-3 py-2">
                      {c.novo ? <ChipResultado resultado={c.novo.resultado} /> : '—'}
                      {c.muda && <span className="ml-2 text-xs text-amber-600">muda</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm text-navy-500 dark:text-navy-400">
            <span>
              {filtradas.length.toLocaleString('pt-BR')} listado(s) · {selecionadosValidos.length.toLocaleString('pt-BR')} selecionado(s) · {mudariam.toLocaleString('pt-BR')} mudariam
            </span>
            <div className="flex items-center gap-3">
              <button disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="btn-secondary py-1 px-2 text-xs disabled:opacity-40">
                ‹
              </button>
              <span>
                {pagina + 1} / {totalPaginas}
              </span>
              <button disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina((p) => p + 1)} className="btn-secondary py-1 px-2 text-xs disabled:opacity-40">
                ›
              </button>
              <button onClick={reprocessar} disabled={processando || selecionadosValidos.length === 0} className="btn-primary">
                {processando ? 'Reprocessando…' : `Reprocessar selecionados (${selecionadosValidos.length})`}
              </button>
            </div>
          </div>
        </>
      )}
      {mensagem && <p className="text-sm text-sage-600 mt-3">{mensagem}</p>}
    </div>
  )
}
