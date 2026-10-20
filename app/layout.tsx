import type { Metadata } from 'next'
import { RootLayoutShell, buildMetadata, getFaviconUrl, rootViewport } from '@hypocrates/core-dashboard/app-pages/root-layout-shell'
import { specialtyConfig } from '@/lib/specialty.config'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getFaviconUrl()
  return buildMetadata(specialtyConfig, faviconUrl)
}

export const viewport = rootViewport

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootLayoutShell>{children}</RootLayoutShell>
}
