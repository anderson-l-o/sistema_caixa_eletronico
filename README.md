# 💳 Sistema de Caixa Eletrônico

Sistema de autoatendimento bancário desenvolvido em **TypeScript**, com arquitetura **MVC**, princípios **SOLID**, padrões de projeto clássicos e interface web via API REST — sem nenhuma dependência de framework externo.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Padrões de Projeto](#-padrões-de-projeto)
- [Estrutura de Arquivos](#-estrutura-de-arquivos)
- [Instalação e Execução](#-instalação-e-execução)
- [Endpoints da API](#-endpoints-da-api)
- [Contas de Teste](#-contas-de-teste)
- [Funcionalidades](#-funcionalidades)

---

## 🎯 Visão Geral

O sistema simula um caixa eletrônico completo com dois perfis de usuário:

| Perfil | Acesso | Operações |
|---|---|---|
| **Cliente** | ID da conta | Saque, consulta de saldo |
| **Operador (Admin)** | Painel restrito | Visualizar estoque, carregar e descarregar cédulas, encerrar sistema |

O frontend é uma **SPA (Single Page Application)** em HTML/CSS/JS puro, servida pelo próprio servidor Node.js. Toda a comunicação ocorre via **API REST** em JSON.

---

## 🛠 Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| **TypeScript** | 5.4.5 | Linguagem principal |
| **Node.js** | ≥ 18 | Runtime |
| **http** (nativo) | — | Servidor HTTP |
| **fs / path** (nativo) | — | Servir arquivos estáticos |
| **readline** (nativo) | — | Interface CLI (legada) |

> ⚠️ Nenhum framework externo (Express, Fastify, etc.) é utilizado.

---

## 🏛 Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Browser)                │
│              public/index.html + css + js           │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / JSON
┌────────────────────────▼────────────────────────────┐
│              SERVIDOR HTTP (src/server.ts)           │
│              ApiServer — roteamento REST             │
└────────────────────────┬────────────────────────────┘
                         │ chama
┌────────────────────────▼────────────────────────────┐
│          FACADE (CaixaEletronicoService)             │
│   ┌──────────────┐ ┌───────────────┐ ┌───────────┐  │
│   │EstoqueService│ │ SaqueService  │ │ Gestor    │  │
│   │ (inventário) │ │(validar/compor│ │Notificad. │  │
│   └──────┬───────┘ └───────┬───────┘ └─────┬─────┘  │
└──────────┼─────────────────┼───────────────┼────────┘
           │                 │               │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌────▼──────────┐
    │  Inventario │  │SeletorEstrat.│  │ Notificadores │
    │  (models)   │  │ (strategies) │  │ Console/Arq.  │
    └─────────────┘  └──────────────┘  └───────────────┘
```

---

## 🧩 Padrões de Projeto

### Strategy — Composição de Cédulas
A seleção do algoritmo de composição é **automática**, feita pelo `SeletorEstrategia` com base no estado do inventário. Dois algoritmos disponíveis:

| Estratégia | Quando é ativada |
|---|---|
| `EstrategiaMenurQuantidade` | Caso padrão — minimiza o número de cédulas entregues |
| `EstrategiaPreservarAltoValor` | Quando o estoque de notas grandes está abaixo de 20% — preserva cédulas de alto valor |

### Observer — Notificações
Todos os eventos relevantes (saques, cargas, erros) são publicados para os notificadores registrados:

| Notificador | Destino |
|---|---|
| `NotificadorConsole` | `stdout` do terminal |
| `NotificadorArquivo` | `caixa_eletronico.log` |

### Command — Menus do Console
Os menus do controller e do painel admin utilizam `Record<string, () => void>` para mapear opções a ações, eliminando `switch/case`.

### Facade — CaixaEletronicoService
A classe `CaixaEletronicoService` expõe uma API pública estável enquanto delega internamente para `EstoqueService`, `SaqueService` e `GestorNotificadores`.

### MVC
| Camada | Classes |
|---|---|
| **Model** | `Conta`, `Inventario`, `Cedula`, `RepositorioContas` |
| **View** | `ConsoleUI`, `FluxoSaque`, `FluxoAdmin` |
| **Controller** | `CaixaEletronicoController` (CLI), `ApiServer` (HTTP) |

---

## 📁 Estrutura de Arquivos

```
sistema_caixa_eletronico/
│
├── public/                          # Frontend (servido estaticamente)
│   ├── index.html                   # Estrutura HTML das telas
│   ├── css/
│   │   └── style.css                # Estilos e variáveis CSS
│   └── js/
│       └── app.js                   # Lógica JS — chamadas à API e renderização
│
├── src/                             # Backend (TypeScript)
│   ├── app.ts                       # Bootstrap: DI, pré-carga de dados, start
│   ├── server.ts                    # ApiServer: servidor HTTP + roteamento REST
│   │
│   ├── controllers/
│   │   └── CaixaEletronicoController.ts  # Controller do console (CLI)
│   │
│   ├── models/
│   │   ├── IConta.ts                # Interface da conta
│   │   ├── Conta.ts                 # Implementação da conta
│   │   ├── ICedula.ts               # Interface da cédula
│   │   ├── Cedula.ts                # Implementação da cédula
│   │   ├── Denominacoes.ts          # Constante com todas as denominações (R$0,01 → R$200)
│   │   ├── IInventario.ts           # Interface do inventário
│   │   ├── Inventario.ts            # Implementação do inventário (Map<valorEmCentavos, ItemEstoque>)
│   │   ├── ItemEstoque.ts           # DTO de item de estoque
│   │   └── RepositorioContas.ts     # Repositório em memória de contas
│   │
│   ├── services/
│   │   ├── CaixaEletronicoService.ts # Fachada principal
│   │   ├── EstoqueService.ts         # Operações de inventário
│   │   ├── SaqueService.ts           # Lógica de saque e sugestões
│   │   └── GestorNotificadores.ts    # Padrão Observer
│   │
│   ├── strategies/
│   │   ├── IEstrategiaComposicao.ts  # Interface da estratégia
│   │   ├── ResultadoComposicao.ts    # DTO do resultado
│   │   ├── EstrategiaMenurQuantidade.ts    # Algoritmo guloso padrão
│   │   ├── EstrategiaPreservarAltoValor.ts # Algoritmo conservador
│   │   └── SeletorEstrategia.ts      # Seleciona a estratégia automaticamente
│   │
│   ├── notifications/
│   │   ├── INotificador.ts           # Interface do notificador
│   │   ├── NotificadorConsole.ts     # Saída no terminal
│   │   └── NotificadorArquivo.ts     # Saída em arquivo .log
│   │
│   ├── utils/
│   │   └── Formatador.ts             # Utilitário de formatação BRL
│   │
│   └── views/
│       ├── ConsoleUI.ts              # Wrapper de readline (perguntar/pausar)
│       ├── FluxoSaque.ts             # Fluxo interativo de saque no console
│       └── FluxoAdmin.ts             # Fluxo interativo do painel admin no console
│
├── dist/                            # Build compilado (gerado por tsc — não versionar)
├── caixa_eletronico.log             # Log de operações (gerado em runtime)
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js** ≥ 18
- **npm** disponível **ou** execute os comandos alternativos abaixo

### 1. Instalar dependências

```bash
npm install
```

> Se o PowerShell bloquear scripts `.ps1`, use o comando alternativo:
> ```powershell
> node node_modules\typescript\bin\tsc
> ```

### 2. Compilar o TypeScript

```bash
npm run build
```

Alternativa sem npm:
```powershell
node node_modules\typescript\bin\tsc
```

### 3. Iniciar o servidor

```bash
npm start
```

Alternativa sem npm:
```powershell
node dist\app.js
```

### 4. Acessar no navegador

```
http://localhost:3000
```

### Encerrar o servidor
- Pelo navegador: botão **⏻ Encerrar Sistema** na tela de login
- Pelo terminal: `Ctrl+C`
- Se a porta estiver em uso: `taskkill /F /IM node.exe`

---

## 🌐 Endpoints da API

| Método | Rota | Descrição | Body |
|---|---|---|---|
| `GET` | `/api/denominacoes` | Lista todas as denominações suportadas | — |
| `GET` | `/api/estoque` | Estado atual do caixa | — |
| `POST` | `/api/login` | Autentica uma conta | `{ contaId }` |
| `GET` | `/api/conta/:id` | Dados e saldo da conta | — |
| `POST` | `/api/saque` | Realiza um saque | `{ contaId, valorEmCentavos }` |
| `POST` | `/api/admin/carregar` | Adiciona cédulas ao caixa | `{ operadorId, valorEmCentavos, quantidade }` |
| `POST` | `/api/admin/descarregar` | Remove cédulas do caixa | `{ operadorId, valorEmCentavos, quantidade }` |
| `POST` | `/api/shutdown` | Encerra o processo do servidor | — |
| `GET` | `/` | Serve o `index.html` | — |

> Todos os valores monetários são trafegados em **centavos** (inteiros) para evitar problemas de ponto flutuante.

---

## 👤 Contas de Teste

| ID | Saldo Inicial |
|---|---|
| `001` | R$ 5.000,00 |
| `002` | R$ 1.000,00 |
| `003` | R$ 500,00 |
| `joao` | R$ 3.000,00 |
| `maria` | R$ 750,00 |

**Painel do operador:** botão **⚙ Painel do Operador** na tela de login (sem senha em ambiente de desenvolvimento).

---

## ⚙️ Funcionalidades

### Cliente
- ✅ Login por ID de conta
- ✅ Exibição de saldo em tempo real
- ✅ Saque com composição automática de cédulas
- ✅ Sugestões de valores alternativos quando o saque não é possível
- ✅ Encerramento de sessão

### Operador (Admin)
- ✅ Visualização do estoque completo do caixa
- ✅ Carregamento de cédulas por denominação e quantidade
- ✅ Descarregamento de cédulas
- ✅ Encerramento do sistema

### Sistema
- ✅ Seleção automática de estratégia de composição
- ✅ Notificação de todas as operações (console + arquivo de log)
- ✅ Prevenção de porta em uso (`EADDRINUSE`) com mensagem amigável
- ✅ Validação de saldo insuficiente na conta e no caixa
- ✅ Valores em centavos (sem erros de ponto flutuante)
