import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { useComentarios } from '../lib/useComentarios'
import ComentarioCampo from './ComentarioCampo'
import { maskRG, maskCPF, maskTelefone, validarCPF } from '../lib/formatters'

const CAMPOS_INICIAIS = {
  fonte: '',
  rede_social: '',
  nome_indicador: '',
  nome_completo: '',
  telefone: '',
  rg: '',
  cpf: '',
  data_nascimento: '',
  sexo: '',
  nome_mae: '',
  endereco: '',
  bairro: '',
  cidade: '',
  cep: '',
  email: '',
  disponibilidade_horario_trabalho: '',
  disponibilidade_horario_treinamento: '',
  disponibilidade_jornada: '',
  possui_veiculo: '',
  concorda_turno_treinamento: '',
  possui_ensino_superior: '',
  observacoes: '',
}

function SimNao({ label, value, onChange, name }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex gap-2">
        {['Sim', 'Não'].map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(name, opt === 'Sim')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              value === (opt === 'Sim')
                ? 'border-navy-700 bg-navy-700 text-white'
                : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AddCandidateModal({ onClose, onSaved }) {
  const { opcoes } = useOpcoes()
  const comentarios = useComentarios()
  const [form, setForm] = useState(CAMPOS_INICIAIS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleChange(e) {
    set(e.target.name, e.target.value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.fonte === 'Indicação' && form.nome_indicador === '') {
      setError('Informe o nome de quem indicou, ou selecione outra origem.')
      return
    }
    if (form.fonte === 'Redes Sociais' && form.rede_social === '') {
      setError('Selecione de qual rede social o candidato veio.')
      return
    }
    if (!validarCPF(form.cpf)) {
      setError('O CPF informado não é válido. Confira os números digitados.')
      return
    }

    setSubmitting(true)
    const payload = {
      ...form,
      nome_indicador: form.fonte === 'Indicação' ? form.nome_indicador || null : 'Ninguém',
      rede_social: form.fonte === 'Redes Sociais' ? form.rede_social || null : null,
      data_nascimento: form.data_nascimento || null,
    }
    const { error } = await supabase.from('candidatos').insert(payload)
    setSubmitting(false)
    if (error) {
      setError('Não foi possível salvar. Confira os campos obrigatórios.')
      console.error(error)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Adicionar candidato</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Origem</h3>
            <div>
              <label className="field-label">Fonte</label>
              <select name="fonte" required className="field-select" value={form.fonte} onChange={handleChange}>
                <option value="" disabled>
                  Selecione
                </option>
                {(opcoes.fonte || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ComentarioCampo texto={comentarios.fonte} />
            </div>
            {form.fonte === 'Redes Sociais' && (
              <div>
                <label className="field-label">Qual rede social?</label>
                <select
                  name="rede_social"
                  required
                  className="field-select"
                  value={form.rede_social}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {(opcoes.rede_social || []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.fonte === 'Indicação' && (
              <div>
                <label className="field-label">Quem indicou?</label>
                <input
                  name="nome_indicador"
                  required
                  className="field-input"
                  value={form.nome_indicador}
                  onChange={handleChange}
                />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Dados pessoais</h3>
            <div>
              <label className="field-label">Nome completo</label>
              <input name="nome_completo" required className="field-input" value={form.nome_completo} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Data de nascimento</label>
                <input
                  type="date"
                  name="data_nascimento"
                  required
                  className="field-input"
                  value={form.data_nascimento}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="field-label">Sexo</label>
                <select name="sexo" required className="field-select" value={form.sexo} onChange={handleChange}>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">RG</label>
                <input
                  name="rg"
                  required
                  inputMode="numeric"
                  className="field-input"
                  value={form.rg}
                  onChange={(e) => set('rg', maskRG(e.target.value))}
                  placeholder="Somente números"
                />
              </div>
              <div>
                <label className="field-label">CPF</label>
                <input
                  name="cpf"
                  required
                  inputMode="numeric"
                  className="field-input"
                  value={form.cpf}
                  onChange={(e) => set('cpf', maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div>
              <label className="field-label">Nome da mãe</label>
              <input name="nome_mae" required className="field-input" value={form.nome_mae} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Telefone</label>
                <input
                  name="telefone"
                  required
                  inputMode="numeric"
                  className="field-input"
                  value={form.telefone}
                  onChange={(e) => set('telefone', maskTelefone(e.target.value))}
                  placeholder="(00) 0 0000-0000"
                />
              </div>
              <div>
                <label className="field-label">E-mail</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="field-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seuemail@exemplo.com"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Endereço</h3>
            <div>
              <label className="field-label">Rua / Número</label>
              <input name="endereco" required className="field-input" value={form.endereco} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Bairro</label>
                <input name="bairro" required className="field-input" value={form.bairro} onChange={handleChange} />
              </div>
              <div>
                <label className="field-label">Cidade</label>
                <input name="cidade" required className="field-input" value={form.cidade} onChange={handleChange} />
              </div>
            </div>
            <div>
              <label className="field-label">CEP</label>
              <input name="cep" required className="field-input" value={form.cep} onChange={handleChange} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Disponibilidade</h3>
            <div>
              <label className="field-label">Horário de trabalho</label>
              <select
                name="disponibilidade_horario_trabalho"
                required
                className="field-select"
                value={form.disponibilidade_horario_trabalho}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {(opcoes.disponibilidade_horario_trabalho || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Horário de treinamento</label>
              <select
                name="disponibilidade_horario_treinamento"
                required
                className="field-select"
                value={form.disponibilidade_horario_treinamento}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {(opcoes.disponibilidade_horario_treinamento || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Jornada de trabalho</label>
              <select
                name="disponibilidade_jornada"
                required
                className="field-select"
                value={form.disponibilidade_jornada}
                onChange={handleChange}
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
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Outras informações</h3>
            <SimNao label="Possui veículo próprio?" name="possui_veiculo" value={form.possui_veiculo} onChange={set} />
            <SimNao label="Possui ensino superior?" name="possui_ensino_superior" value={form.possui_ensino_superior} onChange={set} />
            <SimNao
              label="Concorda com o turno de treinamento fora da jornada?"
              name="concorda_turno_treinamento"
              value={form.concorda_turno_treinamento}
              onChange={set}
            />
            <div>
              <label className="field-label">Observações</label>
              <textarea name="observacoes" rows={3} className="field-input" value={form.observacoes} onChange={handleChange} />
            </div>
          </section>

          {error && <p className="text-sm text-clay-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-navy-100 dark:border-navy-800">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Salvando…' : 'Adicionar candidato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
