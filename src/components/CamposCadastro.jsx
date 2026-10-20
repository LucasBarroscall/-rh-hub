import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import CampoFonte from './CampoFonte'
import SeletorTurnos from './SeletorTurnos'
import EscolhaUnica from './EscolhaUnica'
import InputSugestao from './InputSugestao'
import CampoPersonalizado from './CampoPersonalizado'
import ComentarioCampo from './ComentarioCampo'
import { useComentariosCompleto } from '../lib/useComentarios'
import { useLegendasOpcoes } from '../lib/useLegendasOpcoes'
import { maskRG, maskCPF, maskTelefone, maskCEP, maskDataBR, normalizarTexto } from '../lib/formatters'
import { VALIDACOES, OPCOES_TREINAMENTO, OPCOES_ESCALA } from '../lib/cadastro'
import { estaVisivel } from '../lib/camposPersonalizados'

const TITULO_SECAO = 'text-base font-semibold text-navy-900 dark:text-white pb-2 border-b border-navy-100 dark:border-navy-800'

function SimNao({ label, value, onChange, comentario, posicaoComentario = 'depois' }) {
  const bloco = comentario && <div className="comentario-rico" dangerouslySetInnerHTML={{ __html: comentario }} />
  return (
    <div>
      <span className="field-label">{label}</span>
      {posicaoComentario === 'antes' && bloco}
      <div className="flex gap-2">
        {['Sim', 'Não'].map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt === 'Sim')}
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
      {posicaoComentario !== 'antes' && bloco}
    </div>
  )
}

