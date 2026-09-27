const http = require('node:http')
const { readFile } = require('node:fs/promises')
const { extname, join } = require('node:path')

const proxy = require('./api/metagame/[...path].js')

const PORT = Number(process.env.PORT || 3000)
const PREFIX = '/api/metagame/'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function asVercelResponse(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(body))
    return res
  }
  res.send = (body) => {
    res.end(body || '')
    return res
  }
  return res
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname.startsWith(PREFIX)) {
    req.query = Object.fromEntries(url.searchParams)
    req.query.path = url.pathname.slice(PREFIX.length).split('/').filter(Boolean)

    res.on('finish', () => console.log(`${res.statusCode} ${req.method} ${req.url}`))
    return proxy(req, asVercelResponse(res))
  }

  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)

  try {
    const body = await readFile(join(__dirname, file))
    res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
})

server.listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`))
