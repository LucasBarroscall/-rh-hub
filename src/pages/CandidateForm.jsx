import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { useConfigFormulario } from '../lib/useConfigFormulario'
import { useCamposFormulario } from '../lib/useCamposFormulario'
import { useCepEndereco } from '../lib/useCepEndereco'
import { CAMPOS_INICIAIS, validarCadastro, montarPayload } from '../lib/cadastro'
import CamposCadastro from '../components/CamposCadastro'
import Toast from '../components/Toast'

const LOGO = 'https://callink.com.br/vagas/wp-content/uploads/2022/10/callink-azul-1.png'

export default function CandidateForm() {
  const { opcoes, fontes } = useOpcoes()
  const { customizados, ocultos } = useCamposFormulario()
  const { config } = useConfigFormulario()
  const [form, setForm] = useState(CAMPOS_INICIAIS)
  const cep = useCepEndereco(setForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState('')
  const inicioRef = useRef(Date.now())

  useEffect(() => {
    inicioRef.current = Date.now()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const msg = validarCadastro(form, { fontes, customizados, ocultos, enderecoStatus: cep.status, estrito: true })
    if (msg) {
      setError(msg)
      setToast(msg)
      return
    }

    setSubmitting(true)
    const payload = {
      ...montarPayload(form, { fontes, ocultos }),
      tempo_preenchimento_segundos: Math.round((Date.now() - inicioRef.current) / 1000),
    }
    const { error: erroInsert } = await supabase.from('candidatos').insert(payload)
    setSubmitting(false)

    if (erroInsert) {
      let texto
      if (erroInsert.message?.includes('CPF_DUPLICADO_HOJE')) {
        texto = 'Este CPF já foi cadastrado hoje. Não é possível se cadastrar mais de uma vez no mesmo dia.'
        setToast(texto)
      } else if (erroInsert.message?.includes('column')) {
        texto = 'O banco de dados ainda não está atualizado para este formulário. Peça para o analista rodar as atualizações pendentes no Supabase.'
      } else {
        texto = 'Não foi possível enviar seu cadastro. Verifique os dados e tente novamente.'
      }
      setError(texto)
      console.error(erroInsert)
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
            Obrigado, {form.nome_completo.split(' ')[0]}. Seus dados foram registrados e você será chamado(a) para a entrevista em breve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-50 dark:bg-navy-950 py-6 px-3 sm:py-10 sm:px-4">
      <div className="max-w-xl mx-auto">
        {config?.capa_url && <img src={config.capa_url} alt="" className="w-full h-32 sm:h-44 object-cover rounded-lg mb-6 sm:mb-8" />}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img src={LOGO} alt="Callink" className="h-7 w-auto dark:hidden" />
          <img src={LOGO} alt="Callink" className="h-7 w-auto hidden dark:block brightness-0 invert" />
          <p className="text-[13px] font-medium text-navy-800 dark:text-navy-200 mt-3">Cadastro de Candidato</p>
          <p className="text-[11px] text-navy-400 mt-0.5">Processo seletivo</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card p-4 sm:p-8 space-y-6 sm:space-y-7">
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
          {error && <p className="text-sm text-clay-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 text-base">
            {submitting ? 'Enviando…' : 'Enviar cadastro'}
          </button>
        </form>
      </div>
      <Toast mensagem={toast} onFechar={() => setToast('')} />
    </div>
  )
}
