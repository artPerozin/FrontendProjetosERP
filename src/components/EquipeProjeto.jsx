import { useApp } from '../context/AppContext'
import { chip, fd } from '../lib/utils'
import Ic from './Icon'
import Table from './Table'
import ActionMenu from './ActionMenu'
import alerts from '../lib/alerts'
import { LIMITE_ALOCACAO, alocacaoPorPessoa, equipe, rotuloStatusProjeto } from '../services/projetos'
import { rotuloStatus } from '../services/pessoas'

/** Mostra o alerta de RN-04 depois de salvar: avisa, mas não bloqueia. */
export function avisarAlocacao(resultado, nome) {
  const a = resultado?.alocacao
  if (!a?.excedeu) return
  const lista = a.projetos.map(p => `${p.nome}: ${p.alocacao}%`).join(' · ')
  alerts.info('Alocação acima de 100%', `${nome} soma ${a.total}% em projetos ativos. ${lista}`)
}

const Total = ({ v }) => v > LIMITE_ALOCACAO
  ? <span className={chip('er')} title="Soma em projetos ativos acima de 100%">{v}% · acima de 100%</span>
  : <span className={chip(v === LIMITE_ALOCACAO ? 'wa' : '')}>{v}%</span>

/**
 * Aba Equipe (RF-022, PR-06): função, responsabilidades, alocação e histórico.
 * `todos` = lista de projetos, para somar a alocação de cada pessoa.
 */
export default function EquipeProjeto({ projeto, todos, gente, gestor, aoSalvar }) {
  const { form, go } = useApp()
  const totais = alocacaoPorPessoa(todos)
  const ativas = projeto.participacoes.filter(p => !p.dataSaida).map(p => ({ ...p, id: p.codigo }))
  const encerradas = projeto.participacoes.filter(p => p.dataSaida).map(p => ({ ...p, id: p.codigo }))
  const contaNaAlocacao = ['em_execucao', 'atencao', 'bloqueado'].includes(projeto.status)

  const salvar = async (acao, sucesso, nome) => {
    try {
      const r = await acao()
      alerts.toastSuccess(sucesso)
      await aoSalvar()
      avisarAlocacao(r, nome)
    } catch (error) {
      alerts.error('Não foi possível salvar', error.message)
      return false
    }
  }

  const camposComuns = [
    { k: 'funcao', l: 'Função no projeto', opt: true, h: 'Ex.: Gerente de projeto, Desenvolvedor, Consultor.' },
    { k: 'responsabilidades', l: 'Responsabilidades', t: 'textarea', opt: true },
    { k: 'alocacao', l: 'Alocação (%)', t: 'number', h: 'Quanto da dedicação da pessoa vai para este projeto, de 0 a 100. A soma acima de 100% gera alerta.' },
  ]

  const adicionar = () => {
    const dentro = new Set(ativas.map(p => p.usuario.codigo))
    const opcoes = gente.filter(u => u.naEj && !dentro.has(u.codigo))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(u => [u.codigo, `${u.nome} · ${totais[u.codigo] || 0}% alocado${u.status === 'trainee' ? ' · Trainee' : ''}`])
    if (!opcoes.length) return alerts.info('Ninguém disponível', 'Todas as pessoas Ativas e Trainees já estão na equipe.')
    form('Adicionar à equipe', [
      { k: 'codigoUsuario', l: 'Pessoa', o: opcoes },
      ...camposComuns,
      { k: 'dataEntrada', l: 'Entrada no projeto', t: 'date', opt: true, h: 'Vazio = hoje.' },
    ], { codigoUsuario: opcoes[0][0], alocacao: 0, dataEntrada: '' },
    v => salvar(() => equipe.adicionar(projeto.codigo, v), 'Pessoa adicionada', gente.find(u => u.codigo === v.codigoUsuario)?.nome))
  }

  const editar = p => form(`Editar participação de ${p.usuario.nome}`, camposComuns,
    { funcao: p.funcao || '', responsabilidades: p.responsabilidades || '', alocacao: p.alocacao },
    v => salvar(() => equipe.editar(projeto.codigo, p.codigo, v), 'Participação atualizada', p.usuario.nome))

  const encerrar = p => form(`Tirar ${p.usuario.nome} da equipe`, [
    { k: 'dataSaida', l: 'Saída do projeto', t: 'date', opt: true, h: 'Vazio = hoje. A participação continua no histórico do projeto.' },
  ], { dataSaida: '' }, v => salvar(() => equipe.encerrar(projeto.codigo, p.codigo, v.dataSaida), 'Participação encerrada', p.usuario.nome))

  const pessoa = p => (
    <button className="btn btn-link p-0 text-start" onClick={() => go('perfil', p.usuario.codigo)}>
      {p.usuario.nome}{p.usuario.status && p.usuario.status !== 'ativo' ? <small className="ms-1">({rotuloStatus(p.usuario.status)})</small> : null}
    </button>
  )

  const colsAtivas = [
    { k: 'nome', l: 'Pessoa', get: p => p.usuario.nome, render: pessoa },
    { k: 'funcao', l: 'Função', filter: 1, get: p => p.funcao || '—' },
    { k: 'resp', l: 'Responsabilidades', get: p => p.responsabilidades || '—', render: p => <small>{p.responsabilidades || '—'}</small> },
    { k: 'alocacao', l: 'Neste projeto', render: p => p.alocacao + '%' },
    { k: 'total', l: 'Total da pessoa', get: p => totais[p.usuario.codigo] || 0, render: p => <Total v={totais[p.usuario.codigo] || 0} /> },
    { k: 'entrada', l: 'Entrada', get: p => String(p.dataEntrada), render: p => fd(p.dataEntrada) },
    ...(gestor ? [{ l: 'Ações', render: p => <ActionMenu items={[['edit', 'Editar', () => editar(p)], ['undo', 'Tirar da equipe', () => encerrar(p), 1]]} /> }] : []),
  ]
  const colsHistorico = [
    { k: 'nome', l: 'Pessoa', get: p => p.usuario.nome, render: pessoa },
    { k: 'funcao', l: 'Função', get: p => p.funcao || '—' },
    { k: 'alocacao', l: 'Alocação', render: p => p.alocacao + '%' },
    { k: 'periodo', l: 'Período', get: p => String(p.dataEntrada), render: p => fd(p.dataEntrada) + ' a ' + fd(p.dataSaida) },
  ]
  const excedidos = ativas.filter(p => (totais[p.usuario.codigo] || 0) > LIMITE_ALOCACAO)

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <small>
          {ativas.length} {ativas.length === 1 ? 'pessoa' : 'pessoas'} na equipe.
          {!contaNaAlocacao && ` Projeto ${rotuloStatusProjeto(projeto.status)}: não conta na alocação.`}
        </small>
        {gestor && <button className="btn btn-primary" onClick={adicionar}><Ic k="plus" />Adicionar pessoa</button>}
      </div>
      {excedidos.length > 0 && (
        <div className="card card-body mb-3">
          <span><span className={chip('er')}>Alerta</span> {excedidos.map(p => p.usuario.nome).join(', ')} {excedidos.length === 1 ? 'está' : 'estão'} com mais de 100% de alocação somando os projetos ativos.</span>
        </div>
      )}
      <Table cols={colsAtivas} rows={ativas} />
      {encerradas.length > 0 && (
        <>
          <h3 className="h6 fw-bold mt-4">Histórico da equipe</h3>
          <Table cols={colsHistorico} rows={encerradas} />
        </>
      )}
    </>
  )
}
