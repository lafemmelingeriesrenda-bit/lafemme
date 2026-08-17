import { describe, expect, it } from 'vitest'
import { mapearRespostaRpcProduto } from '../app/utils/mapearRpcProduto'

describe('mapearRespostaRpcProduto', () => {
  it('mapeia resposta ok de criação/atualização', () => {
    const r = mapearRespostaRpcProduto({
      ok: true,
      id: 7,
      variantes: [{ id: 1, fotos: [{ id: 10, url: 'https://x/1.jpg' }] }]
    })

    expect(r).toEqual({
      ok: true,
      tipo: 'criado_ou_atualizado',
      id: 7,
      variantes: [{ id: 1, fotos: [{ id: 10, url: 'https://x/1.jpg' }] }]
    })
  })

  it('mapeia resposta ok de exclusão', () => {
    expect(mapearRespostaRpcProduto({ ok: true, fotos: ['a', 'b'] })).toEqual({
      ok: true,
      tipo: 'excluido',
      fotos: ['a', 'b']
    })
  })

  it('filtra itens não-string na lista de fotos', () => {
    expect(mapearRespostaRpcProduto({ ok: true, fotos: ['a', 3, null] })).toEqual({
      ok: true,
      tipo: 'excluido',
      fotos: ['a']
    })
  })

  it('mapeia erro PAYLOAD_INVALIDO', () => {
    expect(mapearRespostaRpcProduto({ ok: false, codigo: 'PAYLOAD_INVALIDO', erro: 'Tamanho inválido.' })).toEqual({
      ok: false,
      codigo: 'PAYLOAD_INVALIDO',
      erro: 'Tamanho inválido.'
    })
  })

  it('mapeia erro NAO_ENCONTRADO', () => {
    expect(mapearRespostaRpcProduto({ ok: false, codigo: 'NAO_ENCONTRADO', erro: 'Produto não encontrado.' })).toEqual({
      ok: false,
      codigo: 'NAO_ENCONTRADO',
      erro: 'Produto não encontrado.'
    })
  })

  it('usa mensagem padrão quando erro ausente', () => {
    expect(mapearRespostaRpcProduto({ ok: false, codigo: 'PAYLOAD_INVALIDO' })).toEqual({
      ok: false,
      codigo: 'PAYLOAD_INVALIDO',
      erro: 'Erro interno do servidor.'
    })
  })

  it('rejeita respostas que não são objeto', () => {
    expect(mapearRespostaRpcProduto(null)).toBeNull()
    expect(mapearRespostaRpcProduto('texto')).toBeNull()
    expect(mapearRespostaRpcProduto([1])).toBeNull()
    expect(mapearRespostaRpcProduto(42)).toBeNull()
  })

  it('rejeita resposta sem ok ou com ok não-booleano', () => {
    expect(mapearRespostaRpcProduto({ id: 1 })).toBeNull()
    expect(mapearRespostaRpcProduto({ ok: 'sim' })).toBeNull()
  })

  it('rejeita codigo de erro desconhecido', () => {
    expect(mapearRespostaRpcProduto({ ok: false, codigo: 'OUTRO', erro: 'x' })).toBeNull()
  })

  it('rejeita ok true sem id/variantes nem fotos', () => {
    expect(mapearRespostaRpcProduto({ ok: true })).toBeNull()
    expect(mapearRespostaRpcProduto({ ok: true, id: 1 })).toBeNull()
  })
})