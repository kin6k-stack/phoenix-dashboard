// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — SERVER-SIDE PUSH SENDER (FCM + web-push unified)
//
// Reads pushSubscriptions from Firestore. Sends to each sub via:
//   type="fcm"  → Firebase Admin SDK (FCM) — for the native Android app
//   type="web"  → web-push library (VAPID) — for browser subscribers
// Both paths fire-and-forget; failures never break the webhook.
// ─────────────────────────────────────────────────────────────────────────
import webpush from "web-push"

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || process.env.FIREBASE_PROJECT_ID

// ── VAPID config (web-push) ───────────────────────────────────────────────
let _vapidConfigured = false
function configureVapid() {
  if (_vapidConfigured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const mail = process.env.VAPID_CONTACT || "mailto:admin@phoenix.local"
  if (pub && priv) { webpush.setVapidDetails(mail, pub, priv); _vapidConfigured = true }
}

// ── Firestore REST auth (mirrors webhook) ────────────────────────────────
let _token: string | null = null
let _tokenExp = 0
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (_token && now < _tokenExp - 60) return _token
  const email = process.env.FIREBASE_CLIENT_EMAIL
  const raw   = process.env.FIREBASE_PRIVATE_KEY
  if (!email || !raw) throw new Error("Firebase service account env not set")
  const pem = raw.replace(/\\n/g, "\n")
  const b64u = (s: string) => Buffer.from(s).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")
  const iat = now, exp = now + 3600
  const header  = b64u(JSON.stringify({ alg:"RS256", typ:"JWT" }))
  const payload = b64u(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat, exp,
  }))
  const stripped = pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s/g,"")
  const key = await crypto.subtle.importKey("pkcs8", Buffer.from(stripped,"base64"),
    { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`))
  const sigStr = Buffer.from(sig).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")
  const jwt = `${header}.${payload}.${sigStr}`
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error(`token exchange failed ${res.status}`)
  const data = await res.json() as { access_token:string; expires_in:number }
  _token = data.access_token; _tokenExp = now + (data.expires_in ?? 3600)
  return _token
}

interface Sub {
  id: string; type?: string
  // FCM
  fcmToken?: string
  // Web push
  endpoint?: string; keys?: { p256dh?:string; auth?:string }
  userId?: string
}

async function readSubs(userId?: string): Promise<Sub[]> {
  if (!PROJECT_ID) return []
  const token = await getAccessToken()
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/pushSubscriptions?pageSize=300`
  const res = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } })
  if (!res.ok) return []
  const json = await res.json()
  const docs = (json.documents ?? []).map((d: any) => {
    const f = d.fields ?? {}
    return {
      id: d.name.split("/").pop(),
      type:     f.type?.stringValue ?? "web",
      fcmToken: f.fcmToken?.stringValue,
      endpoint: f.endpoint?.stringValue,
      keys: {
        p256dh: f.keys?.mapValue?.fields?.p256dh?.stringValue,
        auth:   f.keys?.mapValue?.fields?.auth?.stringValue,
      },
      userId: f.userId?.stringValue,
    }
  }).filter((s: Sub) => s.fcmToken || s.endpoint)
  return userId ? docs.filter((s: Sub) => s.userId === userId) : docs
}

// Send via FCM (Firebase Cloud Messaging) for native app subscribers.
async function sendFCM(token: string, payload: PushPayload, accessToken: string): Promise<boolean> {
  if (!PROJECT_ID) return false
  const msg = {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      android: {
        notification: {
          icon: "ic_stat_notify",   // small notification icon (white, in drawable)
          color: "#16a34a",
          click_action: "OPEN_APP",
        },
      },
      data: { url: payload.url || "/", tag: payload.tag || "phoenix" },
    },
  }
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${accessToken}` },
      body: JSON.stringify(msg) }
  )
  return res.ok
}

export interface PushPayload { title:string; body:string; url?:string; tag?:string }

export async function sendPush(payload: PushPayload, userId?: string): Promise<{ sent:number; failed:number }> {
  configureVapid()
  const [subs, accessToken] = await Promise.all([readSubs(userId), getAccessToken()])
  let sent = 0, failed = 0

  await Promise.all(subs.map(async (s) => {
    try {
      if (s.type === "fcm" && s.fcmToken) {
        const ok = await sendFCM(s.fcmToken, payload, accessToken)
        ok ? sent++ : failed++
      } else if (s.endpoint && s.keys) {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh ?? "", auth: s.keys.auth ?? "" } },
          JSON.stringify(payload)
        )
        sent++
      }
    } catch { failed++ }
  }))
  return { sent, failed }
}
