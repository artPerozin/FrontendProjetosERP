import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DAY, PC, chip, d, fm, hj, iso, nid, nm } from '../lib/utils'
import Ic from '../components/Icon'
import ActionMenu from '../components/ActionMenu'
import TaskModal from '../components/TaskModal'
import EquipeProjeto from '../components/EquipeProjeto'
import { Av, PageBar, Seg } from '../components/Ui'
import alerts from '../lib/alerts'
import useCarregar from '../lib/useCarregar'
import { configuracoes, pessoas } from '../services/pessoas'
import { projetos, rotuloPrioridade } from '../services/projetos'
import { StatusProjeto, camposProjeto, valoresProjeto } from './Projetos'

const COLS = ['Essa semana', 'Semana que vem', 'Daqui a duas semanas', 'Concluído']
const ABAS = [['tarefas', 'Tarefas'], ['geral', 'Visão geral'], ['equipe', 'Equipe']]

export default function Projeto() {
  const { D, up, form, go, me, pode, refresh } = useApp(), { id } = useParams(), pid = id
  const [pt, setPt] = useState('kanban'), [ov, setOv] = useState(null), [tk, setTk] = useState(null), dg = useRef(null)
  const [aba, setAba] = useState('tarefas')
  const gestor = pode('projetos.editar')
  const { dados, carregando, recarregar } = useCarregar(async () => {
    const [projeto, todos, gente, areas] = await Promise.all([
      projetos.buscar(pid), projetos.listar(), gestor ? pessoas.listar() : [], gestor ? configuracoes.areas() : [],
    ])
    return { projeto, todos, gente, areas }
  }, [pid, gestor])
  const voltar = <button className="btn btn-g" onClick={() => go('projetos')}><Ic k="back" />Voltar</button>
  if (!dados) return <PageBar title="Projeto" sub={carregando ? 'Carregando…' : 'Projeto não encontrado.'}>{voltar}</PageBar>
  const { projeto, todos, gente, areas } = dados
  // Depois de salvar: recarrega o projeto e os dados compartilhados (tarefas, avatares, painel).
  const aoSalvar = async () => { await recarregar(); refresh().catch(() => {}) }
  const p = { id: projeto.codigo, nome: projeto.nome, membros: projeto.participacoes.filter(x => !x.dataSaida).map(x => x.usuario.codigo) }
  const T = D.t.filter(t => t.projetoId == pid), h = hj(D)
  const m = +h - ((h.getDay() + 6) % 7) * DAY
  const col = t => t.status == 'concluida' ? 3 : Math.min(2, Math.max(0, Math.floor((+d(t.fim) - m) / (7 * DAY))))

  const add = i => form('Nova tarefa',
    [{ k: 'titulo', l: 'Título' }, { k: 'prioridade', l: 'Prioridade', o: ['P1', 'P2', 'P3', 'P4'].map(x => [x, x]) }, { k: 'responsaveis', l: 'Responsáveis', c: D.u.filter(u => p.membros.includes(u.id)) }, { k: 'inicio', l: 'Início', t: 'date' }, { k: 'fim', l: 'Fim', t: 'date' }],
    { prioridade: 'P3', responsaveis: D.priv ? [me] : [], ...(typeof i == 'number' && i < 3 ? { inicio: D.c.hoje, fim: iso(m + (7 * i + 4) * DAY) } : {}) },
    o => up('t', a => [...a, { id: nid(a), projetoId: pid, status: 'pendente', ...o }]))
  const tog = t => up('t', a => a.map(x => x.id == t.id ? { ...x, status: x.status == 'concluida' ? 'andamento' : 'concluida', conclusao: x.status == 'concluida' ? undefined : D.c.hoje } : x))
  const delT = tid => up('t', a => a.filter(x => x.id != tid).map(x => x.dependeDe == tid ? { ...x, dependeDe: undefined } : x))
  const drop = (t, i) => up('t', a => a.map(x => {
    if (x.id != t.id) return x
    if (i == 3) return x.status == 'concluida' ? x : { ...x, status: 'concluida', conclusao: D.c.hoje }
    const was = x.status == 'concluida'
    if (!was && col(x) == i) return x
    const mon = m + 7 * i * DAY, fim = iso(mon + 4 * DAY), o = { ...x, status: was ? 'andamento' : x.status, conclusao: undefined, fim }
    if (x.inicio > fim) o.inicio = iso(mon)
    return o
  }))

  const a = Math.min(...T.map(t => +d(t.inicio))), z = Math.max(...T.map(t => +d(t.fim))) + DAY, L = z - a, pc = x => (x - a) / L * 100, hp = pc(+h)

  const kanban = () => (
    <div className="kb">
      {COLS.map((c, i) => {
        const l = T.filter(t => col(t) == i).sort((a, b) => a.prioridade > b.prioridade ? 1 : a.prioridade < b.prioridade ? -1 : a.fim > b.fim ? 1 : -1)
        return (
          <div className={'col-k' + (ov === i ? ' over' : '')} key={c}
            onDragOver={e => { e.preventDefault(); setOv(i) }}
            onDragLeave={e => !e.currentTarget.contains(e.relatedTarget) && setOv(null)}
            onDrop={e => { e.preventDefault(); setOv(null); dg.current && drop(dg.current, i); dg.current = null }}>
            <h3>{c}<span className={chip()}>{l.length}</span></h3>
            {l.map(t => {
              const lt = t.status != 'concluida' && d(t.fim) < h, dn = t.status == 'concluida'
              return (
                <div key={t.id} draggable className="tk" onClick={() => setTk(t.id)}
                  onDragStart={e => { dg.current = t; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(t.id)) }}
                  onDragEnd={() => { dg.current = null; setOv(null) }}>
                  <span className={chip(PC[t.prioridade])}>{t.prioridade}</span>
                  <b>{t.titulo}</b>
                  <div className="tkf">
                    <span className="bds">
                      <span className={'bd ' + (dn ? 'ok' : lt ? 'er' : '')} title={dn ? 'Concluída' : lt ? 'Atrasada' : 'Prazo'}><Ic k="clock" />{fm(dn && t.conclusao ? t.conclusao : t.fim)}</span>
                      {(t.checklist || []).length > 0 && <span className={'bd ' + (t.checklist.every(x => x.feito) ? 'ok' : '')}><Ic k="check" />{t.checklist.filter(x => x.feito).length}/{t.checklist.length}</span>}
                      {t.dependeDe && <span className="bd" title="Depende de outra tarefa"><Ic k="link" /></span>}
                      {t.descricao && <span className="bd" title="Tem descrição"><Ic k="list" /></span>}
                    </span>
                    <Av D={D} ids={t.responsaveis} />
                  </div>
                  <span className="cm t"><ActionMenu items={[[dn ? 'undo' : 'check', dn ? 'Reabrir' : 'Concluir', () => tog(t)], ['trash', 'Excluir', () => delT(t.id), 1]]} /></span>
                </div>
              )
            })}
            {i < 3 && <button className="btn btn-ghost addc" onClick={() => add(i)}><Ic k="plus" />Adicionar tarefa</button>}
          </div>
        )
      })}
    </div>
  )

  const gantt = () => !T.length
    ? <div className="card card-body">Nenhuma tarefa ainda. Use “Nova tarefa”.</div>
    : (
      <div className="card gt">
        {T.map(t => {
          const dep = T.find(x => x.id == t.dependeDe), x1 = dep && pc(+d(dep.fim) + DAY), x2 = dep && pc(+d(t.inicio))
          return (
            <div className="gr" key={t.id}>
              <div className="gl">{t.titulo}<br /><small style={{ fontWeight: 400 }}>{nm(D, t.responsaveis)}</small>
                {dep && <small className="gdl" title={'Depende de ' + dep.titulo}><Ic k="link" />depende de {dep.titulo}</small>}
              </div>
              <div className="gc">
                {hp >= 0 && hp <= 100 && <i className="hj" style={{ left: hp + '%' }} />}
                {dep && <><i className="gdp" style={{ left: x1 + '%' }} /><i className={'gdd' + (x2 < x1 ? ' bad' : '')} style={{ left: Math.min(x1, x2) + '%', width: Math.abs(x2 - x1) + '%' }} /></>}
                <div className={'gb ' + (t.status == 'concluida' ? 'c' : t.status == 'pendente' ? 'p' : '')} title={fm(t.inicio) + ' a ' + fm(t.fim)} style={{ left: pc(+d(t.inicio)) + '%', width: (+d(t.fim) + DAY - +d(t.inicio)) / L * 100 + '%' }} />
              </div>
            </div>
          )
        })}
        <small className="mt-2">Vermelho: hoje · Verde: concluída · Azul: em andamento · Âmbar: pendente · Linha tracejada: dependência entre tarefas</small>
      </div>
    )

  const editarProjeto = () => form('Editar projeto', camposProjeto({ lista: gente, areas }), valoresProjeto(projeto), async v => {
    try {
      await projetos.editar(projeto.codigo, v)
      alerts.toastSuccess('Projeto atualizado')
      await aoSalvar()
    } catch (error) {
      alerts.error('Não foi possível salvar', error.message)
      return false
    }
  })

  const dia = s => (s ? String(s).slice(0, 10) : '')
  const info = [
    ['Status', <StatusProjeto s={projeto.status} />],
    ['Referência', projeto.referencia || '—'],
    ['Cliente', projeto.clienteNome || '—'],
    ['Período', fm(dia(projeto.dataInicio)) + ' a ' + fm(dia(projeto.dataFim))],
    ['Prioridade', rotuloPrioridade(projeto.prioridade)],
    ['Responsável', projeto.responsavel?.nome || '—'],
    ['Área', projeto.area?.nome || '—'],
    ['Equipe', <Av D={D} ids={p.membros} />],
  ]
  const geral = () => (
    <div className="card card-body">
      <div className="row g-3">
        {info.map(([l, v]) => <div className="col-sm-6 col-lg-3" key={l}><small className="d-block">{l}</small><div className="fw-semibold">{v}</div></div>)}
      </div>
      <h3 className="h6 fw-bold mt-4">Descrição</h3>
      <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{projeto.descricao}</p>
      {projeto.objetivo && <><h3 className="h6 fw-bold mt-3">Objetivo</h3><p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{projeto.objetivo}</p></>}
      {gestor && <div className="mt-3"><button className="btn btn-g" onClick={editarProjeto}><Ic k="edit" />Editar projeto</button></div>}
    </div>
  )

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">{voltar}<h1>{projeto.nome}</h1><StatusProjeto s={projeto.status} /></div>
        {aba == 'tarefas' && <div className="d-flex flex-wrap gap-2">
          <button className={'btn btn-g' + (pt == 'kanban' ? ' on' : '')} onClick={() => setPt('kanban')}>Kanban</button>
          <button className={'btn btn-g' + (pt == 'gantt' ? ' on' : '')} onClick={() => setPt('gantt')}>Cronograma</button>
          <button className="btn btn-primary" onClick={() => add()}><Ic k="plus" />Nova tarefa</button>
        </div>}
      </div>
      <div className="mb-3"><Seg items={ABAS} value={aba} onChange={setAba} /></div>
      {aba == 'tarefas' && (pt == 'kanban' ? kanban() : gantt())}
      {aba == 'geral' && geral()}
      {aba == 'equipe' && <EquipeProjeto projeto={projeto} todos={todos} gente={gente} gestor={gestor} aoSalvar={aoSalvar} />}
      {tk && T.find(x => x.id == tk) && <TaskModal D={D} up={up} t={T.find(x => x.id == tk)} p={p} T={T} close={() => setTk(null)} del={delT} />}
    </>
  )
}
