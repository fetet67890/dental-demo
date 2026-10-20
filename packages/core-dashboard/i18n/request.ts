import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale } from '@core/lib/i18n-config'

// Each page/feature owns its own small JSON file (messages/<locale>/<namespace>.json)
// instead of one giant shared file — keeps concurrent additions (many pages
// getting translated independently) from stepping on each other. Every file
// in the locale's directory is merged into one messages object here, keyed
// by filename, so components just call useTranslations('<namespace>').
function loadMessages(locale: string) {
  const dir = path.join(process.cwd(), 'messages', locale)
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  const messages: Record<string, unknown> = {}
  for (const file of files) {
    const namespace = path.basename(file, '.json')
    messages[namespace] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  }
  return messages
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const requested = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isSupportedLocale(requested) ? requested : DEFAULT_LOCALE

  return {
    locale,
    messages: loadMessages(locale),
  }
})
