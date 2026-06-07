import axios from 'axios'

import { env } from '@/lib/env'
import { supabase } from '@/lib/supabaseClient'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
})

apiClient.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.set('Authorization', `Bearer ${session.access_token}`)
  } else {
    config.headers.delete('Authorization')
  }

  return config
})
