import api from '../api-client'

export type GalleryTag = 'hero' | 'team' | 'clinic' | 'arc_gallery' | 'smile_ticker' | 'before' | 'after'

export interface GalleryImage {
  id: string
  tag: GalleryTag
  imagePath: string
  caption: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export function getGalleryImages(tag?: GalleryTag): Promise<GalleryImage[]> {
  return api.get<GalleryImage[]>(`/api/gallery${tag ? `?tag=${tag}` : ''}`)
}

export function createGalleryImage(data: {
  tag: GalleryTag; imagePath: string; caption?: string; sortOrder?: number; isActive?: boolean
}): Promise<GalleryImage> {
  return api.post<GalleryImage>('/api/gallery', data)
}

export function updateGalleryImage(id: string, data: Partial<{
  tag: GalleryTag; imagePath: string; caption: string; sortOrder: number; isActive: boolean
}>): Promise<GalleryImage> {
  return api.put<GalleryImage>(`/api/gallery/${id}`, data)
}

export function deleteGalleryImage(id: string): Promise<void> {
  return api.delete(`/api/gallery/${id}`)
}
