export const DAY = 864e5
export const d = s => new Date(s + 'T00:00')
export const iso = x => { const t = new Date(x); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') }
export const fm = s => s.slice(8) + '/' + s.slice(5, 7)

export const TIPO = { mecanica: 'Mecânica', computacao: 'Computação', eletrica: 'Elétrica' }
export const PC = { P1: 'er', P2: 'wa', P3: 'p3', P4: '' }
export const ST = { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída' }
export const HUM = ['Difícil', 'Cansativa', 'Ok', 'Boa', 'Ótima']

export const NAV = [
  ['dashboard', 'Dashboard', '/'],
  ['projetos', 'Projetos', '/projetos'],
  ['capacitacoes', 'Capacitações', '/capacitacoes'],
  ['checkins', 'Check-in semanal', '/checkins'],
  ['estrategia', 'Visão Estratégica', '/estrategia'],
  ['gestao', 'Gestão', '/gestao'],
  ['precificacao', 'Simular precificação', '/precificacao'],
  ['usuarios', 'Pessoas', '/usuarios'],
  ['configuracoes', 'Configurações', '/configuracoes'],
  ['perfil', 'Meu perfil', '/perfil']
]
export const path = (n, pid) => n === 'projeto' ? '/projetos/' + pid : n === 'perfil' && pid ? '/perfil/' + pid : (NAV.find(x => x[0] === n)?.[2] || '/')

export const chip = (c = '') => 'badge rounded-pill ' + c
export const nid = () => crypto.randomUUID()
export const ini = n => n.split(' ').map(x => x[0]).join('').slice(0, 2)
export const un = (D, id) => D.u.find(u => u.id == id)?.nome || '—'
export const hj = D => d(D.c.hoje)
export const nm = (D, ids) => (ids || []).map(i => un(D, i)).join(', ') || '—'
export const prog = (D, p) => { const t = D.t.filter(x => x.projetoId == p.id); return t.length ? Math.round(t.filter(x => x.status == 'concluida').length / t.length * 100) : 0 }
export const semana = D => { const h = hj(D); return iso(+h - ((h.getDay() + 6) % 7) * DAY) }
export const brl = n => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const sz = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'
// Data vinda da API (ISO, meia-noite UTC) para dd/mm/aaaa.
export const fd = s => s ? new Date(s).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'
