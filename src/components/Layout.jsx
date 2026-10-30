import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fm, ini, un, chip } from '../lib/utils'
import Ic from './Icon'
import FormModal from './FormModal'

function Header() {
  const { D, me, sair } = useApp(), navigate = useNavigate()
  const [dk, setDk] = useState(document.documentElement.dataset.theme == 'dark')
  const tema = () => {
    const n = !dk, r = document.documentElement
    r.classList.add('tt'); r.dataset.theme = n ? 'dark' : 'light'; r.dataset.bsTheme = n ? 'dark' : 'light'
    try { localStorage.setItem('tema', n ? 'dark' : 'light') } catch (e) { }
    setDk(n); setTimeout(() => r.classList.remove('tt'), 600)
  }
  return (
    <header className="hd">
      <div className="hdi">
        <img className="hl" src={import.meta.env.BASE_URL + 'assets/logo-branca.png'} alt="Konvex Jr – ir para o Dashboard" onClick={() => navigate('/')} />
        <div className="hr">
          <span className={chip('hdt')}>Hoje · {fm(D.c.hoje)}</span>
          <button className="tg" aria-label={dk ? 'Ativar modo claro' : 'Ativar modo escuro'} title={dk ? 'Modo claro' : 'Modo escuro'} onClick={tema}>
            <span className="sun"><Ic k="sun" /></span><span className="moon"><Ic k="moon" /></span>
          </button>
          <span className="hu"><b>{un(D, me)}</b><small>{D.u.find(u => u.id == me)?.perfil}</small></span>
          <span className="av" role="button" title="Meu perfil" onClick={() => navigate('/perfil')}>{ini(un(D, me))}</span>
          <button className="btn btn-g btn-sm" onClick={sair}><Ic k="logout" />Sair</button>
        </div>
      </div>
    </header>
  )
}

function SideNav() {
  const { nav, go } = useApp(), { pathname } = useLocation()
  const ativo = nav.findIndex(([, , p]) => p === '/' ? pathname === '/' : pathname.startsWith(p))
  return (
    <nav id="menu" aria-label="Menu principal" style={{ '--i': Math.max(0, ativo) }}>
      <i className="pill" />
      {nav.map(([k, l], i) => (
        <a key={k} role="button" tabIndex={0} className={i === ativo ? 'on' : ''} aria-current={i === ativo ? 'page' : undefined} aria-label={l} data-l={l} onClick={() => go(k)} onKeyDown={e => e.key == 'Enter' && go(k)}>
          <Ic k={k} />
        </a>
      ))}
    </nav>
  )
}

export default function Layout() {
  const { me, nav, md, setMd } = useApp(), { pathname } = useLocation()
  if (!me) return <Navigate to="/login" replace />
  const secao = pathname.split('/')[1]
  // Só abre telas que vieram no menu da pessoa (GET /auth/permissoes).
  if (secao && !nav.some(([, , caminho]) => caminho === '/' + secao)) return <Navigate to="/" replace />
  return (
    <>
      <Header />
      <SideNav />
      <main className="app-main"><div key={pathname} className="page-in"><Outlet /></div></main>
      {md && <FormModal {...md} close={() => setMd(null)} />}
    </>
  )
}
