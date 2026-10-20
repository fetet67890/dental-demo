import createNextIntlPlugin from 'next-intl/plugin'

// Single source of truth for the Next.js config every apps/<specialty>/dashboard
// shares — was a byte-identical next.config.mjs copy-pasted across forks
// before this monorepo; a change here now reaches every specialty on its
// next build with no manual re-copy. Each app's own next.config.mjs is a
// thin call into buildNextConfig() supplying only what's genuinely
// per-app: where its i18n/request.ts lives, its own outputFileTracingRoot
// (must be an absolute path computed from that app's own file location —
// see next.config.mjs's own comment), and any extra webpack/turbopack
// rules a specialty needs (Dental's Cornerstone3D WASM codecs).
export function buildNextConfig({
  outputFileTracingRoot,
  i18nRequestPath = './i18n/request.ts',
  webpackExtra,
} = {}) {
  const withNextIntl = createNextIntlPlugin(i18nRequestPath)

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    // Emits a minimal, self-contained server (.next/standalone) that only
    // includes the node_modules actually needed at runtime — the standard
    // lean-Docker-image pattern. No effect on `next dev`.
    output: 'standalone',
    outputFileTracingRoot,
    // Every app's UI is core-dashboard's source, transpiled per-app rather
    // than pre-built — Next.js otherwise only transpiles the app's own
    // directory and treats workspace packages as pre-compiled.
    transpilePackages: ['@hypocrates/core-dashboard'],
    // Belt-and-suspenders for i18n/request.ts's runtime fs.readdirSync over
    // messages/<locale>/*.json: Next's file tracer can't see that dynamic
    // read coming, so messages/ silently drops out of .next/standalone unless
    // explicitly included here. Currently masked here by the Dockerfile's own
    // explicit `COPY messages ./messages` step — but the standalone demo
    // template (same i18n/request.ts, no such Docker step, deployed via
    // Netlify's serverless Functions instead) hit exactly this gap in
    // production: ENOENT scandir '/var/task/messages/sq'. Added here too so
    // this app doesn't quietly depend on the Dockerfile step never changing.
    outputFileTracingIncludes: {
      '/*': ['./messages/**/*'],
    },
    // Hides the floating dev-mode route indicator (bottom-left "N" badge) —
    // purely a dev-time overlay, doesn't affect production or error reporting.
    devIndicators: false,
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
    },
    // Next.js 16 defaults both `next dev` and `next build` to Turbopack, so a
    // `webpack()` config key (the setup Cornerstone3D's own docs show) is
    // simply never executed there. This is the Turbopack-native equivalent: treat
    // `.wasm` codec files as emitted static assets (same as webpack's
    // `asset/resource`), and stub out `fs` for browser bundles the same way
    // webpack's `resolve.fallback = { fs: false }` did. Inert for specialties
    // with no WASM codecs of their own — the rule just never matches.
    //
    // `next dev` (Turbopack) handles the Cornerstone3D DICOM viewer's WASM
    // codecs fine with the above. `next build` under Turbopack does NOT —
    // it hangs indefinitely (0% CPU, genuinely deadlocked, not just slow)
    // somewhere in resolving the codec packages' decoder Web Worker, rather
    // than erroring the way webpack does. Turbopack support for `build`
    // (as opposed to `dev`) only went stable in Next 16.0.0 and is evidently
    // not yet reliable for this dependency — see each app's package.json
    // `build` script, which builds with `--webpack` instead specifically to
    // route around this. Keep this turbopack config too: `next dev` still
    // uses it.
    webpack: (config, context) => {
      if (!context.isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
        }
      }
      config.experiments = { ...config.experiments, asyncWebAssembly: true }
      config.module.rules.push({ test: /\.wasm$/, type: 'asset/resource' })
      if (webpackExtra) webpackExtra(config, context)
      return config
    },
    turbopack: {
      rules: {
        '*.wasm': {
          type: 'asset',
        },
      },
      resolveAlias: {
        fs: { browser: '@hypocrates/core-dashboard/lib/empty-module.ts' },
      },
    },
    // The patient portal moved to Hypocrates-Web (login/account pages now match
    // the public site's own template) — these send anyone with an old bookmark
    // or a stale invite-email link to the new equivalent instead of a bare 404.
    // Query strings (e.g. an activation ?token=...) forward automatically.
    async redirects() {
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001'
      return [
        { source: '/portal-hyrje',                     destination: `${portalUrl}/login`,                   permanent: false },
        { source: '/portal-hyrje/aktivizo',            destination: `${portalUrl}/activate`,                permanent: false },
        { source: '/portal',                           destination: `${portalUrl}/account`,                 permanent: false },
        { source: '/portal/takime',                    destination: `${portalUrl}/account/appointments`,    permanent: false },
        { source: '/portal/faturat',                   destination: `${portalUrl}/account/invoices`,        permanent: false },
        { source: '/portal/trajtimet',                 destination: `${portalUrl}/account/treatments`,      permanent: false },
        { source: '/portal/permbledhja-mjekesore',     destination: `${portalUrl}/account/medical-summary`, permanent: false },
        { source: '/portal/klinika',                   destination: `${portalUrl}/account/clinic`,          permanent: false },
      ]
    },
    async rewrites() {
      // Only proxy in local dev — in production the frontend calls the API directly
      if (process.env.NEXT_PUBLIC_API_URL) return []
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
        {
          source: '/uploads/:path*',
          destination: 'http://localhost:5000/uploads/:path*',
        },
      ]
    },
  }

  return withNextIntl(nextConfig)
}