// Todos os campos do cadastro do candidato — usado no formulário público, no
// "Adicionar candidato" e na edição, para que as três telas tenham exatamente
// o mesmo front, as mesmas máscaras e as mesmas validações.
export default function CamposCadastro({ form, setForm, opcoes, fontes, customizados, ocultos, cep, avisar }) {
  const { comentarios, titulos, posicoes } = useComentariosCompleto()
  const { legendas } = useLegendasOpcoes()
  const [invalidos, setInvalidos] = useState(new Set())

  const set = (nome, valor) => setForm((f) => ({ ...f, [nome]: valor }))

  function validarAoSair(campo, valor) {
    const regra = VALIDACOES[campo]
    if (!regra || !valor) return
    const ok = regra.teste(valor)
    setInvalidos((s) => {
      const novo = new Set(s)
      if (ok) novo.delete(campo)
      else novo.add(campo)
      return novo
    })
    if (!ok) avisar(regra.mensagem)
  }

  const erro = (campo) => (invalidos.has(campo) ? 'border-clay-500 ring-2 ring-clay-500/20' : '')

  const campo = (nome, rotuloPadrao, filho) => (
    <div className="flex flex-col">
      <label className="field-label">{titulos[nome] || rotuloPadrao}</label>
      {posicoes[nome] === 'antes' && <ComentarioCampo texto={comentarios[nome]} posicao="antes" />}
      {filho}
      {posicoes[nome] !== 'antes' && <ComentarioCampo texto={comentarios[nome]} posicao={posicoes[nome]} />}
    </div>
  )

  const bloqueado = cep.status === 'pendente'
  const readOnly = cep.status === 'auto'
  const manual = cep.status === 'manual'
  const classeEndereco = 'field-input disabled:opacity-60 disabled:cursor-not-allowed'

  function textoEndereco(nome, label) {
    const props = {
      className: classeEndereco,
      value: form[nome],
      onChange: (e) => set(nome, e.target.value),
      onBlur: readOnly ? undefined : () => set(nome, normalizarTexto(form[nome])),
      placeholder: bloqueado && nome === 'logradouro' ? 'Informe o CEP primeiro' : '',
    }
    return (
      <div className="flex flex-col">
        <label className="field-label">{label}</label>
        {manual ? (
          <InputSugestao campo={nome} {...props} />
        ) : (
          <input {...props} readOnly={readOnly} disabled={bloqueado || cep.carregando} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      <section className="space-y-4">
        <h2 className={TITULO_SECAO}>Como você chegou até nós</h2>
        <CampoFonte
          fontes={fontes}
          fonteValor={form.fonte}
          onFonteChange={(v) => setForm((f) => ({ ...f, fonte: v, nome_indicador: '', rede_social: '' }))}
          detalheValor={form.nome_indicador}
          onDetalheChange={(v) => set('nome_indicador', v)}
          onDetalheBlur={() => {
            const v = normalizarTexto(form.nome_indicador)
            set('nome_indicador', v)
            validarAoSair('nome_indicador', v)
          }}
          detalheInvalido={invalidos.has('nome_indicador')}
          subValor={form.rede_social}
          onSubChange={(v) => set('rede_social', v)}
          comentario={comentarios.fonte}
          posicaoComentario={posicoes.fonte}
          rotulo={titulos.fonte}
        />
      </section>

      <section className="space-y-4">
        <h2 className={TITULO_SECAO}>Dados pessoais</h2>
        {campo(
          'nome_completo',
          'Nome completo',
          <input
            className={`field-input ${erro('nome_completo')}`}
            value={form.nome_completo}
            onChange={(e) => set('nome_completo', e.target.value)}
            onBlur={() => {
              const v = normalizarTexto(form.nome_completo)
              set('nome_completo', v)
              validarAoSair('nome_completo', v)
            }}
          />,
        )}
        <div className="grid grid-cols-2 gap-3">
          {campo(
            'data_nascimento',
            'Nascimento',
            <input
              type="text"
              inputMode="numeric"
              className={`field-input ${erro('data_nascimento')}`}
              placeholder="dd/mm/aaaa"
              value={form.data_nascimento}
              onChange={(e) => set('data_nascimento', maskDataBR(e.target.value))}
              onBlur={() => validarAoSair('data_nascimento', form.data_nascimento)}
            />,
          )}
          {campo(
            'sexo',
            'Sexo',
            <select className="field-select" value={form.sexo} onChange={(e) => set('sexo', e.target.value)}>
              <option value="" disabled>
                Selecione
              </option>
              {(opcoes.sexo || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>,
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {campo(
            'rg',
            'RG',
            <input
              inputMode="numeric"
              className={`field-input ${erro('rg')}`}
              value={form.rg}
              onChange={(e) => set('rg', maskRG(e.target.value))}
              onBlur={() => validarAoSair('rg', form.rg)}
              placeholder="Somente números"
            />,
          )}
          {campo(
            'cpf',
            'CPF',
            <input
              inputMode="numeric"
              className={`field-input ${erro('cpf')}`}
              value={form.cpf}
              onChange={(e) => set('cpf', maskCPF(e.target.value))}
              onBlur={() => validarAoSair('cpf', form.cpf)}
              placeholder="000.000.000-00"
            />,
          )}
        </div>
        {campo(
          'nome_mae',
          'Nome da mãe',
          <input
            className={`field-input ${erro('nome_mae')}`}
            value={form.nome_mae}
            onChange={(e) => set('nome_mae', e.target.value)}
            onBlur={() => {
              const v = normalizarTexto(form.nome_mae)
              set('nome_mae', v)
              validarAoSair('nome_mae', v)
            }}
          />,
        )}
        {campo(
          'telefone',
          'Telefone',
          <input
            inputMode="numeric"
            className={`field-input ${erro('telefone')}`}
            value={form.telefone}
            onChange={(e) => set('telefone', maskTelefone(e.target.value))}
            onBlur={() => validarAoSair('telefone', form.telefone)}
            placeholder="(00) 0 0000-0000"
          />,
        )}
        {campo(
          'email',
          'E-mail',
          <input
            type="email"
            className={`field-input ${erro('email')}`}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => validarAoSair('email', form.email)}
            placeholder="seuemail@exemplo.com"
          />,
        )}
      </section>

      <section className="space-y-4">
        <h2 className={TITULO_SECAO}>Endereço</h2>
        <div className="flex flex-col">
          <label className="field-label">{titulos.cep || 'CEP'}</label>
          {posicoes.cep === 'antes' && <ComentarioCampo texto={comentarios.cep} posicao="antes" />}
          <div className="relative">
            <input
              inputMode="numeric"
              className={`field-input ${erro('cep')}`}
              value={form.cep}
              onChange={(e) => {
                const novo = maskCEP(e.target.value)
                set('cep', novo)
                cep.aoMudarCep(novo)
              }}
              onBlur={() => {
                cep.aoSairCep(form.cep)
                validarAoSair('cep', form.cep)
              }}
              placeholder="00000-000"
            />
            {cep.carregando && <Loader2 size={16} className="animate-spin text-navy-400 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>
          {cep.aviso && <p className="text-xs text-clay-600 mt-1.5">{cep.aviso}</p>}
          {posicoes.cep !== 'antes' && <ComentarioCampo texto={comentarios.cep} posicao={posicoes.cep} />}
        </div>
        {textoEndereco('logradouro', titulos.logradouro || 'Rua / Logradouro')}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="field-label">{titulos.numero || 'Número'}</label>
            <input
              ref={cep.numeroRef}
              className="field-input"
              value={form.numero}
              disabled={bloqueado || cep.carregando}
              onChange={(e) => set('numero', e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="field-label">{titulos.complemento || 'Complemento'}</label>
            <input
              className="field-input"
              value={form.complemento}
              disabled={bloqueado || cep.carregando}
              onChange={(e) => set('complemento', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {textoEndereco('bairro', titulos.bairro || 'Bairro')}
          {textoEndereco('cidade', titulos.cidade || 'Cidade')}
        </div>
        <div className="flex flex-col">
          <label className="field-label">{titulos.estado || 'Estado'}</label>
          <input
            className={`${classeEndereco} max-w-[100px]`}
            value={form.estado}
            readOnly={readOnly}
            disabled={bloqueado || cep.carregando}
            onChange={(e) => set('estado', e.target.value.toUpperCase().slice(0, 2))}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={TITULO_SECAO}>Disponibilidade</h2>
        <SeletorTurnos
          label={titulos.disponibilidade_horario_trabalho || 'Horário de trabalho'}
          valorInicial={form.disponibilidade_horario_trabalho}
          onChange={(v) => set('disponibilidade_horario_trabalho', v)}
          comentario={comentarios.disponibilidade_horario_trabalho}
          posicaoComentario={posicoes.disponibilidade_horario_trabalho}
        />
        <EscolhaUnica
          label={titulos.disponibilidade_horario_treinamento || 'Disponibilidade para treinamento'}
          opcoes={OPCOES_TREINAMENTO}
          legendas={legendas.disponibilidade_horario_treinamento}
          valor={form.disponibilidade_horario_treinamento}
          onChange={(v) => set('disponibilidade_horario_treinamento', v)}
          comentario={comentarios.disponibilidade_horario_treinamento}
          posicaoComentario={posicoes.disponibilidade_horario_treinamento}
        />
        <EscolhaUnica
          label={titulos.disponibilidade_jornada || 'Escala de trabalho'}
          opcoes={OPCOES_ESCALA}
          legendas={legendas.disponibilidade_jornada}
          valor={form.disponibilidade_jornada}
          onChange={(v) => set('disponibilidade_jornada', v)}
          comentario={comentarios.disponibilidade_jornada}
          posicaoComentario={posicoes.disponibilidade_jornada}
        />
      </section>

      <section className="space-y-4">
        <h2 className={TITULO_SECAO}>Outras informações</h2>
        {!ocultos.has('possui_veiculo') && (
          <SimNao
            label={titulos.possui_veiculo || 'Possui veículo próprio?'}
            value={form.possui_veiculo}
            onChange={(v) => set('possui_veiculo', v)}
            comentario={comentarios.possui_veiculo}
            posicaoComentario={posicoes.possui_veiculo}
          />
        )}
        {!ocultos.has('possui_ensino_superior') && (
          <SimNao
            label={titulos.possui_ensino_superior || 'Possui ensino superior?'}
            value={form.possui_ensino_superior}
            onChange={(v) => set('possui_ensino_superior', v)}
            comentario={comentarios.possui_ensino_superior}
            posicaoComentario={posicoes.possui_ensino_superior}
          />
        )}
        {!ocultos.has('concorda_turno_treinamento') && (
          <SimNao
            label={
              titulos.concorda_turno_treinamento ||
              'Caso aprovado(a), os treinamentos serão fora do horário da jornada de trabalho, em um dos turnos definidos pela operação. Você concorda?'
            }
            value={form.concorda_turno_treinamento}
            onChange={(v) => set('concorda_turno_treinamento', v)}
            comentario={comentarios.concorda_turno_treinamento}
            posicaoComentario={posicoes.concorda_turno_treinamento}
          />
        )}
        {customizados
          .filter((c) => estaVisivel(c, customizados, form))
          .map((c) => (
            <CampoPersonalizado
              key={c.id}
              campo={c}
              titulo={titulos[c.chave]}
              comentario={comentarios[c.chave]}
              posicao={posicoes[c.chave]}
              legendas={legendas[c.chave]}
              valor={(form.respostas_extras || {})[c.chave]}
              onChange={(v) => setForm((f) => ({ ...f, respostas_extras: { ...(f.respostas_extras || {}), [c.chave]: v } }))}
            />
          ))}
        {!ocultos.has('observacoes') &&
          campo(
            'observacoes',
            'Observações',
            <textarea rows={3} className="field-input" value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />,
          )}
      </section>
    </div>
  )
}
