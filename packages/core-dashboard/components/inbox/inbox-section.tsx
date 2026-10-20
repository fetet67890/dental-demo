"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Card } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Badge } from "@core/components/ui/badge"
import { Avatar, AvatarFallback } from "@core/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import { Textarea } from "@core/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@core/components/ui/dialog"
import { EmptyState } from "@core/components/ui/empty-state"
import { SkeletonTable, LoadingSpinner } from "@core/components/ui/loading"
import { Mail, Send, RefreshCw, ExternalLink, Reply } from "lucide-react"
import { cn } from "@core/lib/utils"
import {
  getMailboxSettings, getEmails, getEmail, replyToEmail, sendTestEmail,
  type MailboxSettings, type SyncedEmail, type EmailDetail,
} from "@core/lib/api/clinic-mailbox"

const PERIOD_OPTIONS = [
  { hours: 24, key: "24h" },
  { hours: 72, key: "3d" },
  { hours: 168, key: "7d" },
  { hours: 720, key: "30d" },
]

// Deterministic per-sender avatar color — the same address always lands on
// the same color across renders/sessions, so it works as a real scanning
// aid (like Gmail's sender colors) instead of just noise. Tailwind's own
// dark: pairing handles both themes; there's no other avatar convention
// elsewhere in this app yet to match, so this palette is scoped to Inbox.
const AVATAR_PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
]

function avatarClassFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function initialFor(email: { fromName: string | null; fromAddress: string }) {
  const source = email.fromName?.trim() || email.fromAddress
  return source.charAt(0).toUpperCase()
}

// Today → time only, this year → "Aug 18", older → "Aug 18, 2025" — the
// same tiering Gmail/most inboxes use so the common case (today's mail)
// scans as a time, not a date nobody needs to re-read.
function formatSmartDate(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" })
}

export function InboxSection() {
  const t = useTranslations("inbox")

  const [settings, setSettingsState] = useState<MailboxSettings | null | undefined>(undefined)
  const [hours, setHours] = useState(24)
  const [emails, setEmails] = useState<SyncedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingTest, setSendingTest] = useState(false)

  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  const unreadCount = useMemo(() => emails.filter((e) => !e.isRead).length, [emails])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getMailboxSettings()
      setSettingsState(s)
      if (s.enabled && s.imapConfigured) {
        const rows = await getEmails(hours)
        setEmails(rows)
      } else {
        setEmails([])
      }
    } catch {
      toast.error(t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [hours, t])

  useEffect(() => { load() }, [load])

  const openEmail = async (id: string) => {
    setOpenId(id)
    setDetail(null)
    setReplyText("")
    setLoadingDetail(true)
    try {
      const full = await getEmail(id)
      setDetail(full)
      // Reflect the read state locally right away — the server marks it
      // \Seen in the real mailbox too, this just keeps the list in sync
      // without waiting for the next 5-minute sweep.
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("openError"))
      setOpenId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const sendReply = async () => {
    if (!openId || !replyText.trim()) return
    setSendingReply(true)
    try {
      await replyToEmail(openId, replyText.trim())
      toast.success(t("replySent"))
      setEmails((prev) => prev.map((e) => (e.id === openId ? { ...e, repliedAt: new Date().toISOString() } : e)))
      setOpenId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("replyError"))
    } finally {
      setSendingReply(false)
    }
  }

  const handleSendTest = async () => {
    setSendingTest(true)
    try {
      const res = await sendTestEmail()
      toast.success(res.message)
      setTimeout(load, 6000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("testError"))
    } finally {
      setSendingTest(false)
    }
  }

  if (loading && settings === undefined) {
    return <SkeletonTable rows={6} />
  }

  if (!settings?.enabled || !settings.imapConfigured) {
    return (
      <EmptyState
        icon={Mail}
        title={t("noMailbox.title")}
        description={t("noMailbox.description")}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.hours} value={String(opt.hours)}>{t(`period.${opt.key}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t("refresh")}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="rounded-full px-2.5 font-medium tabular-nums">
              {t("unread", { count: unreadCount })}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {settings.lastSyncError && (
            <Badge variant="destructive" className="max-w-[240px] truncate">{settings.lastSyncError}</Badge>
          )}
          <Button variant="outline" onClick={handleSendTest} disabled={sendingTest} className="gap-2">
            {sendingTest ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
            {t("sendTest")}
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : emails.length === 0 ? (
        <EmptyState icon={Mail} title={t("empty.title")} description={t("empty.description")} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden gap-0 py-0">
          {emails.map((email) => (
            <button
              key={email.id}
              onClick={() => openEmail(email.id)}
              className={cn(
                "w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors hover:bg-secondary/60",
                !email.isRead && "bg-accent/[0.06]"
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", !email.isRead ? "bg-accent" : "bg-transparent")}
                aria-hidden="true"
              />
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className={cn("text-xs font-semibold", avatarClassFor(email.fromAddress))}>
                  {initialFor(email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("text-sm truncate", !email.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                    {email.fromName || email.fromAddress}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatSmartDate(email.receivedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {email.repliedAt && (
                    <Reply className="h-3 w-3 text-accent shrink-0" aria-label={t("reply")} />
                  )}
                  <p className={cn("text-sm truncate", !email.isRead ? "text-foreground" : "text-muted-foreground")}>
                    {email.subject || t("noSubject")}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </Card>
      )}

      <Dialog open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          {loadingDetail || !detail ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 pr-6">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={cn("text-sm font-semibold", avatarClassFor(detail.fromAddress))}>
                      {initialFor(detail)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <DialogTitle className="text-base leading-snug">{detail.subject || t("noSubject")}</DialogTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {detail.fromName ? `${detail.fromName} <${detail.fromAddress}>` : detail.fromAddress}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(detail.receivedAt).toLocaleString()}</p>
                  </div>
                  {settings.webmailUrl && (
                    <Button variant="ghost" size="icon" asChild className="shrink-0 -mt-1">
                      <a href={settings.webmailUrl} target="_blank" rel="noreferrer" aria-label={t("openInWebmail")}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="max-h-80 overflow-auto whitespace-pre-wrap text-sm rounded-lg border border-border bg-secondary/30 p-4">
                {detail.body || t("emptyBody")}
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Textarea
                  placeholder={t("replyPlaceholder")}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="border-0 rounded-none resize-none shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-3 py-2">
                  <Button size="sm" onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="gap-2">
                    {sendingReply ? <LoadingSpinner size="sm" /> : <Reply className="h-3.5 w-3.5" />}
                    {t("reply")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
