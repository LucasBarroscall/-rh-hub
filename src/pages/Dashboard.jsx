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
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
} from 'recharts'
import { X, Users, TrendingUp, Gauge, Target, Clock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import DateRangePicker from '../components/DateRangePicker'
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
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-navy-900 dark:text-white font-display">{value}</p>
      {sub && <p className="text-xs text-navy-400 mt-1">{sub}</p>}
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

  // ---- Funil de conversão (contagem cumulativa por marco) ----
  const etapasComData = ETAPAS_FUNIL.filter((e) => e.dataCampo)

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
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
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
          </div>
        </header>

        <div className="card p-4 mb-6 flex flex-wrap items-end gap-4">
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
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E9F5" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#B3BFE0" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} stroke="#B3BFE0" />
                    <Tooltip />
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mb-5">
              <ChartCard title="Por sexo" onClear={() => setFiltros((f) => ({ ...f, sexo: null }))} cleared={!filtros.sexo}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porSexo}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E9F5" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#B3BFE0" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#B3BFE0" />
                    <Tooltip />
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E9F5" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#B3BFE0" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#B3BFE0" />
                    <Tooltip />
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
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E9F5" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#B3BFE0" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} stroke="#B3BFE0" />
                    <Tooltip />
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
                <div className="space-y-2.5">
                  {funilMarcos.map((f, i) => {
                    const max = funilMarcos[0].value || 1
                    const pct = Math.round((f.value / max) * 100)
                    const pctAnterior =
                      i > 0 && funilMarcos[i - 1].value ? Math.round((f.value / funilMarcos[i - 1].value) * 100) : null
                    return (
                      <div key={f.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-navy-700 dark:text-navy-200 font-medium">{f.name}</span>
                          <span className="text-navy-400">
                            {formatarNumero(f.value)} · {pct}%
                            {pctAnterior != null ? ` (${pctAnterior}% da etapa anterior)` : ''}
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-navy-50 dark:bg-navy-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: CORES[i % CORES.length] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
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
                  <LineChart data={evolucao}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F5" />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} stroke="#B3BFE0" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#B3BFE0" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="WPM" stroke="#2f4c73" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Precisão" stroke="#a64170" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Candidatos cadastrados">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={candidatosPorPeriodo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F5" />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} stroke="#B3BFE0" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#B3BFE0" allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Candidatos" stroke="#30cff2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
