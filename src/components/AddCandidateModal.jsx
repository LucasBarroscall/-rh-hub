import { useFecharComEsc, aoClicarFora } from '../lib/useModal'
import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useOpcoes } from '../lib/useOpcoes'
import { useCamposFormulario } from '../lib/useCamposFormulario'
import { useCepEndereco } from '../lib/useCepEndereco'
import { CAMPOS_INICIAIS, validarCadastroDetalhado, montarPayload } from '../lib/cadastro'
import CamposCadastro from './CamposCadastro'
import Toast from './Toast'

export default function AddCandidateModal({ onClose, onSaved }) {
  useFecharComEsc(onClose)
  const { opcoes, fontes } = useOpcoes()
  const { customizados, ocultos } = useCamposFormulario()
  const [form, setForm] = useState(CAMPOS_INICIAIS)
  const cep = useCepEndereco(setForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [erroCampo, setErroCampo] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const det = validarCadastroDetalhado(form, { fontes, customizados, ocultos, enderecoStatus: cep.status, estrito: true })
    const msg = det ? det.mensagem : null
    if (det) setErroCampo({ campo: det.campo, n: Date.now() })
    if (msg) {
      setError(msg)
      setToast(msg)
      return
    }
    setSubmitting(true)
    const { error: erroInsert } = await supabase.from('candidatos').insert(montarPayload(form, { fontes, ocultos, customizados }))
    setSubmitting(false)
    if (erroInsert) {
      if (erroInsert.message?.includes('CPF_DUPLICADO_HOJE')) {
        const texto = 'Este CPF já foi cadastrado hoje. Não é possível cadastrar o mesmo CPF mais de uma vez no mesmo dia.'
        setError(texto)
        setToast(texto)
      } else {
        setError(
          erroInsert.message?.includes('column')
            ? 'O banco de dados ainda não está atualizado — rode as atualizações pendentes no Supabase.'
            : 'Não foi possível salvar. Confira os campos obrigatórios.',
        )
      }
      console.error(erroInsert)
      return
    }
    onSaved()
  }

  return (
    <div {...aoClicarFora(onClose)} className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card-elevated w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Adicionar candidato</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          <CamposCadastro
            form={form}
            setForm={setForm}
            opcoes={opcoes}
            fontes={fontes}
            customizados={customizados}
            ocultos={ocultos}
            cep={cep}
            avisar={setToast}
            erroExterno={erroCampo}
          />
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
      <Toast mensagem={toast} onFechar={() => setToast('')} />
    </div>
  )
}
