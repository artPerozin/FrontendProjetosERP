import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { chip } from '../lib/utils'
import Ic from '../components/Icon'
import Table from '../components/Table'
import { PageBar, Seg } from '../components/Ui'
import alerts from '../lib/alerts'
import useCarregar from '../lib/useCarregar'
import { configuracoes } from '../services/pessoas'

const ABAS = [['areas', 'Áreas'], ['cargos', 'Cargos'], ['senioridades', 'Senioridades']]
const SIM_NAO = [['true', 'Ativo'], ['false', 'Inativo']]

/** ADR-007: listas configuráveis (áreas, cargos, senioridades). Só diretores editam. */
export default function Configuracoes() {
  const { form, refresh } = useApp()
  const [aba, setAba] = useState('areas')
  const { dados, carregando, recarregar } = useCarregar(async () => {
    const [areas, cargos, senioridades] = await Promise.all([configuracoes.areas(), configuracoes.cargos(), configuracoes.senioridades()])
    return { areas, cargos, senioridades }
  })

  if (!dados) return <PageBar title="Configurações" sub={carregando ? 'Carregando…' : 'Não foi possível carregar.'} />

  const { areas, cargos, senioridades } = dados
  const nomeArea = codigo => areas.find(a => a.codigo === codigo)?.nome || '—'

  const salvar = async (acao, sucesso) => {
    try {
      await acao()
      alerts.toastSuccess(sucesso)
      await recarregar()
      if (aba === 'senioridades') refresh().catch(() => {})
    } catch (error) {
      alerts.error('Não foi possível salvar', error.message)
      return false
    }
  }

  const editarArea = a => form(
    a ? 'Editar área' : 'Nova área',
    [
      { k: 'nome', l: 'Nome' },
      { k: 'codigoAreaPai', l: 'Área superior', o: [['', 'Nenhuma'], ...areas.filter(x => x.codigo !== a?.codigo).map(x => [x.codigo, x.nome])], opt: true },
      { k: 'ativa', l: 'Situação', o: SIM_NAO, h: 'Áreas inativas somem das opções, mas o histórico das pessoas continua.' },
    ],
    { nome: a?.nome || '', codigoAreaPai: a?.codigoAreaPai || '', ativa: String(a?.ativa ?? true) },
    v => salvar(() => configuracoes.salvarArea(a?.codigo, { nome: v.nome, codigoAreaPai: v.codigoAreaPai || null, ativa: v.ativa === 'true' }), 'Área salva'),
  )

  const editarCargo = c => form(
    c ? 'Editar cargo' : 'Novo cargo',
    [
      { k: 'nome', l: 'Nome' },
      { k: 'ativo', l: 'Situação', o: SIM_NAO },
    ],
    { nome: c?.nome || '', ativo: String(c?.ativo ?? true) },
    v => salvar(() => configuracoes.salvarCargo(c?.codigo, { nome: v.nome, ativo: v.ativo === 'true' }), 'Cargo salvo'),
  )

  const editarSenioridade = s => form(
    s ? 'Editar senioridade' : 'Nova senioridade',
    [
      { k: 'nome', l: 'Nome' },
      { k: 'ordem', l: 'Ordem na escada', t: 'number', h: '1 para o nível inicial; números maiores para níveis acima.' },
    ],
    { nome: s?.nome || '', ordem: s?.ordem ?? senioridades.length + 1 },
    v => salvar(() => configuracoes.salvarSenioridade(s?.codigo, { nome: v.nome, ordem: Number(v.ordem) }), 'Senioridade salva'),
  )

  const situacao = ativo => <span className={chip(ativo ? 'ok' : 'er')}>{ativo ? 'Ativo' : 'Inativo'}</span>
  const editarBotao = fn => <button className="btn btn-g btn-sm" onClick={fn}><Ic k="edit" />Editar</button>

  const telas = {
    areas: {
      novo: () => editarArea(),
      linhas: areas,
      colunas: [
        { k: 'nome', l: 'Nome' },
        { k: 'sup', l: 'Área superior', get: a => (a.codigoAreaPai ? nomeArea(a.codigoAreaPai) : '—') },
        { k: 'st', l: 'Situação', filter: 1, get: a => (a.ativa ? 'Ativo' : 'Inativo'), render: a => situacao(a.ativa) },
        { l: 'Ações', render: a => editarBotao(() => editarArea(a)) },
      ],
    },
    cargos: {
      novo: () => editarCargo(),
      linhas: cargos,
      colunas: [
        { k: 'nome', l: 'Nome' },
        { k: 'st', l: 'Situação', filter: 1, get: c => (c.ativo ? 'Ativo' : 'Inativo'), render: c => situacao(c.ativo) },
        { l: 'Ações', render: c => editarBotao(() => editarCargo(c)) },
      ],
    },
    senioridades: {
      novo: () => editarSenioridade(),
      linhas: [...senioridades].sort((a, b) => a.ordem - b.ordem),
      colunas: [
        { k: 'ordem', l: 'Ordem' },
        { k: 'nome', l: 'Nome' },
        { l: 'Ações', render: s => editarBotao(() => editarSenioridade(s)) },
      ],
    },
  }
  const atual = telas[aba]

  return (
    <>
      <PageBar title="Configurações" sub="Listas usadas no cadastro de pessoas. Valor-hora das senioridades fica para quando as taxas forem definidas.">
        <button className="btn btn-primary" onClick={atual.novo}><Ic k="plus" />Novo item</button>
      </PageBar>
      <div className="mb-3"><Seg items={ABAS} value={aba} onChange={setAba} /></div>
      <Table key={aba} cols={atual.colunas} rows={atual.linhas.map(x => ({ ...x, id: x.codigo }))} />
    </>
  )
}
