import { useState } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { normalizarTexto, normalizarDisponibilidade } from '../lib/formatters'
import CampoFonte from './CampoFonte'
import CheckboxGroup from './CheckboxGroup'
import BoolToggle from './BoolToggle'

export default function EditorCandidato({ candidato, onClose, onSaved, podeExcluir = false }) {
  const [form, setForm] = useState(candidato)
  const [salvando, setSalvando] = useState(false)
  const { opcoes, fontes } = useOpcoes()

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function salvar() {
    setSalvando(true)
    // remove campos calculados/gerados que não podem ser atualizados
    // eslint-disable-next-line no-unused-vars
    const { idade, aprovado_teste, updated_at, ...editavel } = form
    editavel.nome_completo = normalizarTexto(editavel.nome_completo)
    editavel.nome_mae = normalizarTexto(editavel.nome_mae)
    editavel.bairro = normalizarTexto(editavel.bairro)
    editavel.cidade = normalizarTexto(editavel.cidade)
    editavel.disponibilidade_horario_trabalho = normalizarDisponibilidade(
      (editavel.disponibilidade_horario_trabalho || '').split(' | ').filter(Boolean),
      opcoes.disponibilidade_horario_trabalho || [],
    )
    editavel.disponibilidade_horario_treinamento = normalizarDisponibilidade(
      (editavel.disponibilidade_horario_treinamento || '').split(' | ').filter(Boolean),
      opcoes.disponibilidade_horario_treinamento || [],
    )
    const { error } = await supabase.from('candidatos').update(editavel).eq('id', candidato.id)
    setSalvando(false)
    if (!error) onSaved()
  }

  async function excluir() {
    if (!confirm(`Excluir definitivamente o registro de ${candidato.nome_completo}?`)) return
    setSalvando(true)
    const { error } = await supabase.from('candidatos').delete().eq('id', candidato.id)
    setSalvando(false)
    if (!error) onSaved()
  }

  const campos = [
    ['nome_completo', 'Nome completo'],
    ['telefone', 'Telefone'],
    ['email', 'E-mail'],
    ['rg', 'RG'],
    ['cpf', 'CPF'],
    ['data_nascimento', 'Data de nascimento', 'date'],
    ['nome_mae', 'Nome da mãe'],
    ['endereco', 'Endereço (composto)'],
    ['numero', 'Número'],
    ['complemento', 'Complemento'],
    ['bairro', 'Bairro'],
    ['cidade', 'Cidade'],
    ['estado', 'Estado'],
    ['cep', 'CEP'],
    ['data_entrevista', 'Data da entrevista', 'date'],
    ['compliance', 'Compliance'],
    ['data_contato_whatsapp', 'Data do contato (WhatsApp)', 'date'],
    ['data_documentacao_solicitada', 'Data doc. solicitada', 'date'],
    ['data_envio_documentacao', 'Data envio documentação', 'date'],
    ['data_exame', 'Data do exame', 'date'],
    ['data_onboarding', 'Data do onboarding', 'date'],
    ['data_treinamento', 'Data do treinamento', 'date'],
    ['data_alo', 'Data do Alô', 'date'],
    ['wpm', 'WPM', 'number'],
    ['precisao', 'Precisão (%)', 'number'],
    ['observacoes', 'Observações'],
  ]

  return (
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card-elevated w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Editar candidato</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-4 pb-4 border-b border-navy-100 dark:border-navy-800">
          <CampoFonte
            fontes={fontes}
            fonteValor={form.fonte || ''}
            onFonteChange={(v) => set('fonte', v)}
            detalheValor={form.nome_indicador || ''}
            onDetalheChange={(v) => set('nome_indicador', v)}
            subValor={form.rede_social || ''}
            onSubChange={(v) => set('rede_social', v)}
          />
          <div>
            <label className="field-label">Sexo</label>
            <select className="field-select" value={form.sexo || ''} onChange={(e) => set('sexo', e.target.value)}>
              <option value="" disabled>
                Selecione
              </option>
              {(opcoes.sexo || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <CheckboxGroup
            label="Horário de trabalho"
            opcoes={opcoes.disponibilidade_horario_trabalho || []}
            valor={form.disponibilidade_horario_trabalho || ''}
            onChange={(v) => set('disponibilidade_horario_trabalho', v)}
          />
          <CheckboxGroup
            label="Horário de treinamento"
            opcoes={opcoes.disponibilidade_horario_treinamento || []}
            valor={form.disponibilidade_horario_treinamento || ''}
            onChange={(v) => set('disponibilidade_horario_treinamento', v)}
          />
          <div>
            <label className="field-label">Jornada de trabalho</label>
            <select
              className="field-select"
              value={form.disponibilidade_jornada || ''}
              onChange={(e) => set('disponibilidade_jornada', e.target.value)}
            >
              <option value="" disabled>
                Selecione
              </option>
              {(opcoes.disponibilidade_jornada || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {campos.map(([campo, label, tipo]) => (
            <div key={campo}>
              <label className="field-label">{label}</label>
              <input
                type={tipo || 'text'}
                className="field-input"
                value={form[campo] ?? ''}
                onChange={(e) => set(campo, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="pt-5 mt-5 border-t border-navy-100 dark:border-navy-800">
          <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">
            Status do funil — aprovar/reprovar em qualquer etapa
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <BoolToggle
              label="Compareceu na entrevista?"
              value={form.compareceu_entrevista}
              onChange={(v) => set('compareceu_entrevista', v)}
              disabled={salvando}
            />
            <BoolToggle
              label="Aprovado na entrevista?"
              value={form.aprovado_entrevista}
              onChange={(v) => set('aprovado_entrevista', v)}
              disabled={salvando}
              semantic
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <BoolToggle
              label="Realizou o teste de digitação?"
              value={form.teste_realizado}
              onChange={(v) => set('teste_realizado', v)}
              disabled={salvando}
            />
            <div>
              <label className="field-label">Alerta de comportamento</label>
              <input
                className="field-input"
                value={form.alerta_comportamental ?? ''}
                onChange={(e) => set('alerta_comportamental', e.target.value)}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4 mb-4">
            {[
              ['documentacao_solicitada', 'Documentação solicitada?', 'data_documentacao_solicitada'],
              ['compareceu_exame', 'Compareceu no exame?', null],
              ['aprovado_exame', 'Aprovado no exame?', null],
              ['enviou_documentacao', 'Enviou documentação?', 'data_envio_documentacao'],
              ['aprovado_documentacao', 'Aprovado na documentação?', null],
              ['compareceu_onboarding', 'Compareceu no onboarding?', 'data_onboarding'],
              ['compareceu_treinamento', 'Compareceu no treinamento?', 'data_treinamento'],
              ['contatado_whatsapp', 'Contatado via WhatsApp?', 'data_contato_whatsapp'],
              ['compareceu_alo', 'Alô realizado?', 'data_alo'],
            ].map(([campo, label, campoData]) => (
              <BoolToggle
                key={campo}
                label={label}
                value={form[campo]}
                onChange={(v) => {
                  set(campo, v)
                  if (campoData && v === true && !form[campoData]) {
                    set(campoData, new Date().toISOString().slice(0, 10))
                  }
                }}
                disabled={salvando}
              />
            ))}
          </div>
          <p className="text-xs text-navy-400 -mt-2 mb-4">
            Marcar "Sim" nesses campos preenche a data correspondente automaticamente (editável na lista de campos acima).
          </p>
          <div>
            <p className="field-label mb-2">Decisão final</p>
            <div className="grid grid-cols-3 gap-3">
              {['Aprovado', 'Reprovado', 'Pendente'].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={salvando}
                  onClick={() => set('decisao_final', v === 'Pendente' ? null : v)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    (form.decisao_final ?? 'Pendente') === v
                      ? v === 'Aprovado'
                        ? 'border-sage-500 bg-sage-500 text-white'
                        : v === 'Reprovado'
                          ? 'border-clay-500 bg-clay-500 text-white'
                          : 'border-navy-700 bg-navy-700 text-white'
                      : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

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
    </div>
  )
}
