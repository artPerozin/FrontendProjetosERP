import { useState } from 'react'
import Multi from './Multi'

/**
 * Campos: k (chave), l (rótulo), t (tipo do input ou 'textarea'), o (opções de select),
 * c (opções de múltipla escolha), s (mostrar se), opt (opcional), h (dica abaixo do campo).
 * `save` pode ser assíncrono; se devolver false (ou falhar), o modal continua aberto.
 */
export default function FormModal({ t, fs, init, save, close }) {
  const [v, setV] = useState(init), set = (k, x) => setV(o => ({ ...o, [k]: x }))
  const [salvando, setSalvando] = useState(false)
  const enviar = async e => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (await save(v) !== false) close()
    } catch {
      // Quem chamou já mostrou o erro; o formulário fica aberto para corrigir.
    } finally {
      setSalvando(false)
    }
  }
  const campo = x => {
    const comum = { className: 'form-control mt-1', required: !x.opt, value: v[x.k] ?? '', onChange: e => set(x.k, e.target.value) }
    if (x.o) return <select className="form-select mt-1" disabled={Boolean(x.disabled)} value={v[x.k] ?? ''} onChange={e => set(x.k, e.target.value)}>{x.o.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
    if (x.t === 'textarea') return <textarea rows={3} {...comum} />
    return <input type={x.t || 'text'} {...comum} />
  }
  return (
    <>
      <div className="modal-backdrop show" />
      <div className="modal d-block" tabIndex="-1" onClick={close}>
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <form className="modal-content" onSubmit={enviar}>
            <div className="modal-body">
              <h3 className="h5 fw-bold mb-3">{t}</h3>
              {fs.filter(x => !x.s || x.s(v)).map(x => x.c
                ? <div className="mb-3" key={x.k}><div className="form-label">{x.l}</div><Multi opts={x.c} value={v[x.k] || []} onChange={z => set(x.k, z)} /></div>
                : <label className="form-label w-100 mb-3" key={x.k}>{x.l}{campo(x)}{x.h && <small className="d-block mt-1">{x.h}</small>}</label>)}
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-g" onClick={close}>Cancelar</button>
                <button className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
