import { useTranslations } from 'next-intl'

export function Footer({ className }: { className?: string }) {
  const t = useTranslations('footer')
  const year = new Date().getFullYear()

  return (
    <footer className={`w-full border-t border-border bg-background px-6 py-3 text-center text-xs text-muted-foreground shrink-0 ${className ?? ''}`}>
      <span>{t('copyright', { year })}</span>
      <span className="mx-2 opacity-40">·</span>
      <span>
        {t('designedBy')}{' '}
        <span className="font-medium text-foreground">QuolyTech</span>
      </span>
    </footer>
  )
}
