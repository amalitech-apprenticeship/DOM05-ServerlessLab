export const DEFAULT_ITERATIONS = 210000

const encoder = new TextEncoder()
const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const derive = async (password, salt, iterations) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, key, 256)
  return toHex(bits)
}

// Salted PBKDF2-SHA-256 (Web Crypto). Resolves to { algorithm, iterations, salt, hash },
// or null for an empty password (an account that can't sign in).
export const hashPassword = async (password, iterations = DEFAULT_ITERATIONS) => {
  if (!password) return null
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return { algorithm: 'PBKDF2-SHA256', iterations, salt, hash: await derive(password, salt, iterations) }
}

export const verifyPassword = async (password, credential) => {
  if (!password || !credential?.hash) return false
  const candidate = await derive(password, credential.salt, credential.iterations)
  let difference = candidate.length ^ credential.hash.length
  for (let i = 0; i < candidate.length; i += 1) difference |= candidate.charCodeAt(i) ^ credential.hash.charCodeAt(i)
  return difference === 0
}
