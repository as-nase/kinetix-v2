// ChanTan AI Media — voice, transcription, video, talking photo, document search,
// person swap, video edit, 3D, background removal, sharper photos and lip sync.
// No API key needed; Chantan bills the project owner's AI credits.
//
//   import { chantanMedia } from "@/lib/chantan-media"
//   const { audio } = await chantanMedia.speech({ text: "Bonjour !" })            // WAV audio URL
//   const { text } = await chantanMedia.transcribe({ audio: recordedBlob })        // speech → text
//   const { video } = await chantanMedia.video({ prompt: "a red car at sunset", onProgress })
//   const { video } = await chantanMedia.video({ image: photoFile, prompt: "slow zoom" })
//   const { video } = await chantanMedia.video({ image: productPhoto, style: "ugc" })   // UGC ad, 9:16
//   const { video } = await chantanMedia.talkingPhoto({ image: facePhoto, text: "Hello!" })
//   const { embeddings } = await chantanMedia.embed({ input: ["chunk 1", "chunk 2"] })
//   const { results } = await chantanMedia.rerank({ query, documents })
//   const { video } = await chantanMedia.swapPerson({ video: clipFile, image: facePhoto })
//   const { video } = await chantanMedia.editVideo({ video: clipFile, images: [productPhoto], prompt: "replace the bottle, beach background" })
//   const { model } = await chantanMedia.to3d({ image: photo })                     // GLB for <model-viewer>
//   const { image } = await chantanMedia.removeBackground({ image: photo })         // transparent PNG
//
// Videos take 1–3 minutes: pass onProgress, and keep the jobId so a reload can
// resume with chantanMedia.videoStatus(jobId). Errors throw MediaError with a
// .code: "no_credits" | "daily_cap" | "module_off" | "rate_limited" | ...

const API_BASE =
  (typeof window !== "undefined" && (window as any).__CHANTAN_API_URL__) ||
  (import.meta as any).env?.VITE_API_URL ||
  "https://chantanapi.chantan.one"

function projectId(): string {
  if (typeof window !== "undefined") {
    const fromGlobal = (window as any).__CHANTAN_PROJECT_ID__
    if (fromGlobal) return String(fromGlobal)
    const fromMeta = document.querySelector('meta[name="chantan:project-id"]')
    if (fromMeta) return fromMeta.getAttribute("content") || ""
  }
  return ""
}

export class MediaError extends Error {
  status: number
  code?: string
  /** Set on every error while waiting for a job: resume later with videoStatus(jobId). */
  jobId?: string
  constructor(message: string, status: number, code?: string, jobId?: string) {
    super(message); this.status = status; this.code = code; this.jobId = jobId
  }
}

