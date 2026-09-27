const http = require('node:http')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')

const proxy = require('./api/metagame/[...path].js')

const PORT = Number.parseInt(process.env.PORT, 10) || 3000
const HOST = '127.0.0.1'
const PREFIX = '/api/metagame/'
const PAGE = join(__dirname, 'index.html')

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

function segmentsOf(pathname) {
  try {
    return pathname.slice(PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return []
  }
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${HOST}`)

  if (url.pathname.startsWith(PREFIX)) {
    req.query = Object.fromEntries(url.searchParams)
    req.query.path = segmentsOf(url.pathname)

    res.on('finish', () => console.log(`${res.statusCode} ${req.method} ${req.url}`))
    return proxy(req, asVercelResponse(res))
  }

  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    res.statusCode = 404
    return res.end('Not found')
  }

  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end(await readFile(PAGE))
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error)
    if (!res.headersSent) res.statusCode = 500
    res.end()
  })
})

server.listen(PORT, HOST, () => console.log(`Serving on http://${HOST}:${PORT}`))
