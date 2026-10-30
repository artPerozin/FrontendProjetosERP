import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { HUM, fm, ini, nid, semana, un } from '../lib/utils'
import Ic from '../components/Icon'
import { Hm, PageBar, Seg } from '../components/Ui'

const Tx = ({ x }) => (
  <dl className="ci mb-0">
    <dt>Como foi a semana</dt><dd>{x.resumo}</dd>
    <dt>Aprendizados</dt><dd>{x.aprendizados}</dd>
    {x.sentimento && <><dt>Como se sentiu</dt><dd>{x.sentimento}</dd></>}
  </dl>
)

export default function Checkins() {
  const { D, up, me, pode } = useApp()
  const wk = semana(D), eu = D.u.find(u => u.id == me), gestor = pode('checkins.verTodos'), [ab, setAb] = useState('meus')
  const mine = D.i.find(x => x.usuarioId == me && x.semana == wk), [ed, setEd] = useState(!mine), [v, setV] = useState(mine || { humor: 3, resumo: '', aprendizados: '', sentimento: '' })
  const [sw, setSw] = useState(wk), [fm2, setFm2] = useState('')
  const set = (k, x) => setV(o => ({ ...o, [k]: x })), time = D.u.filter(u => u.ativo && u.perfil == 'membro')
  const send = e => { e.preventDefault(); up('i', a => mine ? a.map(x => x.id == mine.id ? { ...x, ...v } : x) : [...a, { id: nid(a), usuarioId: me, semana: wk, ...v }]); setEd(false) }
  const hist = D.i.filter(x => x.usuarioId == me && x.semana != wk).sort((a, b) => a.semana < b.semana ? 1 : -1)
  const weeks = [...new Set([wk, ...D.i.map(x => x.semana)])].sort().reverse()
  const L = D.i.filter(x => x.semana == sw && (!fm2 || x.usuarioId == fm2)).sort((a, b) => un(D, a.usuarioId) > un(D, b.usuarioId) ? 1 : -1)
  const pend = time.filter(u => (!fm2 || u.id == fm2) && !D.i.some(x => x.usuarioId == u.id && x.semana == sw)), media = L.length ? L.reduce((s, x) => s + x.humor, 0) / L.length : 0
  return (
    <>
      <PageBar title="Check-in semanal" sub={ab == 'meus' ? 'Conte como foi a semana, o que aprendeu e como se sentiu.' : 'Acompanhe os check-ins de toda a equipe.'} />
      {gestor && <div className="mb-3"><Seg items={[['meus', 'Meus check-ins'], ['equipe', 'Equipe']]} value={ab} onChange={setAb} /></div>}

      {ab == 'meus' ? (
        <div className="row g-3">
          <div className="col-lg-8">
            {ed || !mine ? (
              <form className="card card-body" onSubmit={send}>
                <h2>Esta semana</h2><small>Semana de {fm(wk)}. Leva menos de um minuto.</small>
                <div className="d-flex flex-wrap gap-2 my-3" role="radiogroup" aria-label="Como foi sua semana">
                  {HUM.map((l, i) => <button type="button" role="radio" aria-checked={v.humor == i + 1} key={l} className={'btn btn-g btn-sm' + (v.humor == i + 1 ? ' on' : '')} onClick={() => set('humor', i + 1)}>{l}</button>)}
                </div>
                <label className="form-label w-100 mb-3">Como foi a semana?<textarea className="form-control mt-1" required rows={3} value={v.resumo} onChange={e => set('resumo', e.target.value)} /></label>
                <label className="form-label w-100 mb-3">Quais foram seus aprendizados?<textarea className="form-control mt-1" required rows={3} value={v.aprendizados} onChange={e => set('aprendizados', e.target.value)} /></label>
                <label className="form-label w-100 mb-3">Como você se sentiu? Precisa de apoio?<textarea className="form-control mt-1" rows={3} value={v.sentimento} onChange={e => set('sentimento', e.target.value)} /></label>
                <div className="d-flex justify-content-end gap-2">{mine && <button type="button" className="btn btn-g" onClick={() => setEd(false)}>Cancelar</button>}<button className="btn btn-primary">Enviar check-in</button></div>
              </form>
            ) : (
              <div className="card card-body">
                <div className="d-flex justify-content-between align-items-center"><h2 className="m-0">Esta semana</h2><Hm n={mine.humor} /></div>
                <small>Semana de {fm(wk)} · enviado</small><Tx x={mine} />
                <div className="mt-3"><button className="btn btn-g btn-sm" onClick={() => { setV(mine); setEd(true) }}><Ic k="edit" />Editar check-in</button></div>
              </div>
            )}
          </div>
          <div className="col-lg-4"><div className="card card-body">
            <h2>Meu histórico</h2>
            {hist.length ? hist.map(x => <div className="fbk" key={x.id}><div className="d-flex justify-content-between"><b>Semana de {fm(x.semana)}</b><Hm n={x.humor} /></div><Tx x={x} /></div>) : <small>Seus check-ins anteriores aparecem aqui.</small>}
          </div></div>
        </div>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <select className="form-select w-auto" aria-label="Semana" value={sw} onChange={e => setSw(e.target.value)}>{weeks.map(w => <option key={w} value={w}>Semana de {fm(w)}</option>)}</select>
            <select className="form-select w-auto" aria-label="Membro" value={fm2} onChange={e => setFm2(e.target.value)}><option value="">Todos os membros</option>{time.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
          </div>
          <div className="row g-3 mb-3">
            {[[L.length, 'Check-ins enviados'], [pend.length, 'Pendentes'], [media ? media.toFixed(1).replace('.', ',') : '—', 'Humor médio (1 a 5)']].map(([n, l]) => (
              <div className="col-md-4" key={l}><div className="card card-body stat"><b>{n}</b><span>{l}</span></div></div>
            ))}
          </div>
          <div className="row g-3">
            {L.map(x => (
              <div className="col-md-6" key={x.id}><div className="card card-body h-100">
                <div className="d-flex justify-content-between align-items-center"><span><span className="av me-2">{ini(un(D, x.usuarioId))}</span><b>{un(D, x.usuarioId)}</b></span><Hm n={x.humor} /></div>
                <Tx x={x} />
              </div></div>
            ))}
            {pend.length > 0 && <div className="col-md-6"><div className="card card-body"><h2>Pendentes</h2><div className="d-flex flex-wrap gap-1">{pend.map(u => <span key={u.id} className="badge rounded-pill">{u.nome}</span>)}</div></div></div>}
          </div>
          {!L.length && <div className="card card-body mt-3"><small>Nenhum check-in nesta semana.</small></div>}
        </>
      )}
    </>
  )
}
