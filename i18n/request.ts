import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale } from '@core/lib/i18n-config'

// Bundles messages/<locale>/*.json into the build via webpack's require.context
// instead of core-dashboard's runtime fs.readdirSync over process.cwd(). On
// serverless hosts (Vercel) cwd is not this app's folder, so that read fails
// with ENOENT and every page 500s. Same merge-by-filename shape as core's loader.
const context = (require as any).context('../messages', true, /^\.\/[a-z]+\/[^/]+\.json$/)

function loadMessages(locale: string) {
  const messages: Record<string, unknown> = {}
  for (const key of context.keys() as string[]) {
    const [, fileLocale, file] = key.split('/')
    if (fileLocale !== locale) continue
    messages[file.replace(/\.json$/, '')] = context(key)
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
