import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Download, Upload, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { buscarTodos } from '../../lib/buscarTodos'
import { useFecharComEsc, aoClicarFora } from '../../lib/useModal'
import { hojeISO } from '../../lib/cadastro'
import { formatarData } from '../../lib/candidato'
import { baixarBlob, baixarXlsx, objetosParaAba, preencherModeloCompliance, lerAbaComoObjetos } from '../../lib/xlsx'
import { montarLinhaCompliance, nomeArquivoCompliance, dataHoraBrasilia, prepararRetornoCompliance, ABA_RETORNO } from '../../lib/compliance'
import { carregarModelo, substituirModelo, restaurarModeloPadrao, infoModelo, MIME_XLSX } from '../../lib/modeloCompliance'
import ChipCompliance from '../ChipCompliance'

const CAMPOS = 'id, nome_completo, cpf, rg, data_nascimento, nome_mae, telefone, logradouro, numero, bairro, cidade, cep, compliance, created_at'

function PainelModelo() {
  const [info, setInfo] = useState(undefined)
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const inputRef = useRef(null)

  async function atualizar() {
    try {
      setInfo(await infoModelo())
    } catch {
      setInfo(null)
    }
  }
  useEffect(() => {
    atualizar()
  }, [])

  async function executar(acao, ok) {
    setOcupado(true)
    setMensagem('')
    try {
      await acao()
      setMensagem(ok)
    } catch (e) {
      setMensagem(e.message || 'Não foi possível concluir.')
    }
    setOcupado(false)
    atualizar()
  }

  return (
    <div className="rounded-lg border border-navy-100 dark:border-navy-800 p-4 mt-5">
      <p className="text-sm font-medium text-navy-800 dark:text-navy-100 flex items-center gap-1.5">
        <FileSpreadsheet size={15} className="text-navy-400" /> Modelo da planilha
      </p>
      <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
        {info === undefined
          ? 'Verificando…'
          : info
            ? `Salvo no banco${info.atualizadoEm ? ` (atualizado em ${formatarData(info.atualizadoEm)})` : ''}. A exportação usa sempre este modelo e só preenche as células combinadas.`
            : 'Ainda não salvo no banco — será salvo automaticamente na primeira exportação (ou use "Restaurar modelo padrão").'}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          disabled={ocupado}
          className="btn-secondary text-xs flex items-center gap-1.5"
          onClick={() =>
            executar(async () => {
              const { buffer } = await carregarModelo()
              baixarBlob(new Blob([buffer], { type: MIME_XLSX }), 'MODELO - ANALISE COMPLIANCE OPERACIONAL - ARACAJU.xlsx')
            }, 'Modelo baixado.')
          }
        >
          <Download size={13} /> Baixar modelo atual
        </button>
        <button disabled={ocupado} className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => inputRef.current?.click()}>
          <Upload size={13} /> Substituir modelo
        </button>
        <button
          disabled={ocupado}
          className="btn-secondary text-xs"
          onClick={() => confirm('Voltar ao modelo padrão que acompanha o site? O modelo atual do banco será substituído.') && executar(restaurarModeloPadrao, 'Modelo padrão restaurado.')}
        >
          Restaurar modelo padrão
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) executar(() => substituirModelo(f), 'Modelo substituído e salvo no banco.')
          }}
        />
      </div>
      {mensagem && <p className="text-xs text-navy-600 dark:text-navy-300 mt-2">{mensagem}</p>}
    </div>
  )
}

