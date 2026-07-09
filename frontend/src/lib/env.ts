function getRequiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const env = {
  apiBaseUrl: getRequiredEnv(
    'VITE_API_BASE_URL',
    import.meta.env.VITE_API_BASE_URL
  ),
  supabaseUrl: getRequiredEnv(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL
  ),
  supabasePublishableKey: getRequiredEnv(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ),
  // Optional on purpose: only the Desmos graph card needs it, so a missing key
  // must not brick the whole app at boot — the card surfaces the error instead.
  desmosApiKey: (import.meta.env.VITE_DESMOS_API_KEY ?? '') as string,
}
