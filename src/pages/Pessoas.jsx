import { useApp } from '../context/AppContext'
import { chip, fd } from '../lib/utils'
import Ic from '../components/Icon'
import Table from '../components/Table'
import ActionMenu from '../components/ActionMenu'
import { PageBar } from '../components/Ui'
import alerts from '../lib/alerts'
import useCarregar from '../lib/useCarregar'
import { configuracoes, pessoas, rotuloStatus, STATUS_PESSOA } from '../services/pessoas'

const COR_STATUS = { ativo: 'ok', trainee: '', alumni: 'wa', inativo: 'er' }
const PERFIS = [['membro', 'Membro'], ['gerente', 'Gerente'], ['diretor', 'Diretor']]
const SAIDA = ['alumni', 'inativo']

/** RF-010 a RF-016: cadastro e acompanhamento de pessoas (gestores). */
export default function Pessoas() {
  const { form, go, me, pode, refresh } = useApp()
  const { dados, carregando, recarregar } = useCarregar(async () => {
    const [lista, areas, cargos, senioridades] = await Promise.all([
      pessoas.listar(), configuracoes.areas(), configuracoes.cargos(), configuracoes.senioridades(),
    ])
    return { lista, areas, cargos, senioridades }
  })

  if (!dados) return <PageBar title="Pessoas" sub={carregando ? 'Carregando…' : 'Não foi possível carregar.'} />

  const { lista, areas, cargos, senioridades } = dados
  const gereDiretores = pode('pessoas.gerirDiretores')
  const perfis = gereDiretores ? PERFIS : PERFIS.filter(([k]) => k !== 'diretor')
  const opcoes = (itens, ativo) => [['', '—'], ...itens.filter(ativo).map(i => [i.codigo, i.nome])]
  const podeMexer = p => gereDiretores || p.perfil !== 'diretor'

  // Depois de salvar: recarrega esta tela e os dados compartilhados (nomes em projetos etc.).
  const executar = async (acao, sucesso) => {
    try {
      await acao()
      alerts.toastSuccess(sucesso)
      await recarregar()
      refresh().catch(() => {})
    } catch (error) {
      alerts.error('Não foi possível salvar', error.message)
      return false
    }
  }

  const editar = p => form(
    p ? 'Editar pessoa' : 'Nova pessoa',
    [
      { k: 'nome', l: 'Nome' },
      { k: 'email', l: 'E-mail', t: 'email' },
      { k: 'status', l: 'Status', o: STATUS_PESSOA.slice(0, 2), s: () => !p, h: 'Trainee fica cadastrado e entra em projetos, mas ainda não acessa o sistema.' },
      { k: 'senha', l: 'Senha inicial', t: 'password', s: v => !p && v.status === 'ativo', h: 'Mínimo de 8 caracteres. A pessoa pode trocar depois em Meu perfil.' },
      { k: 'perfil', l: 'Perfil de acesso', o: perfis },
      { k: 'codigoSenioridade', l: 'Senioridade', o: senioridades.map(s => [s.codigo, s.nome]) },
      { k: 'codigoArea', l: 'Área', o: opcoes(areas, a => a.ativa || a.codigo === p?.area?.codigo), opt: true },
      { k: 'codigoCargo', l: 'Cargo', o: opcoes(cargos, c => c.ativo || c.codigo === p?.cargo?.codigo), opt: true },
      { k: 'dataEntrada', l: 'Data de entrada na EJ', t: 'date', opt: true },
    ],
    p
      ? { nome: p.nome, email: p.email, perfil: p.perfil, codigoSenioridade: p.senioridade?.codigo || senioridades[0]?.codigo, codigoArea: p.area?.codigo || '', codigoCargo: p.cargo?.codigo || '', dataEntrada: p.dataEntrada?.slice(0, 10) || '' }
      : { status: 'ativo', perfil: 'membro', codigoSenioridade: senioridades[0]?.codigo, codigoArea: '', codigoCargo: '', dataEntrada: '' },
    v => {
      const { senha, status, dataEntrada, ...resto } = v
      const corpo = { ...resto, ...(dataEntrada ? { dataEntrada } : {}) }
      if (p) return executar(() => pessoas.editar(p.codigo, corpo), 'Pessoa atualizada')
      // Trainee não entra no sistema; a senha é sorteada e o gestor define outra ao torná-lo membro.
      const senhaInicial = status === 'ativo' ? senha : crypto.randomUUID()
      return executar(() => pessoas.criar({ ...corpo, status, senha: senhaInicial }), 'Pessoa cadastrada')
    },
  )

  const mudarStatus = p => form(
    `Status de ${p.nome}`,
    [
      { k: 'status', l: 'Status', o: STATUS_PESSOA },
      { k: 'dataSaida', l: 'Data de saída', t: 'date', opt: true, s: v => SAIDA.includes(v.status), h: 'Encerra as participações em projetos abertos. A pessoa e o histórico continuam registrados.' },
    ],
    { status: p.status, dataSaida: '' },
    async v => {
      if (v.status === p.status) return
      if (SAIDA.includes(v.status) && !await alerts.confirm({ title: `Marcar como ${rotuloStatus(v.status)}?`, text: `${p.nome} perde o acesso e sai dos projetos em andamento.`, confirmText: 'Confirmar', danger: true })) return false
      const r = await executar(() => pessoas.alterarStatus(p.codigo, v.status, v.dataSaida), 'Status atualizado')
      if (r !== false && p.status === 'trainee' && v.status === 'ativo') {
        await alerts.info('Defina uma senha', `${p.nome} agora é membro. Use "Redefinir senha" para liberar o acesso.`)
      }
      return r
    },
  )

  const redefinirSenha = p => form(
    `Nova senha de ${p.nome}`,
    [{ k: 'novaSenha', l: 'Nova senha', t: 'password', h: 'Mínimo de 8 caracteres. Passe para a pessoa por um canal seguro.' }],
    {},
    v => executar(() => pessoas.redefinirSenha(p.codigo, v.novaSenha), 'Senha redefinida'),
  )

  const linhas = lista.map(p => ({ ...p, id: p.codigo }))
  const colunas = [
    { k: 'nome', l: 'Nome', render: p => <a role="button" className="fw-semibold" onClick={() => go('perfil', p.codigo)}>{p.nome}</a> },
    { k: 'email', l: 'E-mail' },
    { k: 'ar', l: 'Área', filter: 1, get: p => p.area?.nome || '—' },
    { k: 'cg', l: 'Cargo', filter: 1, get: p => p.cargo?.nome || '—' },
    { k: 'sn', l: 'Senioridade', filter: 1, get: p => p.senioridade?.nome || '—' },
    { k: 'pf', l: 'Perfil', filter: 1, get: p => PERFIS.find(([k]) => k === p.perfil)?.[1] || p.perfil },
    { k: 'st', l: 'Status', filter: 1, get: p => rotuloStatus(p.status), render: p => <span className={chip(COR_STATUS[p.status])}>{rotuloStatus(p.status)}</span> },
    { k: 'en', l: 'Entrada', get: p => p.dataEntrada || '', render: p => fd(p.dataEntrada) },
    {
      l: 'Ações',
      render: p => (
        <ActionMenu items={[
          ['open', 'Ver perfil', () => go('perfil', p.codigo)],
          ...(podeMexer(p) ? [
            ['edit', 'Editar', () => editar(p)],
            ...(p.codigo !== me ? [['userok', 'Mudar status', () => mudarStatus(p)]] : []),
            ...(p.status === 'ativo' && p.codigo !== me ? [['key', 'Redefinir senha', () => redefinirSenha(p)]] : []),
          ] : []),
        ]} />
      ),
    },
  ]

  return (
    <>
      <PageBar title="Pessoas" sub="Quem está e quem já passou pela Konvex. Sair da EJ preserva o histórico.">
        <button className="btn btn-primary" onClick={() => editar()} disabled={!senioridades.length}><Ic k="plus" />Nova pessoa</button>
      </PageBar>
      {!senioridades.length && <p className="text-mu">Cadastre uma senioridade em Configurações antes de criar pessoas.</p>}
      <Table cols={colunas} rows={linhas} />
    </>
  )
}
