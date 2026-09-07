import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  Line,
  Legend,
  PieChart,
  Pie,
} from 'recharts'
import { X, TrendingUp, Gauge, Target, Clock, Printer, Flag, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import DateRangePicker from '../components/DateRangePicker'
import FunilChart from '../components/FunilChart'
import ChartTooltip from '../components/ChartTooltip'
import MapaDeCalor from '../components/MapaDeCalor'
import { etapaFunil, faixaEtariaDe } from '../lib/candidato'
import { ETAPAS_FUNIL, MARCOS_FUNIL, formatarNumero, formatarDuracaoCurta, formatarDuracaoLonga } from '../lib/status'

const CORES = ['#2f4c73', '#D4D943', '#30cff2', '#a64170', '#2a438c', '#7c93b8']

const PERIODOS = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'ano', label: 'Este ano' },
  { id: 'tudo', label: 'Tudo' },
]

const GRANULARIDADES = [
  { id: 'dia', label: 'Dia' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
]

const FAIXAS_ETARIAS = ['<18', '18-24', '25-34', '35-44', '45+']

const CAMPOS_FILTRO = [
  { chave: 'fonte', label: 'Origem' },
  { chave: 'sexo', label: 'Sexo' },
  { chave: 'cidade', label: 'Cidade' },
  { chave: 'faixaEtaria', label: 'Faixa etária' },
  { chave: 'etapa', label: 'Etapa do funil' },
]

function inicioPeriodo(id) {
  const agora = new Date()
  if (id === '7d') return new Date(agora.getTime() - 7 * 86400000)
  if (id === '30d') return new Date(agora.getTime() - 30 * 86400000)
  if (id === 'mes') return new Date(agora.getFullYear(), agora.getMonth(), 1)
  if (id === 'ano') return new Date(agora.getFullYear(), 0, 1)
  return null
}

function chaveGranular(dataISO, granularidade) {
  if (granularidade === 'ano') return dataISO.slice(0, 4)
  if (granularidade === 'mes') return dataISO.slice(0, 7)
  return dataISO.slice(0, 10)
}

function rotuloGranular(chave, granularidade) {
  if (granularidade === 'ano') return chave
  if (granularidade === 'mes') {
    const [ano, mes] = chave.split('-')
    return `${mes}/${ano.slice(2)}`
  }
  return chave.slice(5) // MM-DD
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-navy-400 mb-2">
        <Icon size={15} />
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      <p className="text-[26px] leading-none font-semibold text-navy-900 dark:text-white font-display">{value}</p>
      {sub && <p className="text-xs text-navy-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children, onClear, cleared }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100">{title}</h3>
        {!cleared && onClear && (
          <button onClick={onClear} className="text-xs text-navy-400 hover:text-navy-700 dark:hover:text-navy-200 flex items-center gap-1">
            <X size={12} /> limpar filtro
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

const FILTROS_VAZIOS = { fonte: null, sexo: null, cidade: null, etapa: null, faixaEtaria: null }

export default function Dashboard() {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30d')
  const [intervalo, setIntervalo] = useState({ inicio: null, fim: null })
  const [granularidade, setGranularidade] = useState('dia')
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('candidatos').select('*').order('created_at', { ascending: true })
    if (!error) setDados(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function selecionarPeriodo(id) {
    setPeriodo(id)
    setIntervalo({ inicio: null, fim: null })
  }

  const dentroDoPeriodo = useMemo(() => {
    if (intervalo.inicio && intervalo.fim) {
      const fimAjustado = new Date(intervalo.fim)
      fimAjustado.setHours(23, 59, 59, 999)
      return (c) => {
        const d = new Date(c.created_at)
        return d >= intervalo.inicio && d <= fimAjustado
      }
    }
    const inicio = inicioPeriodo(periodo)
    return (c) => !inicio || new Date(c.created_at) >= inicio
  }, [periodo, intervalo])

  const base = useMemo(() => dados.filter(dentroDoPeriodo), [dados, dentroDoPeriodo])

  const filtrados = useMemo(() => {
    return base.filter((c) => {
      if (filtros.fonte && c.fonte !== filtros.fonte) return false
      if (filtros.sexo && c.sexo !== filtros.sexo) return false
      if (filtros.cidade && c.cidade !== filtros.cidade) return false
      if (filtros.faixaEtaria && faixaEtariaDe(c.idade) !== filtros.faixaEtaria) return false
      if (filtros.etapa && etapaFunil(c) !== filtros.etapa) return false
      return true
    })
  }, [base, filtros])

  function alternarFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: f[campo] === valor ? null : valor }))
  }

  const opcoesPorCampo = useMemo(() => {
    const conj = { fonte: new Set(), sexo: new Set(), cidade: new Set(), etapa: new Set() }
    base.forEach((c) => {
      if (c.fonte) conj.fonte.add(c.fonte)
      if (c.sexo) conj.sexo.add(c.sexo)
      if (c.cidade) conj.cidade.add(c.cidade)
      conj.etapa.add(etapaFunil(c))
    })
    return {
      fonte: [...conj.fonte].sort(),
      sexo: [...conj.sexo].sort(),
      cidade: [...conj.cidade].sort(),
      etapa: [...conj.etapa].sort(),
      faixaEtaria: FAIXAS_ETARIAS,
    }
  }, [base])

  // ---- KPIs ----
  const total = filtrados.length
  const decididos = filtrados.filter((c) => c.decisao_final)
  const aprovados = filtrados.filter((c) => c.decisao_final === 'Aprovado')
  const taxaAprovacao = decididos.length ? Math.round((aprovados.length / decididos.length) * 100) : 0
  const testados = filtrados.filter((c) => c.teste_realizado)
  const wpmMedioNum = testados.length ? testados.reduce((s, c) => s + Number(c.wpm || 0), 0) / testados.length : null
  const wpmMedio = wpmMedioNum != null ? formatarNumero(wpmMedioNum, 1) : '—'
  const precisaoMediaNum = testados.length ? testados.reduce((s, c) => s + Number(c.precisao || 0), 0) / testados.length : null
  const precisaoMedia = precisaoMediaNum != null ? formatarNumero(precisaoMediaNum, 1) : '—'

  const comTempoPreenchimento = filtrados.filter((c) => c.tempo_preenchimento_segundos != null)
  const tempoPreenchimentoMedio = comTempoPreenchimento.length
    ? comTempoPreenchimento.reduce((s, c) => s + c.tempo_preenchimento_segundos, 0) / comTempoPreenchimento.length
    : null

  // ---- Agregações para gráficos ----
  function contarPor(campo) {
    const mapa = {}
    filtrados.forEach((c) => {
      const chave = c[campo] || 'Não informado'
      mapa[chave] = (mapa[chave] || 0) + 1
    })
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  const porFonte = useMemo(() => contarPor('fonte'), [filtrados])
  const porSexo = useMemo(() => contarPor('sexo'), [filtrados])
  const porCidade = useMemo(() => contarPor('cidade').slice(0, 8), [filtrados])

  const porFaixaEtaria = useMemo(() => {
    const faixas = { '<18': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 }
    filtrados.forEach((c) => {
      const f = faixaEtariaDe(c.idade)
      if (f) faixas[f]++
    })
    return Object.entries(faixas).map(([name, value]) => ({ name, value }))
  }, [filtrados])

  const porEtapa = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      const e = etapaFunil(c)
      mapa[e] = (mapa[e] || 0) + 1
    })
    return Object.entries(mapa).map(([name, value]) => ({ name, value }))
  }, [filtrados])

  const evolucao = useMemo(() => {
    const mapa = {}
    filtrados
      .filter((c) => c.teste_realizado)
      .forEach((c) => {
        const chave = chaveGranular((c.teste_em || c.created_at).slice(0, 10), granularidade)
        if (!mapa[chave]) mapa[chave] = { chave, wpmTotal: 0, precisaoTotal: 0, n: 0 }
        mapa[chave].wpmTotal += Number(c.wpm || 0)
        mapa[chave].precisaoTotal += Number(c.precisao || 0)
        mapa[chave].n += 1
      })
    return Object.values(mapa)
      .sort((a, b) => a.chave.localeCompare(b.chave))
      .map((d) => ({
        data: rotuloGranular(d.chave, granularidade),
        WPM: +(d.wpmTotal / d.n).toFixed(1),
        Precisão: +(d.precisaoTotal / d.n).toFixed(1),
      }))
  }, [filtrados, granularidade])

  const candidatosPorPeriodo = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      const chave = chaveGranular(c.created_at.slice(0, 10), granularidade)
      mapa[chave] = (mapa[chave] || 0) + 1
    })
    return Object.entries(mapa)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([chave, value]) => ({ data: rotuloGranular(chave, granularidade), Candidatos: value }))
  }, [filtrados, granularidade])

  const filtrosAtivos = Object.entries(filtros).filter(([, v]) => v)

  // ---- 1. Qualidade da fonte (não só volume, taxa de aprovação) ----
  const qualidadeFonte = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      const chave = c.fonte || 'Não informado'
      if (!mapa[chave]) mapa[chave] = { fonte: chave, total: 0, decididos: 0, aprovados: 0, wpmSoma: 0, wpmN: 0 }
      mapa[chave].total++
      if (c.decisao_final) {
        mapa[chave].decididos++
        if (c.decisao_final === 'Aprovado') mapa[chave].aprovados++
      }
      if (c.teste_realizado) {
        mapa[chave].wpmSoma += Number(c.wpm || 0)
        mapa[chave].wpmN++
      }
    })
    return Object.values(mapa)
      .map((m) => ({
        ...m,
        taxa: m.decididos ? Math.round((m.aprovados / m.decididos) * 100) : null,
        wpmMedio: m.wpmN ? +(m.wpmSoma / m.wpmN).toFixed(1) : null,
      }))
      .sort((a, b) => b.total - a.total)
  }, [filtrados])

  // ---- 2. No-show vs Reprovado avaliado (entrevista e exame) ----
  const noShow = useMemo(() => {
    const entrevistaAgendada = filtrados.filter((c) => c.compareceu_entrevista !== null && c.compareceu_entrevista !== undefined)
    const entrevistaNoShow = entrevistaAgendada.filter((c) => c.compareceu_entrevista === false).length
    const entrevistaReprovado = filtrados.filter((c) => c.compareceu_entrevista === true && c.aprovado_entrevista === false).length

    const exameAgendado = filtrados.filter((c) => c.data_exame)
    const exameNoShow = exameAgendado.filter((c) => c.compareceu_exame === false).length
    const exameReprovado = filtrados.filter((c) => c.compareceu_exame === true && c.aprovado_exame === false).length

    return {
      entrevistaAgendada: entrevistaAgendada.length,
      entrevistaNoShow,
      entrevistaReprovado,
      exameAgendado: exameAgendado.length,
      exameNoShow,
      exameReprovado,
    }
  }, [filtrados])

  // ---- 3. Ranking de indicadores (Indicação / Funcionário Callink) ----
  const rankingIndicadores = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      if (!c.nome_indicador || c.fonte === 'Redes Sociais') return
      if (!mapa[c.nome_indicador]) mapa[c.nome_indicador] = { nome: c.nome_indicador, total: 0, aprovados: 0 }
      mapa[c.nome_indicador].total++
      if (c.decisao_final === 'Aprovado') mapa[c.nome_indicador].aprovados++
    })
    return Object.values(mapa)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [filtrados])

  // ---- 4. Distribuição de WPM e Precisão (histograma) ----
  const distribuicaoWpm = useMemo(() => {
    const faixas = [
      { label: '< 10', min: 0, max: 10 },
      { label: '10-20', min: 10, max: 20 },
      { label: '20-30', min: 20, max: 30 },
      { label: '30-40', min: 30, max: 40 },
      { label: '40+', min: 40, max: Infinity },
    ]
    const contagem = faixas.map((f) => ({ name: f.label, value: 0 }))
    filtrados
      .filter((c) => c.teste_realizado && c.wpm != null)
      .forEach((c) => {
        const i = faixas.findIndex((f) => c.wpm >= f.min && c.wpm < f.max)
        if (i >= 0) contagem[i].value++
      })
    return contagem
  }, [filtrados])

  const distribuicaoPrecisao = useMemo(() => {
    const faixas = [
      { label: '< 80%', min: 0, max: 80 },
      { label: '80-90%', min: 80, max: 90 },
      { label: '90-95%', min: 90, max: 95 },
      { label: '95-100%', min: 95, max: 101 },
    ]
    const contagem = faixas.map((f) => ({ name: f.label, value: 0 }))
    filtrados
      .filter((c) => c.teste_realizado && c.precisao != null)
      .forEach((c) => {
        const i = faixas.findIndex((f) => c.precisao >= f.min && c.precisao < f.max)
        if (i >= 0) contagem[i].value++
      })
    return contagem
  }, [filtrados])

  // ---- 5. Gargalo de documentação (presos há quanto tempo) ----
  const gargaloDocumentacao = useMemo(() => {
    const hoje = new Date()
    const presos = filtrados
      .filter((c) => c.documentacao_solicitada === true && c.enviou_documentacao !== true)
      .map((c) => {
        const dias = c.data_documentacao_solicitada
          ? Math.floor((hoje - new Date(c.data_documentacao_solicitada)) / 86400000)
          : null
        return { nome: c.nome_completo, dias }
      })
      .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))

    const enviadas = filtrados.filter(
      (c) => c.data_documentacao_solicitada && c.data_envio_documentacao,
    )
    const tempoMedioEnvio = enviadas.length
      ? enviadas.reduce(
          (s, c) => s + (new Date(c.data_envio_documentacao) - new Date(c.data_documentacao_solicitada)),
          0,
        ) / enviadas.length
      : null

    return { presos, tempoMedioEnvio }
  }, [filtrados])

  // ---- 6. Exames atrasados ----
  const examesAtrasados = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return filtrados
      .filter((c) => c.data_exame && c.compareceu_exame !== true && new Date(c.data_exame + 'T00:00:00') < hoje)
      .map((c) => ({
        nome: c.nome_completo,
        dias: Math.floor((hoje - new Date(c.data_exame + 'T00:00:00')) / 86400000),
      }))
      .sort((a, b) => b.dias - a.dias)
  }, [filtrados])

  // ---- 7. Veículo / Ensino superior x aprovação ----
  function taxaPorCondicao(campo) {
    const comCondicao = filtrados.filter((c) => c[campo] === true && c.decisao_final)
    const semCondicao = filtrados.filter((c) => c[campo] === false && c.decisao_final)
    const taxa = (lista) => {
      const aprovados = lista.filter((c) => c.decisao_final === 'Aprovado').length
      return lista.length ? Math.round((aprovados / lista.length) * 100) : null
    }
    return {
      comTaxa: taxa(comCondicao),
      comN: comCondicao.length,
      semTaxa: taxa(semCondicao),
      semN: semCondicao.length,
    }
  }
  const correlacaoVeiculo = useMemo(() => taxaPorCondicao('possui_veiculo'), [filtrados])
  const correlacaoEnsino = useMemo(() => taxaPorCondicao('possui_ensino_superior'), [filtrados])

  // ---- 8. Cadastros por dia da semana ----
  const porDiaSemana = useMemo(() => {
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const contagem = nomes.map((n) => ({ name: n, value: 0 }))
    filtrados.forEach((c) => {
      const dia = new Date(c.created_at).getDay()
      contagem[dia].value++
    })
    return contagem
  }, [filtrados])

  // ---- 9. Reincidência de CPF ----
  const reincidencia = useMemo(() => {
    const porCpf = {}
    filtrados.forEach((c) => {
      if (!c.cpf) return
      if (!porCpf[c.cpf]) porCpf[c.cpf] = []
      porCpf[c.cpf].push(c)
    })
    const grupos = Object.values(porCpf)
    const reincidentes = grupos.filter((g) => g.length > 1).flat()
    const novatos = grupos.filter((g) => g.length === 1).flat()
    const taxa = (lista) => {
      const decididos = lista.filter((c) => c.decisao_final)
      const aprovados = decididos.filter((c) => c.decisao_final === 'Aprovado')
      return decididos.length ? Math.round((aprovados.length / decididos.length) * 100) : null
    }
    return {
      candidatosUnicos: grupos.length,
      reincidentesN: grupos.filter((g) => g.length > 1).length,
      taxaReincidentes: taxa(reincidentes),
      taxaNovatos: taxa(novatos),
    }
  }, [filtrados])

  // ---- 10. Tempo de resposta pós-contato ----
  const respostaPosContato = useMemo(() => {
    const deltas = []
    filtrados.forEach((c) => {
      if (c.data_contato_whatsapp && c.data_envio_documentacao) {
        const t1 = new Date(c.data_contato_whatsapp).getTime()
        const t2 = new Date(c.data_envio_documentacao).getTime()
        if (t2 >= t1) deltas.push(t2 - t1)
      }
    })
    const contatados = filtrados.filter((c) => c.contatado_whatsapp === true)
    const respondeu = contatados.filter((c) => c.enviou_documentacao === true)
    return {
      tempoMedio: deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null,
      taxaResposta: contatados.length ? Math.round((respondeu.length / contatados.length) * 100) : null,
      contatadosN: contatados.length,
    }
  }, [filtrados])

  // ---- 11. Sazonalidade mensal (candidatos e taxa de aprovação por mês) ----
  const sazonalidadeMensal = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      const chave = c.created_at.slice(0, 7) // YYYY-MM
      if (!mapa[chave]) mapa[chave] = { chave, total: 0, aprovados: 0, decididos: 0 }
      mapa[chave].total++
      if (c.decisao_final) {
        mapa[chave].decididos++
        if (c.decisao_final === 'Aprovado') mapa[chave].aprovados++
      }
    })
    return Object.values(mapa)
      .sort((a, b) => a.chave.localeCompare(b.chave))
      .map((m) => {
        const [ano, mes] = m.chave.split('-')
        return {
          mes: `${mes}/${ano.slice(2)}`,
          Candidatos: m.total,
          'Taxa de aprovação': m.decididos ? Math.round((m.aprovados / m.decididos) * 100) : 0,
        }
      })
  }, [filtrados])

  // ---- 12. Turno de treinamento x aprovação final ----
  const turnoTreinamento = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      if (!c.disponibilidade_horario_treinamento || !c.decisao_final) return
      const chave = c.disponibilidade_horario_treinamento
      if (!mapa[chave]) mapa[chave] = { turno: chave, decididos: 0, aprovados: 0 }
      mapa[chave].decididos++
      if (c.decisao_final === 'Aprovado') mapa[chave].aprovados++
    })
    return Object.values(mapa)
      .map((m) => ({ ...m, taxa: Math.round((m.aprovados / m.decididos) * 100) }))
      .sort((a, b) => b.decididos - a.decididos)
  }, [filtrados])

  // ---- 13. Localização para o mapa de calor (cidade e bairro) ----
  const [nivelMapa, setNivelMapa] = useState('cidade')
  const contagemMapa = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      if (nivelMapa === 'cidade') {
        if (!c.cidade) return
        const chave = c.estado ? `${c.cidade}, ${c.estado}` : c.cidade
        mapa[chave] = (mapa[chave] || 0) + 1
      } else {
        if (!c.bairro || !c.cidade) return
        const chave = `${c.bairro}, ${c.cidade}`
        mapa[chave] = (mapa[chave] || 0) + 1
      }
    })
    return Object.entries(mapa).map(([nome, quantidade]) => ({ nome, quantidade }))
  }, [filtrados, nivelMapa])

  // ---- 14. Meta mensal de contratações ----
  const [meta, setMeta] = useState(null)
  useEffect(() => {
    const inicioMes = `${new Date().toISOString().slice(0, 7)}-01`
    supabase
      .from('metas')
      .select('*')
      .eq('mes', inicioMes)
      .maybeSingle()
      .then(({ data }) => setMeta(data))
  }, [])
  const entregasNoMes = useMemo(() => {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    return dados.filter((c) => c.compareceu_alo === true && c.data_alo && new Date(c.data_alo) >= inicioMes).length
  }, [dados])

  const funilMarcos = useMemo(() => {
    return MARCOS_FUNIL.map((chave) => {
      const etapa = ETAPAS_FUNIL.find((e) => e.chave === chave)
      const value = filtrados.filter((c) => etapa.alcancado(c)).length
      return { name: etapa.label, value }
    })
  }, [filtrados])

  const temposEntreEtapas = useMemo(() => {
    const resultados = []
    for (let i = 0; i < etapasComData.length - 1; i++) {
      const atual = etapasComData[i]
      const proxima = etapasComData[i + 1]
      const deltas = []
      filtrados.forEach((c) => {
        const d1 = c[atual.dataCampo]
        const d2 = c[proxima.dataCampo]
        if (d1 && d2) {
          const t1 = new Date(d1).getTime()
          const t2 = new Date(d2).getTime()
          if (t2 >= t1) deltas.push(t2 - t1)
        }
      })
      if (deltas.length) {
        resultados.push({
          de: atual.label,
          para: proxima.label,
          media: deltas.reduce((a, b) => a + b, 0) / deltas.length,
          n: deltas.length,
        })
      }
    }
    return resultados
  }, [filtrados])

  const tempoTotalCadastroAteAlo = useMemo(() => {
    const deltas = []
    filtrados.forEach((c) => {
      if (c.created_at && c.data_alo) {
        const t1 = new Date(c.created_at).getTime()
        const t2 = new Date(c.data_alo).getTime()
        if (t2 >= t1) deltas.push(t2 - t1)
      }
    })
    if (!deltas.length) return null
    return deltas.reduce((a, b) => a + b, 0) / deltas.length
  }, [filtrados])

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <div className="print-only mb-6">
          <h1 className="text-2xl font-semibold text-navy-900">Relatório de Recrutamento — Hub RH</h1>
          <p className="text-sm text-navy-500 mt-1">
            Gerado em {new Date().toLocaleString('pt-BR')}
            {periodo && !intervalo.inicio ? ` · Período: ${PERIODOS.find((p) => p.id === periodo)?.label}` : ''}
            {intervalo.inicio && intervalo.fim
              ? ` · Período: ${intervalo.inicio.toLocaleDateString('pt-BR')} a ${intervalo.fim.toLocaleDateString('pt-BR')}`
              : ''}
            {filtrosAtivos.length > 0 ? ` · Filtros: ${filtrosAtivos.map(([, v]) => v).join(', ')}` : ''}
          </p>
        </div>

        <header className="no-print mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Dashboard</h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">Visão geral do funil de recrutamento.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selecionarPeriodo(p.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    !intervalo.inicio && periodo === p.id
                      ? 'bg-navy-700 text-white'
                      : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <DateRangePicker inicio={intervalo.inicio} fim={intervalo.fim} onChange={(novo) => setIntervalo(novo)} />
            <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5">
              <Printer size={15} /> Relatório / PDF
            </button>
          </div>
        </header>

        <div className="no-print card p-4 mb-6 flex flex-wrap items-end gap-4">
          {CAMPOS_FILTRO.map(({ chave, label }) => (
            <div key={chave} className="min-w-[160px]">
              <label className="field-label mb-1">{label}</label>
              <select
                className="field-select py-2"
                value={filtros[chave] ?? ''}
                onChange={(e) => setFiltros((f) => ({ ...f, [chave]: e.target.value || null }))}
              >
                <option value="">Todos</option>
                {opcoesPorCampo[chave].map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {filtrosAtivos.length > 0 && (
            <button
              onClick={() => setFiltros(FILTROS_VAZIOS)}
              className="text-xs text-navy-400 hover:text-navy-700 dark:hover:text-navy-200 underline mb-2.5"
            >
              limpar todos os filtros
            </button>
          )}
        </div>

        {filtrosAtivos.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs text-navy-400">Filtrando por:</span>
            {filtrosAtivos.map(([campo, valor]) => (
              <button
                key={campo}
                onClick={() => setFiltros((f) => ({ ...f, [campo]: null }))}
                className="pill bg-navy-700 text-white"
              >
                {valor} <X size={12} />
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-navy-400 text-sm">Carregando dados…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <KpiCard icon={Users} label="Candidatos" value={formatarNumero(total)} sub={`${porEtapa.length} etapas ativas`} />
              <KpiCard icon={Target} label="Taxa de aprovação" value={`${taxaAprovacao}%`} sub={`${aprovados.length} de ${decididos.length} decididos`} />
              <KpiCard icon={Gauge} label="WPM médio" value={wpmMedio} sub={`${testados.length} testados`} />
              <KpiCard
                icon={TrendingUp}
                label="Precisão média"
                value={precisaoMedia !== '—' ? `${precisaoMedia}%` : '—'}
                sub={`${testados.length} testados`}
              />
              <KpiCard
                icon={Clock}
                label="Tempo médio de cadastro"
                value={tempoPreenchimentoMedio != null ? formatarDuracaoCurta(tempoPreenchimentoMedio) : '—'}
                sub={`${comTempoPreenchimento.length} medidos`}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              <ChartCard title="Funil de recrutamento" onClear={() => setFiltros((f) => ({ ...f, etapa: null }))} cleared={!filtros.etapa}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={porEtapa} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="none" horizontal={false} stroke="#EEF1F8" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => alternarFiltro('etapa', d.name)}>
                      {porEtapa.map((e, i) => (
                        <Cell key={e.name} fill={filtros.etapa === e.name || !filtros.etapa ? CORES[i % CORES.length] : '#D8DFF0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Origem do candidato" onClear={() => setFiltros((f) => ({ ...f, fonte: null }))} cleared={!filtros.fonte}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={porFonte}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      cursor="pointer"
                      onClick={(d) => alternarFiltro('fonte', d.name)}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {porFonte.map((e, i) => (
                        <Cell key={e.name} fill={filtros.fonte === e.name || !filtros.fonte ? CORES[i % CORES.length] : '#D8DFF0'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mb-5">
              <ChartCard title="Por sexo" onClear={() => setFiltros((f) => ({ ...f, sexo: null }))} cleared={!filtros.sexo}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porSexo}>
                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#EEF1F8" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => alternarFiltro('sexo', d.name)}>
                      {porSexo.map((e, i) => (
                        <Cell key={e.name} fill={filtros.sexo === e.name || !filtros.sexo ? CORES[i % CORES.length] : '#D8DFF0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Faixa etária" onClear={() => setFiltros((f) => ({ ...f, faixaEtaria: null }))} cleared={!filtros.faixaEtaria}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porFaixaEtaria}>
                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#EEF1F8" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => alternarFiltro('faixaEtaria', d.name)}>
                      {porFaixaEtaria.map((e, i) => (
                        <Cell key={e.name} fill={filtros.faixaEtaria === e.name || !filtros.faixaEtaria ? CORES[i % CORES.length] : '#D8DFF0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Cidade / região" onClear={() => setFiltros((f) => ({ ...f, cidade: null }))} cleared={!filtros.cidade}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porCidade} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="none" horizontal={false} stroke="#EEF1F8" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => alternarFiltro('cidade', d.name)}>
                      {porCidade.map((e, i) => (
                        <Cell key={e.name} fill={filtros.cidade === e.name || !filtros.cidade ? CORES[i % CORES.length] : '#D8DFF0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-4">
                  Funil de conversão — onde estamos perdendo candidatos
                </h3>
                <FunilChart etapas={funilMarcos} cores={CORES} />
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-4">Tempo médio entre etapas</h3>
                {tempoTotalCadastroAteAlo != null && (
                  <p className="text-sm text-navy-600 dark:text-navy-300 mb-4 pb-4 border-b border-navy-100 dark:border-navy-800">
                    Do cadastro até o Alô, em média:{' '}
                    <strong className="text-navy-900 dark:text-white">{formatarDuracaoLonga(tempoTotalCadastroAteAlo)}</strong>
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  {temposEntreEtapas.map((t) => (
                    <div
                      key={`${t.de}-${t.para}`}
                      className="flex items-center justify-between border-b border-navy-50 dark:border-navy-800/60 last:border-0 py-1.5"
                    >
                      <span className="text-navy-600 dark:text-navy-300">
                        {t.de} → {t.para}
                      </span>
                      <span className="text-navy-800 dark:text-navy-100 font-medium">{formatarDuracaoLonga(t.media)}</span>
                    </div>
                  ))}
                  {temposEntreEtapas.length === 0 && <p className="text-navy-400 text-sm">Ainda sem dados suficientes.</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-3">
              <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1 w-fit">
                {GRANULARIDADES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGranularidade(g.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      granularidade === g.id ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <ChartCard title="Evolução de WPM e Precisão">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={evolucao} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradWpm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f4c73" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#2f4c73" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPrecisao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a64170" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#a64170" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="none" stroke="#EEF1F8" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} width={32} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Area type="monotone" dataKey="WPM" stroke="#2f4c73" strokeWidth={2} fill="url(#gradWpm)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="Precisão" stroke="#a64170" strokeWidth={2} fill="url(#gradPrecisao)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Candidatos cadastrados">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={candidatosPorPeriodo} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCandidatos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#30cff2" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#30cff2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="none" stroke="#EEF1F8" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Candidatos" stroke="#1AB6D8" strokeWidth={2} fill="url(#gradCandidatos)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="pt-2 pb-3 mt-8 border-t border-navy-100 dark:border-navy-800">
              <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Insights avançados</h2>
              <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">
                Qualidade, gargalos e padrões — não só volume.
              </p>
            </div>

            {/* 1. Qualidade da fonte */}
            <div className="card p-5 mb-5">
              <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">Qualidade da fonte</h3>
              <p className="text-xs text-navy-400 mb-4">Volume não é tudo — qual origem realmente converte em contratação?</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 dark:border-navy-800 text-left text-navy-400 text-xs uppercase tracking-wide">
                      <th className="py-2 pr-4">Fonte</th>
                      <th className="py-2 pr-4">Candidatos</th>
                      <th className="py-2 pr-4">Taxa de aprovação</th>
                      <th className="py-2 pr-4">WPM médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualidadeFonte.map((f) => (
                      <tr key={f.fonte} className="border-b border-navy-50 dark:border-navy-800/60 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-navy-800 dark:text-navy-100">{f.fonte}</td>
                        <td className="py-2.5 pr-4 text-navy-600 dark:text-navy-300">{formatarNumero(f.total)}</td>
                        <td className="py-2.5 pr-4">
                          {f.taxa != null ? (
                            <span className={`pill ${f.taxa >= 50 ? 'bg-sage-500/15 text-sage-600' : 'bg-amber-400/20 text-amber-700 dark:text-amber-300'}`}>
                              {f.taxa}% ({f.aprovados}/{f.decididos})
                            </span>
                          ) : (
                            <span className="text-navy-400">sem decisões ainda</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-navy-600 dark:text-navy-300">{f.wpmMedio ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              {/* 2. No-show vs Reprovado */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">No-show vs. reprovado</h3>
                <p className="text-xs text-navy-400 mb-4">Não apareceu é um problema diferente de não passar na avaliação.</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-navy-500 dark:text-navy-400 mb-1.5">
                      Entrevista ({formatarNumero(noShow.entrevistaAgendada)} agendadas)
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="pill bg-clay-500/15 text-clay-600">{noShow.entrevistaNoShow} não compareceram</span>
                      <span className="pill bg-amber-400/20 text-amber-700 dark:text-amber-300">{noShow.entrevistaReprovado} avaliados e reprovados</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-navy-500 dark:text-navy-400 mb-1.5">
                      Exame ({formatarNumero(noShow.exameAgendado)} agendados)
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="pill bg-clay-500/15 text-clay-600">{noShow.exameNoShow} não compareceram</span>
                      <span className="pill bg-amber-400/20 text-amber-700 dark:text-amber-300">{noShow.exameReprovado} avaliados e reprovados</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Ranking de indicadores */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">Ranking de indicadores</h3>
                <p className="text-xs text-navy-400 mb-4">Quem mais traz candidatos (Indicação / Funcionário Callink).</p>
                {rankingIndicadores.length === 0 ? (
                  <p className="text-sm text-navy-400">Nenhuma indicação no período.</p>
                ) : (
                  <div className="space-y-2">
                    {rankingIndicadores.map((r) => (
                      <div key={r.nome} className="flex items-center justify-between text-sm">
                        <span className="text-navy-700 dark:text-navy-200 truncate">{r.nome}</span>
                        <span className="text-navy-400 text-xs flex-shrink-0 ml-2">
                          {r.total} indicado{r.total !== 1 ? 's' : ''} · {r.aprovados} aprovado{r.aprovados !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              {/* 4. Distribuição WPM/Precisão */}
              <ChartCard title="Distribuição de WPM">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distribuicaoWpm}>
                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#EEF1F8" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2f4c73" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Distribuição de Precisão">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distribuicaoPrecisao}>
                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#EEF1F8" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#a64170" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              {/* 5. Gargalo de documentação */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">Gargalo de documentação</h3>
                <p className="text-xs text-navy-400 mb-4">
                  {gargaloDocumentacao.tempoMedioEnvio != null
                    ? `Tempo médio até enviar: ${formatarDuracaoLonga(gargaloDocumentacao.tempoMedioEnvio)}.`
                    : 'Ainda sem dados de tempo de envio.'}
                </p>
                {gargaloDocumentacao.presos.length === 0 ? (
                  <p className="text-sm text-sage-600">Ninguém preso esperando enviar documentos. 🎉</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {gargaloDocumentacao.presos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-navy-700 dark:text-navy-200 truncate">{p.nome}</span>
                        <span className="text-xs text-clay-600 flex-shrink-0 ml-2">
                          {p.dias != null ? `${p.dias} dia${p.dias !== 1 ? 's' : ''} parado` : 'sem data'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Exames atrasados */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">Exames atrasados</h3>
                <p className="text-xs text-navy-400 mb-4">Data do exame já passou e o candidato ainda não compareceu.</p>
                {examesAtrasados.length === 0 ? (
                  <p className="text-sm text-sage-600">Nenhum exame atrasado. 🎉</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {examesAtrasados.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-navy-700 dark:text-navy-200 truncate">{p.nome}</span>
                        <span className="text-xs text-clay-600 flex-shrink-0 ml-2">{p.dias} dia{p.dias !== 1 ? 's' : ''} de atraso</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              {/* 7. Correlações */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-4">Veículo x aprovação</h3>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-navy-600 dark:text-navy-300">Com veículo ({correlacaoVeiculo.comN})</span>
                  <span className="font-medium text-navy-900 dark:text-white">{correlacaoVeiculo.comTaxa ?? '—'}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-600 dark:text-navy-300">Sem veículo ({correlacaoVeiculo.semN})</span>
                  <span className="font-medium text-navy-900 dark:text-white">{correlacaoVeiculo.semTaxa ?? '—'}%</span>
                </div>
                <p className="text-xs text-navy-400 mt-3">Taxa de aprovação final entre decididos.</p>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-4">Ensino superior x aprovação</h3>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-navy-600 dark:text-navy-300">Com ensino superior ({correlacaoEnsino.comN})</span>
                  <span className="font-medium text-navy-900 dark:text-white">{correlacaoEnsino.comTaxa ?? '—'}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-600 dark:text-navy-300">Sem ensino superior ({correlacaoEnsino.semN})</span>
                  <span className="font-medium text-navy-900 dark:text-white">{correlacaoEnsino.semTaxa ?? '—'}%</span>
                </div>
                <p className="text-xs text-navy-400 mt-3">Taxa de aprovação final entre decididos.</p>
              </div>

              {/* 9. Reincidência */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-4">Reincidência de CPF</h3>
                <p className="text-2xl font-semibold text-navy-900 dark:text-white font-display mb-1">
                  {reincidencia.reincidentesN}
                </p>
                <p className="text-xs text-navy-400 mb-3">
                  de {formatarNumero(reincidencia.candidatosUnicos)} candidatos únicos já se cadastraram mais de uma vez
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-600 dark:text-navy-300">Taxa aprovação reincidentes</span>
                  <span className="font-medium text-navy-900 dark:text-white">{reincidencia.taxaReincidentes ?? '—'}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-600 dark:text-navy-300">Taxa aprovação novatos</span>
                  <span className="font-medium text-navy-900 dark:text-white">{reincidencia.taxaNovatos ?? '—'}%</span>
                </div>
              </div>
            </div>

            {/* 8. Cadastros por dia da semana */}
            <div className="mt-5 grid lg:grid-cols-2 gap-5">
              <ChartCard title="Cadastros por dia da semana">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porDiaSemana}>
                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#EEF1F8" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#D4D943" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 11. Sazonalidade mensal */}
              <ChartCard title="Sazonalidade — candidatos e aprovação por mês">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sazonalidadeMensal}>
                    <CartesianGrid strokeDasharray="none" vertical={false} stroke="#EEF1F8" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="esq" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis yAxisId="dir" orientation="right" tick={{ fontSize: 11, fill: '#8497BB' }} stroke="#DFE6F1" tickLine={false} axisLine={false} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    <Bar yAxisId="esq" dataKey="Candidatos" radius={[4, 4, 0, 0]} fill="#2f4c73" />
                    <Line yAxisId="dir" type="monotone" dataKey="Taxa de aprovação" stroke="#a64170" strokeWidth={2} dot={{ r: 3 }} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mt-5">
              {/* 10. Resposta pós-contato */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">Resposta pós-contato</h3>
                <p className="text-xs text-navy-400 mb-4">Depois do WhatsApp, o candidato segue engajado?</p>
                <p className="text-[26px] leading-none font-semibold text-navy-900 dark:text-white font-display">
                  {respostaPosContato.taxaResposta != null ? `${respostaPosContato.taxaResposta}%` : '—'}
                </p>
                <p className="text-xs text-navy-400 mt-1.5 mb-3">
                  enviaram documentação, de {respostaPosContato.contatadosN} contatados
                </p>
                {respostaPosContato.tempoMedio != null && (
                  <p className="text-sm text-navy-600 dark:text-navy-300">
                    Tempo médio até enviar: <strong className="text-navy-900 dark:text-white">{formatarDuracaoLonga(respostaPosContato.tempoMedio)}</strong>
                  </p>
                )}
              </div>

              {/* 12. Turno de treinamento x aprovação */}
              <div className="card p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 mb-1">Turno de treinamento x aprovação</h3>
                <p className="text-xs text-navy-400 mb-4">A disponibilidade de horário muda a taxa de aprovação final?</p>
                {turnoTreinamento.length === 0 ? (
                  <p className="text-sm text-navy-400">Ainda sem decisões suficientes.</p>
                ) : (
                  <div className="space-y-2.5">
                    {turnoTreinamento.map((t) => (
                      <div key={t.turno}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-navy-700 dark:text-navy-200 font-medium">{t.turno}</span>
                          <span className="text-navy-400">
                            {t.taxa}% ({t.aprovados}/{t.decididos})
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden">
                          <div className="h-full rounded-full bg-navy-700" style={{ width: `${t.taxa}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 14. Meta mensal */}
            <div className="card p-5 mt-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100 flex items-center gap-1.5">
                  <Flag size={14} className="text-navy-400" /> Meta do mês
                </h3>
                {meta && <span className="text-xs text-navy-400">{entregasNoMes} de {meta.meta_contratacoes}</span>}
              </div>
              {meta ? (
                <>
                  <div className="h-2.5 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden mt-3">
                    <div
                      className={`h-full rounded-full ${entregasNoMes >= meta.meta_contratacoes ? 'bg-sage-500' : 'bg-navy-700'}`}
                      style={{ width: `${Math.min(100, Math.round((entregasNoMes / meta.meta_contratacoes) * 100))}%` }}
                    />
                  </div>
                  <p className="text-xs text-navy-400 mt-2">
                    {entregasNoMes >= meta.meta_contratacoes
                      ? 'Meta batida! 🎉'
                      : `Faltam ${meta.meta_contratacoes - entregasNoMes} contratações para bater a meta deste mês.`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-navy-400 mt-2">
                  Nenhuma meta configurada para este mês — o analista pode definir uma em Administração.
                </p>
              )}
            </div>

            {/* 4/13. Mapa de calor geográfico */}
            <div className="card p-5 mt-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
                <div>
                  <h3 className="text-sm font-semibold text-navy-800 dark:text-navy-100">Mapa de calor — origem geográfica</h3>
                  <p className="text-xs text-navy-400 mt-0.5">Onde os candidatos estão concentrados.</p>
                </div>
                <div className="flex gap-1 bg-navy-50 dark:bg-navy-800 rounded-lg p-1 w-fit">
                  {[
                    ['cidade', 'Por cidade'],
                    ['bairro', 'Por bairro'],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setNivelMapa(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        nivelMapa === v ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <MapaDeCalor contagemPorLocal={contagemMapa} nivel={nivelMapa} />
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>

  )
}
