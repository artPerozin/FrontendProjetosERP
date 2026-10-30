import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { DAY, PC, TIPO, chip, d, fm, hj, nm, prog } from '../lib/utils'
import Burn from '../components/Burn'
import Table from '../components/Table'
import { PageBar, Prog } from '../components/Ui'

const TB = { late: ['Atrasadas', 'er'], and: ['Em andamento', 'an'], done: ['Concluídas', 'ok'] }

export default function Estrategia() {
  const { D, go } = useApp()
  const T = D.t, h = hj(D), ativos = D.u.filter(u => u.ativo), [tab, setTab] = useState('late')
  const late = t => t.status != 'concluida' && d(t.fim) < h, pn = id => D.p.find(p => p.id == id)?.nome
  const G = { late: T.filter(late), and: T.filter(t => t.status != 'concluida' && !late(t)), done: T.filter(t => t.status == 'concluida') }

  const crit = D.p.filter(p => p.status == 'em_execucao').map(p => {
    const n = G.late.filter(t => t.projetoId == p.id).length, left = Math.round((+d(p.fim) - +h) / DAY), pr = prog(D, p), r = []
    if (n) r.push(n + (n == 1 ? ' tarefa atrasada' : ' tarefas atrasadas'))
    if (left < 0) r.push('Prazo vencido há ' + -left + (left == -1 ? ' dia' : ' dias'))
    else if (left <= 14 && pr < 70) r.push('Prazo em ' + left + (left == 1 ? ' dia' : ' dias') + ' com ' + pr + '% concluído')
    return { p, r, sc: n * 10 + (left < 0 ? 100 : 0) + Math.max(0, 14 - left), pr }
  }).filter(x => x.r.length).sort((a, b) => b.sc - a.sc)

  const part = ativos.map(u => ({ id: u.id, nome: u.nome, ks: D.k.filter(k => k.inscritos.includes(u.id)) })), com = part.filter(x => x.ks.length), sem = part.filter(x => !x.ks.length)
  const ccols = [
    { k: 'nome', l: 'Membro' },
    { k: 'n', l: 'Capacitações', get: x => x.ks.length, render: x => x.ks.length },
    { l: 'Quais', render: x => x.ks.map(k => <span key={k.id} className={chip('tp-' + k.tipo + ' me-1 d-inline-block')}>{k.titulo}</span>) }
  ]


  return (
    <>
      <PageBar title="Visão Estratégica" sub={'Panorama de tarefas, projetos, capacitações e pessoas em ' + fm(D.c.hoje)} />

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><div className="card card-body stat"><b>{T.length}</b><span>Tarefas no total</span></div></div>
        {Object.keys(TB).map(k => <div className="col-6 col-lg-3" key={k}><div className="card card-body stat"><b>{G[k].length}</b><span><i className={'dt ' + TB[k][1]} />{TB[k][0]}</span></div></div>)}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-8"><div className="card card-body h-100"><h2>Burndown de tarefas</h2><Burn D={D} /></div></div>
        <div className="col-lg-4"><div className="card card-body h-100">
          <h2>Relação de tarefas</h2>
          <div className="d-flex flex-wrap gap-1 mb-2">{Object.keys(TB).map(k => <button key={k} className={'btn btn-g btn-sm' + (tab == k ? ' on' : '')} onClick={() => setTab(k)}>{TB[k][0]}</button>)}</div>
          <div className="lst">
            {G[tab].length ? G[tab].map(t => (
              <div className="ag" key={t.id} onClick={() => go('projeto', t.projetoId)}>
                <span className={chip(PC[t.prioridade])}>{t.prioridade}</span>
                <div><b>{t.titulo}</b><small>{pn(t.projetoId)} · {nm(D, t.responsaveis)}</small></div>
                <span className={chip()}>{fm(tab == 'done' ? t.conclusao : t.fim)}</span>
              </div>
            )) : <small>Nenhuma tarefa nesta situação.</small>}
          </div>
        </div></div>
      </div>

      <div className="sec"><h2>Projetos</h2></div>
      <div className="row g-3 mb-3">
        <div className="col-lg-8"><div className="card card-body h-100">
          <h2>Tarefas por projeto</h2>
          {D.p.map(p => {
            const L = T.filter(t => t.projetoId == p.id), c = L.filter(t => t.status == 'concluida').length, a = L.filter(late).length, n = L.length || 1
            return (
              <div key={p.id}>
                <div className="d-flex justify-content-between"><span>{p.nome}</span><b>{L.length}</b></div>
                <Prog parts={[[c / n * 100, 'ok'], [(L.length - c - a) / n * 100, '', .45], [a / n * 100, 'er']]} />
                <small>{c} concluídas · {L.length - c - a} em andamento · {a} atrasadas</small>
              </div>
            )
          })}
        </div></div>
        <div className="col-lg-4"><div className="card card-body h-100">
          <h2>Projetos críticos</h2>
          {crit.length ? crit.map(x => (
            <div className="cr" key={x.p.id} onClick={() => go('projeto', x.p.id)}>
              <b>{x.p.nome}</b>{x.r.map(m => <small key={m}>{m}</small>)}<Prog v={x.pr} />
            </div>
          )) : <small>Nenhum projeto crítico agora.</small>}
          <small className="d-block mt-3">Crítico: tarefa atrasada, prazo vencido ou prazo em até 14 dias com menos de 70% concluído.</small>
        </div></div>
      </div>

      <div className="sec"><h2>Capacitações</h2></div>
      <div className="card card-body mb-3">
        <div className="d-flex justify-content-between"><span><b>{com.length} de {part.length}</b> membros ativos participaram de alguma capacitação</span><b>{part.length ? Math.round(com.length / part.length * 100) : 0}%</b></div>
        <Prog v={part.length ? com.length / part.length * 100 : 0} cls="ok" />
      </div>
      <div className="row g-3 mb-3">
        <div className="col-lg-8"><Table cols={ccols} rows={com} /></div>
        <div className="col-lg-4"><div className="card card-body h-100">
          <h2>Não participaram de nenhuma</h2>
          {sem.length ? <div className="d-flex flex-wrap gap-1">{sem.map(x => <span key={x.id} className={chip()}>{x.nome}</span>)}</div> : <small>Todos os membros ativos já participaram.</small>}
        </div></div>
      </div>
    </>
  )
}
