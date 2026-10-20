import api from '../api-client'
import type { PatientDocument } from '@core/types'

export function getDocumentsByPatient(patientId: string): Promise<PatientDocument[]> {
  return api.get<PatientDocument[]>(`/api/documents/patient/${patientId}`)
}

export function uploadDocument(
  patientId: string,
  file: File,
  category: PatientDocument['category'] = 'general'
): Promise<PatientDocument> {
  const form = new FormData()
  form.append('file', file)
  form.append('category', category)
  return api.upload<PatientDocument>(`/api/documents/upload/${patientId}`, form)
}

export interface UploadBatchResponse {
  studyId: string
  documents: PatientDocument[]
  failed: { filename: string; error: string }[]
}

export function uploadDocumentsBatch(
  patientId: string,
  files: File[],
  imageSubtype: string
): Promise<UploadBatchResponse> {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  form.append('imageSubtype', imageSubtype)
  return api.upload<UploadBatchResponse>(`/api/documents/upload-batch/${patientId}`, form)
}

export function deleteDocument(id: string): Promise<void> {
  return api.delete(`/api/documents/${id}`)
}
