# AGENTS.md — La Femme

Projeto **Nuxt 4.5.1** (Vue 3.5, Vite) + **Tailwind CSS** via `@nuxtjs/tailwindcss` (v6 / Tailwind v4).
Stack mínima: nenhum teste, lint ou typecheck configurado — verificação = build + navegação no dev server.

## Comandos

- `npm run dev` — dev server (porta 3000; neste ambiente 3000 pode estar ocupada → sobe em **3001**)
- `npm run build` — build de produção (verificação principal; rode ao terminar tarefas)
- `npm run generate` — build estático (prerender)
- `npm run preview` — prévia do build
- `npm install` roda `postinstall` → `nuxt prepare` (gera `.nuxt/`)

## Estrutura (Nuxt 4 — tudo dentro de `app/`)

- `app/assets/` — CSS global, fontes, ícones processados
- `app/components/` — componentes UI pequenos, reusáveis, sem lógica de dados
- `app/composables/` — lógica reativa (`useX`), estados com `useState`
- `app/layouts/` — layouts (PascalCase); usar com `<NuxtLayout>`
- `app/middleware/` — guards de rota (camelCase)
- `app/pages/` — rotas por arquivo (minúsculas, sem traços; subpastas p/ contexto)
- `app/plugins/` — registro de libs e injeções (client/server)
- `app/utils/` — helpers puros, sem reatividade (camelCase)
- `app/app.vue` — shell do app
- `shared/types/` — tipos globais/DTOs (PascalCase); em projetos pequenos pode ir em `app/types`
- `server/` — API Nitro (`server/api/`), middleware e plugins server-side
- `public/` — estáticos servidos na raiz
- `content/` — opcional (conteúdo estático/MD; módulo não instalado)

## Convenções de código

- **Sempre TypeScript** (`<script setup lang="ts">`), sem `any`, com props/emits/retornos tipados.
- **Imports explícitos** para cada arquivo — evitar auto-imports.
- **Componentizar ao máximo**: UI → composable → acesso a dados (`server/api` ou SDK).
- **Responsabilidade única**: se um arquivo cresce, quebre.
- Componentes com **ID fixo** para evitar problemas de hidratação.
- Nomes: componentes/layouts **PascalCase**, páginas **minúsculas**, composables `use*` + PascalCase, middleware/utils camelCase.

## Notas do projeto

- `nuxt.config.ts` tem `modules: ['@nuxtjs/tailwindcss']`; `@nuxtjs/tailwindcss` v6 usa Tailwind v4 (config **CSS-first** via `@theme`, não `tailwind.config.js`).
- Nenhum arquivo CSS/Tailwind foi criado ainda — o módulo usa o arquivo default `assets/css/tailwind.css` se ausente.
