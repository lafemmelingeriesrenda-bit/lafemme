-- ============================================================
-- La Femme — estrutura de pedidos (Migration)
-- Idempotente: pode ser re-executado no Supabase SQL Editor.
-- ============================================================

-- ---------- Tabela: public.pedidos ----------
create table if not exists public.pedidos (
  id bigint generated always as identity primary key,
  cliente_id bigint null,
  status text not null default 'aguardando_atendimento',
  subtotal numeric(10,2) not null default 0,
  frete numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  nome_cliente text not null,
  telefone_cliente text not null,
  observacoes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Constraints do pedidos (idempotente) ----------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_cliente_id_fkey') then
    alter table public.pedidos
      add constraint pedidos_cliente_id_fkey
      foreign key (cliente_id) references public.clientes (id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pedidos_subtotal_check') then
    alter table public.pedidos add constraint pedidos_subtotal_check check (subtotal >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pedidos_frete_check') then
    alter table public.pedidos add constraint pedidos_frete_check check (frete >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pedidos_total_check') then
    alter table public.pedidos add constraint pedidos_total_check check (total >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pedidos_status_check') then
    alter table public.pedidos
      add constraint pedidos_status_check check (
        status in (
          'aguardando_atendimento',
          'em_atendimento',
          'aguardando_pagamento',
          'pago',
          'enviado',
          'entregue',
          'cancelado'
        )
      );
  end if;
end
$$;

-- ---------- Índices do pedidos ----------
create index if not exists pedidos_cliente_id_idx on public.pedidos (cliente_id);
create index if not exists pedidos_status_idx on public.pedidos (status);
create index if not exists pedidos_created_at_idx on public.pedidos (created_at);

-- ---------- RLS pedidos ----------
alter table public.pedidos enable row level security;

-- ---------- Tabela: public.itens_pedido ----------
create table if not exists public.itens_pedido (
  id bigint generated always as identity primary key,
  pedido_id bigint not null,
  produto_variante_id bigint not null,
  nome_produto text not null,
  cor text null,
  tamanho text not null,
  sku text null,
  foto text null,
  quantidade integer not null,
  valor_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ---------- Constraints do itens_pedido (idempotente) ----------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'itens_pedido_pedido_id_fkey') then
    alter table public.itens_pedido
      add constraint itens_pedido_pedido_id_fkey
      foreign key (pedido_id) references public.pedidos (id)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'itens_pedido_produto_variante_id_fkey') then
    alter table public.itens_pedido
      add constraint itens_pedido_produto_variante_id_fkey
      foreign key (produto_variante_id) references public.produto_variante (id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'itens_pedido_quantidade_check') then
    alter table public.itens_pedido add constraint itens_pedido_quantidade_check check (quantidade > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'itens_pedido_valor_unitario_check') then
    alter table public.itens_pedido add constraint itens_pedido_valor_unitario_check check (valor_unitario >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'itens_pedido_subtotal_check') then
    alter table public.itens_pedido add constraint itens_pedido_subtotal_check check (subtotal >= 0);
  end if;
end
$$;

-- ---------- Índices do itens_pedido ----------
create index if not exists itens_pedido_pedido_id_idx on public.itens_pedido (pedido_id);
create index if not exists itens_pedido_produto_variante_id_idx on public.itens_pedido (produto_variante_id);

-- ---------- RLS itens_pedido ----------
alter table public.itens_pedido enable row level security;