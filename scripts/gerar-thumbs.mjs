// ============================================================
// La Femme — Script one-time: gera thumbnails WebP derivados
// para as imagens já existentes no bucket, sem alterar os originais.
//
// Uso: node scripts/gerar-thumbs.mjs
// Credenciais vêm do .env (nunca hardcoded):
//   NUXT_PUBLIC_SUPABASE_URL, NUXT_SUPABASE_SECRET_KEY
// ============================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET = 'La Femme'
const PASTA_THUMBS = 'thumbs'
const LARGURA = 600
const ALTURA = 800
const QUALIDADE = 78

function carregarEnv() {
  const caminho = resolve(process.cwd(), '.env')
  const env = {}
  let conteudo = ''
  try {
    conteudo = readFileSync(caminho, 'utf8')
  } catch {
    console.error('Arquivo .env não encontrado.')
    process.exit(1)
  }
  for (const linha of conteudo.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m) {
      env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
    }
  }
  return env
}

function ehCaminhoThumb(caminho) {
  return caminho.split('/').includes(PASTA_THUMBS)
}

function caminhoThumbStorage(caminho) {
  if (ehCaminhoThumb(caminho)) {
    return caminho
  }
  const barra = caminho.lastIndexOf('/')
  const dir = barra === -1 ? '' : caminho.slice(0, barra)
  const arquivo = barra === -1 ? caminho : caminho.slice(barra + 1)
  const base = arquivo.replace(/\.[^./]+$/, '')
  const thumb = `${base}.webp`
  return dir === '' ? `${PASTA_THUMBS}/${thumb}` : `${dir}/${PASTA_THUMBS}/${thumb}`
}

async function listarArquivos(supabase, prefixo) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefixo, { limit: 1000 })
  if (error) {
    throw new Error(`Falha ao listar "${prefixo}": ${error.message}`)
  }
  return (data ?? [])
    .filter((item) => item.id !== null && item.name !== '.emptyFolderPlaceholder')
    .map((item) => (prefixo ? `${prefixo}/${item.name}` : item.name))
}

const env = carregarEnv()
const url = env.NUXT_PUBLIC_SUPABASE_URL
const chave = env.NUXT_SUPABASE_SECRET_KEY

if (!url || !chave) {
  console.error('NUXT_PUBLIC_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY ausente no .env.')
  process.exit(1)
}

const supabase = createClient(url, chave, { auth: { persistSession: false } })

const raiz = await listarArquivos(supabase, '')
const produtos = await listarArquivos(supabase, 'produtos')
const thumbsRaiz = await listarArquivos(supabase, PASTA_THUMBS)
const thumbsProdutos = await listarArquivos(supabase, `produtos/${PASTA_THUMBS}`)

const existentesThumb = new Set([...thumbsRaiz, ...thumbsProdutos])
const originais = [...raiz, ...produtos].filter((caminho) => !ehCaminhoThumb(caminho))

console.log(`Originais encontrados: ${originais.length}`)
console.log(`Thumbnails já existentes: ${existentesThumb.size}`)

let gerados = 0
let ignorados = 0
let erros = 0

for (const original of originais) {
  const thumb = caminhoThumbStorage(original)

  if (existentesThumb.has(thumb)) {
    ignorados++
    console.log(`- ignore  ${original} (thumb já existe)`)
    continue
  }

  try {
    const { data: blob, error: erroDownload } = await supabase.storage.from(BUCKET).download(original)
    if (erroDownload || !blob) {
      throw new Error(erroDownload?.message ?? 'download vazio')
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: LARGURA, height: ALTURA, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALIDADE })
      .toBuffer()

    const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(thumb, thumbBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false
    })

    if (erroUpload) {
      throw new Error(erroUpload.message)
    }

    gerados++
    console.log(`- ok      ${original} -> ${thumb} (${(thumbBuffer.length / 1024).toFixed(1)} KB)`)
  } catch (erro) {
    erros++
    console.error(`- ERRO    ${original}: ${erro instanceof Error ? erro.message : String(erro)}`)
  }
}

console.log('---------------------------------------------')
console.log(`Gerados: ${gerados} | Ignorados: ${ignorados} | Erros: ${erros}`)
