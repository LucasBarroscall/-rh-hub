import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronUp, ChevronDown, Plus, ListPlus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { CAMPOS_PADRAO_OCULTAVEIS } from '../../lib/useCamposFormulario'

const TIPOS = [
  ['texto', 'Texto'],
  ['sim_nao', 'Sim / Não'],
  ['selecao', 'Escolha única (opções)'],
  ['numero', 'Número'],
  ['data', 'Data'],
]

function gerarChave(rotulo) {
  const base = rotulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30)
  return `${base || 'campo'}_${Math.random().toString(36).slice(2, 6)}`
}

export default function AbaCamposFormulario() {
  const [customizados, setCustomizados] = useState([])
  const [ocultos, setOcultos] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [novo, setNovo] = useState({ rotulo: '', tipo: 'texto', opcoes: '', obrigatorio: false })

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: cs }, { data: cf }] = await Promise.all([
      supabase.from('campos_formulario').select('*').order('ordem', { ascending: true }),
      supabase.from('config_campos').select('*'),
    ])
    setCustomizados(cs || [])
    setOcultos(new Set((cf || []).filter((x) => x.oculto).map((x) => x.campo)))
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function alternarPadrao(campo) {
    const oculto = !ocultos.has(campo)
    const { error } = await supabase.from('config_campos').upsert({ campo, oculto })
    if (error) setErro(error.message)
    else carregar()
  }

  async function adicionar(e) {
    e.preventDefault()
    setErro('')
    if (!novo.rotulo.trim()) return
    const opcoes = novo.tipo === 'selecao' ? novo.opcoes.split(',').map((o) => o.trim()).filter(Boolean) : []
    if (novo.tipo === 'selecao' && opcoes.length < 2) {
      setErro('Para "Escolha única", informe ao menos 2 opções separadas por vírgula.')
      return
    }
    const ordem = customizados.length ? Math.max(...customizados.map((c) => c.ordem)) + 1 : 1
    const { error } = await supabase.from('campos_formulario').insert({
      chave: gerarChave(novo.rotulo),
      rotulo: novo.rotulo.trim(),
      tipo: novo.tipo,
      opcoes,
      obrigatorio: novo.obrigatorio,
      ordem,
    })
    if (error) {
      setErro(error.message)
      return
    }
    setNovo({ rotulo: '', tipo: 'texto', opcoes: '', obrigatorio: false })
    carregar()
  }

  async function atualizar(c, campos) {
    const { error } = await supabase.from('campos_formulario').update(campos).eq('id', c.id)
    if (error) setErro(error.message)
    else carregar()
  }

  async function mover(i, direcao) {
    const outro = customizados[i + direcao]
    if (!outro) return
    const c = customizados[i]
    await supabase.from('campos_formulario').update({ ordem: outro.ordem }).eq('id', c.id)
    await supabase.from('campos_formulario').update({ ordem: c.ordem }).eq('id', outro.id)
    carregar()
  }

  async function excluir(c) {
    if (!confirm(`Excluir o campo "${c.rotulo}"? As respostas já enviadas continuam guardadas, mas o campo some do formulário.`)) return
    const { error } = await supabase.from('campos_formulario').delete().eq('id', c.id)
    if (error) setErro(error.message)
    else carregar()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-4 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <ListPlus size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Crie novas perguntas (ex.: "Você é PCD?") ou oculte perguntas padrão que não fazem sentido. As mudanças aparecem no formulário público, no
          "Adicionar candidato" e na edição. Os títulos e comentários de cada campo continuam em Comentários.
        </p>
      </div>

      {erro && <p className="text-sm text-clay-600">{erro}</p>}

      <div className="card p-5">
        <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-3">Campos padrão opcionais</h3>
        <div className="divide-y divide-navy-100 dark:divide-navy-800">
          {CAMPOS_PADRAO_OCULTAVEIS.map(([campo, rotulo]) => (
            <div key={campo} className="flex items-center justify-between py-2.5 text-sm">
              <span className={ocultos.has(campo) ? 'text-navy-400 line-through' : 'text-navy-800 dark:text-navy-100'}>{rotulo}</span>
              <button onClick={() => alternarPadrao(campo)} className="btn-secondary py-1 px-3 text-xs">
                {ocultos.has(campo) ? 'Mostrar no formulário' : 'Ocultar do formulário'}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-navy-400 mt-2">Nome, CPF, contato, endereço e disponibilidade são essenciais e não podem ser removidos.</p>
      </div>

      <div className="card p-5">
        <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-3">Campos personalizados</h3>
        {loading && <p className="text-sm text-navy-400">Carregando…</p>}
        {!loading && customizados.length === 0 && <p className="text-sm text-navy-400 mb-3">Nenhum campo personalizado ainda.</p>}
        <div className="divide-y divide-navy-100 dark:divide-navy-800 mb-4">
          {customizados.map((c, i) => (
            <div key={c.id} className="py-3 flex items-center gap-3 flex-wrap">
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => mover(i, -1)} className="text-navy-400 hover:text-navy-700 disabled:opacity-30">
                  <ChevronUp size={15} />
                </button>
                <button disabled={i === customizados.length - 1} onClick={() => mover(i, 1)} className="text-navy-400 hover:text-navy-700 disabled:opacity-30">
                  <ChevronDown size={15} />
                </button>
              </div>
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-medium text-navy-900 dark:text-white">{c.rotulo}</p>
                <p className="text-xs text-navy-400">
                  {TIPOS.find(([t]) => t === c.tipo)?.[1]}
                  {c.tipo === 'selecao' ? `: ${(c.opcoes || []).join(', ')}` : ''}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-navy-600 dark:text-navy-300">
                <input type="checkbox" checked={c.obrigatorio} onChange={(e) => atualizar(c, { obrigatorio: e.target.checked })} /> Obrigatório
              </label>
              <button onClick={() => excluir(c)} className="text-navy-400 hover:text-clay-600" title="Excluir campo">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={adicionar} className="rounded-lg border border-navy-100 dark:border-navy-800 p-4 space-y-3">
          <p className="text-sm font-medium text-navy-800 dark:text-navy-100">Novo campo</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Pergunta / título</label>
              <input className="field-input" value={novo.rotulo} onChange={(e) => setNovo({ ...novo, rotulo: e.target.value })} placeholder="Ex.: Você é PCD?" />
            </div>
            <div>
              <label className="field-label">Tipo de resposta</label>
              <select className="field-select" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>
                {TIPOS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {novo.tipo === 'selecao' && (
            <div>
              <label className="field-label">Opções (separadas por vírgula)</label>
              <input className="field-input" value={novo.opcoes} onChange={(e) => setNovo({ ...novo, opcoes: e.target.value })} placeholder="Ex.: Sim, Não, Prefiro não informar" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
            <input type="checkbox" checked={novo.obrigatorio} onChange={(e) => setNovo({ ...novo, obrigatorio: e.target.checked })} /> Resposta obrigatória
          </label>
          <button type="submit" className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Adicionar campo
          </button>
        </form>
      </div>
    </div>
  )
}
