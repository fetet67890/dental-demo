import api from '../api-client'

export function getVapidPublicKey(): Promise<{ publicKey: string }> {
  return api.get('/api/push/vapid-public-key')
}

export function subscribePush(subscription: PushSubscriptionJSON): Promise<{ message: string }> {
  return api.post('/api/push/subscribe', { subscription })
}

export function unsubscribePush(endpoint: string): Promise<{ message: string }> {
  return api.post('/api/push/unsubscribe', { endpoint })
}

export function sendTestPush(): Promise<{ sent: number; failed: number; total: number }> {
  return api.post('/api/push/test', {})
}
