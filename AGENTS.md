# AGENTS.md — Diretrizes e Arquitetura do Projeto ATS Plurix 360°

Este arquivo é lido automaticamente pelo assistente de IA (**Antigravity**) no início de qualquer tarefa ou desenvolvimento neste repositório. Todas as orientações, padrões de código, decisões de arquitetura e o **Plurix Design System** descritos aqui devem ser rigorosamente seguidos.

---

## 1. Visão Geral do Projeto

O **ATS Plurix 360°** é um sistema de Gestão de Recrutamento e Seleção (R&S) e Governança com suporte a:
- **Kanban de Vagas**: Acompanhamento do ciclo de vida das vagas (Alinhamento, Triagem, Entrevistas, Proposta, Concluída, etc.).
- **Kanban de Candidatos**: Funil de movimentação por etapas para candidatos associados a cada vaga específica.
- **Banco de Talentos & Tabela de Candidatos**: Gestão e busca unificada de todos os candidatos.
- **Módulo de Indicadores & KPIs**: Gráficos, métricas de SLA, tempo médio de fechamento e taxas de conversão.
- **Auditoria & Histórico (Insert-Only)**: Histórico de movimentações de etapas (`stage_history`) e alterações de status de vagas (`job_history`).

---

## 2. Tecnologias & Estrutura do Projeto

