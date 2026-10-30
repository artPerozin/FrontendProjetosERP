import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { chip, fm, prog } from '../lib/utils'
import Ic from '../components/Icon'
import ActionMenu from '../components/ActionMenu'
import Table from '../components/Table'
import { Av, PageBar, Prog } from '../components/Ui'
import alerts from '../lib/alerts'
import useCarregar from '../lib/useCarregar'
import { configuracoes, pessoas } from '../services/pessoas'
import { COR_STATUS_PROJETO, PRIORIDADE_PROJETO, STATUS_PROJETO, projetos, rotuloStatusProjeto } from '../services/projetos'

const dia = s => (s ? String(s).slice(0, 10) : '')
const membrosAtivos = p => (p.participacoes || []).filter(x => !x.dataSaida).map(x => x.usuario.codigo)

/** Campos do formulário do projeto, usados aqui e na Visão geral do projeto. */
export function camposProjeto({ lista, areas, novo }) {
  const opcoes = (itens, ok) => [['', '—'], ...itens.filter(ok).map(i => [i.codigo, i.nome])]
  return [
    { k: 'nome', l: 'Nome' },
    { k: 'referencia', l: 'Referência', opt: true, h: 'Código curto do projeto, ex.: PRJ-2026-01.' },
    { k: 'clienteNome', l: 'Cliente', opt: true },
    { k: 'descricao', l: 'Descrição', t: 'textarea' },
    { k: 'objetivo', l: 'Objetivo', t: 'textarea', opt: true },
    { k: 'dataInicio', l: 'Início', t: 'date' },
    { k: 'dataFim', l: 'Fim', t: 'date' },
    { k: 'status', l: 'Status', o: STATUS_PROJETO, s: () => !novo },
    { k: 'prioridade', l: 'Prioridade', o: PRIORIDADE_PROJETO },
    { k: 'codigoResponsavel', l: 'Responsável', o: opcoes(lista, u => u.naEj), opt: true },
    { k: 'codigoArea', l: 'Área', o: opcoes(areas, a => a.ativa), opt: true },
  ]
}

export function valoresProjeto(p) {
  if (!p) return { prioridade: 'media', codigoResponsavel: '', codigoArea: '' }
  return {
    nome: p.nome, referencia: p.referencia || '', clienteNome: p.clienteNome || '', descricao: p.descricao, objetivo: p.objetivo || '',
    dataInicio: dia(p.dataInicio), dataFim: dia(p.dataFim), status: p.status, prioridade: p.prioridade || 'media',
    codigoResponsavel: p.responsavel?.codigo || '', codigoArea: p.area?.codigo || '',
  }
}

export const StatusProjeto = ({ s }) => <span className={chip(COR_STATUS_PROJETO[s])}>{rotuloStatusProjeto(s)}</span>

