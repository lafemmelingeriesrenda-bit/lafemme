export const BUCKET_LA_FEMME = 'La Femme'
export const BUCKET_LA_FEMME_ENCODED = 'La%20Femme'
export const TAMANHO_MAXIMO_UPLOAD = 2 * 1024 * 1024
export const TAMANHOS_PRODUTO = ['P', 'M', 'G', 'GG', 'Tamanho Único'] as const
export type TamanhoProduto = (typeof TAMANHOS_PRODUTO)[number]

export const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
}

export function extensaoPorMime(mime: string): string | null {
  return EXTENSAO_POR_MIME[mime] ?? null
}

export function mimePermitido(mime: string): boolean {
  return extensaoPorMime(mime) !== null
}

export function normalizarTextoObrigatorio(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') {
    return null
  }

  const texto = valor.replace(/\s+/g, ' ').trim()

  if (texto.length === 0 || texto.length > max) {
    return null
  }

  return texto
}

export const PREFIXO_STORAGE_PRODUTOS = 'produtos/'
export const PREFIXO_ENDPOINT_STORAGE_PUBLICO = '/storage/v1/object/public/'

const SEGMENTOS_ENDPOINT_STORAGE_PUBLICO = ['storage', 'v1', 'object', 'public']
const REGEX_NOME_ARQUIVO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

function decodificarSegmento(segmento: string | undefined): string | null {
  if (segmento === undefined) {
    return null
  }

  try {
    return decodeURIComponent(segmento)
  } catch {
    return null
  }
}

function nomeArquivoValido(nome: string): boolean {
  if (nome.length === 0 || nome === '.' || nome === '..') {
    return false
  }

  if (nome.includes('..') || nome.includes('/') || nome.includes('\\') || nome.includes('\0')) {
    return false
  }

  return REGEX_NOME_ARQUIVO.test(nome)
}

/**
 * Rejeita, no nível bruto (antes do parse), qualquer indicador de path
 * traversal ou encoding hostil no caminho da URL.
 *
 * O construtor URL normaliza segmentos "."/".." durante o parse: uma URL
 * como ".../produtos/../x.jpg" chegaria ao parser já reduzida a
 * ".../x.jpg". Por isso o caminho bruto precisa ser inspecionado antes,
 * independentemente da validação do segmento final.
 */
function urlSemTraversalBruta(url: string): boolean {
  const idxProtocolo = url.indexOf('://')
  if (idxProtocolo === -1) {
    return false
  }

  const inicioCaminho = url.indexOf('/', idxProtocolo + 3)
  const caminho = inicioCaminho === -1 ? '' : url.slice(inicioCaminho)
  const caminhoMinusculo = caminho.toLowerCase()

  if (caminho.includes('..')) {
    return false
  }

  if (caminho.includes('\\') || caminho.includes('\0')) {
    return false
  }

  if (caminhoMinusculo.includes('%2e')) {
    return false
  }

  if (caminhoMinusculo.includes('%2f')) {
    return false
  }

  if (caminhoMinusculo.includes('%5c')) {
    return false
  }

  if (caminhoMinusculo.includes('%00')) {
    return false
  }

  return true
}

/**
 * COMPATIBILIDADE LEGADA (Fase 5D-4) — imagens na raiz do bucket.
 *
 * Os produtos 1 e 2, criados antes da padronização em `produtos/`,
 * possuem capa/imagens armazenadas diretamente na raiz do bucket
 * "La Femme" (ex.: .../storage/v1/object/public/La%20Femme/IMG_xxx.JPG).
 *
 * Para não quebrar PATCH/DELETE desses produtos, aceitamos aqui SOMENTE
 * um único segmento no nível raiz, validado pelas MESMAS regras de nome
 * seguro das URLs novas (sem traversal, sem "/", "\", NUL, "..", etc.).
 *
 * Isto NÃO é uma flexibilização geral do parser: a raiz continua restrita
 * a exatamente um segmento, e qualquer encoding hostil, outro
 * host/bucket/endpoint, query, fragment ou credencial é rejeitado nas
 * demais etapas. Novas URLs (uploads) sempre usam a pasta `produtos/`.
 */
function caminhoRaizLegado(segmento: string | undefined): string | null {
  const arquivo = decodificarSegmento(segmento)

  if (arquivo === null || !nomeArquivoValido(arquivo)) {
    return null
  }

  return arquivo
}

