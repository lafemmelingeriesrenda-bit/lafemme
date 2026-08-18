export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          id: number
          created_at: string | null
          nome: string
          sobrenome: string | null
          telefone: string | null
          telefone_normalizado: string | null
          data_nascimento: string | null
          email: string | null
        }
        Insert: {
          id?: number
          created_at?: string | null
          nome: string
          sobrenome?: string | null
          telefone?: string | null
          telefone_normalizado?: string | null
          data_nascimento?: string | null
          email?: string | null
        }
        Update: {
          id?: number
          created_at?: string | null
          nome?: string
          sobrenome?: string | null
          telefone?: string | null
          telefone_normalizado?: string | null
          data_nascimento?: string | null
          email?: string | null
        }
        Relationships: []
      }
      foto_variante: {
        Row: {
          id: number
          created_at: string | null
          url: string
          id_variante: number
        }
        Insert: {
          id?: number
          created_at?: string | null
          url: string
          id_variante: number
        }
        Update: {
          id?: number
          created_at?: string | null
          url?: string
          id_variante?: number
        }
        Relationships: [
          {
            foreignKeyName: 'foto_variante_id_variante_fkey'
            columns: ['id_variante']
            referencedRelation: 'produto_variante'
            referencedColumns: ['id']
          }
        ]
      }
      itens_pedido: {
        Row: {
          id: number
          pedido_id: number
          produto_variante_id: number
          nome_produto: string
          cor: string | null
          tamanho: string
          sku: string | null
          foto: string | null
          quantidade: number
          valor_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: number
          pedido_id: number
          produto_variante_id: number
          nome_produto: string
          cor?: string | null
          tamanho: string
          sku?: string | null
          foto?: string | null
          quantidade: number
          valor_unitario: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: number
          pedido_id?: number
          produto_variante_id?: number
          nome_produto?: string
          cor?: string | null
          tamanho?: string
          sku?: string | null
          foto?: string | null
          quantidade?: number
          valor_unitario?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'itens_pedido_pedido_id_fkey'
            columns: ['pedido_id']
            referencedRelation: 'pedidos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itens_pedido_produto_variante_id_fkey'
            columns: ['produto_variante_id']
            referencedRelation: 'produto_variante'
            referencedColumns: ['id']
          }
        ]
      }
      pedidos: {
        Row: {
          id: number
          cliente_id: number | null
          status: string
          subtotal: number
          frete: number
          total: number
          nome_cliente: string
          telefone_cliente: string
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          cliente_id?: number | null
          status?: string
          subtotal?: number
          frete?: number
          total?: number
          nome_cliente: string
          telefone_cliente: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          cliente_id?: number | null
          status?: string
          subtotal?: number
          frete?: number
          total?: number
          nome_cliente?: string
          telefone_cliente?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pedidos_cliente_id_fkey'
            columns: ['cliente_id']
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          }
        ]
      }
      produto_variante: {
        Row: {
          id: number
          produto_id: number
          cor: string | null
          tamanho: string
          valor: number
          quantidade: number
          sku: string | null
          foto: string | null
          ativo: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          produto_id: number
          cor?: string | null
          tamanho: string
          valor: number
          quantidade: number
          sku?: string | null
          foto?: string | null
          ativo?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          produto_id?: number
          cor?: string | null
          tamanho?: string
          valor?: number
          quantidade?: number
          sku?: string | null
          foto?: string | null
          ativo?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'produto_variante_produto_id_fkey'
            columns: ['produto_id']
            referencedRelation: 'produtos'
            referencedColumns: ['id']
          }
        ]
      }
      produtos: {
        Row: {
          id: number
          nome: string
          slug: string | null
          descricao: string | null
          categoria: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          nome: string
          slug?: string | null
          descricao?: string | null
          categoria?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          nome?: string
          slug?: string | null
          descricao?: string | null
          categoria?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usuario: {
        Row: {
          id: number
          uid: string
          nome: string
          sobrenome: string | null
          telefone: number | null
          email: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          uid: string
          nome: string
          sobrenome?: string | null
          telefone?: number | null
          email: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          uid?: string
          nome?: string
          sobrenome?: string | null
          telefone?: number | null
          email?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      catalogo_produtos: {
        Row: {
          produto_id: number
          nome: string
          slug: string | null
          descricao: string | null
          categoria: string | null
          variante_id: number
          cor: string | null
          tamanho: string
          valor: number
          foto: string | null
          sku: string | null
          quantidade: number
          disponivel: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      admin_atualizar_produto: {
        Args: {
          p_id: number
          p_dados: Json
        }
        Returns: Json
      }
      admin_atualizar_status_pedido: {
        Args: {
          p_id: number
          p_status: string
        }
        Returns: Json
      }
      admin_criar_produto: {
        Args: {
          p_dados: Json
        }
        Returns: Json
      }
      admin_excluir_produto: {
        Args: {
          p_id: number
        }
        Returns: Json
      }
      admin_finalizar_pedido: {
        Args: {
          p_id: number
        }
        Returns: Json
      }
      admin_listar_pedidos: {
        Args: {
          p_filtros?: Json | null
        }
        Returns: Json
      }
      admin_obter_pedido: {
        Args: {
          p_id: number
        }
        Returns: Json
      }
      criar_pedido: {
        Args: {
          p_itens: Json
          p_nome: string
          p_telefone: string
          p_observacoes?: string | null
        }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}