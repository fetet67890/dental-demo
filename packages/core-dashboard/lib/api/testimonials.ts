import api from '../api-client'

export interface Testimonial {
  id: string
  name: string
  quote: string
  title: string
  location: string
  gender: 'M' | 'F' | null
  rating: number | null
  photoPath: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export function getTestimonials(): Promise<Testimonial[]> {
  return api.get<Testimonial[]>('/api/testimonials')
}

export function createTestimonial(data: {
  name: string; quote: string; title?: string; location?: string
  gender?: 'M' | 'F'; rating?: number; photoPath?: string; sortOrder?: number; isActive?: boolean
}): Promise<Testimonial> {
  return api.post<Testimonial>('/api/testimonials', data)
}

export function updateTestimonial(id: string, data: Partial<{
  name: string; quote: string; title: string; location: string
  gender: 'M' | 'F'; rating: number; photoPath: string; sortOrder: number; isActive: boolean
}>): Promise<Testimonial> {
  return api.put<Testimonial>(`/api/testimonials/${id}`, data)
}

export function deleteTestimonial(id: string): Promise<void> {
  return api.delete(`/api/testimonials/${id}`)
}
