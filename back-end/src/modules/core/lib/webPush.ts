import webpush, { type PushSubscription } from 'web-push'

type PushEnvironment = {
  DB: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        all(): Promise<{ results?: Array<Record<string, unknown>> }>
        run(): Promise<unknown>
      }
    }
  }
  VAPID_PUBLIC_KEY?: unknown
  VAPID_PRIVATE_KEY?: unknown
  VAPID_SUBJECT?: unknown
}

export type PushMessage = {
  id: string
  title: string
  message: string
  href: string
  type?: string
  timestamp?: number
}

export function pushPublicKey(env: PushEnvironment): string {
  return String(env.VAPID_PUBLIC_KEY || '').trim()
}

function vapidDetails(env: PushEnvironment) {
  const publicKey = pushPublicKey(env)
  const privateKey = String(env.VAPID_PRIVATE_KEY || '').trim()
  const subject = String(env.VAPID_SUBJECT || 'mailto:support@kocviet.com').trim()
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export async function sendPushToUser(
  env: PushEnvironment,
  userId: string,
  message: PushMessage,
): Promise<void> {
  const details = vapidDetails(env)
  if (!details || !userId) return

  let results: Array<Record<string, unknown>> = []
  try {
    const response = await env.DB.prepare(
      `SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=?`,
    ).bind(userId).all()
    results = response.results || []
  } catch (error) {
    console.warn('web push subscriptions unavailable', error)
    return
  }
  if (!results.length) return

  const payload = JSON.stringify(message)
  await Promise.all(results.map(async (row) => {
    const endpoint = String(row.endpoint || '')
    const subscription: PushSubscription = {
      endpoint,
      keys: {
        p256dh: String(row.p256dh || ''),
        auth: String(row.auth || ''),
      },
    }

    try {
      await webpush.sendNotification(subscription, payload, {
        TTL: 24 * 60 * 60,
        urgency: message.type === 'booking' ? 'high' : 'normal',
        topic: `koc-viet-${message.id}`.slice(0, 32),
        timeout: 5_000,
        vapidDetails: {
          subject: details.subject,
          publicKey: details.publicKey,
          privateKey: details.privateKey,
        },
      })
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint=?`)
          .bind(endpoint).run()
        return
      }
      console.warn('web push delivery failed', statusCode || error)
    }
  }))
}
