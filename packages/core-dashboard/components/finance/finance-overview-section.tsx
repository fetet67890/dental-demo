"use client"

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useData } from '@core/context/data-context'
import { StatCard } from '@core/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Wallet, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight, Minus, Loader2 } from 'lucide-react'
import { fmtLEK, fmtEUR } from '@core/lib/currency'
import { getRevenueForecast, type RevenueForecast } from '@core/lib/api/dashboard'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function FinanceOverviewSection() {
  const t = useTranslations('admin-financa')
  const MONTH_NAMES = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
    t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
    t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec'),
  ]
  const METHOD_LABELS: Record<string, string> = {
    cash: t('paymentMethods.cash'),
    karte: t('paymentMethods.karte'),
    transfer: t('paymentMethods.transfer'),
  }
  const TREND_LABELS: Record<string, string> = {
    up: t('trend.up'),
    down: t('trend.down'),
    flat: t('trend.flat'),
  }
  const { invoices, dailyTransactions } = useData()
  const [forecast, setForecast] = useState<RevenueForecast | null>(null)
  const [forecastLoading, setForecastLoading] = useState(true)

  useEffect(() => {
    getRevenueForecast(3)
      .then(setForecast)
      .catch(() => setForecast(null))
      .finally(() => setForecastLoading(false))
  }, [])

  const forecastChartData = useMemo(() => {
    if (!forecast) return []
    const fmtMonth = (key: string) => {
      const [y, m] = key.split('-').map(Number)
      return `${MONTH_NAMES[m - 1]} '${String(y).slice(2)}`
    }
    return [
      ...forecast.history.slice(-6).map(h => ({ name: fmtMonth(h.month), revenue: h.revenue, projected: 0 })),
      ...forecast.forecast.map(f => ({ name: fmtMonth(f.month), revenue: 0, projected: f.revenue })),
    ]
  }, [forecast])

  const monthlyData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const income = invoices
        .filter((inv) => inv.createdAt?.startsWith(key))
        .reduce((sum, inv) => sum + inv.paidAmount, 0)
      const expenses = dailyTransactions
        .filter((t) => t.type === 'dalje' && t.createdAt?.startsWith(key))
        .reduce((sum, t) => sum + t.amount, 0)
      return { name: MONTH_NAMES[d.getMonth()], income, expenses }
    })
  }, [invoices, dailyTransactions])

  const expenseCategories = useMemo(() => {
    const totals: Record<string, number> = {}
    dailyTransactions
      .filter((t) => t.type === 'dalje')
      .forEach((t) => {
        const key = METHOD_LABELS[t.method] || t.method
        totals[key] = (totals[key] || 0) + t.amount
      })
    return Object.entries(totals).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [dailyTransactions])

  const totalIncome = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const pendingPayments = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0)
  const totalExpenses = dailyTransactions
    .filter((t) => t.type === 'dalje')
    .reduce((sum, t) => sum + t.amount, 0)
  const netBalance = totalIncome - totalExpenses

  const todayKey = new Date().toISOString().split('T')[0]
  const todayTransactions = dailyTransactions.filter((t) => t.createdAt.startsWith(todayKey))
  const todayIncome = todayTransactions
    .filter((t) => t.type === 'hyrese')
    .reduce((sum, t) => sum + t.amount, 0)
  const todayExpenses = todayTransactions
    .filter((t) => t.type === 'dalje')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <StatCard
          title={t('stats.totalRevenue')}
          value={fmtLEK(totalIncome)}
          description={fmtEUR(totalIncome)}
          icon={Wallet}
          color="emerald"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title={t('stats.pendingPayments')}
          value={fmtLEK(pendingPayments)}
          description={fmtEUR(pendingPayments)}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title={t('stats.totalExpenses')}
          value={fmtLEK(totalExpenses)}
          description={fmtEUR(totalExpenses)}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title={t('stats.netBalance')}
          value={fmtLEK(netBalance)}
          description={fmtEUR(netBalance)}
          icon={CreditCard}
          color={netBalance >= 0 ? 'emerald' : 'rose'}
          trend={{ value: 8, isPositive: netBalance > 0 }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Income vs Expenses */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">
              {t('charts.incomeVsExpenses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--chart-1)" fontSize={12} />
                <YAxis stroke="var(--chart-1)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${fmtLEK(value)}`,
                    name === 'income' ? t('charts.income') : t('charts.expenses'),
                  ]}
                />
                <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="income" />
                <Bar dataKey="expenses" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="expenses" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">{t('charts.income')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full dot-red" />
                <span className="text-sm text-muted-foreground">{t('charts.expenses')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">
              {t('charts.expenseDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                {t('charts.noExpenses')}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [`${fmtLEK(value)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {expenseCategories.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{fmtLEK(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold text-primary">
            {t('charts.forecastTitle')}
          </CardTitle>
          {forecast?.trend && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              forecast.trend.direction === 'up' ? 'chip-green' : forecast.trend.direction === 'down' ? 'chip-red' : 'chip-neutral'
            }`}>
              {forecast.trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : forecast.trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {TREND_LABELS[forecast.trend.direction]}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {forecastLoading ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !forecast || forecast.insufficientData ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm text-center px-6">
              {t('charts.insufficientData')}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--chart-1)" fontSize={12} />
                  <YAxis stroke="var(--chart-1)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '12px' }}
                    formatter={(value: number, name: string) => [fmtLEK(value), name === 'revenue' ? t('charts.actual') : t('charts.projected')]}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="revenue" />
                  <Bar dataKey="projected" fill="var(--chart-5)" radius={[4, 4, 0, 0]} name="projected" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm text-muted-foreground">{t('charts.actual')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--chart-5)' }} />
                  <span className="text-sm text-muted-foreground">{t('charts.projectedTrend')}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Today's Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">
              {t('today.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 ibg-green rounded-xl">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="h-5 w-5 ic-green" />
                  <span className="font-medium ic-green">{t('today.incoming')}</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold ic-green">{fmtLEK(todayIncome)}</p>
                  <p className="text-xs ic-green">{fmtEUR(todayIncome)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 ibg-red rounded-xl">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="h-5 w-5 ic-red" />
                  <span className="font-medium ic-red">{t('today.outgoing')}</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold ic-red">{fmtLEK(todayExpenses)}</p>
                  <p className="text-xs ic-red">{fmtEUR(todayExpenses)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                <span className="font-medium text-primary">{t('today.dailyBalance')}</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{fmtLEK(todayIncome - todayExpenses)}</p>
                  <p className="text-xs text-muted-foreground">{fmtEUR(todayIncome - todayExpenses)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">
              {t('recent.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {t('recent.empty')}
              </div>
            ) : (
              <div className="space-y-3">
                {dailyTransactions.slice(0, 6).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          transaction.type === 'hyrese' ? 'ibg-green' : 'ibg-red'
                        }`}
                      >
                        {transaction.type === 'hyrese' ? (
                          <ArrowUpRight className="h-4 w-4 ic-green" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 ic-red" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.createdBy} •{' '}
                          {new Date(transaction.createdAt).toLocaleTimeString('sq-AL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold text-right ${
                        transaction.type === 'hyrese' ? 'ic-green' : 'ic-red'
                      }`}
                    >
                      <p>{transaction.type === 'hyrese' ? '+' : '-'}{fmtLEK(transaction.amount)}</p>
                      <p className="text-xs font-normal text-muted-foreground">{fmtEUR(transaction.amount)}</p>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