function headers(): Record<string, string> {
  const tok = typeof window !== "undefined" ? (window as any).__CHANTAN_AI_TOKEN__ : ""
  return {
    "Content-Type": "application/json",
    "X-Chantan-Project-Id": projectId(),
    ...(tok ? { "X-Chantan-Ai-Token": String(tok) } : {}),
  }
}

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${API_BASE}/api/chantan-ai${path}`, {
    method, headers: headers(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new MediaError(data?.message || data?.error || `AI request failed (${res.status})`, res.status, data?.error)
  return data
}

/** Blob / File / data URL / https URL → a string the gateway accepts. */
async function toDataUrl(input: Blob | string): Promise<string> {
  if (typeof input === "string") return input
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new MediaError("Could not read the file.", 400, "bad_file"))
    r.readAsDataURL(input)
  })
}

/** Photos are resized to <= 1280 px JPEG before upload (fast, reliable). */
async function photo(input: Blob | string): Promise<string> {
  const src = await toDataUrl(input)
  if (typeof document === "undefined" || !src.startsWith("data:image/")) return src
  try {
    const bmp = await createImageBitmap(await (await fetch(src)).blob(), { imageOrientation: "from-image" } as any)
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height))
    if (scale >= 1 && src.length < 1_500_000) { bmp.close?.(); return src }
    const c = document.createElement("canvas")
    c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale))
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close?.()
    return c.toDataURL("image/jpeg", 0.88)
  } catch { return src }
}

export interface VideoProgress { jobId: string; status: "pending" | "completed" | "failed"; elapsedSec: number }
type JobView = { jobId: string; status: "pending" | "completed" | "failed"; video?: string; model?: string; url?: string; error?: string; message?: string }

async function waitForJob(jobId: string, onProgress?: (p: VideoProgress) => void, signal?: AbortSignal): Promise<{ video: string; jobId: string }> {
  const r = await waitForResult(jobId, onProgress, signal)
  return { video: r.url, jobId }
}

async function waitForResult(jobId: string, onProgress?: (p: VideoProgress) => void, signal?: AbortSignal): Promise<{ url: string; jobId: string }> {
  const started = Date.now()
  let misses = 0
  for (;;) {
    if (signal?.aborted) throw new MediaError("Cancelled.", 499, "cancelled", jobId)
    let v: JobView | null = null
    try {
      v = await call("GET", `/video/${encodeURIComponent(jobId)}`)
      misses = 0
    } catch (e) {
      // A failed CHECK is not a failed job: network blip, 429, 5xx → wait and ask again.
      const st = (e as MediaError)?.status
      if (st !== undefined && st < 500 && st !== 429 && st !== 408) throw Object.assign(e as MediaError, { jobId })
      misses++
    }
    const elapsedSec = Math.round((Date.now() - started) / 1000)
    if (v) {
      onProgress?.({ jobId, status: v.status, elapsedSec })
      const url = v.url || v.video || v.model
      if (v.status === "completed" && url) return { url, jobId }
      if (v.status === "failed") throw new MediaError(v.message || "The video could not be created.", 502, v.error || "video_failed", jobId)
    }
    // The server gives up on a job after 45 min (refunded) — wait as long as it does.
    if (Date.now() - started > 46 * 60_000) throw new MediaError("The video is taking too long — try videoStatus(jobId) later.", 504, "video_timeout", jobId)
    await new Promise((r) => setTimeout(r, misses ? Math.min(30_000, 5000 * 2 ** Math.min(misses, 3)) : 5000))
  }
}

export interface UploadProgress { sentBytes: number; totalBytes: number; percent: number }
type VideoIn = Blob | string

/** A video File/Blob → uploaded in 5 MB pieces (each retried) → our media URL. A URL string passes through. */
async function videoUrl(v: VideoIn, onUpload?: (p: UploadProgress) => void, signal?: AbortSignal): Promise<string> {
  if (typeof v === "string") return v
  return (await chantanMedia.uploadVideo(v, onUpload, signal)).video
}

function b64(buf: ArrayBuffer): string {
  let s = ""
  const a = new Uint8Array(buf)
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000))
  return btoa(s)
}

export const chantanMedia = {
  /** Text → speech with Gemini 3.8 Flash TTS. Voice: Kore (default), Puck, Charon, etc.
   * Returns { audio } = a WAV audio URL for <audio src>. ~10,000 characters max per call.
   * quality is kept for older apps; both values use the same speech model. */
  async speech(opts: { text: string; voice?: string; quality?: "standard" | "best" }): Promise<{ audio: string; voice: string }> {
    return call("POST", "/speech", opts)
  },

  /** Speech → text. `audio` = a recorded Blob / File or an audio data URL (<= 15 MB). */
  async transcribe(opts: { audio: Blob | string; language?: string }): Promise<{ text: string; language?: string }> {
    return call("POST", "/transcribe", { audio: await toDataUrl(opts.audio), language: opts.language })
  },

  /** Text → video, photo → video (`image`), or a UGC product ad (`style: "ugc"` + `image`).
   *  Takes 1–3 minutes. Returns { video } = an mp4 URL for <video src controls>. */
  async video(opts: {
    prompt?: string; image?: Blob | string; duration?: number; aspectRatio?: string
    style?: "ugc"; quality?: "standard" | "best"
    onProgress?: (p: VideoProgress) => void; signal?: AbortSignal
  }): Promise<{ video: string; jobId: string }> {
    const { onProgress, signal, image, ...rest } = opts
    const job = await call("POST", "/video", { ...rest, ...(image ? { image: await photo(image) } : {}) })
    onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    return waitForJob(job.jobId, onProgress, signal)
  },

  /** A face photo speaks `text` (lip-synced). Voices: "kore" (default, multilingual), "orus", "chloe", "thomas"… */
  async talkingPhoto(opts: {
    image: Blob | string; text: string; voice?: string; aspectRatio?: string
    onProgress?: (p: VideoProgress) => void; signal?: AbortSignal
  }): Promise<{ video: string; jobId: string }> {
    const { onProgress, signal, image, ...rest } = opts
    const job = await call("POST", "/talking-photo", { ...rest, image: await photo(image) })
    onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    return waitForJob(job.jobId, onProgress, signal)
  },

  /** Check (and finish) a video job after a reload. */
  async videoStatus(jobId: string): Promise<JobView> {
    return call("GET", `/video/${encodeURIComponent(jobId)}`)
  },

  /** Text → vectors (for search / "ask my documents"). Up to 256 texts per call. */
  async embed(opts: { input: string | string[] }): Promise<{ embeddings: number[][]; dimensions: number }> {
    return call("POST", "/embed", opts)
  },

  /** Order documents by relevance to a query. Returns [{ index, score }] best first. */
  async rerank(opts: { query: string; documents: string[]; topN?: number }): Promise<{ results: Array<{ index: number; score: number }> }> {
    return call("POST", "/rerank", opts)
  },

  /** Upload a video (MP4/MOV only — not WebM; <= 100 MB, <= 30 s) in pieces with progress. Returns { video } = its URL. */
  async uploadVideo(file: Blob, onUpload?: (p: UploadProgress) => void, signal?: AbortSignal): Promise<{ video: string; durationSec: number; width: number; height: number }> {
    // Checked before sending anything: screen recordings (WebM) cannot be read — say so at once.
    if (file.type && !/^video\/(mp4|quicktime)$/i.test(file.type)) throw new MediaError("Please use an MP4 or MOV video (the normal phone camera format). Screen recordings (WebM) are not supported.", 415, "unsupported_video")
    const start = await call("POST", "/upload", { size: file.size, mime: file.type || "video/mp4" })
    const size: number = start.partSize
    let sent = 0
    for (let n = 1; n <= start.parts; n++) {
      if (signal?.aborted) throw new MediaError("Cancelled.", 499, "cancelled")
      const piece = file.slice((n - 1) * size, Math.min(file.size, n * size))
      const data = b64(await piece.arrayBuffer())
      for (let attempt = 1; ; attempt++) {
        try { await call("POST", `/upload/${start.uploadId}/part`, { n, data }); break }
        catch (e) { if (attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 1500 * attempt)) }
      }
      sent += piece.size
      onUpload?.({ sentBytes: sent, totalBytes: file.size, percent: Math.round((sent / file.size) * 100) })
    }
    return call("POST", `/upload/${start.uploadId}/complete`, {})
  },

  /** Put the person from `image` (1–3 photos) into a video, keeping motion, light, background and sound. Up to 30 s. */
  async swapPerson(opts: { video: VideoIn; image?: Blob | string; images?: Array<Blob | string>; prompt?: string; onUpload?: (p: UploadProgress) => void; onProgress?: (p: VideoProgress) => void; signal?: AbortSignal }): Promise<{ video: string; jobId: string }> {
    const imgs = await Promise.all((opts.images || (opts.image ? [opts.image] : [])).map(photo))
    const job = await call("POST", "/swap-person", { video: await videoUrl(opts.video, opts.onUpload, opts.signal), images: imgs, prompt: opts.prompt })
    opts.onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    return waitForJob(job.jobId, opts.onProgress, opts.signal)
  },

  /** Edit a video with words + up to 4 photos (swap a product, change the background…). Video >= 720 px, up to 10 s. */
  async editVideo(opts: { video: VideoIn; prompt: string; images?: Array<Blob | string>; onUpload?: (p: UploadProgress) => void; onProgress?: (p: VideoProgress) => void; signal?: AbortSignal }): Promise<{ video: string; jobId: string }> {
    const imgs = await Promise.all((opts.images || []).map(photo))
    const job = await call("POST", "/edit-video", { video: await videoUrl(opts.video, opts.onUpload, opts.signal), images: imgs, prompt: opts.prompt })
    opts.onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    return waitForJob(job.jobId, opts.onProgress, opts.signal)
  },

  /** Remove the background of a video (up to 30 s) → { video } = a transparent WebM. */
  async removeVideoBackground(opts: { video: VideoIn; onUpload?: (p: UploadProgress) => void; onProgress?: (p: VideoProgress) => void; signal?: AbortSignal }): Promise<{ video: string; jobId: string }> {
    const job = await call("POST", "/remove-video-background", { video: await videoUrl(opts.video, opts.onUpload, opts.signal) })
    opts.onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    return waitForJob(job.jobId, opts.onProgress, opts.signal)
  },

  /** Make the person in a video speak `audio` (a voice from speech() or a recording), lip-synced. Up to 30 s. */
  async lipSync(opts: { video: VideoIn; audio: Blob | string; onUpload?: (p: UploadProgress) => void; onProgress?: (p: VideoProgress) => void; signal?: AbortSignal }): Promise<{ video: string; jobId: string }> {
    const job = await call("POST", "/lip-sync", { video: await videoUrl(opts.video, opts.onUpload, opts.signal), audio: await toDataUrl(opts.audio) })
    opts.onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    return waitForJob(job.jobId, opts.onProgress, opts.signal)
  },

  /** Text or photo → 3D model (~2 min). Returns { model } = a .glb URL for <model-viewer src>. */
  async to3d(opts: { prompt?: string; image?: Blob | string; onProgress?: (p: VideoProgress) => void; signal?: AbortSignal }): Promise<{ model: string; jobId: string }> {
    const job = await call("POST", "/to-3d", { prompt: opts.prompt, ...(opts.image ? { image: await photo(opts.image) } : {}) })
    opts.onProgress?.({ jobId: job.jobId, status: "pending", elapsedSec: 0 })
    const r = await waitForResult(job.jobId, opts.onProgress, opts.signal)
    return { model: r.url, jobId: r.jobId }
  },

  /** Remove a photo's background → { image } = a transparent PNG URL. */
  async removeBackground(opts: { image: Blob | string }): Promise<{ image: string }> {
    return call("POST", "/remove-background", { image: await photo(opts.image) })
  },

  /** Make a photo sharper and bigger (about 4 megapixels) → { image } URL. */
  async upscale(opts: { image: Blob | string }): Promise<{ image: string }> {
    return call("POST", "/upscale", { image: await photo(opts.image) })
  },
}

/** Cosine similarity helper for embed() vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export default chantanMedia
