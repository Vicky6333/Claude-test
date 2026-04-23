import client from './client'

export const submissionsApi = {
  list: (params) => client.get('/submissions', { params }),
  get: (id) => client.get(`/submissions/${id}`),
  create: (data) => client.post('/submissions', data),
  patch: (id, data) => client.patch(`/submissions/${id}`, data),
  aiEvaluate: (id) => client.post(`/submissions/${id}/ai-evaluate`),
  accept: (id, data) => client.post(`/submissions/${id}/accept`, data),
  updateAcceptance: (id, data) => client.patch(`/submissions/${id}/accept`, data),
}
