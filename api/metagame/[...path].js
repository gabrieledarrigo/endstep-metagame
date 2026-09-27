const UPSTREAM = 'https://endstep.cc/api/metagame/v1'

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

function queryString(url) {
  const start = url.indexOf('?')
  return start === -1 ? '' : url.slice(start)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const segments = [].concat(req.query.path || [])

  if (!isAllowed(segments)) {
    return res.status(400).json({ error: 'Unsupported metagame path' })
  }

  const target = `${UPSTREAM}/${segments.join('/')}${queryString(req.url)}`

  let upstream
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: { accept: 'application/json' },
    })
  } catch {
    return res.status(502).json({ error: 'Endstep is unreachable' })
  }

  const body = await upstream.text()

  res.status(upstream.status)
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
  res.setHeader(
    'Cache-Control',
    upstream.ok ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store'
  )

  return res.send(body)
}
