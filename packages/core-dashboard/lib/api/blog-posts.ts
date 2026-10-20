import api from '../api-client'

export interface BlogSection {
  heading?: string
  paragraph: string
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  englishTitle: string
  excerpt: string
  category: string
  readTime: string
  image: string | null
  hasDoubleImage: boolean
  writer: { name: string; role: string; avatar: string | null; bio: string }
  sections: BlogSection[]
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export function getBlogPosts(): Promise<BlogPost[]> {
  return api.get<BlogPost[]>('/api/blog-posts')
}

export function getBlogPost(id: string): Promise<BlogPost> {
  return api.get<BlogPost>(`/api/blog-posts/${id}`)
}

export function createBlogPost(data: {
  title: string; englishTitle?: string; excerpt?: string; category?: string; readTime?: string
  image?: string; hasDoubleImage?: boolean; writerName?: string; writerRole?: string
  writerAvatar?: string; writerBio?: string; sections?: BlogSection[]; isPublished?: boolean; slug?: string
}): Promise<BlogPost> {
  return api.post<BlogPost>('/api/blog-posts', data)
}

export function updateBlogPost(id: string, data: Partial<{
  title: string; englishTitle: string; excerpt: string; category: string; readTime: string
  image: string; hasDoubleImage: boolean; writerName: string; writerRole: string
  writerAvatar: string; writerBio: string; sections: BlogSection[]; isPublished: boolean; slug: string
}>): Promise<BlogPost> {
  return api.put<BlogPost>(`/api/blog-posts/${id}`, data)
}

export function deleteBlogPost(id: string): Promise<void> {
  return api.delete(`/api/blog-posts/${id}`)
}
