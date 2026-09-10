import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type IdentityImages = { front: string; back: string; selfie: string }

function config(env: Record<string, unknown>) {
  const region = String(env.AWS_REGION || '').trim()
  const bucket = String(env.AWS_S3_IDENTITY_BUCKET || env.AWS_S3_BUCKET || '').trim()
  const endpoint = String(env.AWS_S3_ENDPOINT || '').trim()
  const forcePathStyle = String(env.AWS_S3_FORCE_PATH_STYLE || '').trim().toLowerCase() === 'true'
  if (!region || !bucket) throw new Error('AWS_REGION and AWS_S3_IDENTITY_BUCKET are required')
  return { region, bucket, endpoint, forcePathStyle }
}

function client(env: Record<string, unknown>) {
  const { region, endpoint, forcePathStyle } = config(env)
  return new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle,
  })
}

function decodeImage(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) throw new Error('Invalid identity image')
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > 10_000_000) throw new Error('Identity image exceeds 10 MB')
  const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1]
  return { bytes, contentType: match[1], extension }
}

export async function uploadKocIdentityImages(
  env: Record<string, unknown>,
  kocId: string,
  images: IdentityImages,
) {
  const isDev = (env.NODE_ENV || 'development') === 'development';
  const keys: Record<keyof IdentityImages, string> = { front: '', back: '', selfie: '' }
  try {
    const { bucket } = config(env)
    const s3 = client(env)
    for (const kind of Object.keys(keys) as Array<keyof IdentityImages>) {
      const image = decodeImage(images[kind])
      const key = `private/identity/${kocId}/${kind}-${crypto.randomUUID()}.${image.extension}`
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: image.bytes,
        ContentType: image.contentType,
        ServerSideEncryption: 'AES256',
        Metadata: { kocId, documentType: kind },
      }))
      keys[kind] = key
    }
    return keys
  } catch (error) {
    if (isDev) {
      console.warn('⚠️ [DEV] AWS S3 upload failed or dummy keys configured. Using local identity fallback:', (error as Error)?.message)
      return {
        front: `local/identity/${kocId}/front.jpg`,
        back: `local/identity/${kocId}/back.jpg`,
        selfie: `local/identity/${kocId}/selfie.jpg`,
      }
    }
    const { bucket } = config(env)
    const objects = Object.values(keys).filter(Boolean).map(Key => ({ Key }))
    if (objects.length) {
      await client(env).send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } })).catch(() => {})
    }
    throw error
  }
}

export async function deleteKocIdentityImages(
  env: Record<string, unknown>,
  keys: Partial<Record<keyof IdentityImages, string>>,
) {
  const objects = Object.values(keys).filter(Boolean).map(Key => ({ Key }))
  if (!objects.length) return
  const { bucket } = config(env)
  await client(env).send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }))
}

export async function signedKocIdentityUrl(env: Record<string, unknown>, key: string) {
  if (!key) return ''
  const { bucket } = config(env)
  return getSignedUrl(
    client(env),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: 'inline',
    }),
    { expiresIn: 5 * 60 },
  )
}
