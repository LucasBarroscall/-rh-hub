import { useEffect, useState, useCallback } from 'react'
import { Trash2, ChevronUp, ChevronDown, Plus, ListPlus, Pencil, X, GitBranch } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { CAMPOS_PADRAO_OCULTAVEIS } from '../../lib/useCamposFormulario'
import { useOpcoes } from '../../lib/useOpcoes'
import { TIPOS_CAMPO, TIPOS_COM_OPCOES, TIPOS_CONTROLADORES } from '../../lib/camposPersonalizados'
import EditorRico from '../EditorRico'

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

function dependeDe(c, alvoChave, lista, nivel = 0) {
  if (nivel > 10 || !c.condicao?.campo) return false
  if (c.condicao.campo === alvoChave) return true
  const pai = lista.find((x) => x.chave === c.condicao.campo)
  return pai ? dependeDe(pai, alvoChave, lista, nivel + 1) : false
}

const comentarioVazio = (html) => !html || (!html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() && !/<img/.test(html))

function EditorCampoModal({ campo, lista, proximaOrdem, aoFechar, aoSalvar }) {
  const { opcoes: opcoesPadrao, fontes } = useOpcoes()
  const [f, setF] = useState({
    rotulo: campo?.rotulo || '',
    tipo: campo?.tipo || 'texto',
    opcoes: campo?.opcoes?.length ? campo.opcoes : ['', ''],
    obrigatorio: campo?.obrigatorio || false,
    placeholder: campo?.placeholder || '',
    condCampo: campo?.condicao?.campo || '',
    condValores: campo?.condicao?.valores || [],
  })
  const [comentario, setComentario] = useState('')
  const [posicao, setPosicao] = useState('depois')
  const [existiaComentario, setExistiaComentario] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!campo) return
    supabase
      .from('campo_comentarios')
      .select('*')
      .eq('campo', campo.chave)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistiaComentario(true)
          setComentario(data.comentario || '')
          setPosicao(data.posicao || 'depois')
        }
      })
  }, [campo])

  // Campos que podem controlar este (sem criar ciclos).
  const controladores = [
    ...lista
      .filter((x) => TIPOS_CONTROLADORES.includes(x.tipo) && (!campo || (x.chave !== campo.chave && !dependeDe(x, campo.chave, lista))))
      .map((x) => ({ chave: x.chave, rotulo: x.rotulo, opcoes: x.tipo === 'sim_nao' ? ['Sim', 'Não'] : x.opcoes || [] })),
    { chave: 'fonte', rotulo: 'Fonte (campo padrão)', opcoes: fontes.map((o) => o.valor) },
    { chave: 'sexo', rotulo: 'Sexo (campo padrão)', opcoes: opcoesPadrao.sexo || [] },
    { chave: 'possui_veiculo', rotulo: 'Possui veículo (campo padrão)', opcoes: ['Sim', 'Não'] },
    { chave: 'possui_ensino_superior', rotulo: 'Possui ensino superior (campo padrão)', opcoes: ['Sim', 'Não'] },
    { chave: 'concorda_turno_treinamento', rotulo: 'Concorda com o turno de treinamento (campo padrão)', opcoes: ['Sim', 'Não'] },
  ]
  const controlador = controladores.find((c) => c.chave === f.condCampo)

  function setOpcao(i, valor) {
    setF((s) => ({ ...s, opcoes: s.opcoes.map((o, j) => (j === i ? valor : o)) }))
  }
  function moverOpcao(i, d) {
    setF((s) => {
      const novo = [...s.opcoes]
      const j = i + d
      if (j < 0 || j >= novo.length) return s
      ;[novo[i], novo[j]] = [novo[j], novo[i]]
      return { ...s, opcoes: novo }
    })
  }
  function alternarValor(v) {
    setF((s) => ({ ...s, condValores: s.condValores.includes(v) ? s.condValores.filter((x) => x !== v) : [...s.condValores, v] }))
  }

  async function salvar() {
    setErro('')
    const rotulo = f.rotulo.trim()
    if (!rotulo) return setErro('Informe a pergunta / título do campo.')
    const comOpcoes = TIPOS_COM_OPCOES.includes(f.tipo)
    const opcoes = comOpcoes ? f.opcoes.map((o) => o.trim()).filter(Boolean) : []
    if (comOpcoes && opcoes.length < 2) return setErro('Informe ao menos 2 opções.')
    if (f.condCampo && f.condValores.length === 0) return setErro('Escolha em quais respostas este campo deve aparecer.')
    const dados = {
      rotulo,
      tipo: f.tipo,
      opcoes,
      obrigatorio: f.obrigatorio,
      placeholder: f.placeholder.trim() || null,
      condicao: f.condCampo ? { campo: f.condCampo, valores: f.condValores } : null,
    }
    setSalvando(true)
    let chave = campo?.chave
    let resp
    if (campo) resp = await supabase.from('campos_formulario').update(dados).eq('id', campo.id)
    else {
      chave = gerarChave(rotulo)
      resp = await supabase.from('campos_formulario').insert({ chave, ordem: proximaOrdem, ...dados })
    }
    if (resp.error) {
      setSalvando(false)
      return setErro(resp.error.message)
    }
    // comentário de apoio (mesma tabela dos campos padrão)
    if (!comentarioVazio(comentario) || existiaComentario) {
      const r2 = await supabase.from('campo_comentarios').upsert({
        campo: chave,
        comentario: comentarioVazio(comentario) ? null : comentario,
        posicao,
        atualizado_em: new Date().toISOString(),
      })
      if (r2.error) {
        setSalvando(false)
        return setErro(`Campo salvo, mas o comentário falhou: ${r2.error.message}`)
      }
    }
    setSalvando(false)
    aoSalvar()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card-elevated w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{campo ? 'Editar campo' : 'Novo campo'}</h2>
          <button onClick={aoFechar} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Pergunta / título</label>
              <input className="field-input" value={f.rotulo} onChange={(e) => setF({ ...f, rotulo: e.target.value })} placeholder="Ex.: Você é PCD?" />
            </div>
            <div>
              <label className="field-label">Tipo de resposta</label>
              <select className="field-select" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                {TIPOS_CAMPO.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {TIPOS_COM_OPCOES.includes(f.tipo) && (
            <div>
              <label className="field-label">Opções</label>
              <div className="space-y-2">
                {f.opcoes.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="field-input py-1.5 text-sm" value={o} onChange={(e) => setOpcao(i, e.target.value)} placeholder={`Opção ${i + 1}`} />
                    <button type="button" onClick={() => moverOpcao(i, -1)} className="text-navy-400 hover:text-navy-700">
                      <ChevronUp size={15} />
                    </button>
                    <button type="button" onClick={() => moverOpcao(i, 1)} className="text-navy-400 hover:text-navy-700">
                      <ChevronDown size={15} />
                    </button>
                    <button type="button" onClick={() => setF((s) => ({ ...s, opcoes: s.opcoes.filter((_, j) => j !== i) }))} className="text-navy-400 hover:text-clay-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setF((s) => ({ ...s, opcoes: [...s.opcoes, ''] }))} className="btn-secondary text-xs mt-2 flex items-center gap-1">
                <Plus size={13} /> Adicionar opção
              </button>
              <p className="text-xs text-navy-400 mt-1">
                Para "aparecer uma nova pergunta" quando uma opção for escolhida, crie outro campo e marque abaixo "Mostrar somente quando…".
              </p>
            </div>
          )}

          {['texto', 'texto_longo', 'numero'].includes(f.tipo) && (
            <div>
              <label className="field-label">Texto de exemplo dentro do campo (opcional)</label>
              <input className="field-input" value={f.placeholder} onChange={(e) => setF({ ...f, placeholder: e.target.value })} />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
            <input type="checkbox" checked={f.obrigatorio} onChange={(e) => setF({ ...f, obrigatorio: e.target.checked })} />
            Resposta obrigatória (só quando o campo estiver visível)
          </label>

          <div className="rounded-lg border border-navy-100 dark:border-navy-800 p-4">
            <p className="text-sm font-medium text-navy-800 dark:text-navy-100 flex items-center gap-1.5 mb-2">
              <GitBranch size={15} className="text-navy-400" /> Mostrar somente quando…
            </p>
            <select
              className="field-select"
              value={f.condCampo}
              onChange={(e) => setF({ ...f, condCampo: e.target.value, condValores: [] })}
            >
              <option value="">Sempre visível</option>
              {controladores.map((c) => (
                <option key={c.chave} value={c.chave}>
                  {c.rotulo}
                </option>
              ))}
            </select>
            {controlador && (
              <div className="mt-3">
                <p className="text-xs text-navy-500 dark:text-navy-400 mb-1.5">…a resposta for (pode marcar mais de uma):</p>
                <div className="flex flex-wrap gap-2">
                  {controlador.opcoes.map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => alternarValor(v)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        f.condValores.includes(v)
                          ? 'border-navy-700 bg-navy-700 text-white'
                          : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                  {controlador.opcoes.length === 0 && <span className="text-xs text-navy-400">Esse campo ainda não tem opções cadastradas.</span>}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Comentário de apoio (negrito, listas, links, imagens…)</label>
            <EditorRico value={comentario} onChange={setComentario} placeholder="Sem comentário para este campo…" />
          </div>
          <div>
            <p className="field-label mb-2">Onde o comentário aparece</p>
            <div className="flex gap-2">
              {[
                ['antes', 'Antes do campo'],
                ['depois', 'Depois do campo'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPosicao(v)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    posicao === v
                      ? 'border-navy-700 bg-navy-700 text-white'
                      : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-clay-600 mt-4">{erro}</p>}

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
          <button onClick={aoFechar} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando…' : 'Salvar campo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AbaCamposFormulario() {
  const [customizados, setCustomizados] = useState([])
  const [ocultos, setOcultos] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(undefined) // undefined = fechado, null = novo, objeto = editar

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

  async function mover(i, direcao) {
    const outro = customizados[i + direcao]
    if (!outro) return
    const c = customizados[i]
    await supabase.from('campos_formulario').update({ ordem: outro.ordem }).eq('id', c.id)
    await supabase.from('campos_formulario').update({ ordem: c.ordem }).eq('id', outro.id)
    carregar()
  }

  async function excluir(c) {
    const filhos = customizados.filter((x) => x.condicao?.campo === c.chave)
    const aviso = filhos.length ? `\n\nAtenção: ${filhos.length} campo(s) dependem deste e passarão a ficar sempre visíveis.` : ''
    if (!confirm(`Excluir o campo "${c.rotulo}"? As respostas já enviadas continuam guardadas, mas o campo some do formulário.${aviso}`)) return
    for (const f of filhos) await supabase.from('campos_formulario').update({ condicao: null }).eq('id', f.id)
    const { error } = await supabase.from('campos_formulario').delete().eq('id', c.id)
    if (error) setErro(error.message)
    else {
      await supabase.from('campo_comentarios').delete().eq('campo', c.chave)
      carregar()
    }
  }

  const proximaOrdem = customizados.length ? Math.max(...customizados.map((c) => c.ordem)) + 1 : 1

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-4 flex items-start gap-2.5 text-sm text-navy-600 dark:text-navy-300">
        <ListPlus size={16} className="text-navy-400 flex-shrink-0 mt-0.5" />
        <p>
          Crie novas perguntas com os mesmos recursos dos campos padrão: texto, lista, escolha única, múltipla escolha, Sim/Não, número ou data; comentário
          com formatação (antes ou depois do campo); e regras para <strong>aparecer só quando outra resposta for escolhida</strong>. As mudanças valem no
          formulário público, no "Adicionar candidato" e na edição.
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-navy-900 dark:text-white">Campos personalizados</h3>
          <button onClick={() => setEditando(null)} className="btn-primary flex items-center gap-1.5 py-1.5 text-sm">
            <Plus size={15} /> Novo campo
          </button>
        </div>
        {loading && <p className="text-sm text-navy-400">Carregando…</p>}
        {!loading && customizados.length === 0 && <p className="text-sm text-navy-400">Nenhum campo personalizado ainda.</p>}
        <div className="divide-y divide-navy-100 dark:divide-navy-800">
          {customizados.map((c, i) => {
            const pai = c.condicao?.campo ? customizados.find((x) => x.chave === c.condicao.campo)?.rotulo || c.condicao.campo : null
            return (
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
                  <p className="text-sm font-medium text-navy-900 dark:text-white">
                    {c.rotulo} {c.obrigatorio && <span className="pill bg-clay-500/10 text-clay-600 ml-1">obrigatório</span>}
                  </p>
                  <p className="text-xs text-navy-400">
                    {TIPOS_CAMPO.find(([t]) => t === c.tipo)?.[1] || c.tipo}
                    {(c.opcoes || []).length ? `: ${c.opcoes.join(', ')}` : ''}
                  </p>
                  {pai && (
                    <p className="text-xs text-navy-500 dark:text-navy-300 flex items-center gap-1 mt-0.5">
                      <GitBranch size={11} /> Aparece quando "{pai}" = {(c.condicao.valores || []).join(' ou ')}
                    </p>
                  )}
                </div>
                <button onClick={() => setEditando(c)} className="text-navy-400 hover:text-navy-700 dark:hover:text-white" title="Editar campo">
                  <Pencil size={15} />
                </button>
                <button onClick={() => excluir(c)} className="text-navy-400 hover:text-clay-600" title="Excluir campo">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {editando !== undefined && (
        <EditorCampoModal
          campo={editando}
          lista={customizados}
          proximaOrdem={proximaOrdem}
          aoFechar={() => setEditando(undefined)}
          aoSalvar={() => {
            setEditando(undefined)
            carregar()
          }}
        />
      )}
    </div>
  )
}