export function parsearUrlStorage(url: unknown, supabaseUrl: string): string | null {
  if (typeof url !== 'string' || url.length === 0) {
    return null
  }

  if (!urlSemTraversalBruta(url)) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') {
    return null
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return null
  }

  if (parsed.search !== '' || parsed.hash !== '') {
    return null
  }

  let base: URL
  try {
    base = new URL(supabaseUrl)
  } catch {
    return null
  }

  if (parsed.host !== base.host) {
    return null
  }

  const segmentos = parsed.pathname.split('/')
  const prefixo = SEGMENTOS_ENDPOINT_STORAGE_PUBLICO

  if (segmentos.length < prefixo.length + 3) {
    return null
  }

  for (let i = 0; i < prefixo.length; i++) {
    if (segmentos[i + 1] !== prefixo[i]) {
      return null
    }
  }

  const bucket = decodificarSegmento(segmentos[prefixo.length + 1])
  if (bucket !== BUCKET_LA_FEMME) {
    return null
  }

  const segmentosCaminho = segmentos.slice(prefixo.length + 2)

  if (segmentosCaminho.length === 1) {
    return caminhoRaizLegado(segmentosCaminho[0])
  }

  if (segmentosCaminho.length !== 2) {
    return null
  }

  const pasta = decodificarSegmento(segmentosCaminho[0])
  const arquivo = decodificarSegmento(segmentosCaminho[1])

  if (pasta === null || arquivo === null) {
    return null
  }

  if (pasta !== 'produtos') {
    return null
  }

  if (!nomeArquivoValido(arquivo)) {
    return null
  }

  return `${pasta}/${arquivo}`
}

export function urlPertenceAoBucket(url: unknown, supabaseUrl: string): boolean {
  return parsearUrlStorage(url, supabaseUrl) !== null
}

export function storagePathDaUrl(url: string, supabaseUrl: string): string | null {
  return parsearUrlStorage(url, supabaseUrl)
}

/**
 * Calcula quais fotos antigas podem ser removidas do Storage após um
 * PATCH: fotos antigas cujo caminho NÃO esteja presente nas fotos
 * novas (payload validado). Devolve as URLs antigas correspondentes,
 * deduplicadas por caminho.
 *
 * Regras garantidas:
 *   - foto antiga ainda presente no payload -> NÃO entra no retorno;
 *   - foto nova (não existia antes) -> nunca é considerada;
 *   - URLs fora do bucket -> ignoradas;
 *   - o cálculo é por caminho de Storage, não pela string bruta da URL.
 */
export function calcularFotosRemover(
  fotosAntigas: Array<string | null | undefined>,
  fotosNovas: Array<string | null | undefined>,
  supabaseUrl: string
): string[] {
  const caminhosNovos = new Set<string>()

  for (const url of fotosNovas) {
    const caminho = storagePathDaUrl(url ?? '', supabaseUrl)
    if (caminho !== null) {
      caminhosNovos.add(caminho)
    }
  }

  const aRemover: string[] = []
  const caminhosVistos = new Set<string>()

  for (const url of fotosAntigas) {
    if (typeof url !== 'string' || url.length === 0) {
      continue
    }

    const caminho = storagePathDaUrl(url, supabaseUrl)
    if (caminho === null || caminhosNovos.has(caminho) || caminhosVistos.has(caminho)) {
      continue
    }

    caminhosVistos.add(caminho)
    aRemover.push(url)
  }

  return aRemover
}

