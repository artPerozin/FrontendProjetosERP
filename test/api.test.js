import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { ApiError, apiUrl, request } from '../src/services/api.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function response(status, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }
}

test('request sends authentication and JSON headers only when needed', async () => {
  let captured
  globalThis.fetch = async (url, options) => {
    captured = { url, options }
    return response(200, '[]')
  }

  const result = await request('/projetos', { token: 'jwt-test' })

  assert.deepEqual(result, [])
  assert.equal(captured.url, `${apiUrl}/projetos`)
  assert.equal(captured.options.method, 'GET')
  assert.equal(captured.options.headers.Accept, 'application/json')
  assert.equal(captured.options.headers['access-token'], 'jwt-test')
  assert.equal(captured.options.headers['Content-Type'], undefined)
  assert.equal(captured.options.body, undefined)
})

test('request serializes write bodies and returns parsed JSON', async () => {
  let captured
  globalThis.fetch = async (_url, options) => {
    captured = options
    return response(201, '{"codigo":"task-1"}')
  }

  const body = { titulo: 'Integrar API', codigosResponsaveis: ['user-1'] }
  const result = await request('/tarefas', { method: 'POST', token: 'jwt-test', body })

  assert.deepEqual(result, { codigo: 'task-1' })
  assert.equal(captured.headers['Content-Type'], 'application/json')
  assert.equal(captured.body, JSON.stringify(body))
})

test('request raises ApiError with the API message and HTTP status', async () => {
  globalThis.fetch = async () => response(422, '{"message":"Tarefa inválida"}')

  await assert.rejects(
    request('/tarefas', { token: 'jwt-test' }),
    error => error instanceof ApiError && error.status === 422 && error.message === 'Tarefa inválida',
  )
})

test('request preserves useful error text when the API returns non-JSON', async () => {
  globalThis.fetch = async () => response(500, 'Falha no servidor')

  await assert.rejects(
    request('/projetos', { token: 'jwt-test' }),
    error => error instanceof ApiError && error.status === 500 && error.message === 'Falha no servidor',
  )
})

test('request reports network failures with the configured API URL', async () => {
  globalThis.fetch = async () => { throw new TypeError('network down') }

  await assert.rejects(
    request('/auth/login'),
    error => error instanceof ApiError && error.status === 0 && error.message.includes(apiUrl),
  )
})

test('request returns null for successful empty responses', async () => {
  globalThis.fetch = async () => response(204)
  assert.equal(await request('/usuarios/123', { method: 'DELETE', token: 'jwt-test' }), null)
})


test('request sends binary files without JSON serialization', async () => {
  const originalFetch = globalThis.fetch
  const file = new Blob(['conteudo do arquivo'], { type: 'application/pdf' })
  let captured
  globalThis.fetch = async (_url, options) => {
    captured = options
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const { request } = await import('../src/services/api.js')
    const result = await request('/pastas/folder/documents/upload', { method: 'POST', token: 'token', body: file, headers: { 'X-File-Name': 'arquivo.pdf' } })
    assert.deepEqual(result, { ok: true })
    assert.equal(captured.body, file)
    assert.equal(captured.headers['Content-Type'], 'application/pdf')
    assert.equal(captured.headers['access-token'], 'token')
  } finally { globalThis.fetch = originalFetch }
})

test('request com auth renova o token após 401 e repete a chamada', async () => {
  const { request, sessao } = await import('../src/services/api.js')
  sessao.salvar({ token: 'vencido', refreshToken: 'refresh-1' })
  const chamadas = []
  globalThis.fetch = async (url, options) => {
    chamadas.push({ url: String(url), token: options.headers['access-token'], body: options.body })
    if (String(url).endsWith('/auth/refresh')) return response(200, '{"token":"novo","refreshToken":"refresh-2"}')
    return options.headers['access-token'] === 'novo' ? response(200, '[1]') : response(401, '{"message":"Token inválido ou expirado."}')
  }
  try {
    assert.deepEqual(await request('/projetos', { auth: true }), [1])
    assert.deepEqual(chamadas.map(c => [c.url.replace(apiUrl, ''), c.token]), [['/projetos', 'vencido'], ['/auth/refresh', undefined], ['/projetos', 'novo']])
    assert.equal(chamadas[1].body, JSON.stringify({ refreshToken: 'refresh-1' }))
    assert.equal(sessao.token, 'novo')
    assert.equal(sessao.refreshToken, 'refresh-2')
  } finally { sessao.limpar() }
})

test('chamadas simultâneas compartilham uma única renovação', async () => {
  const { request, sessao } = await import('../src/services/api.js')
  sessao.salvar({ token: 'vencido', refreshToken: 'refresh-1' })
  let renovacoes = 0
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/auth/refresh')) { renovacoes += 1; return response(200, '{"token":"novo","refreshToken":"refresh-2"}') }
    return options.headers['access-token'] === 'novo' ? response(200, '{}') : response(401)
  }
  try {
    await Promise.all([request('/projetos', { auth: true }), request('/tarefas', { auth: true }), request('/usuarios', { auth: true })])
    assert.equal(renovacoes, 1)
  } finally { sessao.limpar() }
})

test('se a renovação falha, limpa a sessão e avisa o app', async () => {
  const { request, sessao } = await import('../src/services/api.js')
  sessao.salvar({ token: 'vencido', refreshToken: 'revogado' })
  let avisado = false
  sessao.onExpirada = () => { avisado = true }
  globalThis.fetch = async () => response(401, '{"message":"Sessão inválida."}')
  try {
    await assert.rejects(request('/projetos', { auth: true }), error => error instanceof ApiError && error.status === 401)
    assert.equal(avisado, true)
    assert.equal(sessao.ativa, false)
  } finally { sessao.onExpirada = null; sessao.limpar() }
})
