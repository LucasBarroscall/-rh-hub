export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 shadow-card text-xs">
      {label && <p className="font-medium text-navy-800 dark:text-navy-100 mb-1">{label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-1.5 text-navy-600 dark:text-navy-300">
          <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color || p.fill }} />
          <span>
            {p.name}: <strong className="text-navy-900 dark:text-white">{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}
