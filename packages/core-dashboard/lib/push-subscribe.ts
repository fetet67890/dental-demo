import { getVapidPublicKey, subscribePush } from './api/push'

// applicationServerKey wants a Uint8Array, the backend hands us the VAPID
// public key as a URL-safe base64 string — this is the standard conversion
// (see the Web Push / MDN docs, every implementation does this exact thing).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export class PushUnsupportedError extends Error {}
export class PushPermissionDeniedError extends Error {}

// Ensures the current browser/device has an active push subscription,
// registered with the backend — requesting Notification permission and
// creating one if this is the first time. Safe to call repeatedly: an
// already-subscribed browser just re-confirms its existing subscription
// with the backend (subscribe() upserts by endpoint) instead of duplicating.
export async function ensurePushSubscribed(): Promise<PushSubscription> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new PushUnsupportedError('Ky shfletues nuk mbështet njoftimet push')
  }

  if (Notification.permission === 'denied') {
    throw new PushPermissionDeniedError(
      'Njoftimet janë bllokuar për këtë faqe. Lejojini nga cilësimet e shfletuesit dhe provoni përsëri.'
    )
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new PushPermissionDeniedError('Leja për njoftime nuk u dha')
    }
  }

  const registration = await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const { publicKey } = await getVapidPublicKey()
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await subscribePush(subscription.toJSON() as PushSubscriptionJSON)
  return subscription
}
