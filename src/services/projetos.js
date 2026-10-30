import { request } from './api.js'

/**
 * Chamadas diretas do módulo Projetos e da aba Equipe.
 * Substituem o caminho antigo (up('p') + persistCollection).
 */
const get = path => request(path, { auth: true })
const send = (method, path, body) => request(path, { method, auth: true, body })

/** Campos vazios do formulário viram null, para a API limpar o valor. */
const vazioComoNull = dados => Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, v === '' ? null : v]))
const numeroOuNada = v => (v === '' || v === null || v === undefined ? undefined : Number(v))

export const STATUS_PROJETO = [
  ['em_execucao', 'Em andamento'],
  ['atencao', 'Atenção'],
  ['bloqueado', 'Bloqueado'],
  ['concluido', 'Concluído'],
  ['arquivado', 'Arquivado'],
]
export const COR_STATUS_PROJETO = { em_execucao: '', atencao: 'wa', bloqueado: 'er', concluido: 'ok', arquivado: '' }
export const PRIORIDADE_PROJETO = [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']]

/** Projetos que contam para a alocação (QA-35): Em andamento, Atenção e Bloqueado. */
export const STATUS_ATIVOS = ['em_execucao', 'atencao', 'bloqueado']
export const LIMITE_ALOCACAO = 100

export const rotuloStatusProjeto = s => STATUS_PROJETO.find(([k]) => k === s)?.[1] || s || '—'
export const rotuloPrioridade = s => PRIORIDADE_PROJETO.find(([k]) => k === s)?.[1] || '—'

/**
 * Soma a alocação de cada pessoa nas participações em aberto de projetos ativos (RN-04).
 * Devolve { [codigoPessoa]: total }. Mesmo cálculo do backend, para mostrar o alerta nas listas.
 */
export function alocacaoPorPessoa(lista) {
  const totais = {}
  for (const projeto of lista || []) {
    if (!STATUS_ATIVOS.includes(projeto.status)) continue
    for (const p of projeto.participacoes || []) {
      if (p.dataSaida) continue
      const codigo = p.usuario?.codigo
      if (codigo) totais[codigo] = (totais[codigo] || 0) + (p.alocacao || 0)
    }
  }
  return totais
}

/** Converte o formulário do projeto no corpo da API. */
export function corpoProjeto(dados) {
  const { progresso, ...resto } = vazioComoNull(dados)
  return { ...resto, ...(numeroOuNada(progresso) !== undefined ? { progresso: Number(progresso) } : {}) }
}

/** Converte o formulário da participação no corpo da API. */
export function corpoParticipacao(dados) {
  const { alocacao, ...resto } = vazioComoNull(dados)
  return { ...resto, alocacao: numeroOuNada(alocacao) ?? 0 }
}

export const projetos = {
  listar: (filtro = {}) => {
    const qs = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v)).toString()
    return get('/projetos' + (qs ? '?' + qs : ''))
  },
  buscar: codigo => get(`/projetos/${codigo}`),
  criar: dados => send('POST', '/projetos', corpoProjeto(dados)),
  editar: (codigo, dados) => send('PUT', `/projetos/${codigo}`, corpoProjeto(dados)),
  alterarStatus: (codigo, status) => send('PATCH', `/projetos/${codigo}/status`, { status }),
  excluir: codigo => send('DELETE', `/projetos/${codigo}`),
}

/** Aba Equipe. Cada chamada devolve { projeto, alocacao } com o alerta da pessoa (RN-04). */
export const equipe = {
  adicionar: (codigoProjeto, dados) => send('POST', `/projetos/${codigoProjeto}/membros`, corpoParticipacao(dados)),
  editar: (codigoProjeto, codigoParticipacao, dados) => send('PUT', `/projetos/${codigoProjeto}/membros/${codigoParticipacao}`, corpoParticipacao(dados)),
  encerrar: (codigoProjeto, codigoParticipacao, dataSaida) => send('POST', `/projetos/${codigoProjeto}/membros/${codigoParticipacao}/encerrar`, dataSaida ? { dataSaida } : {}),
}
