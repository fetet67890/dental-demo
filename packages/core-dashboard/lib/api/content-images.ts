import api from '../api-client'

// Shared image upload for blog posts, testimonials, and gallery — returns a
// URL (served by the Api's own /uploads/content route) to store on whichever
// resource is being edited.
export function uploadContentImage(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  return api.upload<{ url: string }>('/api/content-images/upload', form)
}
