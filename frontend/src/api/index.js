import { createHttpAdapter } from './http/httpAdapter'
import { createMockAdapter } from './mock/mockAdapter'

export class ApiConfigError extends Error {}

// Read key by key so Vite doesn't inline the whole env (including demo passwords) into the bundle.
const buildEnv = () => ({
  PROD: import.meta.env.PROD,
  VITE_API_MODE: import.meta.env.VITE_API_MODE,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_ALLOW_MOCK_IN_PRODUCTION: import.meta.env.VITE_ALLOW_MOCK_IN_PRODUCTION,
})

// Returns the adapter for VITE_API_MODE ('mock' | 'http'). Throws ApiConfigError for an unknown
// mode, or for mock mode in a production build unless VITE_ALLOW_MOCK_IN_PRODUCTION is 'true'.
export const createApi = (env = buildEnv()) => {
  const mode = env.VITE_API_MODE || 'mock'
  if (mode === 'http') return createHttpAdapter({ baseUrl: env.VITE_API_BASE_URL })
  if (mode !== 'mock') throw new ApiConfigError(`Unknown VITE_API_MODE "${mode}". Use "http" or "mock".`)
  if (env.PROD && env.VITE_ALLOW_MOCK_IN_PRODUCTION !== 'true') {
    throw new ApiConfigError(
      'This build is using the in-browser mock backend, which is not secure. Set VITE_API_MODE=http and VITE_API_BASE_URL to connect a real backend.'
    )
  }
  return createMockAdapter()
}
