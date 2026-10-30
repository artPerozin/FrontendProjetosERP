import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { chip, fd, ini } from '../lib/utils'
import Ic from '../components/Icon'
import { PageBar, Prog } from '../components/Ui'
import alerts from '../lib/alerts'
import useCarregar from '../lib/useCarregar'
import { minhaConta, pessoas, rotuloStatus } from '../services/pessoas'

const COR_STATUS = { ativo: 'ok', trainee: '', alumni: 'wa', inativo: 'er' }

function Lista({ titulo, itens, vazio, linha }) {
  return (
    <div className="card card-body h-100">
      <h2>{titulo}</h2>
      {itens.length ? itens.map(linha) : <small>{vazio}</small>}
    </div>
  )
}

/** RF-013: perfil da pessoa. Em /perfil é o próprio; em /perfil/:codigo, o de outra pessoa. */
export default function Perfil() {
  const { codigo: outro } = useParams()
  const { me, form, go, refresh } = useApp()
  const codigo = outro || me
  const meu = codigo === me
  const { dados: perfil, carregando, recarregar } = useCarregar(() => pessoas.perfil(codigo), [codigo])

  if (!perfil) return <PageBar title={meu ? 'Meu perfil' : 'Perfil'} sub={carregando ? 'Carregando…' : 'Não foi possível carregar.'} />

  const { usuario: u, projetosAtuais, projetosAnteriores, historico, capacitacoes, alocacao } = perfil

  const editarDados = () => form(
    'Editar meus dados',
    [
      { k: 'nomeExibicao', l: 'Como prefere ser chamado(a)', opt: true },
      { k: 'telefone', l: 'Telefone', t: 'tel', opt: true },
      { k: 'linkedinUrl', l: 'LinkedIn (link)', t: 'url', opt: true },
      { k: 'curso', l: 'Curso', opt: true },
      { k: 'semestre', l: 'Semestre', t: 'number', opt: true },
      { k: 'bio', l: 'Sobre você', t: 'textarea', opt: true },
    ],
    { nomeExibicao: u.nomeExibicao || '', telefone: u.telefone || '', linkedinUrl: u.linkedinUrl || '', curso: u.curso || '', semestre: u.semestre ?? '', bio: u.bio || '' },
    async v => {
      try {
        await minhaConta.editarPerfil(v)
        alerts.toastSuccess('Dados atualizados')
        await recarregar()
        refresh().catch(() => {})
      } catch (error) {
        alerts.error('Não foi possível salvar', error.message)
        return false
      }
    },
  )

  const trocarSenha = () => form(
    'Trocar senha',
    [
      { k: 'senhaAtual', l: 'Senha atual', t: 'password' },
      { k: 'novaSenha', l: 'Nova senha', t: 'password', h: 'Mínimo de 8 caracteres.' },
      { k: 'confirmar', l: 'Repita a nova senha', t: 'password' },
    ],
    {},
    async v => {
      if (v.novaSenha !== v.confirmar) {
        alerts.error('As senhas não conferem', 'Digite a mesma senha nos dois campos.')
        return false
      }
      try {
        const r = await minhaConta.trocarSenha(v.senhaAtual, v.novaSenha)
        alerts.success('Senha alterada', r?.message || '')
      } catch (error) {
        alerts.error('Não foi possível trocar a senha', error.message)
        return false
      }
    },
  )

  const info = [
    ['E-mail', u.email],
    ['Telefone', u.telefone],
    ['LinkedIn', u.linkedinUrl && <a href={u.linkedinUrl} target="_blank" rel="noreferrer">{u.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}</a>],
    ['Curso', u.curso && (u.semestre ? `${u.curso} · ${u.semestre}º semestre` : u.curso)],
    ['Na EJ desde', u.dataEntrada && fd(u.dataEntrada)],
    ['Saída', u.dataSaida && fd(u.dataSaida)],
  ].filter(([, v]) => v)

  const projeto = p => (
    <div className="ag" key={p.codigo + p.dataEntrada} onClick={() => go('projeto', p.codigo)}>
      <span className={chip()}>{p.alocacao}%</span>
      <div><b>{p.nome}</b><small>{p.funcao || 'Sem função definida'} · desde {fd(p.dataEntrada)}{p.dataSaida ? ` até ${fd(p.dataSaida)}` : ''}</small></div>
      <span className={chip()}>{p.status}</span>
    </div>
  )
  const capacitacao = c => (
    <div className="ag" key={c.codigo} onClick={() => go('capacitacoes')}>
      <span className={chip()}>{c.papel === 'instrutor' ? 'Instrutor' : 'Participante'}</span>
      <div><b>{c.titulo}</b><small>{c.hora}</small></div>
      <span className={chip()}>{fd(c.data)}</span>
    </div>
  )
  const mudancas = [
    ...historico.cargos.map(m => ({ ...m, tipo: 'Cargo', de: m.cargoAnterior?.nome, para: m.cargoNovo?.nome })),
    ...historico.areas.map(m => ({ ...m, tipo: 'Área', de: m.areaAnterior?.nome, para: m.areaNova?.nome })),
  ].sort((a, b) => (a.dataVigencia < b.dataVigencia ? 1 : -1))

  return (
    <>
      <PageBar title={meu ? 'Meu perfil' : u.nome} sub={!meu ? 'Perfil de pessoa da Konvex' : undefined}>
        {!meu && <button className="btn btn-g" onClick={() => history.back()}><Ic k="back" />Voltar</button>}
        {meu && <button className="btn btn-g" onClick={trocarSenha}><Ic k="key" />Trocar senha</button>}
        {meu && <button className="btn btn-primary" onClick={editarDados}><Ic k="edit" />Editar meus dados</button>}
      </PageBar>

      <div className="row g-3">
        <div className="col-md-6"><div className="card card-body h-100">
          <div className="d-flex align-items-center gap-3 mb-3">
            <span className="av">{ini(u.nome)}</span>
            <div>
              <h2 className="mb-0">{u.nomeExibicao || u.nome}</h2>
              <small>{[u.cargo?.nome, u.area?.nome, u.senioridade?.nome].filter(Boolean).join(' · ') || 'Sem cargo e área definidos'}</small>
            </div>
            <span className={'ms-auto ' + chip(COR_STATUS[u.status])}>{rotuloStatus(u.status)}</span>
          </div>
          {info.map(([k, v]) => <div key={k} className="d-flex justify-content-between gap-3 mb-1"><small>{k}</small><span className="text-end">{v}</span></div>)}
          {u.bio && <p className="mt-3 mb-0">{u.bio}</p>}
        </div></div>

        <div className="col-md-6"><div className="card card-body h-100">
          <h2>Alocação em projetos ativos</h2>
          <div className="d-flex justify-content-between mb-1">
            <b>{alocacao.total}%</b>
            {alocacao.excedeu && <span className={chip('er')}>Acima de 100%</span>}
          </div>
          <Prog v={Math.min(alocacao.total, 100)} cls={alocacao.excedeu ? 'bg-danger' : ''} />
          <div className="mt-3">
            {alocacao.projetos.length
              ? alocacao.projetos.map(p => <div key={p.codigo} className="d-flex justify-content-between"><small>{p.nome}</small><small>{p.alocacao}%</small></div>)
              : <small>Sem alocação em projetos ativos.</small>}
          </div>
        </div></div>

        <div className="col-md-6"><Lista titulo="Projetos atuais" itens={projetosAtuais} vazio="Nenhum projeto no momento." linha={projeto} /></div>
        <div className="col-md-6"><Lista titulo="Projetos anteriores" itens={projetosAnteriores} vazio="Nenhum projeto encerrado." linha={projeto} /></div>
        <div className="col-md-6"><Lista titulo="Capacitações" itens={[...capacitacoes.proximas, ...capacitacoes.realizadas]} vazio="Nenhuma capacitação registrada." linha={capacitacao} /></div>
        <div className="col-md-6"><Lista titulo="Histórico de cargo e área" itens={mudancas} vazio="Sem mudanças registradas." linha={(m, i) => (
          <div className="ag" key={i} style={{ cursor: 'default' }}>
            <span className={chip()}>{m.tipo}</span>
            <div><b>{m.para || 'Nenhum'}</b><small>antes: {m.de || 'nenhum'}</small></div>
            <span className={chip()}>{fd(m.dataVigencia)}</span>
          </div>
        )} /></div>
      </div>
    </>
  )
}
