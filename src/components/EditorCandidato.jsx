import { useState } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { useCamposFormulario } from '../lib/useCamposFormulario'
import { useCepEndereco } from '../lib/useCepEndereco'
import { useRegrasTeste, avaliarTeste } from '../lib/regrasTeste'
import { candidatoParaForm, validarCadastro, montarPayload, OPCOES_COMPLIANCE } from '../lib/cadastro'
import CamposCadastro from './CamposCadastro'
import BoolToggle from './BoolToggle'
import Toast from './Toast'

const DATAS_FUNIL = [
  ['data_entrevista', 'Data da entrevista'],
  ['data_contato_whatsapp', 'Data do contato (WhatsApp)'],
  ['data_documentacao_solicitada', 'Data doc. solicitada'],
  ['data_envio_documentacao', 'Data envio documentação'],
  ['data_exame', 'Data do exame'],
  ['data_onboarding', 'Data do onboarding'],
  ['data_treinamento', 'Data do treinamento'],
  ['data_alo', 'Data do Alô'],
]

const numeroOuNull = (v) => (v === '' || v == null ? null : Math.round(Number(v)))

// Edição completa do candidato: mesmo front e mesmas validações do cadastro,
// mais o status do funil. Só quem tem podeExcluir (analista) vê o botão de excluir.
export default function EditorCandidato({ candidato, onClose, onSaved, podeExcluir = false }) {
  const [form, setForm] = useState(() => candidatoParaForm(candidato))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')
  const { opcoes, fontes } = useOpcoes()
  const { customizados, ocultos } = useCamposFormulario()
  const { regras } = useRegrasTeste()
  const cep = useCepEndereco(setForm, candidato.logradouro ? 'auto' : 'pendente')

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function salvar() {
    setErro('')
    const msg = validarCadastro(form, { fontes, customizados, ocultos, enderecoStatus: cep.status, estrito: false })
    if (msg) {
      setErro(msg)
      setToast(msg)
      return
    }
    setSalvando(true)
    // eslint-disable-next-line no-unused-vars
    const { idade, updated_at, cpf_digitos, ...resto } = { ...form, ...montarPayload(form, { fontes, ocultos, customizados }) }
    resto.wpm = numeroOuNull(resto.wpm)
    resto.precisao = numeroOuNull(resto.precisao)
    // Recalcula o resultado do teste só se WPM/Precisão mudaram (a regra vigente
    // vale daqui pra frente; resultados antigos não mudam sozinhos).
    if (resto.teste_realizado === true && resto.wpm != null && resto.precisao != null && (resto.wpm !== candidato.wpm || resto.precisao !== candidato.precisao)) {
      const aval = avaliarTeste(resto.wpm, resto.precisao, regras)
      if (aval) {
        resto.aprovado_teste = aval.aprovado
        resto.resultado_teste = aval.resultado
      }
    }
    DATAS_FUNIL.forEach(([k]) => {
      if (resto[k] === '') resto[k] = null
    })
    const { error } = await supabase.from('candidatos').update(resto).eq('id', candidato.id)
    setSalvando(false)
    if (error) {
      setErro(error.message?.includes('CPF_DUPLICADO_HOJE') ? 'Este CPF já foi cadastrado hoje.' : `Não foi possível salvar: ${error.message}`)
      return
    }
    onSaved()
  }

  async function excluir() {
    if (!confirm(`Excluir definitivamente o registro de ${candidato.nome_completo}?`)) return
    setSalvando(true)
    const { error } = await supabase.from('candidatos').delete().eq('id', candidato.id)
    setSalvando(false)
    if (!error) onSaved()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card-elevated w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Editar candidato</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <CamposCadastro
          form={form}
          setForm={setForm}
          opcoes={opcoes}
          fontes={fontes}
          customizados={customizados}
          ocultos={ocultos}
          cep={cep}
          avisar={setToast}
        />

        <div className="pt-5 mt-6 border-t border-navy-100 dark:border-navy-800">
          <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Etapas, datas e resultados</h3>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {DATAS_FUNIL.map(([campo, label]) => (
              <div key={campo}>
                <label className="field-label">{label}</label>
                <input type="date" className="field-input" value={form[campo] ?? ''} onChange={(e) => set(campo, e.target.value)} />
              </div>
            ))}
            <div>
              <label className="field-label">WPM (0 a 256)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="256"
                className="field-input"
                value={form.wpm ?? ''}
                onChange={(e) => set('wpm', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Precisão % (0 a 100)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="field-input"
                value={form.precisao ?? ''}
                onChange={(e) => set('precisao', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Resultado do teste</label>
              <input className="field-input" value={form.resultado_teste ?? ''} readOnly placeholder="calculado pela regra do teste" />
            </div>
            <div>
              <label className="field-label">Alerta de comportamento</label>
              <input className="field-input" value={form.alerta_comportamental ?? ''} onChange={(e) => set('alerta_comportamental', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Compliance</label>
              <select className="field-select" value={form.compliance ?? ''} onChange={(e) => set('compliance', e.target.value || null)}>
                <option value="">—</option>
                {OPCOES_COMPLIANCE.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Produto</label>
              <select className="field-select" value={form.produto ?? ''} onChange={(e) => set('produto', e.target.value || null)}>
                <option value="">—</option>
                {(opcoes.produto || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4 mb-4">
            {[
              ['compareceu_entrevista', 'Compareceu na entrevista?', null],
              ['aprovado_entrevista', 'Aprovado na entrevista?', null],
              ['teste_realizado', 'Realizou o teste de digitação?', null],
              ['contatado_whatsapp', 'Contatado via WhatsApp?', 'data_contato_whatsapp'],
              ['documentacao_solicitada', 'Documentação solicitada?', 'data_documentacao_solicitada'],
              ['enviou_documentacao', 'Documentação completa enviada?', 'data_envio_documentacao'],
              ['aprovado_documentacao', 'Aprovado na documentação?', null],
              ['compareceu_exame', 'Compareceu no exame?', null],
              ['aprovado_exame', 'Aprovado no exame?', null],
              ['compareceu_onboarding', 'Compareceu no onboarding?', 'data_onboarding'],
              ['compareceu_treinamento', 'Compareceu no treinamento?', 'data_treinamento'],
              ['compareceu_alo', 'Alô realizado? (finaliza o processo com sucesso)', 'data_alo'],
            ].map(([campo, label, campoData]) => (
              <BoolToggle
                key={campo}
                label={label}
                value={form[campo]}
                semantic={campo.startsWith('aprovado_')}
                disabled={salvando}
                onChange={(v) => {
                  set(campo, v)
                  if (campoData && v === true && !form[campoData]) set(campoData, new Date().toISOString().slice(0, 10))
                }}
              />
            ))}
          </div>

          <div>
            <p className="field-label mb-2">Reprovação (em qualquer etapa)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Reprovado', 'Reprovar candidato'],
                [null, 'Sem reprovação'],
              ].map(([valor, label]) => (
                <button
                  key={label}
                  type="button"
                  disabled={salvando}
                  onClick={() => set('decisao_final', valor)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    (form.decisao_final === 'Reprovado' ? 'Reprovado' : null) === valor
                      ? valor === 'Reprovado'
                        ? 'border-clay-500 bg-clay-500 text-white'
                        : 'border-navy-700 bg-navy-700 text-white'
                      : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-clay-600 mt-4">{erro}</p>}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
          {podeExcluir ? (
            <button onClick={excluir} disabled={salvando} className="flex items-center gap-1.5 text-sm text-clay-600 hover:text-clay-700">
              <Trash2 size={15} /> Excluir registro
            </button>
          ) : (
            <p className="text-xs text-navy-400">Só o analista pode excluir candidatos.</p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando} className="btn-primary flex items-center gap-1.5">
              <Save size={15} /> {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
      <Toast mensagem={toast} onFechar={() => setToast('')} />
    </div>
  )
}
