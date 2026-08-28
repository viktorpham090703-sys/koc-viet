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

export type PushDeliveryResult = {
  configured: boolean
  subscriptionCount: number
  delivered: number
  failed: number
  removed: number
}

const emptyDelivery = (configured: boolean): PushDeliveryResult => ({
  configured,
  subscriptionCount: 0,
  delivered: 0,
  failed: 0,
  removed: 0,
})

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
): Promise<PushDeliveryResult> {
  const details = vapidDetails(env)
  if (!details || !userId) return emptyDelivery(Boolean(details))

  let results: Array<Record<string, unknown>> = []
  try {
    const response = await env.DB.prepare(
      `SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=?`,
    ).bind(userId).all()
    results = response.results || []
  } catch (error) {
    console.warn('web push subscriptions unavailable', error)
    return { ...emptyDelivery(true), failed: 1 }
  }
  if (!results.length) return emptyDelivery(true)

  const payload = JSON.stringify(message)
  const outcomes = await Promise.all(results.map(async (row) => {
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
      return 'delivered' as const
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint=?`)
          .bind(endpoint).run()
        return 'removed' as const
      }
      console.warn('web push delivery failed', statusCode || error)
      return 'failed' as const
    }
  }))

  return {
    configured: true,
    subscriptionCount: results.length,
    delivered: outcomes.filter((outcome) => outcome === 'delivered').length,
    failed: outcomes.filter((outcome) => outcome === 'failed').length,
    removed: outcomes.filter((outcome) => outcome === 'removed').length,
  }
}
