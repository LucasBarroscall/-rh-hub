import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { useComentarios } from '../lib/useComentarios'
import ComentarioCampo from '../components/ComentarioCampo'
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
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
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

export default function CandidateForm() {
  const { opcoes } = useOpcoes()
  const comentarios = useComentarios()
  const [form, setForm] = useState(CAMPOS_INICIAIS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const inicioRef = useRef(Date.now())

  useEffect(() => {
    inicioRef.current = Date.now()
  }, [])

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleChange(e) {
    const { name, value } = e.target
    set(name, value)
  }

  function handleRG(e) {
    set('rg', maskRG(e.target.value))
  }

  function handleCPF(e) {
    set('cpf', maskCPF(e.target.value))
  }

  function handleTelefone(e) {
    set('telefone', maskTelefone(e.target.value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.fonte === 'Indicação' && form.nome_indicador === '') {
      setError('Informe o nome de quem te indicou, ou selecione outra origem.')
      return
    }
    if (form.fonte === 'Redes Sociais' && form.rede_social === '') {
      setError('Selecione de qual rede social você chegou até nós.')
      return
    }
    if (!validarCPF(form.cpf)) {
      setError('O CPF informado não é válido. Confira os números digitados.')
      return
    }

    setSubmitting(true)
    const tempoPreenchimentoSegundos = Math.round((Date.now() - inicioRef.current) / 1000)
    const payload = {
      ...form,
      nome_indicador: form.fonte === 'Indicação' ? form.nome_indicador || null : 'Ninguém',
      rede_social: form.fonte === 'Redes Sociais' ? form.rede_social || null : null,
      data_nascimento: form.data_nascimento || null,
      tempo_preenchimento_segundos: tempoPreenchimentoSegundos,
    }

    const { error } = await supabase.from('candidatos').insert(payload)
    setSubmitting(false)

    if (error) {
      setError(
        error.message?.includes('column')
          ? 'O banco de dados ainda não está atualizado para este formulário. Peça para o analista rodar as atualizações pendentes no Supabase.'
          : 'Não foi possível enviar seu cadastro. Verifique os dados e tente novamente.',
      )
      console.error(error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-navy-50 dark:bg-navy-950 flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <CheckCircle2 className="mx-auto text-sage-500 mb-4" size={44} />
          <h1 className="text-xl font-semibold text-navy-900 dark:text-white mb-2">Cadastro recebido!</h1>
          <p className="text-navy-600 dark:text-navy-300 text-sm">
            Obrigado, {form.nome_completo.split(' ')[0]}. Seus dados foram registrados e você será
            chamado(a) para a entrevista em breve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-50 dark:bg-navy-950 py-6 px-3 sm:py-10 sm:px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2.5 justify-center mb-6 sm:mb-8">
          <div className="h-9 w-9 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
            <Users size={19} className="text-amber-400" />
          </div>
          <div className="text-left">
            <p className="font-display text-lg leading-none text-navy-900 dark:text-white">Cadastro de Candidato</p>
            <p className="text-[11px] text-navy-400 mt-0.5">Processo seletivo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-4 sm:p-8 space-y-6 sm:space-y-7">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">
              Como você chegou até nós
            </h2>
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
                <label className="field-label">Quem te indicou?</label>
                <input
                  name="nome_indicador"
                  required
                  className="field-input"
                  value={form.nome_indicador}
                  onChange={handleChange}
                  placeholder="Nome completo de quem indicou"
                />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Dados pessoais</h2>
            <div>
              <label className="field-label">Nome completo</label>
              <input
                name="nome_completo"
                required
                className="field-input"
                value={form.nome_completo}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Nascimento</label>
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
                  onChange={handleRG}
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
                  onChange={handleCPF}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div>
              <label className="field-label">Nome da mãe</label>
              <input
                name="nome_mae"
                required
                className="field-input"
                value={form.nome_mae}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="field-label">Telefone</label>
              <input
                name="telefone"
                required
                inputMode="numeric"
                className="field-input"
                value={form.telefone}
                onChange={handleTelefone}
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
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Endereço</h2>
            <div>
              <label className="field-label">Rua / Número</label>
              <input
                name="endereco"
                required
                className="field-input"
                value={form.endereco}
                onChange={handleChange}
              />
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
            <h2 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Disponibilidade</h2>
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
            <h2 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Outras informações</h2>
            <SimNao label="Possui veículo próprio?" name="possui_veiculo" value={form.possui_veiculo} onChange={set} />
            <SimNao label="Possui ensino superior?" name="possui_ensino_superior" value={form.possui_ensino_superior} onChange={set} />
            <SimNao
              label="Caso aprovado(a), os treinamentos serão fora do horário da jornada de trabalho, em um dos turnos definidos pela operação. Você concorda?"
              name="concorda_turno_treinamento"
              value={form.concorda_turno_treinamento}
              onChange={set}
            />
            <div>
              <label className="field-label">Observações</label>
              <textarea
                name="observacoes"
                rows={3}
                className="field-input"
                value={form.observacoes}
                onChange={handleChange}
              />
            </div>
          </section>

          {error && <p className="text-sm text-clay-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 text-base">
            {submitting ? 'Enviando…' : 'Enviar cadastro'}
          </button>
        </form>
      </div>
    </div>
  )
}
