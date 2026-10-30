import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alocacaoPorPessoa, corpoParticipacao, corpoProjeto, equipe, projetos, rotuloStatusProjeto } from '../src/services/projetos.js'
import { sessao } from '../src/services/api.js'

const capturar = async fn => {
  const original = globalThis.fetch
  const chamadas = []
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url: String(url).replace(/^https?:\/\/[^/]+/, ''), method: init.method, body: init.body ? JSON.parse(init.body) : undefined, token: init.headers['access-token'] })
    return { ok: true, status: 200, text: async () => '{}' }
  }
  try { await fn() } finally { globalThis.fetch = original }
  return chamadas
}

test('projetos e equipe chamam as rotas certas com a sessão', async () => {
  sessao.salvar({ token: 'tk', refreshToken: 'rt' })
  const chamadas = await capturar(async () => {
    await projetos.listar({ codigoUsuario: 'u1', busca: '' })
    await projetos.listar()
    await projetos.editar('p1', { nome: 'Site', codigoArea: '', progresso: '' })
    await projetos.alterarStatus('p1', 'atencao')
    await equipe.adicionar('p1', { codigoUsuario: 'u1', funcao: '', alocacao: '40', dataEntrada: '' })
    await equipe.editar('p1', 'pa1', { funcao: 'Dev', responsabilidades: '', alocacao: '' })
    await equipe.encerrar('p1', 'pa1', '')
  })
  sessao.limpar()

  assert.deepEqual(chamadas.map(c => [c.method, c.url]), [
    ['GET', '/projetos?codigoUsuario=u1'], ['GET', '/projetos'], ['PUT', '/projetos/p1'], ['PATCH', '/projetos/p1/status'],
    ['POST', '/projetos/p1/membros'], ['PUT', '/projetos/p1/membros/pa1'], ['POST', '/projetos/p1/membros/pa1/encerrar'],
  ])
  assert.ok(chamadas.every(c => c.token === 'tk'))
  // Projeto não manda mais codigosMembros; equipe vai pela aba Equipe.
  assert.deepEqual(chamadas[2].body, { nome: 'Site', codigoArea: null })
  assert.deepEqual(chamadas[3].body, { status: 'atencao' })
  assert.deepEqual(chamadas[4].body, { codigoUsuario: 'u1', funcao: null, alocacao: 40, dataEntrada: null })
  assert.deepEqual(chamadas[5].body, { funcao: 'Dev', responsabilidades: null, alocacao: 0 })
  assert.deepEqual(chamadas[6].body, {})
})

test('alocação soma só participações em aberto de projetos ativos (RN-04)', () => {
  const part = (codigo, alocacao, dataSaida = null) => ({ usuario: { codigo }, alocacao, dataSaida })
  const totais = alocacaoPorPessoa([
    { status: 'em_execucao', participacoes: [part('ana', 60), part('bia', 30)] },
    { status: 'bloqueado', participacoes: [part('ana', 50), part('bia', 50, '2026-10-01')] },
    { status: 'concluido', participacoes: [part('ana', 100)] },
    { status: 'arquivado', participacoes: [part('bia', 100)] },
  ])
  assert.deepEqual(totais, { ana: 110, bia: 30 })
})

test('corpos e rótulos', () => {
  assert.deepEqual(corpoProjeto({ progresso: '25', objetivo: '' }), { progresso: 25, objetivo: null })
  assert.deepEqual(corpoParticipacao({ alocacao: '100' }), { alocacao: 100 })
  assert.equal(rotuloStatusProjeto('em_execucao'), 'Em andamento')
  assert.equal(rotuloStatusProjeto(undefined), '—')
})
