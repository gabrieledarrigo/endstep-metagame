const UPSTREAM = 'https://endstep.cc/api/metagame/v1'
const PREFIX = '/api/metagame/'
const TIMEOUT_MS = 8000

const ENDPOINTS = [
  ['formats'],
  ['visibility'],
  [':format', 'decks'],
  [':format', 'share-series'],
  [':format', 'decks', ':slug'],
  [':format', 'decks', ':slug', 'matchups'],
  [':format', 'decks', ':slug', 'cards'],
  [':format', 'decks', ':slug', 'ratings'],
]

const SEGMENT = /^[A-Za-z0-9_-]+$/

function isAllowed(segments) {
  if (segments.length === 0) return false
  if (!segments.every((segment) => SEGMENT.test(segment))) return false

  return ENDPOINTS.some(
    (shape) =>
      shape.length === segments.length &&
      shape.every((part, i) => part.startsWith(':') || part === segments[i])
  )
}

function requestedSegments(url) {
  const pathname = url.split('?')[0]
  if (!pathname.startsWith(PREFIX)) return []

  try {
    return pathname.slice(PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return []
  }
}

function forwardedQuery(url) {
  const start = url.indexOf('?')
  if (start === -1) return ''

  const params = new URLSearchParams(url.slice(start + 1))
  params.delete('path')

  const query = params.toString()
  return query ? `?${query}` : ''
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const segments = requestedSegments(req.url)

  if (!isAllowed(segments)) {
    return res.status(400).json({ error: 'Unsupported metagame path' })
  }

  const target = `${UPSTREAM}/${segments.join('/')}${forwardedQuery(req.url)}`

  let status
  let contentType
  let body

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    status = upstream.status
    contentType = upstream.headers.get('content-type')
    body = await upstream.text()
  } catch {
    return res.status(502).json({ error: 'Endstep is unreachable' })
  }

  res.status(status)
  res.setHeader('Content-Type', contentType || 'application/json')
  res.setHeader(
    'Cache-Control',
    status < 400 ? 'public, s-maxage=300, stale-while-revalidate=600' : 'public, s-maxage=10'
  )

  return res.send(body)
}
