import { useRef, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { useComentarios } from '../lib/useComentarios'
import { useViaCep } from '../lib/useViaCep'
import ComentarioCampo from './ComentarioCampo'
import CampoFonte from './CampoFonte'
import CheckboxGroup from './CheckboxGroup'
import {
  maskRG,
  maskCPF,
  maskTelefone,
  maskCEP,
  maskDataBR,
  dataBRParaISO,
  validarCPF,
  validarDataBR,
  normalizarTexto,
  normalizarDisponibilidade,
} from '../lib/formatters'

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
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
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
  const { opcoes, fontes } = useOpcoes()
  const comentarios = useComentarios()
  const { consultar, carregando: carregandoCep, erro: erroCep, limparErro } = useViaCep()
  const [form, setForm] = useState(CAMPOS_INICIAIS)
  const [enderecoStatus, setEnderecoStatus] = useState('pendente')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const numeroRef = useRef(null)
  const consultandoRef = useRef(false)

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function normalizarAoSair(campo) {
    return () => set(campo, normalizarTexto(form[campo]))
  }

  function handleChange(e) {
    set(e.target.name, e.target.value)
  }

  async function consultarCep(valorCep) {
    const digitos = valorCep.replace(/\D/g, '')
    if (digitos.length !== 8 || consultandoRef.current) return
    consultandoRef.current = true
    const dados = await consultar(valorCep)
    consultandoRef.current = false
    if (dados) {
      setForm((f) => ({
        ...f,
        logradouro: dados.logradouro || '',
        bairro: dados.bairro || '',
        cidade: dados.localidade || '',
        estado: dados.uf || '',
      }))
      setEnderecoStatus('auto')
      setTimeout(() => numeroRef.current?.focus(), 50)
    } else {
      setForm((f) => ({ ...f, logradouro: '', bairro: '', cidade: '', estado: '' }))
      setEnderecoStatus('manual')
    }
  }

  function handleCep(e) {
    const novo = maskCEP(e.target.value)
    set('cep', novo)
    limparErro()
    if (novo.replace(/\D/g, '').length === 8) consultarCep(novo)
  }

  function handleCepBlur() {
    if (form.cep.replace(/\D/g, '').length === 8 && enderecoStatus === 'pendente') consultarCep(form.cep)
  }

  const enderecoBloqueado = enderecoStatus === 'pendente'
  const enderecoReadOnly = enderecoStatus === 'auto'

  function mudarFonte(valor) {
    setForm((f) => ({ ...f, fonte: valor, nome_indicador: '', rede_social: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const fonteSelecionada = fontes.find((f) => f.valor === form.fonte)
    if (fonteSelecionada?.tipo_dependencia === 'texto' && !form.nome_indicador.trim()) {
      setError(`Preencha o campo "${fonteSelecionada.rotulo_dependencia || 'detalhe'}".`)
      return
    }
    if (fonteSelecionada?.tipo_dependencia === 'lista' && !form.rede_social) {
      setError(`Selecione uma opção em "${fonteSelecionada.rotulo_dependencia || 'detalhe'}".`)
      return
    }
    if (!validarCPF(form.cpf)) {
      setError('O CPF informado não é válido. Confira os números digitados.')
      return
    }
    if (!validarDataBR(form.data_nascimento)) {
      setError('Data de nascimento inválida. Use o formato dd/mm/aaaa.')
      return
    }
    if (enderecoBloqueado || !form.logradouro || !form.cidade) {
      setError('Preencha o CEP para localizar o endereço.')
      return
    }
    if (!form.numero.trim()) {
      setError('Preencha o número do endereço.')
      return
    }
    if (!form.disponibilidade_horario_trabalho) {
      setError('Selecione ao menos uma opção de horário de trabalho.')
      return
    }
    if (!form.disponibilidade_horario_treinamento) {
      setError('Selecione ao menos uma opção de horário de treinamento.')
      return
    }

    setSubmitting(true)
    const enderecoComposto = `${normalizarTexto(form.logradouro)}, ${form.numero.trim()}${
      form.complemento.trim() ? ' - ' + normalizarTexto(form.complemento) : ''
    }`
    const payload = {
      ...form,
      nome_completo: normalizarTexto(form.nome_completo),
      nome_mae: normalizarTexto(form.nome_mae),
      nome_indicador: fonteSelecionada?.tipo_dependencia === 'texto' ? normalizarTexto(form.nome_indicador) : null,
      rede_social: fonteSelecionada?.tipo_dependencia === 'lista' ? form.rede_social : null,
      logradouro: normalizarTexto(form.logradouro),
      bairro: normalizarTexto(form.bairro),
      cidade: normalizarTexto(form.cidade),
      endereco: enderecoComposto,
      data_nascimento: dataBRParaISO(form.data_nascimento),
      disponibilidade_horario_trabalho: normalizarDisponibilidade(
        form.disponibilidade_horario_trabalho.split(' | ').filter(Boolean),
        opcoes.disponibilidade_horario_trabalho || [],
      ),
      disponibilidade_horario_treinamento: normalizarDisponibilidade(
        form.disponibilidade_horario_treinamento.split(' | ').filter(Boolean),
        opcoes.disponibilidade_horario_treinamento || [],
      ),
    }
    const { error } = await supabase.from('candidatos').insert(payload)
    setSubmitting(false)
    if (error) {
      setError(
        error.message?.includes('column')
          ? 'O banco de dados ainda não está atualizado — rode as atualizações pendentes no Supabase.'
          : 'Não foi possível salvar. Confira os campos obrigatórios.',
      )
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
            <CampoFonte
              fontes={fontes}
              fonteValor={form.fonte}
              onFonteChange={mudarFonte}
              detalheValor={form.nome_indicador}
              onDetalheChange={(v) => set('nome_indicador', v)}
              subValor={form.rede_social}
              onSubChange={(v) => set('rede_social', v)}
              comentario={comentarios.fonte}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Dados pessoais</h3>
            <div>
              <label className="field-label">Nome completo</label>
              <input
                name="nome_completo"
                required
                className="field-input"
                value={form.nome_completo}
                onChange={handleChange}
                onBlur={normalizarAoSair('nome_completo')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Data de nascimento</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="data_nascimento"
                  required
                  className="field-input"
                  placeholder="dd/mm/aaaa"
                  value={form.data_nascimento}
                  onChange={(e) => set('data_nascimento', maskDataBR(e.target.value))}
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
              <input
                name="nome_mae"
                required
                className="field-input"
                value={form.nome_mae}
                onChange={handleChange}
                onBlur={normalizarAoSair('nome_mae')}
              />
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
              <label className="field-label">CEP</label>
              <div className="relative">
                <input
                  name="cep"
                  required
                  inputMode="numeric"
                  className="field-input"
                  value={form.cep}
                  onChange={handleCep}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                />
                {carregandoCep && (
                  <Loader2 size={16} className="animate-spin text-navy-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {erroCep && <p className="text-xs text-clay-600 mt-1.5">{erroCep}</p>}
            </div>
            <div>
              <label className="field-label">Rua / Logradouro</label>
              <input
                className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                value={form.logradouro}
                readOnly={enderecoReadOnly}
                disabled={enderecoBloqueado || carregandoCep}
                onChange={(e) => set('logradouro', e.target.value)}
                onBlur={enderecoReadOnly ? undefined : normalizarAoSair('logradouro')}
                placeholder={enderecoBloqueado ? 'Preencha o CEP primeiro' : ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Número</label>
                <input
                  ref={numeroRef}
                  className="field-input"
                  value={form.numero}
                  disabled={enderecoBloqueado || carregandoCep}
                  onChange={(e) => set('numero', e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Complemento</label>
                <input
                  className="field-input"
                  value={form.complemento}
                  disabled={enderecoBloqueado || carregandoCep}
                  onChange={(e) => set('complemento', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Bairro</label>
                <input
                  className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.bairro}
                  readOnly={enderecoReadOnly}
                  disabled={enderecoBloqueado || carregandoCep}
                  onChange={(e) => set('bairro', e.target.value)}
                  onBlur={enderecoReadOnly ? undefined : normalizarAoSair('bairro')}
                />
              </div>
              <div>
                <label className="field-label">Cidade</label>
                <input
                  className="field-input disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.cidade}
                  readOnly={enderecoReadOnly}
                  disabled={enderecoBloqueado || carregandoCep}
                  onChange={(e) => set('cidade', e.target.value)}
                  onBlur={enderecoReadOnly ? undefined : normalizarAoSair('cidade')}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Estado</label>
              <input
                className="field-input disabled:opacity-60 disabled:cursor-not-allowed max-w-[100px]"
                value={form.estado}
                readOnly={enderecoReadOnly}
                disabled={enderecoBloqueado || carregandoCep}
                onChange={(e) => set('estado', e.target.value.toUpperCase().slice(0, 2))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-300 uppercase tracking-wide">Disponibilidade</h3>
            <CheckboxGroup
              label="Horário de trabalho (pode marcar mais de um)"
              opcoes={opcoes.disponibilidade_horario_trabalho || []}
              valor={form.disponibilidade_horario_trabalho}
              onChange={(v) => set('disponibilidade_horario_trabalho', v)}
            />
            <CheckboxGroup
              label="Horário de treinamento (pode marcar mais de um)"
              opcoes={opcoes.disponibilidade_horario_treinamento || []}
              valor={form.disponibilidade_horario_treinamento}
              onChange={(v) => set('disponibilidade_horario_treinamento', v)}
            />
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
