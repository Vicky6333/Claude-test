import client from './client'

export const topicsApi = {
  list: (params) => client.get('/topics', { params }),
  get: (id) => client.get(`/topics/${id}`),
  create: (data) => client.post('/topics', data),
  update: (id, data) => client.patch(`/topics/${id}`, data),
  evaluate: (id) => client.post(`/topics/${id}/evaluate`),
}