/** RF-020 e RF-021: lista de projetos. Equipe e tarefas ficam dentro de cada projeto. */
export default function Projetos() {
  const { D, me, mb, form, go, pode, refresh } = useApp()
  const [pv, setPv] = useState('grid')
  const gestor = pode('projetos.editar')
  const { dados, carregando, recarregar } = useCarregar(async () => {
    const [lista, gente, areas] = await Promise.all([
      projetos.listar(mb ? { codigoUsuario: me } : {}),
      gestor ? pessoas.listar() : [],
      gestor ? configuracoes.areas() : [],
    ])
    return { lista, gente, areas }
  }, [mb, me, gestor])

  if (!dados) return <PageBar title="Projetos" sub={carregando ? 'Carregando…' : 'Não foi possível carregar.'} />
  const { lista, gente, areas } = dados

  const executar = async (acao, sucesso) => {
    try {
      const r = await acao()
      alerts.toastSuccess(sucesso)
      await recarregar()
      refresh().catch(() => {})
      return r
    } catch (error) {
      alerts.error('Não foi possível salvar', error.message)
      return false
    }
  }

  const editar = p => form(p ? 'Editar projeto' : 'Novo projeto', camposProjeto({ lista: gente, areas, novo: !p }), valoresProjeto(p),
    async v => {
      const r = await executar(() => (p ? projetos.editar(p.codigo, v) : projetos.criar(v)), p ? 'Projeto atualizado' : 'Projeto criado')
      if (r && !p) go('projeto', r.codigo)
      return r === false ? false : undefined
    })
  const mudarStatus = p => form('Mudar status', [{ k: 'status', l: 'Status', o: STATUS_PROJETO, h: 'Em andamento, Atenção e Bloqueado contam na alocação das pessoas.' }], { status: p.status },
    v => executar(() => projetos.alterarStatus(p.codigo, v.status), 'Status atualizado').then(r => (r === false ? false : undefined)))
  const excluir = async p => {
    const ok = await alerts.confirm({ title: 'Excluir projeto?', text: 'Remove o projeto e as tarefas dele. Para guardar o histórico, prefira o status Arquivado.', confirmText: 'Excluir projeto', danger: true })
    if (ok) await executar(() => projetos.excluir(p.codigo), 'Projeto excluído')
  }

  const Ac = ({ p }) => <ActionMenu items={[
    ['open', 'Abrir', () => go('projeto', p.codigo)],
    ...(gestor ? [['edit', 'Editar', () => editar(p)], ['check', 'Mudar status', () => mudarStatus(p)]] : []),
    ...(pode('projetos.excluir') ? [['trash', 'Excluir', () => excluir(p), 1]] : []),
  ]} />
  const pg = p => prog(D, { id: p.codigo })
  const periodo = p => fm(dia(p.dataInicio)) + ' a ' + fm(dia(p.dataFim))
  const cols = [
    { k: 'nome', l: 'Projeto' },
    { k: 'st', l: 'Status', filter: 1, get: p => rotuloStatusProjeto(p.status), render: p => <StatusProjeto s={p.status} /> },
    { k: 'resp', l: 'Responsável', filter: 1, get: p => p.responsavel?.nome || '—' },
    { k: 'fim', l: 'Período', get: p => dia(p.dataFim), render: periodo },
    { k: 'pr', l: 'Progresso', get: pg, render: p => pg(p) + '%' },
    { l: 'Equipe', render: p => <Av D={D} ids={membrosAtivos(p)} /> },
    { l: 'Ações', render: p => <Ac p={p} /> },
  ]
  const linhas = lista.map(p => ({ ...p, id: p.codigo }))

  return (
    <>
      <PageBar title="Projetos" sub={mb ? 'Projetos de que você participa ou participou.' : undefined}>
        <button className={'btn btn-g' + (pv == 'grid' ? ' on' : '')} onClick={() => setPv('grid')}>Grid</button>
        <button className={'btn btn-g' + (pv == 'lista' ? ' on' : '')} onClick={() => setPv('lista')}>Linhas</button>
        {gestor && <button className="btn btn-primary" onClick={() => editar()}><Ic k="plus" />Novo projeto</button>}
      </PageBar>
      {pv == 'grid'
        ? <div className="row g-3">
          {!linhas.length && <div className="col-12"><div className="card card-body">Nenhum projeto ainda.</div></div>}
          {linhas.map(p => (
            <div className="col-md-6 col-xl-4" key={p.id}>
              <div className="card card-body pj hoverable h-100" onClick={() => go('projeto', p.codigo)}>
                <div className="d-flex justify-content-between align-items-center"><StatusProjeto s={p.status} /><Av D={D} ids={membrosAtivos(p)} /></div>
                <h2 className="mt-3">{p.nome}</h2>
                <p className="text-mu m-0">{p.descricao}</p>
                <Prog v={pg(p)} />
                <small>{pg(p)}% · {periodo(p)}{p.clienteNome ? ' · ' + p.clienteNome : ''}</small>
                <span className="cm" onClick={e => e.stopPropagation()}><Ac p={p} /></span>
              </div>
            </div>))}
        </div>
        : <Table cols={cols} rows={linhas} />}
    </>
  )
}
