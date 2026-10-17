import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronUp, ChevronDown, Plus, Keyboard } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { avaliarTeste } from '../../lib/regrasTeste'

const num = (v) => (v === '' || v == null ? null : Math.round(Number(v)))

export default function AbaRegraTeste() {
  const [regras, setRegras] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [testeWpm, setTesteWpm] = useState('')
  const [testePrec, setTestePrec] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('regras_teste').select('*').order('ordem', { ascending: true })
    setRegras(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function editarLocal(id, campos) {
    setRegras((rs) => rs.map((r) => (r.id === id ? { ...r, ...campos } : r)))
  }

  async function salvarLinha(r) {
    const { id, resultado, aprova, wpm_min, wpm_max, precisao_min, precisao_max, ativo } = r
    if (!resultado.trim()) {
      setErro('Dê um nome ao resultado da faixa (ex.: Chat, Voz, Reprovado).')
      return
    }
    setErro('')
    const { error } = await supabase
      .from('regras_teste')
      .update({ resultado: resultado.trim(), aprova, wpm_min, wpm_max, precisao_min, precisao_max, ativo })
      .eq('id', id)
    if (error) setErro(error.message)
  }

  async function adicionar() {
    const ordem = regras.length ? Math.max(...regras.map((r) => r.ordem)) + 1 : 1
    const { error } = await supabase
      .from('regras_teste')
      .insert({ ordem, resultado: 'Nova faixa', aprova: true, wpm_min: 0, wpm_max: 256, precisao_min: 0, precisao_max: 100 })
    if (error) setErro(error.message)
    else carregar()
  }

  async function mover(i, direcao) {
    const outro = regras[i + direcao]
    if (!outro) return
    const r = regras[i]
    await supabase.from('regras_teste').update({ ordem: outro.ordem }).eq('id', r.id)
    await supabase.from('regras_teste').update({ ordem: r.ordem }).eq('id', outro.id)
    carregar()
  }

  async function excluir(r) {
    if (!confirm(`Excluir a faixa "${r.resultado}"?`)) return
    await supabase.from('regras_teste').delete().eq('id', r.id)
    carregar()
  }

  const teste = testeWpm !== '' && testePrec !== '' ? avaliarTeste(Number(testeWpm), Number(testePrec), regras) : null

  const campoNum = (r, campo, max) => (
    <input
      type="number"
      min="0"
      max={max}
      step="1"
      className="field-input py-1.5 text-sm w-20"
      value={r[campo] ?? ''}
      placeholder="—"
      onChange={(e) => editarLocal(r.id, { [campo]: num(e.target.value) })}
      onBlur={() => salvarLinha(regras.find((x) => x.id === r.id))}
    />
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="card p-4 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <Keyboard size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            Defina as faixas de WPM (0 a 256) e Precisão (0 a 100%) e o resultado de cada uma (ex.: <strong>Chat</strong>, <strong>Voz</strong>,{' '}
            <strong>Reprovado</strong>). As faixas são lidas <strong>de cima para baixo e vale a primeira que bater</strong> — igual a um SE aninhado
            do Excel. Para "OU", crie duas faixas com o mesmo resultado. Se nenhuma bater, o candidato fica <strong>Reprovado</strong>.
          </p>
          <p>
            O resultado é gravado no candidato no momento do teste: <strong>mudar a regra não altera candidatos já avaliados</strong>.
          </p>
        </div>
      </div>

      {erro && <p className="text-sm text-clay-600">{erro}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-navy-400 border-b border-navy-100 dark:border-navy-800">
              <th className="px-3 py-3 w-10" />
              <th className="px-3 py-3">Resultado</th>
              <th className="px-3 py-3">Aprova?</th>
              <th className="px-3 py-3">WPM de</th>
              <th className="px-3 py-3">até</th>
              <th className="px-3 py-3">Precisão de</th>
              <th className="px-3 py-3">até</th>
              <th className="px-3 py-3">Ativa</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-navy-400">Carregando…</td>
              </tr>
            )}
            {regras.map((r, i) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <button disabled={i === 0} onClick={() => mover(i, -1)} className="text-navy-400 hover:text-navy-700 disabled:opacity-30">
                      <ChevronUp size={14} />
                    </button>
                    <button disabled={i === regras.length - 1} onClick={() => mover(i, 1)} className="text-navy-400 hover:text-navy-700 disabled:opacity-30">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="field-input py-1.5 text-sm w-36"
                    value={r.resultado}
                    onChange={(e) => editarLocal(r.id, { resultado: e.target.value })}
                    onBlur={() => salvarLinha(regras.find((x) => x.id === r.id))}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => {
                      const nova = { ...r, aprova: !r.aprova }
                      editarLocal(r.id, { aprova: nova.aprova })
                      salvarLinha(nova)
                    }}
                    className={`pill ${r.aprova ? 'bg-sage-500/15 text-sage-600' : 'bg-clay-500/15 text-clay-600'}`}
                  >
                    {r.aprova ? 'Aprova' : 'Reprova'}
                  </button>
                </td>
                <td className="px-3 py-2">{campoNum(r, 'wpm_min', 256)}</td>
                <td className="px-3 py-2">{campoNum(r, 'wpm_max', 256)}</td>
                <td className="px-3 py-2">{campoNum(r, 'precisao_min', 100)}</td>
                <td className="px-3 py-2">{campoNum(r, 'precisao_max', 100)}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={r.ativo}
                    onChange={(e) => {
                      editarLocal(r.id, { ativo: e.target.checked })
                      salvarLinha({ ...r, ativo: e.target.checked })
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => excluir(r)} className="text-navy-400 hover:text-clay-600">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={adicionar} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} /> Adicionar faixa
        </button>
        <p className="text-xs text-navy-400">Deixe um limite em branco para "sem limite". Se nenhuma faixa bater: Reprovado.</p>
      </div>

      <div className="card p-5">
        <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-3">Testar a regra</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">WPM</label>
            <input type="number" min="0" max="256" step="1" className="field-input w-28" value={testeWpm} onChange={(e) => setTesteWpm(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Precisão %</label>
            <input type="number" min="0" max="100" step="1" className="field-input w-28" value={testePrec} onChange={(e) => setTestePrec(e.target.value)} />
          </div>
          {teste && (
            <span className={`pill text-sm px-3 py-1.5 ${teste.aprovado ? 'bg-sage-500/15 text-sage-600' : 'bg-clay-500/15 text-clay-600'}`}>
              {teste.resultado} — {teste.aprovado ? 'aprovado' : 'reprovado'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