- **Linguagem**: JavaScript Vanilla (ES Modules).
- **Estilização**: CSS Vanilla modularizado baseado no **Plurix Design System** ([`DESIGN_SYSTEM.md`](file:///c:/Users/HenriqueCostadosSant/projeto-kanban/DESIGN_SYSTEM.md)).
- **Banco de Dados & Backend**: Supabase (PostgreSQL serverless).
- **Gerenciamento de Estado**: Store reativa local em `src/db/store.js`.

### Mapeamento de Diretórios principais:
```
projeto-kanban/
├── AGENTS.md                  # Diretrizes globais do agente (Leitura automática)
├── DESIGN_SYSTEM.md           # Guia oficial de tokens, logos, tipografia e componentes Plurix
├── schema.sql                 # DDL de tabelas e políticas RLS no Supabase
├── index.html                 # Layout base, estrutura de navegação e modais
├── src/
│   ├── main.js                # Ponto de entrada, roteamento de abas e eventos globais
│   ├── db/
│   │   ├── store.js           # Estado centralizador em memória
│   │   ├── supabaseClient.js  # Inicialização do cliente Supabase SDK
│   │   └── seedData.js        # Dados iniciais / mock para fallback
│   ├── services/
│   │   ├── supabaseService.js # Métodos assíncronos de persistência no Supabase
│   │   ├── jobService.js      # Regras de negócio de vagas
│   │   ├── candidateService.js# Regras de negócio de candidatos
│   │   ├── pipelineService.js # Movimentação de etapas e atualização do funil
│   │   ├── authService.js     # Autenticação e sessão do usuário
│   │   └── exportService.js   # Exportação de relatórios (Excel, etc.)
│   └── components/            # Componentes modulares da UI (KanbanBoard, Modals, KPIGrid, etc.)
```

---

## 3. Diretrizes de Banco de Dados & Supabase

1. **Fonte da Verdade**: O Supabase é a fonte principal de dados persistidos. A `store.js` atua como cache reativo no frontend.
2. **Tabelas do Schema (`schema.sql`)**:
   - `jobs` (Chave Primária `id: TEXT`, ex: `VAGA-001`)
   - `candidates` (Chave Primária `id: UUID`)
   - `applications` (Relacionamento N:N entre `jobs` e `candidates` com `job_id` e `candidate_id`)
   - `stage_history` (Log auditável de troca de etapa do candidato)
   - `job_history` (Log auditável de alteração de status da vaga)
3. **Cascata e Integridade**: Exclusão de vaga ou candidato deve cascatear para `applications` (`ON DELETE CASCADE`).
4. **Tratamento de Erros no Supabase**:
   - Sempre verificar desestruturação de `{ data, error }`.
   - Em caso de falha no Supabase, tratar defensivamente e exibir notificação (Toast/Alert) clara ao usuário.

---

## 4. Padrões de Código e Arquitetura

1. **Assincronismo Clean**: Utilizar `async/await` com blocos `try/catch` bem delimitados em chamadas de API ou serviços.
2. **Preservação do Estado Local (`store.js`)**:
   - Ao criar/editar/excluir qualquer registro, garanta que a `store` local e os componentes visuais correspondentes sejam atualizados em sincronia com o banco de dados.
3. **Nenhum Patch Superficial**: Nunca silencie exceções com blocos `catch` vazios ou retornos falsos silenciosos. Se ocorrer um erro, registre no console com `console.error` detalhado e informe a UI.
4. **Manutenção de Assinaturas de Funções**: Ao alterar o parâmetro de um serviço ou componente, atualizar todos os pontos de invocação no repositório.

---

## 5. Diretrizes de Design & Plurix Design System (OBRIGATÓRIO)

Toda e qualquer interface criada ou ajustada DEVE seguir rigorosamente o guia em [`DESIGN_SYSTEM.md`](file:///c:/Users/HenriqueCostadosSant/projeto-kanban/DESIGN_SYSTEM.md).

### Regras Principais do Design System:
1. **Cores & Tokens Semânticos**:
   - `Background/Main Color/Default`: `#00147d` (Azul escuro principal para headers/botões primários).
   - `Background/Secondary Color/Default`: `#50baec` / `#4FB9EA` (Azul claro de destaque).
   - `Background/Default/Default`: `#ffffff` (Fundo padrão de páginas e cards).
   - `Background/Default/Secondary`: `#f5f5f5` (Fundo de superfícies secundárias).
   - `Text/Default/Default`: `#1e1e1e` (Texto escuro padrão).
   - `Text/Default/Secondary`: `#757575` (Textos auxiliares).
   - `Positive`: `#14ae5c` / `#02542d`, `Warning`: `#e8b931` / `#522504`, `Danger`: `#ec221f` / `#900b09` (Uso **exclusivo** para estados de feedback).
2. **Tipografia**:
   - Fonte primária de interface: **Inter** (Google Fonts).
   - Fonte de código/IDs: **Roboto Mono**.
   - Respeitar estilos e pesos (`Title Hero`, `Heading`, `Subheading`, `Body Base`, `Single Line/Body Base`).
3. **Logo Plurix**:
   - **Logo alinhado sempre à esquerda**.
   - Fundo escuro (`Main Color` `#00147d`): Usar versão **Azul Claro** (`#4FB9EA`).
   - Fundo claro (`#ffffff`): Usar versão **Azul Escuro** (`#00147E`).
4. **Desktop-First**:
   - Projetar e renderizar prioritariamente para telas **Desktop (> 1024px)** com container máximo de `1280px` e grid de 12 colunas.
5. **Componentes**:
   - Botões, Cards, Inputs, Modais e Sidebar devem seguir os tokens de borda (`#d9d9d9`, `#adbbff`), sombras (`Drop Shadow`), radius (8px a 24px) e estados (`default`, `hover`, `pressed`, `disabled`).

---

## 6. Checklist Obrigatório para Qualquer Nova Feature ou Ajuste

Antes de finalizar qualquer modificação no código:

- [ ] **Fidelidade ao Design System**: As cores, fontes (Inter / Roboto Mono), botões e logos seguem os tokens semânticos do [`DESIGN_SYSTEM.md`](file:///c:/Users/HenriqueCostadosSant/projeto-kanban/DESIGN_SYSTEM.md)?
- [ ] **Desktop-First**: A interface renderiza perfeitamente em resoluções desktop (> 1024px)?
- [ ] **Sincronização**: O fluxo funciona tanto no estado local (`store.js`) quanto na chamada ao Supabase em `supabaseService.js`?
- [ ] **Integridade Relacional**: Exclusão de registros limpa dependências de forma segura?
- [ ] **Interface**: A tela renderiza sem erros de JS no console e responde corretamente nas interações de clique/drag-and-drop/modal?
