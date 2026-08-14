const encoder = new TextEncoder()

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function signingKey(secret: string, usage: KeyUsage[]) {
  if (!secret || encoder.encode(secret).length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes')
  }
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  )
}

export async function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${header}.${body}`
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(secret, ['sign']),
    encoder.encode(unsignedToken),
  )
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyJwt(token: string, secret: string) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])))
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null
    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(secret, ['verify']),
      base64UrlDecode(parts[2]),
      encoder.encode(`${parts[0]}.${parts[1]}`),
    )
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])))
    const currentTime = Math.floor(Date.now() / 1000)
    if (payload.iss !== 'koc-viet' || payload.aud !== 'koc-viet-web') return null
    if (!payload.sub || !Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return null
    if (payload.iat > currentTime + 60 || payload.exp <= currentTime) return null
    return payload
  } catch (_) {
    return null
  }
}
