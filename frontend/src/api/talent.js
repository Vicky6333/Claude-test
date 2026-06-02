import client from './client'

export const talentApi = {
  create: (data) => client.post('/talent/reports', data),
  get: (id) => client.get(`/talent/reports/${id}`),
}
