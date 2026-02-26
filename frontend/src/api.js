import axios from 'axios'

const baseURL = "http://10.29.172.228:3000"

const api = axios.create({ baseURL })

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export default api
