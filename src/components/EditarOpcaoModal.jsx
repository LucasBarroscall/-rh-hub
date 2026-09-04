import { useEffect, useState, useCallback } from 'react'
import { X, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const TIPOS = [
  { id: 'nenhum', label: 'Nenhum campo extra', exemplo: 'ex.: Outros' },
  { id: 'texto', label: 'Campo de texto livre', exemplo: 'ex.: Indicação, Funcionário Callink' },
  { id: 'lista', label: 'Lista de opções', exemplo: 'ex.: Redes Sociais' },
]

function SubLista({ opcaoPaiId }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoValor, setNovoValor] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opcoes_sublista')
      .select('*')
      .eq('opcao_pai_id', opcaoPaiId)
      .order('ordem', { ascending: true })
    if (!error) setItens(data)
    setLoading(false)
  }, [opcaoPaiId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(e) {
    e.preventDefault()
    if (!novoValor.trim()) return
    setErro('')
    const proximaOrdem = itens.length ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1
    const { error } = await supabase
      .from('opcoes_sublista')
      .insert({ opcao_pai_id: opcaoPaiId, valor: novoValor.trim(), ordem: proximaOrdem })
    if (!error) {
      setNovoValor('')
      carregar()
    } else {
      setErro(error.code === '23505' ? 'Essa opção já existe.' : error.message)
    }
  }

  async function remover(item) {
    const { error } = await supabase.from('opcoes_sublista').delete().eq('id', item.id)
    if (!error) carregar()
  }

  async function mover(index, direcao) {
    const alvo = index + direcao
    if (alvo < 0 || alvo >= itens.length) return
    const a = itens[index]
    const b = itens[alvo]
    await supabase.from('opcoes_sublista').update({ ordem: b.ordem }).eq('id', a.id)
    await supabase.from('opcoes_sublista').update({ ordem: a.ordem }).eq('id', b.id)
    carregar()
  }

  return (
    <div>
      <form onSubmit={adicionar} className="flex gap-2 mb-2">
        <input
          className="field-input"
          placeholder="Nova opção da lista…"
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
        />
        <button type="submit" className="btn-secondary flex-shrink-0">
          Adicionar
        </button>
      </form>
      {erro && <p className="text-xs text-clay-600 mb-2">{erro}</p>}
      <div className="rounded-lg border border-navy-100 dark:border-navy-800 divide-y divide-navy-100 dark:divide-navy-800">
        {loading && <p className="p-3 text-xs text-navy-400">Carregando…</p>}
        {!loading && itens.length === 0 && <p className="p-3 text-xs text-navy-400">Nenhuma opção ainda.</p>}
        {!loading &&
          itens.map((item, i) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-navy-800 dark:text-navy-100">{item.valor}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-navy-400 hover:text-navy-700 dark:hover:text-white disabled:opacity-30">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => mover(i, 1)} disabled={i === itens.length - 1} className="text-navy-400 hover:text-navy-700 dark:hover:text-white disabled:opacity-30">
                  <ChevronDown size={14} />
                </button>
                <button onClick={() => remover(item)} className="text-navy-400 hover:text-clay-600 ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function EditarOpcaoModal({ opcao, campo, onClose, onSaved }) {
  const [valor, setValor] = useState(opcao.valor)
  const [tipoDependencia, setTipoDependencia] = useState(opcao.tipo_dependencia || 'nenhum')
  const [rotulo, setRotulo] = useState(opcao.rotulo_dependencia || '')
  const [placeholder, setPlaceholder] = useState(opcao.placeholder_dependencia || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setErro('')
    setSalvando(true)
    const campos = { valor: valor.trim() }
    if (campo === 'fonte') {
      campos.tipo_dependencia = tipoDependencia
      campos.rotulo_dependencia = tipoDependencia === 'nenhum' ? null : rotulo.trim() || null
      campos.placeholder_dependencia = tipoDependencia === 'texto' ? placeholder.trim() || null : null
    }
    const { error } = await supabase.from('opcoes_lista').update(campos).eq('id', opcao.id)
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-[60]">
      <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Editar opção</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="field-label">Nome da opção</label>
            <input className="field-input" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>

          {campo === 'fonte' && (
            <>
              <div>
                <label className="field-label mb-2">Quando essa fonte for escolhida...</label>
                <div className="space-y-2">
                  {TIPOS.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors ${
                        tipoDependencia === t.id
                          ? 'border-navy-700 bg-navy-50 dark:bg-navy-800'
                          : 'border-navy-100 dark:border-navy-700 hover:bg-navy-50/60 dark:hover:bg-navy-800/60'
                      }`}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        checked={tipoDependencia === t.id}
                        onChange={() => setTipoDependencia(t.id)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-navy-800 dark:text-navy-100">{t.label}</span>
                        <span className="block text-xs text-navy-400">{t.exemplo}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {tipoDependencia === 'texto' && (
                <>
                  <div>
                    <label className="field-label">Rótulo do campo</label>
                    <input
                      className="field-input"
                      placeholder='ex.: "Quem indicou?"'
                      value={rotulo}
                      onChange={(e) => setRotulo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Placeholder (texto de exemplo)</label>
                    <input
                      className="field-input"
                      placeholder='ex.: "Escreva o nome completo de quem indicou"'
                      value={placeholder}
                      onChange={(e) => setPlaceholder(e.target.value)}
                    />
                  </div>
                </>
              )}

              {tipoDependencia === 'lista' && (
                <>
                  <div>
                    <label className="field-label">Rótulo do campo</label>
                    <input
                      className="field-input"
                      placeholder='ex.: "Qual rede social?"'
                      value={rotulo}
                      onChange={(e) => setRotulo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label mb-2">Opções dessa lista</label>
                    <SubLista opcaoPaiId={opcao.id} />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {erro && <p className="text-sm text-clay-600 mt-4">{erro}</p>}

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
