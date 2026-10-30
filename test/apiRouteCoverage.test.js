import assert from 'node:assert/strict'
import { test } from 'node:test'
import { request } from '../src/services/api.js'

const routeContracts = [
  ['POST', '/auth/login'], ['POST', '/auth/refresh'], ['POST', '/auth/logout'],
  ['GET', '/auth/me'], ['GET', '/auth/permissoes'],
  ['GET', '/usuarios'], ['GET', '/senioridades'], ['POST', '/usuarios'],
  ['PUT', '/usuarios/user-1'], ['DELETE', '/usuarios/user-1'],
  ['GET', '/projetos'], ['POST', '/projetos'], ['PUT', '/projetos/project-1'],
  ['PATCH', '/projetos/project-1/status'], ['DELETE', '/projetos/project-1'],
  ['GET', '/tarefas'], ['POST', '/tarefas'], ['PUT', '/tarefas/task-1'],
  ['PATCH', '/tarefas/task-1/status'], ['DELETE', '/tarefas/task-1'],
  ['GET', '/capacitacoes'], ['POST', '/capacitacoes/training-1/inscricoes'],
  ['DELETE', '/capacitacoes/training-1/inscricoes/user-1'],
  ['POST', '/capacitacoes/training-1/feedbacks'], ['GET', '/feedbacks'],
  ['GET', '/checkins'], ['POST', '/checkins'], ['PUT', '/checkins'],
  ['GET', '/pastas'], ['POST', '/pastas'], ['PUT', '/pastas/folder-1'],
  ['DELETE', '/pastas/folder-1'], ['GET', '/pastas/folder-1/documentos'],
  ['POST', '/pastas/folder-1/documentos'], ['PUT', '/documentos/doc-1'],
  ['DELETE', '/documentos/doc-1'],
  ['GET', '/usuarios/user-1/perfil'], ['PATCH', '/usuarios/user-1/status'], ['PUT', '/usuarios/user-1/senha'],
  ['PUT', '/auth/perfil'], ['PUT', '/auth/senha'],
  ['GET', '/areas'], ['POST', '/areas'], ['PUT', '/areas/area-1'],
  ['GET', '/cargos'], ['POST', '/cargos'], ['PUT', '/cargos/cargo-1'],
  ['POST', '/senioridades'], ['PUT', '/senioridades/sen-1'],
  ['GET', '/projetos/project-1'], ['POST', '/projetos/project-1/membros'],
  ['PUT', '/projetos/project-1/membros/part-1'], ['POST', '/projetos/project-1/membros/part-1/encerrar'],
]

test(`cliente HTTP cobre todos os ${routeContracts.length} contratos de rota do backend`, async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method })
    return { ok: true, status: 200, text: async () => 'null' }
  }

  try {
    for (const [method, path] of routeContracts) {
      await request(path, { method, token: 'test-token', ...(method === 'GET' ? {} : { body: {} }) })
    }
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, routeContracts.length)
  for (let index = 0; index < routeContracts.length; index += 1) {
    const [method, path] = routeContracts[index]
    assert.ok(calls[index].url.endsWith(path), `Rota não chamada corretamente: ${method} ${path}`)
    assert.equal(calls[index].method, method)
  }
})
