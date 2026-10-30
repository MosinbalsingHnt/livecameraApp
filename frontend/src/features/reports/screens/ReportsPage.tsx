import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useState } from 'react'
import { Card, CardTitle, EmptyState, Skeleton } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { cn, fmtDay } from '@/lib/utils'
import { useDailyReport, useWardReport } from '../hooks/useReports'

export default function ReportsPage() {
  const [days, setDays] = useState('14')
  const daily = useDailyReport(Number(days))
  const wards = useWardReport()

  const w = wards.data ?? []
  const totalAlerts = w.reduce((s, x) => s + x.alerts, 0)
  const totalCleared = w.reduce((s, x) => s + x.cleared, 0)
  const withSla = w.filter((x) => x.sla_met_pct != null)
  const avgSla = withSla.length ? withSla.reduce((s, x) => s + (x.sla_met_pct ?? 0), 0) / withSla.length : null
  const withHrs = w.filter((x) => x.avg_clear_hours != null)
  const avgHrs = withHrs.length ? withHrs.reduce((s, x) => s + (x.avg_clear_hours ?? 0), 0) / withHrs.length : null

  const summary = [
    { label: 'Total alerts', value: totalAlerts },
    { label: 'Cleared', value: totalCleared },
    { label: 'SLA met (avg of wards)', value: avgSla == null ? '—' : `${avgSla.toFixed(0)}%` },
    { label: 'Avg time to clear', value: avgHrs == null ? '—' : `${avgHrs.toFixed(1)} h` },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{wards.isLoading ? '…' : s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="mb-0">Alerts per day</CardTitle>
          <div className="w-36"><Select value={days} onChange={setDays} aria-label="Range" options={[{ value: '7', label: 'Last 7 days' }, { value: '14', label: 'Last 14 days' }, { value: '30', label: 'Last 30 days' }]} /></div>
        </div>
        {daily.isLoading ? <Skeleton className="h-72" /> : !daily.data?.length ? <EmptyState title="No data for this range" /> : (
          <div className="h-64 xl:h-72 2xl:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily.data.map((d) => ({ ...d, day: fmtDay(d.date) }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="detected" name="Detected" fill="#C2410C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="duplicates" name="Merged duplicates" fill="#8FA096" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cleared" name="Cleared" fill="#2F7A37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <CardTitle className="px-4 pt-4">Ward league table</CardTitle>
        {wards.isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : !w.length ? <EmptyState title="No wards imported yet" hint="Ward boundaries are imported by ops." /> : (
          <Table className="min-w-[860px]">
            <thead>
              <tr><Th>Ward</Th><Th className="text-right">Alerts</Th><Th className="text-right">New</Th><Th className="text-right">Assigned</Th><Th className="text-right">In progress</Th><Th className="text-right">Awaiting</Th><Th className="text-right">Cleared</Th><Th className="text-right">Dismissed</Th><Th>SLA met</Th><Th className="text-right">Avg clear</Th></tr>
            </thead>
            <tbody>
              {[...w].sort((a, b) => b.alerts - a.alerts).map((r) => (
                <tr key={r.ward_code}>
                  <Td><p className="font-medium">{r.ward}</p><p className="text-xs text-muted-foreground">{r.ward_code}</p></Td>
                  {[r.alerts, r.new, r.assigned, r.in_progress, r.awaiting_confirmation, r.cleared, r.dismissed].map((n, i) => (
                    <Td key={i} className={cn('text-right tabular-nums', i === 0 && 'font-semibold')}>{n}</Td>
                  ))}
                  <Td>
                    {r.sla_met_pct == null ? <span className="text-muted-foreground">—</span> : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-muted"><div className={cn('h-full rounded-full', r.sla_met_pct < 60 ? 'bg-[#D9822B]' : 'bg-brand')} style={{ width: `${r.sla_met_pct}%` }} /></div>
                        <span className="w-12 tabular-nums">{r.sla_met_pct.toFixed(0)}%</span>
                      </div>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{r.avg_clear_hours == null ? '—' : `${r.avg_clear_hours.toFixed(1)} h`}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