function PainelExportar() {
  const [de, setDe] = useState(hojeISO())
  const [ate, setAte] = useState(hojeISO())
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [soSemResultado, setSoSemResultado] = useState(false)
  const [sel, setSel] = useState(new Set())
  const [responsavel, setResponsavel] = useState(() => {
    try {
      return localStorage.getItem('compliance_responsavel') || 'Jean'
    } catch {
      return 'Jean'
    }
  })
  const [exportando, setExportando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    buscarTodos(
      supabase
        .from('candidatos')
        .select(CAMPOS)
        .gte('created_at', `${de}T00:00:00-03:00`)
        .lte('created_at', `${ate}T23:59:59.999-03:00`)
        .order('created_at', { ascending: true })
        .order('id'),
    ).then(({ data }) => {
      if (!ativo) return
      setLista(data || [])
      setSel(new Set())
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [de, ate])

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    const digitos = busca.replace(/\D/g, '')
    return lista.filter((c) => {
      if (soSemResultado && c.compliance) return false
      if (!termo) return true
      return c.nome_completo?.toLowerCase().includes(termo) || (digitos.length >= 3 && c.cpf?.replace(/\D/g, '').includes(digitos))
    })
  }, [lista, busca, soSemResultado])

  const escolhidos = filtrados.filter((c) => sel.has(c.id))
  const todosMarcados = filtrados.length > 0 && filtrados.every((c) => sel.has(c.id))

  function alternar(id) {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function exportar() {
    setErro('')
    if (escolhidos.length === 0) return setErro('Selecione ao menos um candidato.')
    if (!responsavel.trim()) return setErro('Informe o responsável pelo envio da lista.')
    setExportando(true)
    try {
      try {
        localStorage.setItem('compliance_responsavel', responsavel.trim())
      } catch {
        /* sem armazenamento local */
      }
      const modelo = await carregarModelo()
      const blob = await preencherModeloCompliance(
        modelo.buffer,
        { responsavel: responsavel.trim(), dataHora: dataHoraBrasilia(), quantidade: escolhidos.length, candidatos: escolhidos.map(montarLinhaCompliance) },
        'blob',
      )
      baixarBlob(blob, nomeArquivoCompliance())
    } catch (e) {
      setErro(e.message || 'Não foi possível gerar a planilha.')
    }
    setExportando(false)
  }

  return (
    <div>
      <p className="text-xs text-navy-500 dark:text-navy-400 mb-3">
        Escolha o dia (ou período) do cadastro e marque quais candidatos vão para o Compliance. A planilha sai no padrão do modelo:{' '}
        <strong>{nomeArquivoCompliance()}</strong>.
      </p>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="field-label">Cadastrados de</label>
          <input type="date" className="field-input py-1.5 text-sm" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <label className="field-label">até</label>
          <input type="date" className="field-input py-1.5 text-sm" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <input className="field-input py-1.5 text-sm w-48" placeholder="Buscar nome ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm text-navy-600 dark:text-navy-300 pb-1.5">
          <input type="checkbox" checked={soSemResultado} onChange={(e) => setSoSemResultado(e.target.checked)} /> Só quem ainda não tem resultado
        </label>
      </div>

      <div className="overflow-auto max-h-64 rounded-md border border-navy-100 dark:border-navy-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0">
            <tr className="text-left text-xs text-navy-400 bg-navy-50 dark:bg-navy-800">
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={todosMarcados} onChange={() => setSel(todosMarcados ? new Set() : new Set(filtrados.map((c) => c.id)))} title={`Selecionar os ${filtrados.length} listados`} />
              </th>
              <th className="px-3 py-2">Candidato</th>
              <th className="px-3 py-2">CPF</th>
              <th className="px-3 py-2">Cadastro</th>
              <th className="px-3 py-2">Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
            {carregando && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-navy-400">Carregando…</td>
              </tr>
            )}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-navy-400">Nenhum candidato nesse período.</td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-1.5">
                  <input type="checkbox" checked={sel.has(c.id)} onChange={() => alternar(c.id)} />
                </td>
                <td className="px-3 py-1.5 font-medium text-navy-900 dark:text-white">{c.nome_completo}</td>
                <td className="px-3 py-1.5 text-navy-500">{c.cpf}</td>
                <td className="px-3 py-1.5 text-navy-500">{formatarData(c.created_at)}</td>
                <td className="px-3 py-1.5">
                  <ChipCompliance status={c.compliance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
        <div>
          <label className="field-label">Responsável pelo envio da lista</label>
          <input className="field-input py-1.5 text-sm w-48" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-navy-500 dark:text-navy-400">
            {escolhidos.length} de {filtrados.length} selecionado(s)
          </span>
          <button onClick={exportar} disabled={exportando} className="btn-primary flex items-center gap-1.5">
            <Download size={15} /> {exportando ? 'Gerando…' : `Exportar ${escolhidos.length || ''} para o Compliance`}
          </button>
        </div>
      </div>
      {erro && <p className="text-sm text-clay-600 mt-2">{erro}</p>}
      <PainelModelo />
    </div>
  )
}

function Lista({ titulo, cor, itens, colunas, nomeArquivo }) {
  if (itens.length === 0) return null
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-sm font-medium ${cor}`}>
          {titulo} ({itens.length})
        </p>
        <button
          className="text-xs underline text-navy-500 hover:text-navy-800 dark:hover:text-white"
          onClick={() => baixarXlsx([objetosParaAba(titulo, itens.map((i) => Object.fromEntries(colunas.map(([k, rot]) => [rot, i[k] ?? '']))))], nomeArquivo)}
        >
          Baixar esta lista (.xlsx)
        </button>
      </div>
      <div className="max-h-40 overflow-auto rounded-md border border-navy-100 dark:border-navy-800">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="text-left text-navy-400 bg-navy-50 dark:bg-navy-800">
              {colunas.map(([k, rot]) => (
                <th key={k} className="px-2.5 py-1.5">
                  {rot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
            {itens.map((i, idx) => (
              <tr key={idx}>
                {colunas.map(([k]) => (
                  <td key={k} className="px-2.5 py-1 text-navy-700 dark:text-navy-200">
                    {i[k] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PainelImportar() {
  const [previa, setPrevia] = useState(null)
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const inputRef = useRef(null)

  async function analisar(arquivo) {
    setErro('')
    setResultado(null)
    setPrevia(null)
    setLendo(true)
    try {
      const lido = await lerAbaComoObjetos(await arquivo.arrayBuffer(), { aba: ABA_RETORNO })
      if (!lido.encontrada) throw new Error(`Não encontrei a aba "${ABA_RETORNO}". Abas do arquivo: ${lido.abas.join(', ') || '(nenhuma)'}.`)
      const r = prepararRetornoCompliance(lido.colunas, lido.linhas)
      if (r.erro) throw new Error(r.erro)
      setPrevia({ ...r, arquivo: arquivo.name })
    } catch (e) {
      setErro(e.message || 'Não foi possível ler a planilha.')
    }
    setLendo(false)
  }

  async function importar() {
    setImportando(true)
    setErro('')
    let atualizados = 0
    const naoEncontrados = new Set()
    try {
      for (let i = 0; i < previa.validas.length; i += 300) {
        const lote = previa.validas.slice(i, i + 300)
        const { data, error } = await supabase.rpc('importar_compliance', {
          p_linhas: lote.map((v) => ({
            cpf: v.cpf,
            status: v.status,
            lote: v.lote,
            data_importacao: v.data_importacao,
            data_consulta: v.data_consulta,
            juridico: v.juridico,
            ok_nok_compliance: v.ok_nok_compliance,
          })),
        })
        if (error) throw new Error(/importar_compliance/.test(error.message) ? 'A atualização do banco (rodada_16.sql) ainda não foi aplicada.' : error.message)
        atualizados += data.candidatos_atualizados || 0
        ;(data.nao_encontrados || []).forEach((c) => naoEncontrados.add(c))
      }
      const faltou = previa.validas.filter((v) => naoEncontrados.has(v.cpf))
      setResultado({
        atualizados,
        cpfsGravados: previa.validas.length - faltou.length,
        naoEncontrados: faltou.map((v) => ({ linha: v.linha, cpf: v.cpf, statusFinal: v.status, lote: v.lote })),
        outros: previa.outros,
        invalidos: previa.invalidos,
      })
      setPrevia(null)
    } catch (e) {
      setErro(e.message || 'Não foi possível importar.')
    }
    setImportando(false)
  }

  const totalOk = previa ? previa.validas.filter((v) => v.status === 'OK').length : 0
  const totalNok = previa ? previa.validas.filter((v) => v.status === 'NOK').length : 0

  return (
    <div>
      <p className="text-xs text-navy-500 dark:text-navy-400 mb-3">
        Suba o .xlsx devolvido pelo Compliance. O hub lê só a aba <strong>{ABA_RETORNO}</strong> e usa as colunas CPF, LOTE, DATA IMPORTACAO, DATA CONSULTA
        ESCAVADOR, OK/NOK JURIDICO, OK/NOK COMPLIANCE e STATUS FINAL. <strong>STATUS FINAL = OK</strong> marca como Aprovado e <strong>NOK</strong> como Reprovado,
        em todos os cadastros daquele CPF (em qualquer data). Qualquer outro valor não grava nada e aparece numa lista aqui.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) analisar(f)
        }}
      />
      <button onClick={() => inputRef.current?.click()} disabled={lendo || importando} className="btn-secondary flex items-center gap-1.5">
        <Upload size={15} /> {lendo ? 'Lendo planilha…' : 'Escolher planilha (.xlsx)'}
      </button>
      {erro && <p className="text-sm text-clay-600 mt-3">{erro}</p>}

      {previa && (
        <div className="mt-4 rounded-lg border border-navy-100 dark:border-navy-800 p-4">
          <p className="text-sm font-medium text-navy-800 dark:text-navy-100">{previa.arquivo}</p>
          <ul className="text-sm text-navy-600 dark:text-navy-300 mt-2 space-y-0.5">
            <li>
              <strong>{totalOk}</strong> com STATUS FINAL <strong>OK</strong> (aprovados) e <strong>{totalNok}</strong> com <strong>NOK</strong> (reprovados) — serão gravados.
            </li>
            <li>
              <strong>{previa.outros.length}</strong> com outro STATUS FINAL — não gravam nada (aparecem numa lista no fim).
            </li>
            {previa.invalidos.length > 0 && (
              <li>
                <strong>{previa.invalidos.length}</strong> com CPF vazio ou inválido.
              </li>
            )}
          </ul>
          <button onClick={importar} disabled={importando || previa.validas.length === 0} className="btn-primary mt-3">
            {importando ? 'Importando…' : `Importar ${previa.validas.length} resultado(s)`}
          </button>
        </div>
      )}

      {resultado && (
        <div className="mt-4">
          <p className="text-sm text-sage-600 font-medium">
            Pronto: {resultado.atualizados} cadastro(s) de candidatos atualizados ({resultado.cpfsGravados} CPF(s) da planilha encontrados).
          </p>
          <Lista
            titulo="CPFs não encontrados no hub"
            cor="text-clay-600"
            itens={resultado.naoEncontrados}
            colunas={[['linha', 'Linha'], ['cpf', 'CPF'], ['statusFinal', 'Status final'], ['lote', 'Lote']]}
            nomeArquivo="compliance_cpfs_nao_encontrados.xlsx"
          />
          <Lista
            titulo="Ignorados (STATUS FINAL diferente de OK/NOK)"
            cor="text-amber-700 dark:text-amber-300"
            itens={resultado.outros}
            colunas={[['linha', 'Linha'], ['cpf', 'CPF'], ['statusFinal', 'Status final'], ['lote', 'Lote']]}
            nomeArquivo="compliance_status_ignorados.xlsx"
          />
          <Lista
            titulo="CPF vazio ou inválido"
            cor="text-clay-600"
            itens={resultado.invalidos}
            colunas={[['linha', 'Linha'], ['cpf', 'CPF'], ['motivo', 'Motivo'], ['statusFinal', 'Status final']]}
            nomeArquivo="compliance_cpf_invalidos.xlsx"
          />
        </div>
      )}
    </div>
  )
}

export default function ModalCompliance({ onClose }) {
  useFecharComEsc(onClose)
  const [aba, setAba] = useState('exportar')
  return (
    <div {...aoClicarFora(onClose)} className="fixed inset-0 bg-navy-950/40 flex items-center justify-center p-4 z-50">
      <div className="card-elevated w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Compliance</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-2 mb-5">
          {[
            ['exportar', 'Exportar para o Compliance'],
            ['importar', 'Importar retorno do Compliance'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setAba(v)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                aba === v
                  ? 'border-navy-700 bg-navy-700 text-white'
                  : 'border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {aba === 'exportar' ? <PainelExportar /> : <PainelImportar />}
      </div>
    </div>
  )
}
