// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — SERVER-SIDE WEB PUSH SENDER
// Sends a notification to all saved push subscriptions for a user (or all
// owner subscriptions). Reads subscriptions from Firestore via REST (same
// service-account pattern as the webhook/ticker — no Client SDK on server).
// ─────────────────────────────────────────────────────────────────────────
import webpush from "web-push"

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID

// Configure VAPID once per cold start.
let _configured = false
function configure() {
  if (_configured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const mail = process.env.VAPID_CONTACT || "mailto:admin@phoenix.local"
  if (!pub || !priv) throw new Error("VAPID keys not set")
  webpush.setVapidDetails(mail, pub, priv)
  _configured = true
}

// ── Firestore REST auth (mirrors webhook route) ──────────────────────────
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
    iss: email, scope: "https://www.googleapis.com/auth/datastore",
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

interface Sub { id:string; endpoint:string; keys:{ p256dh?:string; auth?:string }; userId?:string }

// Read all push subscriptions (optionally filtered by userId) from Firestore.
async function readSubs(userId?: string): Promise<Sub[]> {
  if (!PROJECT_ID) return []
  const token = await getAccessToken()
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/pushSubscriptions?pageSize=300`
  const res = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } })
  if (!res.ok) return []
  const json = await res.json()
  const docs = json.documents ?? []
  const subs: Sub[] = docs.map((d: any) => {
    const f = d.fields ?? {}
    return {
      id: d.name.split("/").pop(),
      endpoint: f.endpoint?.stringValue ?? "",
      keys: {
        p256dh: f.keys?.mapValue?.fields?.p256dh?.stringValue,
        auth:   f.keys?.mapValue?.fields?.auth?.stringValue,
      },
      userId: f.userId?.stringValue,
    }
  }).filter((s: Sub) => s.endpoint)
  return userId ? subs.filter(s => s.userId === userId) : subs
}

export interface PushPayload { title:string; body:string; url?:string; tag?:string }

// Send a push to all (or one user's) subscriptions. Returns counts.
export async function sendPush(payload: PushPayload, userId?: string): Promise<{ sent:number; failed:number }> {
  configure()
  const subs = await readSubs(userId)
  let sent = 0, failed = 0
  const data = JSON.stringify(payload)
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh ?? "", auth: s.keys.auth ?? "" } },
        data
      )
      sent++
    } catch {
      failed++   // dead subscription — could prune here later
    }
  }))
  return { sent, failed }
}