export function urlPublicaBucket(supabaseUrl: string, caminho: string): string {
  const base = supabaseUrl.replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${BUCKET_LA_FEMME_ENCODED}/${caminho}`
}

export interface VariantePayloadValidada {
  id: number | null
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku: string | null
  ativo: boolean
  imagens: string[]
}

export interface ProdutoPayloadValidado {
  nome: string
  descricao: string | null
  categoria: string | null
  capa: string | null
  variantes: VariantePayloadValidada[]
}

export interface VarianteParaCombinacao {
  cor: string | null
  tamanho: string
}

function chaveCor(cor: string | null): string {
  return (cor ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

export function validarCombinacoesVariantes(variantes: VarianteParaCombinacao[]): string | null {
  const porCor = new Map<string, Set<string>>()
  const tamanhoUnico = 'Tamanho Único'

  for (const variante of variantes) {
    const cor = chaveCor(variante.cor)
    const tamanhos = porCor.get(cor) ?? new Set<string>()

    if (tamanhos.has(variante.tamanho)) {
      return `Tamanho "${variante.tamanho}" repetido na mesma cor.`
    }

    if (variante.tamanho === tamanhoUnico && tamanhos.size > 0) {
      return `A cor "${variante.cor ?? 'sem cor'}" não pode combinar Tamanho Único com tamanhos regulares.`
    }

    if (variante.tamanho !== tamanhoUnico && tamanhos.has(tamanhoUnico)) {
      return `A cor "${variante.cor ?? 'sem cor'}" não pode combinar Tamanho Único com tamanhos regulares.`
    }

    tamanhos.add(variante.tamanho)
    porCor.set(cor, tamanhos)
  }

  return null
}

export type ResultadoValidacaoProduto =
  | { ok: true; payload: ProdutoPayloadValidado }
  | { ok: false; erro: string }

function valorNumerico(valor: unknown): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return null
  }
  return valor
}

interface OpcionalNormalizado {
  ok: boolean
  valor: string | null
}

function opcional(
  valor: unknown,
  max: number,
  colapsarEspacos: boolean
): OpcionalNormalizado {
  if (valor === null || valor === undefined) {
    return { ok: true, valor: null }
  }

  if (typeof valor !== 'string') {
    return { ok: false, valor: null }
  }

  const texto = colapsarEspacos ? valor.replace(/\s+/g, ' ').trim() : valor.trim()

  if (texto.length > max) {
    return { ok: false, valor: null }
  }

  return { ok: true, valor: texto.length === 0 ? null : texto }
}

export function validarProdutoPayload(bruto: unknown, supabaseUrl: string): ResultadoValidacaoProduto {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return { ok: false, erro: 'Payload inválido.' }
  }

  const registro = bruto as Record<string, unknown>

  const nome = normalizarTextoObrigatorio(registro.nome, 120)
  if (!nome) {
    return { ok: false, erro: 'Nome do produto é obrigatório (1 a 120 caracteres).' }
  }

  const descricao = opcional(registro.descricao, 2000, false)
  if (!descricao.ok) {
    return { ok: false, erro: 'Descrição deve ter no máximo 2000 caracteres.' }
  }

  const categoria = opcional(registro.categoria, 100, true)
  if (!categoria.ok) {
    return { ok: false, erro: 'Categoria deve ter no máximo 100 caracteres.' }
  }

  const capa = normalizarCapa(registro.capa, supabaseUrl)
  if (capa === undefined) {
    return { ok: false, erro: 'Imagem de capa inválida.' }
  }

  if (!Array.isArray(registro.variantes)) {
    return { ok: false, erro: 'Variantes deve ser uma lista.' }
  }

  const variantes: VariantePayloadValidada[] = []
  const idsVistos = new Set<number>()
  for (const item of registro.variantes) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { ok: false, erro: 'Cada variante deve ser um objeto.' }
    }

    const variante = item as Record<string, unknown>

    if (!Object.prototype.hasOwnProperty.call(variante, 'id')) {
      return { ok: false, erro: 'ID da variante é obrigatório.' }
    }

    const idBruto = variante.id
    let id: number | null = null
    if (idBruto !== undefined && idBruto !== null) {
      if (typeof idBruto !== 'number' || !Number.isInteger(idBruto) || idBruto <= 0) {
        return { ok: false, erro: 'ID da variante inválido.' }
      }
      if (idsVistos.has(idBruto)) {
        return { ok: false, erro: 'O mesmo ID de variante foi enviado mais de uma vez.' }
      }
      idsVistos.add(idBruto)
      id = idBruto
    }

    const tamanho = normalizarTextoObrigatorio(variante.tamanho, 20)
    if (!tamanho) {
      return { ok: false, erro: 'Tamanho é obrigatório em cada variante.' }
    }

    const cor = opcional(variante.cor, 60, true)
    if (!cor.ok) {
      return { ok: false, erro: 'Cor deve ter no máximo 60 caracteres.' }
    }

    const valor = valorNumerico(variante.valor)
    if (valor === null || valor < 0) {
      return { ok: false, erro: 'Valor deve ser um número maior ou igual a zero.' }
    }

    const quantidade = valorNumerico(variante.quantidade)
    if (quantidade === null || !Number.isInteger(quantidade) || quantidade < 0) {
      return { ok: false, erro: 'Quantidade deve ser um inteiro maior ou igual a zero.' }
    }

    const sku = opcional(variante.sku, 40, true)
    if (!sku.ok) {
      return { ok: false, erro: 'SKU deve ter no máximo 40 caracteres.' }
    }

    if (!Object.prototype.hasOwnProperty.call(variante, 'ativo')) {
      return { ok: false, erro: 'Ativo da variante é obrigatório.' }
    }
    if (typeof variante.ativo !== 'boolean') {
      return { ok: false, erro: 'Ativo deve ser um booleano.' }
    }
    const ativo = variante.ativo

    if (!Array.isArray(variante.imagens)) {
      return { ok: false, erro: 'Imagens da variante deve ser uma lista de URLs.' }
    }

    const imagens: string[] = []
    for (const url of variante.imagens) {
      const caminho = parsearUrlStorage(url, supabaseUrl)
      if (caminho === null) {
        return { ok: false, erro: 'URL de imagem fora do bucket permitido.' }
      }
      imagens.push(urlPublicaBucket(supabaseUrl, caminho))
    }

    variantes.push({ id, cor: cor.valor, tamanho, valor, quantidade, sku: sku.valor, ativo, imagens })
  }

  const erroCombinacoes = validarCombinacoesVariantes(variantes)
  if (erroCombinacoes) {
    return { ok: false, erro: erroCombinacoes }
  }

  return {
    ok: true,
    payload: { nome, descricao: descricao.valor, categoria: categoria.valor, capa, variantes }
  }
}

function normalizarCapa(valor: unknown, supabaseUrl: string): string | null | undefined {
  if (valor === null || valor === undefined) {
    return null
  }

  if (typeof valor !== 'string') {
    return undefined
  }

  const caminho = parsearUrlStorage(valor, supabaseUrl)
  if (caminho === null) {
    return undefined
  }

  return urlPublicaBucket(supabaseUrl, caminho)
}

export type ResultadoValidacaoUpload =
  | { ok: true; extensao: string }
  | { ok: false; status: 400 | 413 | 415; erro: string }

/**
 * Detecta o tipo de imagem real a partir do conteúdo (magic bytes),
 * sem confiar no Content-Type declarado pelo cliente.
 *
 * Formatos reconhecidos (mesmos aceitos pelo endpoint):
 *   - JPEG : FF D8 FF
 *   - PNG  : 89 50 4E 47 0D 0A 1A 0A
 *   - GIF  : "GIF8" + ("7" | "9") + "a"
 *   - WebP : "RIFF" (0-3) + "WEBP" (8-11)
 *   - AVIF : ISO-BMFF "ftyp" (4-7) + brand "avif"/"avis" (8-11)
 */
export function detectarTipoImagem(conteudo: Uint8Array): { mime: string; extensao: string } | null {
  const b = conteudo

  if (b.length < 12) {
    return null
  }

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: 'image/jpeg', extensao: 'jpg' }
  }

  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return { mime: 'image/png', extensao: 'png' }
  }

  if (
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) &&
    b[5] === 0x61
  ) {
    return { mime: 'image/gif', extensao: 'gif' }
  }

  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return { mime: 'image/webp', extensao: 'webp' }
  }

  const ftyp = b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70
  const brandAvif =
    (b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) ||
    (b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x73)

  if (ftyp && brandAvif) {
    return { mime: 'image/avif', extensao: 'avif' }
  }

  return null
}

/**
 * Valida MIME declarado + tamanho e, quando o conteúdo é informado,
 * também o tipo real do arquivo (magic bytes). A extensão final é
 * sempre derivada do tipo validado pelo servidor.
 */
export function validarArquivoUpload(
  tipo: string | null,
  tamanho: number,
  conteudo?: Uint8Array
): ResultadoValidacaoUpload {
  if (!tipo) {
    return { ok: false, status: 400, erro: 'Tipo de arquivo ausente.' }
  }

  const extensaoDeclarada = extensaoPorMime(tipo)

  if (!extensaoDeclarada) {
    return { ok: false, status: 415, erro: 'Tipo de imagem não permitido.' }
  }

  if (tamanho > TAMANHO_MAXIMO_UPLOAD) {
    return { ok: false, status: 413, erro: 'Imagem muito grande (máximo de 2 MB).' }
  }

  if (conteudo !== undefined) {
    const detectado = detectarTipoImagem(conteudo)

    if (!detectado) {
      return { ok: false, status: 415, erro: 'O conteúdo do arquivo não é uma imagem válida.' }
    }

    if (detectado.mime !== tipo) {
      return { ok: false, status: 415, erro: 'O tipo declarado não corresponde ao conteúdo do arquivo.' }
    }

    return { ok: true, extensao: detectado.extensao }
  }

  return { ok: true, extensao: extensaoDeclarada }
}
