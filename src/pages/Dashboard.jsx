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
import { X, Users, TrendingUp, Gauge, Target } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { etapaFunil, faixaEtariaDe } from '../lib/candidato'

const CORES = ['#2f4c73', '#D4D943', '#30cff2', '#a64170', '#2a438c', '#7c93b8']

const PERIODOS = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'ano', label: 'Este ano' },
  { id: 'tudo', label: 'Tudo' },
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
      <div className="flex items-center justify-between mb-4">
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

  const dentroDoPeriodo = useMemo(() => {
    const inicio = inicioPeriodo(periodo)
    return (c) => {
      if (!inicio) return true
      return new Date(c.created_at) >= inicio
    }
  }, [periodo])

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

  // Opções disponíveis para cada select de filtro, calculadas a partir do
  // período selecionado (antes de aplicar os próprios filtros de campo).
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
  const wpmMedio = testados.length
    ? (testados.reduce((s, c) => s + Number(c.wpm || 0), 0) / testados.length).toFixed(1)
    : '—'
  const precisaoMedia = testados.length
    ? (testados.reduce((s, c) => s + Number(c.precisao || 0), 0) / testados.length).toFixed(1)
    : '—'

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
        const chave = (c.teste_em || c.created_at).slice(0, 10)
        if (!mapa[chave]) mapa[chave] = { data: chave, wpmTotal: 0, precisaoTotal: 0, n: 0 }
        mapa[chave].wpmTotal += Number(c.wpm || 0)
        mapa[chave].precisaoTotal += Number(c.precisao || 0)
        mapa[chave].n += 1
      })
    return Object.values(mapa)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((d) => ({
        data: d.data.slice(5),
        WPM: +(d.wpmTotal / d.n).toFixed(1),
        Precisão: +(d.precisaoTotal / d.n).toFixed(1),
      }))
  }, [filtrados])

  const candidatosPorDia = useMemo(() => {
    const mapa = {}
    filtrados.forEach((c) => {
      const chave = c.created_at.slice(0, 10)
      mapa[chave] = (mapa[chave] || 0) + 1
    })
    return Object.entries(mapa)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, value]) => ({ data: data.slice(5), Candidatos: value }))
  }, [filtrados])

  const filtrosAtivos = Object.entries(filtros).filter(([, v]) => v)

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Dashboard</h1>
            <p className="text-navy-500 dark:text-navy-400 text-sm mt-1">Visão geral do funil de recrutamento.</p>
          </div>
          <div className="flex gap-1 bg-white dark:bg-navy-900 rounded-lg border border-navy-100 dark:border-navy-700 p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  periodo === p.id ? 'bg-navy-700 text-white' : 'text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800'
                }`}
              >
                {p.label}
              </button>
            ))}
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard icon={Users} label="Candidatos" value={total} sub={`${porEtapa.length} etapas ativas`} />
              <KpiCard icon={Target} label="Taxa de aprovação" value={`${taxaAprovacao}%`} sub={`${aprovados.length} de ${decididos.length} decididos`} />
              <KpiCard icon={Gauge} label="WPM médio" value={wpmMedio} sub={`${testados.length} testados`} />
              <KpiCard
                icon={TrendingUp}
                label="Precisão média"
                value={precisaoMedia !== '—' ? `${precisaoMedia}%` : '—'}
                sub={`${testados.length} testados`}
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

              <ChartCard title="Candidatos cadastrados por dia">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={candidatosPorDia}>
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
