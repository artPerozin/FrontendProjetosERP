import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { TIPO, chip, d, fm, nid, un } from '../lib/utils'
import Ic from '../components/Icon'
import ActionMenu from '../components/ActionMenu'
import { Av, PageBar, Prog, Stars } from '../components/Ui'

function CapCard({ D, e, big, on, open, tog }) {
  const full = e.inscritos.length >= e.vagas, past = e.data < D.c.hoje, n = e.inscritos.length
  const dt = d(e.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace(/[.,]/g, '')
  const items = [['open', 'Ver detalhes', () => open(e.id)], ...(on ? [['x', 'Cancelar inscrição', () => tog(e), 1]] : !full && !past ? [['check', 'Inscrever-se', () => tog(e)]] : [])]
  return (
    <div className={'cc' + (big ? ' big' : '') + (on ? ' me' : '') + (past ? ' past' : '')} onClick={() => open(e.id)}>
      <div className="ct"><h3>{e.titulo}</h3>{on && <span className={chip('ok')}>Inscrito</span>}<span className={chip('tp-' + e.tipo)}>{TIPO[e.tipo]}</span></div>
      <div className="cmeta"><span><Ic k="capacitacoes" />{dt}</span><span><Ic k="clock" />{e.hora}</span><span><Ic k="pin" />{e.sala}</span></div>
      <small>Instrutor: {e.instrutor}</small>
      <div className="cf2">
        {n > 0 && !D.priv && <span className="avs"><Av D={D} ids={e.inscritos.slice(0, 4)} />{n > 4 && <span className="av more">+{n - 4}</span>}</span>}
        <small>{n} de {e.vagas} vagas{full ? ' · esgotada' : ''}</small>
        <ActionMenu items={items} />
      </div>
    </div>
  )
}

function CapDetalhe({ D, c, on, tog, close }) {
  const cheio = c.inscritos.length >= c.vagas
  return (
    <>
      <div className="modal-backdrop show" />
      <div className="modal d-block" tabIndex="-1" onClick={close}>
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <div className="modal-content"><div className="modal-body">
            <span className={chip('tp-' + c.tipo)}>{TIPO[c.tipo]}</span>
            <h3 className="h5 fw-bold my-2">{c.titulo}</h3>
            <p className="mb-2">{fm(c.data)} às {c.hora}<br /><b>Sala:</b> {c.sala}<br />Instrutor: {c.instrutor}</p>
            <Prog v={c.inscritos.length / c.vagas * 100} />
            <small>{c.inscritos.length} de {c.vagas} vagas ocupadas</small>
            {!D.priv && <>
              <p className="mt-2 mb-1"><b>Inscritos ({c.inscritos.length})</b></p>
              <div className="d-flex flex-wrap gap-1">{c.inscritos.length ? c.inscritos.map(i => <span key={i} className={chip()}>{un(D, i)}</span>) : <small>Ninguém inscrito ainda</small>}</div>
            </>}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-g" onClick={close}>Fechar</button>
              <button className={'btn ' + (on ? 'btn-g' : 'btn-primary')} disabled={!on && cheio} onClick={() => tog(c)}>{on ? 'Cancelar inscrição' : cheio ? 'Vagas esgotadas' : 'Inscrever-se'}</button>
            </div>
          </div></div>
        </div>
      </div>
    </>
  )
}

function Lista() {
  const { D, up, me } = useApp()
  const [sel, setSel] = useState(null), [tp, setTp] = useState(''), [mi, setMi] = useState(false)
  const tog = c => up('k', a => a.map(x => x.id == c.id ? { ...x, inscritos: x.inscritos.includes(me) ? x.inscritos.filter(i => i != me) : [...x.inscritos, me] } : x))
  const L = D.k.filter(e => (!tp || e.tipo == tp) && (!mi || e.inscritos.includes(me))).sort((a, b) => (a.data + a.hora) > (b.data + b.hora) ? 1 : -1)
  const nx = L.filter(e => e.data >= D.c.hoje), ps = L.filter(e => e.data < D.c.hoje), feat = nx.slice(0, 2), rest = nx.slice(2)
  const c = sel && D.k.find(x => x.id == sel)
  const sec = (t, l, big) => l.length > 0 && (
    <>
      <div className="sec"><h2>{t}</h2><span className={chip()}>{l.length}</span></div>
      <div className="row g-3">{l.map(e => (
        <div key={e.id} className={big && l.length > 1 ? 'col-md-6' : 'col-md-6 col-xl-4'}>
          <CapCard D={D} e={e} big={big} on={e.inscritos.includes(me)} open={setSel} tog={tog} />
        </div>))}
      </div>
    </>
  )
  return (
    <>
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">{[['', 'Todas'], ...Object.entries(TIPO)].map(([k, l]) => <button key={k} className={'btn btn-g' + (tp == k ? ' on' : '')} onClick={() => setTp(k)}>{l}</button>)}</div>
        <button className={'btn btn-g' + (mi ? ' on' : '')} onClick={() => setMi(!mi)}><Ic k="check" />Minhas inscrições</button>
      </div>
      {sec('Próximas capacitações', feat, 1)}{sec('Mais adiante', rest)}{sec('Já realizadas', ps)}
      {!L.length && <div className="card card-body">Nenhuma capacitação encontrada. Ajuste os filtros.</div>}
      {c && <CapDetalhe D={D} c={c} on={c.inscritos.includes(me)} tog={tog} close={() => setSel(null)} />}
    </>
  )
}

function Feedbacks() {
  const { D, up, me } = useApp()
  const el = D.k.filter(e => e.data <= D.c.hoje && e.inscritos.includes(me)).sort((a, b) => a.data < b.data ? 1 : -1)
  const ld = id => { const x = D.f.find(f => f.capId == id && f.usuarioId == me); return x ? { nota: x.nota, bom: x.bom, melhorar: x.melhorar } : { nota: 0, bom: '', melhorar: '' } }
  const [cid, setCid] = useState(el[0]?.id ?? ''), [v, setV] = useState(() => ld(el[0]?.id)), [ok, setOk] = useState(false)
  const pick = id => { setCid(id); setV(ld(id)); setOk(false) }, set = (k, x) => setV(o => ({ ...o, [k]: x })), ex = D.f.find(f => f.capId == cid && f.usuarioId == me)
  const send = e => { e.preventDefault(); if (!v.nota) return; up('f', a => [...a.filter(x => !(x.capId == cid && x.usuarioId == me)), { id: nid(a), capId: cid, usuarioId: me, data: D.c.hoje, ...v }]); setOk(true) }
  const caps = D.k.filter(k => D.f.some(f => f.capId == k.id)).sort((a, b) => a.data < b.data ? 1 : -1)
  return (
    <div className="row g-3">
      <div className="col-lg-8">
        {caps.length ? caps.map(k => {
          const L = D.f.filter(f => f.capId == k.id), m = L.reduce((s, f) => s + f.nota, 0) / L.length
          return (
            <div className="card card-body mb-3" key={k.id}>
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div><h2 className="m-0">{k.titulo}</h2><small>{fm(k.data)} · Instrutor: {k.instrutor}</small></div>
                <div className="d-flex align-items-center gap-2"><Stars n={Math.round(m)} /><b>{m.toFixed(1).replace('.', ',')}</b><small>({L.length})</small></div>
              </div>
              {L.map(f => (
                <div className="fbk" key={f.id}>
                  <div className="d-flex justify-content-between"><b>{un(D, f.usuarioId)}</b><Stars n={f.nota} /></div>
                  {f.bom && <p className="mt-2 mb-0"><small>O que funcionou</small><br />{f.bom}</p>}
                  {f.melhorar && <p className="mt-2 mb-0"><small>O que melhorar</small><br />{f.melhorar}</p>}
                </div>
              ))}
            </div>
          )
        }) : <div className="card card-body"><small>Nenhum feedback enviado ainda.</small></div>}
      </div>
      <div className="col-lg-4"><div className="card card-body">
        <h2>Dar feedback</h2>
        {el.length ? (
          <form onSubmit={send}>
            <label className="form-label w-100 mb-3">Capacitação
              <select className="form-select mt-1" value={cid} onChange={e => pick(e.target.value)}>{el.map(e => <option key={e.id} value={e.id}>{e.titulo} ({fm(e.data)})</option>)}</select>
            </label>
            <div className="form-label">Nota</div><Stars n={v.nota} set={n => set('nota', n)} />
            <label className="form-label w-100 mt-3 mb-3">O que funcionou bem?<textarea className="form-control mt-1" rows={3} value={v.bom} onChange={e => set('bom', e.target.value)} /></label>
            <label className="form-label w-100 mb-3">O que pode melhorar?<textarea className="form-control mt-1" rows={3} value={v.melhorar} onChange={e => set('melhorar', e.target.value)} /></label>
            <div className="d-flex justify-content-end"><button className="btn btn-primary" disabled={!v.nota}>{ex ? 'Atualizar feedback' : 'Enviar feedback'}</button></div>
            {ok && <small role="status">Feedback salvo. Obrigado!</small>}
          </form>
        ) : <small>Você poderá dar feedback depois de participar de uma capacitação já realizada.</small>}
      </div></div>
    </div>
  )
}

export default function Capacitacoes() {
  const { D, up, me, pode } = useApp(), [ab, setAb] = useState('lista')
  const [mostrarCriacao, setMostrarCriacao] = useState(false)
  const [formacao, setFormacao] = useState({ titulo: '', data: '', hora: '09:00', vagas: 10, tipo: 'computacao', sala: '' })
  const usuarioAtual = D?.u?.find(usuario => String(usuario.id) === String(me))
  const podeCriar = pode('capacitacoes.gerir')
  const criar = evento => {
    evento.preventDefault()
    if (!formacao.titulo.trim() || !formacao.data || !formacao.hora || !formacao.sala.trim() || Number(formacao.vagas) < 1) return
    up('k', atuais => [...atuais, { id: nid(), ...formacao, titulo: formacao.titulo.trim(), sala: formacao.sala.trim(), vagas: Number(formacao.vagas), instrutor: usuarioAtual?.nome || '', instrutorId: me, inscritos: [] }])
    setMostrarCriacao(false)
    setFormacao({ titulo: '', data: '', hora: '09:00', vagas: 10, tipo: 'computacao', sala: '' })
  }
  return (
    <>
      <PageBar title="Capacitações" sub={ab == 'lista' ? 'Clique em um card para ver os detalhes e se inscrever.' : 'Avalie as capacitações que você participou e veja o retorno da turma.'} />
      {podeCriar && ab === 'lista' && <div className="d-flex justify-content-end mb-3"><button className="btn btn-primary" onClick={() => setMostrarCriacao(value => !value)}>{mostrarCriacao ? 'Cancelar' : 'Criar capacitação'}</button></div>}
      {podeCriar && mostrarCriacao && <form className="card card-body mb-3" onSubmit={criar}>
        <h2 className="h5">Nova capacitação</h2>
        <div className="row g-3">
          <label className="col-md-6 form-label">Título<input required className="form-control mt-1" value={formacao.titulo} onChange={e => setFormacao(v => ({ ...v, titulo: e.target.value }))} /></label>
          <label className="col-md-3 form-label">Data<input required type="date" min={D.c.hoje} className="form-control mt-1" value={formacao.data} onChange={e => setFormacao(v => ({ ...v, data: e.target.value }))} /></label>
          <label className="col-md-3 form-label">Horário<input required type="time" className="form-control mt-1" value={formacao.hora} onChange={e => setFormacao(v => ({ ...v, hora: e.target.value }))} /></label>
          <label className="col-md-4 form-label">Tipo<select className="form-select mt-1" value={formacao.tipo} onChange={e => setFormacao(v => ({ ...v, tipo: e.target.value }))}>{Object.entries(TIPO).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="col-md-4 form-label">Sala<input required className="form-control mt-1" value={formacao.sala} onChange={e => setFormacao(v => ({ ...v, sala: e.target.value }))} /></label>
          <label className="col-md-4 form-label">Vagas<input required type="number" min="1" step="1" className="form-control mt-1" value={formacao.vagas} onChange={e => setFormacao(v => ({ ...v, vagas: e.target.value }))} /></label>
        </div>
        <div className="d-flex justify-content-end mt-3"><button className="btn btn-primary" type="submit">Salvar capacitação</button></div>
      </form>}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {[['lista', 'Capacitações'], ['feedbacks', 'Feedbacks']].map(([k, l]) => (
          <button key={k} className={'btn btn-g' + (ab == k ? ' on' : '')} onClick={() => setAb(k)}>
            {k == 'feedbacks' && <Ic k="msg" />}{l}{k == 'feedbacks' && <span className={chip()}>{D.f.length}</span>}
          </button>
        ))}
      </div>
      {ab == 'lista' ? <Lista /> : <Feedbacks />}
    </>
  )
}
