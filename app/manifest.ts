import type { MetadataRoute } from 'next'
import { buildManifest } from '@hypocrates/core-dashboard/app-pages/manifest-builder'
import { specialtyConfig } from '@/lib/specialty.config'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return buildManifest(specialtyConfig)
}
