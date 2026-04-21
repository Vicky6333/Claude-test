import client from './client'

export const materialsApi = {
  list: (params) => client.get('/materials', { params }),
  get: (id) => client.get(`/materials/${id}`),
  create: (data) => client.post('/materials', data),
  update: (id, data) => client.patch(`/materials/${id}`, data),
  delete: (id) => client.delete(`/materials/${id}`),
}
