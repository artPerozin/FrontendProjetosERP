const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Sessão guardada no sessionStorage: token de acesso (15 min) e refresh token (7 dias).
 * Quando a API responde 401, o cliente renova o token uma vez e repete a chamada.
 * Se a renovação falhar, a sessão é limpa e onExpirada é chamado.
 */
const ACCESS_KEY = 'konvex_access_token'
const REFRESH_KEY = 'konvex_refresh_token'
const storage = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage)
const ler = key => { try { return storage()?.getItem(key) || '' } catch { return '' } }
const gravar = (key, value) => { try { value ? storage()?.setItem(key, value) : storage()?.removeItem(key) } catch { /* sem storage */ } }

let memoria = { token: ler(ACCESS_KEY), refreshToken: ler(REFRESH_KEY) }
let renovando = null

export const sessao = {
  get token() { return memoria.token },
  get refreshToken() { return memoria.refreshToken },
  get ativa() { return Boolean(memoria.token || memoria.refreshToken) },
  salvar({ token, refreshToken }) {
    memoria = { token: token || '', refreshToken: refreshToken || memoria.refreshToken }
    gravar(ACCESS_KEY, memoria.token)
    gravar(REFRESH_KEY, memoria.refreshToken)
  },
  limpar() {
    memoria = { token: '', refreshToken: '' }
    gravar(ACCESS_KEY, '')
    gravar(REFRESH_KEY, '')
  },
  /** Definido pelo app: o que fazer quando a sessão não pode mais ser renovada. */
  onExpirada: null,
}

async function chamar(path, init) {
  try {
    return await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError(`Não foi possível conectar à API em ${API_URL}. Verifique se o backend está em execução e se VITE_API_URL está correto.`)
  }
}

async function lerCorpo(response) {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return { message: text } }
}

/** Renova o token de acesso. Chamadas simultâneas compartilham a mesma renovação. */
export function renovarSessao() {
  if (!sessao.refreshToken) return Promise.resolve(false)
  if (!renovando) {
    renovando = (async () => {
      try {
        const response = await chamar('/auth/refresh', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: sessao.refreshToken }),
        })
        const data = await lerCorpo(response)
        if (!response.ok || !data?.token) return false
        sessao.salvar({ token: data.token, refreshToken: data.refreshToken })
        return true
      } catch {
        return false
      }
    })().finally(() => { renovando = null })
  }
  return renovando
}

function expirar() {
  sessao.limpar()
  if (typeof sessao.onExpirada === 'function') sessao.onExpirada()
}

/**
 * fetch autenticado: envia o token da sessão e, se a API responder 401,
 * renova uma vez e repete. Devolve o Response (útil para downloads).
 */
export async function fetchAutenticado(path, { headers = {}, ...init } = {}) {
  const enviar = () => chamar(path, { ...init, headers: { ...headers, ...(sessao.token ? { 'access-token': sessao.token } : {}) } })
  let response = await enviar()
  if (response.status === 401 && sessao.refreshToken) {
    if (await renovarSessao()) response = await enviar()
    else expirar()
  } else if (response.status === 401) {
    expirar()
  }
  return response
}

/**
 * Chamada JSON à API. Com `auth: true` usa a sessão (e renova o token sozinho).
 * `token` explícito continua aceito para chamadas avulsas, sem renovação.
 */
export async function request(path, { method = 'GET', body, token, auth = false, headers = {} } = {}) {
  const init = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !(body instanceof FormData) && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}),
      ...(body instanceof Blob && body.type ? { 'Content-Type': body.type } : {}),
      ...(token ? { 'access-token': token } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: body instanceof FormData || body instanceof Blob ? body : JSON.stringify(body) } : {}),
  }

  const response = auth && !token ? await fetchAutenticado(path, init) : await chamar(path, init)
  const data = await lerCorpo(response)

  if (!response.ok) {
    throw new ApiError(data?.message || `A API retornou HTTP ${response.status}.`, response.status)
  }

  return data
}

export const apiUrl = API_URL
