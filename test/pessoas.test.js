import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configuracoes, minhaConta, pessoas, rotuloStatus } from '../src/services/pessoas.js'
import { sessao } from '../src/services/api.js'

const capturar = async fn => {
  const original = globalThis.fetch
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined, token: init.headers['access-token'] })
    return { ok: true, status: 200, text: async () => '{}' }
  }
  try { await fn() } finally { globalThis.fetch = original }
  return chamadas
}

test('pessoas e configurações usam a sessão e a rota certa', async () => {
  sessao.salvar({ token: 'tk', refreshToken: 'rt' })
  const chamadas = await capturar(async () => {
    await pessoas.editar('p1', { nome: 'Ana', codigoArea: '', codigoCargo: 'c1' })
    await pessoas.alterarStatus('p1', 'alumni', '')
    await minhaConta.editarPerfil({ telefone: '', bio: 'Oi' })
    await configuracoes.salvarArea(null, { nome: 'Projetos' })
    await configuracoes.salvarCargo('c1', { nome: 'Assessor', ativo: false })
  })
  sessao.limpar()

  assert.deepEqual(chamadas.map(c => [c.method, c.url.replace(/^https?:\/\/[^/]+/, '')]), [
    ['PUT', '/usuarios/p1'], ['PATCH', '/usuarios/p1/status'], ['PUT', '/auth/perfil'], ['POST', '/areas'], ['PUT', '/cargos/c1'],
  ])
  assert.ok(chamadas.every(c => c.token === 'tk'))
  // Campo vazio vira null (a API limpa o valor); data de saída vazia não é enviada.
  assert.deepEqual(chamadas[0].body, { nome: 'Ana', codigoArea: null, codigoCargo: 'c1' })
  assert.deepEqual(chamadas[1].body, { status: 'alumni' })
  assert.deepEqual(chamadas[2].body, { telefone: null, bio: 'Oi' })
})

test('rótulos de status', () => {
  assert.equal(rotuloStatus('trainee'), 'Trainee')
  assert.equal(rotuloStatus(undefined), '—')
})
