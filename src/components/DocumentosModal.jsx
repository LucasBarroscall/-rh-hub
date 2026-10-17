import { useState } from 'react'
import { X, FileText } from 'lucide-react'
import { resumoDocumentos } from '../lib/documentos'

const ESTADOS = [
  ['pendente', 'Pendente'],
  ['enviado', 'Enviado'],
  ['na', 'Não se aplica'],
]

export default function DocumentosModal({ candidato, lista, onClose, onSalvar, salvando }) {
  const [docs, setDocs] = useState({ ...(candidato.documentos || {}) })

  function definir(nome, estado) {
    setDocs((d) => {
      const novo = { ...d }
      if (estado === 'pendente') delete novo[nome]
      else novo[nome] = estado
      return novo
    })
  }

  const resumo = resumoDocumentos({ documentos: docs }, lista)

  return (
    <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-[60]">
      <div className="card-elevated w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-navy-400" /> Documentos
          </h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-navy-500 dark:text-navy-400 mb-4">{candidato.nome_completo}</p>

        <div className="mb-5">
          <div className="flex justify-between text-xs text-navy-500 dark:text-navy-400 mb-1">
            <span>
              {resumo.enviados} de {resumo.aplicaveis} documento(s) aplicáveis enviados
            </span>
            <span>{resumo.pct == null ? '—' : `${resumo.pct}%`}</span>
          </div>
          <div className="h-2 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden">
            <div className="h-full bg-navy-700 transition-all" style={{ width: `${resumo.pct || 0}%` }} />
          </div>
        </div>

        {lista.length === 0 && (
          <p className="text-sm text-navy-400">Nenhum documento cadastrado. O analista define a lista em Administração → Listas → Documentos.</p>
        )}

        <div className="space-y-3">
          {lista.map((nome) => (
            <div key={nome} className="rounded-lg border border-navy-100 dark:border-navy-800 p-3">
              <p className="text-sm font-medium text-navy-800 dark:text-navy-100 mb-2">{nome}</p>
              <div className="grid grid-cols-3 gap-2">
                {ESTADOS.map(([estado, rotulo]) => {
                  const atual = docs[nome] || 'pendente'
                  return (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => definir(nome, estado)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        atual === estado
                          ? estado === 'enviado'
                            ? 'border-sage-500 bg-sage-500 text-white'
                            : estado === 'na'
                              ? 'border-navy-400 bg-navy-400 text-white'
                              : 'border-navy-700 bg-navy-700 text-white'
                          : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
                      }`}
                    >
                      {rotulo}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={() => onSalvar(docs)} disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
