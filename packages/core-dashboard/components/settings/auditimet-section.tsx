"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@core/components/ui/input'
import { SearchInput } from '@core/components/ui/search-input'
import { Card, CardContent } from '@core/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@core/components/ui/pagination'
import { History, User, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sq } from 'date-fns/locale'
import { toast } from 'sonner'
import { getAuditLogs, getAuditLogsCount } from '@core/lib/api/audit'
import type { AuditLog } from '@core/types'

const PAGE_SIZE = 20

export function AuditimetSection() {
  const t = useTranslations('auditimet-section')
  const [logs, setLogs]           = useState<AuditLog[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage]           = useState(1)

  // Debounce free-text search before it hits the API.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Any filter change restarts pagination from page 1.
  useEffect(() => { setPage(1) }, [search, roleFilter])

  useEffect(() => {
    const params = {
      search: search || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
    }
    setLoading(true)
    Promise.all([
      getAuditLogs({ ...params, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      getAuditLogsCount(params),
    ])
      .then(([items, { total }]) => { setLogs(items); setTotal(total) })
      .catch(() => toast.error('Gabim gjatë ngarkimit të auditimeve'))
      .finally(() => setLoading(false))
  }, [search, roleFilter, page])

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return t('roles.admin')
      case 'mjek':
        return t('roles.mjek')
      case 'recepsion':
        return t('roles.recepsion')
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':     return 'chip-indigo'
      case 'mjek':      return 'chip-green'
      case 'recepsion': return 'chip-blue'
      default:          return 'chip-neutral'
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          placeholder={t('searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="flex-1"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('filterByRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('roles.all')}</SelectItem>
            <SelectItem value="admin">{t('roles.admin')}</SelectItem>
            <SelectItem value="mjek">{t('roles.mjek')}</SelectItem>
            <SelectItem value="recepsion">{t('roles.recepsion')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Logs List */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 lg:p-6">
          <div className="space-y-4">
            {loading ? (
              <p className="text-center py-12 text-muted-foreground">{t('loading')}</p>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('empty')}</p>
              </div>
            ) : logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/30"
              >
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <History className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">{log.action}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{log.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:ml-auto flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{log.user}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleColor(log.role)}`}>
                    {getRoleLabel(log.role)}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(new Date(log.timestamp), {
                      addSuffix: true,
                      locale: sq,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {t('pagination', { page, totalPages, total })}
              </p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (page > 1) setPage(p => p - 1) }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(p => p + 1) }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
