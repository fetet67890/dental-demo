"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Field, FieldLabel } from '@core/components/ui/field'
import {
  getIntegrations, setIntegrationCredential, deleteIntegrationCredential, testIntegrationGroup,
  type IntegrationCredentialStatus,
} from '@core/lib/api/integrations'
import { AssistantUsageStatusCard } from './assistant-usage-status'
import { AssistantKnowledgeBaseSection } from './assistant-knowledge-base-section'
import { InboxSettingsCard } from './inbox-settings-card'

export function IntegrimetSection() {
  const t = useTranslations('integrimet-section')
  const [items, setItems]     = useState<IntegrationCredentialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts]   = useState<Record<string, string>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})

  const load = () => {
    setLoading(true)
    getIntegrations()
      .then(setItems)
      .catch(() => toast.error('Gabim gjatë ngarkimit të integrimeve'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const groups = items.reduce<Record<string, { label: string; items: IntegrationCredentialStatus[] }>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = { label: item.groupLabel, items: [] }
    acc[item.group].items.push(item)
    return acc
  }, {})

  const handleSave = async (key: string) => {
    const value = drafts[key]?.trim()
    if (!value) { toast.error('Vendosni një vlerë'); return }
    try {
      setSaving(s => ({ ...s, [key]: true }))
      await setIntegrationCredential(key, value)
      toast.success('U ruajt me sukses')
      setDrafts(d => { const next = { ...d }; delete next[key]; return next })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes')
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  const handleDelete = async (key: string) => {
    try {
      await deleteIntegrationCredential(key)
      toast.success('U hoq')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë heqjes')
    }
  }

  const handleTest = async (group: string) => {
    try {
      setTesting(t => ({ ...t, [group]: true }))
      const res = await testIntegrationGroup(group)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë testimit')
    } finally {
      setTesting(t => ({ ...t, [group]: false }))
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <AssistantUsageStatusCard />
      <AssistantKnowledgeBaseSection />
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : (
        Object.entries(groups).map(([group, { label, items: groupItems }]) => (
          <Card key={group}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">{label}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleTest(group)} disabled={testing[group]}>
                {testing[group] ? t('testing') : t('testConnection')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupItems.map(item => (
                <Field key={item.key}>
                  <FieldLabel htmlFor={item.key}>{item.label}</FieldLabel>
                  {item.configured ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-mono">{item.options?.find(o => o.value === item.preview)?.label || item.preview}</span>
                        {item.source === 'env' && <span className="ml-2 text-xs">{t('fromEnvVar')}</span>}
                        {item.source === 'default' && <span className="ml-2 text-xs">{t('defaultValue')}</span>}
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDrafts(d => ({ ...d, [item.key]: item.sensitive ? '__editing__' : (item.preview || '') }))}
                        >
                          {t('change')}
                        </Button>
                        {item.source === 'db' && (
                          <Button size="sm" variant="outline" onClick={() => handleDelete(item.key)}>{t('remove')}</Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {(!item.configured || drafts[item.key] !== undefined) && (
                    <div className="flex gap-2">
                      {item.options ? (
                        <Select
                          value={drafts[item.key] || item.preview || item.options[0]?.value}
                          onValueChange={(v) => setDrafts(d => ({ ...d, [item.key]: v }))}
                        >
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {item.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={item.key}
                          type={item.sensitive ? 'password' : 'text'}
                          autoComplete="off"
                          value={drafts[item.key] === '__editing__' ? '' : (drafts[item.key] || '')}
                          onChange={(e) => setDrafts(d => ({ ...d, [item.key]: e.target.value }))}
                          placeholder={item.label}
                        />
                      )}
                      <Button size="sm" onClick={() => handleSave(item.key)} disabled={saving[item.key]}>
                        {saving[item.key] ? t('saving') : t('save')}
                      </Button>
                      {item.configured && (
                        <Button size="sm" variant="outline" onClick={() => setDrafts(d => { const next = { ...d }; delete next[item.key]; return next })}>
                          {t('cancel')}
                        </Button>
                      )}
                    </div>
                  )}
                </Field>
              ))}
            </CardContent>
          </Card>
        ))
      )}
      {!loading && <InboxSettingsCard />}
    </div>
  )
}
