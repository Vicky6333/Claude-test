import client from './client'

export const projectsApi = {
  list: () => client.get('/projects'),
  get: (id) => client.get(`/projects/${id}`),
  create: (data) => client.post('/projects', data),
  update: (id, data) => client.patch(`/projects/${id}`, data),
  getStats: (id) => client.get(`/projects/${id}/stats`),
}
