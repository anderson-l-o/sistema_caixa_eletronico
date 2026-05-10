/**
 * app.js — Lógica do frontend do Caixa Eletrônico
 *
 * Responsabilidades:
 *  - Comunicação com a API REST (src/server.ts)
 *  - Controle de telas (login / usuário / admin)
 *  - Renderização dinâmica (saldo, cédulas, estoque, sugestões)
 */

// ── Estado da aplicação ───────────────────────────────────────────────────────
let contaAtualId = null;

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Exibe apenas a tela informada, ocultando as demais.
 * @param {string} id - ID do elemento da tela
 */
function mostrarTela(id) {
  document.querySelectorAll('.section[id^="tela-"]').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/**
 * Exibe uma mensagem de alerta colorida no elemento alvo.
 * @param {string} id   - ID do elemento de alerta
 * @param {'ok'|'err'|'warn'} tipo
 * @param {string} msg  - Mensagem HTML a exibir
 */
function setAlert(id, tipo, msg) {
  const el = document.getElementById(id);
  el.className = `alert alert-${tipo} show`;
  el.innerHTML = msg;
}

/** Remove o alerta exibido em um elemento. */
function limparAlert(id) {
  const el = document.getElementById(id);
  el.className = 'alert';
  el.innerHTML = '';
}

/**
 * Formata centavos para moeda BRL.
 * @param {number} centavos
 * @returns {string} Ex: "R$ 1.000,00"
 */
function fmtBRL(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Wrapper genérico para chamadas à API REST.
 * @param {'GET'|'POST'} method
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

// ── Login ─────────────────────────────────────────────────────────────────────

/** Autentica o usuário e navega para a tela de saque. */
async function login() {
  const contaId = document.getElementById('inp-conta').value.trim();
  if (!contaId) {
    setAlert('alert-login', 'err', 'Digite o ID da conta.');
    return;
  }

  limparAlert('alert-login');
  const { ok, data } = await api('POST', '/api/login', { contaId });
  if (!ok) { setAlert('alert-login', 'err', data.erro); return; }

  contaAtualId = data.id;
  document.getElementById('nome-usuario').textContent = data.id;
  document.getElementById('saldo-display').textContent = data.saldoFormatado;
  document.getElementById('inp-conta').value = '';

  ativarTab('saque');
  mostrarTela('tela-usuario');
}

/** Encerra a sessão do usuário e volta à tela de login. */
function logout() {
  contaAtualId = null;
  mostrarTela('tela-login');
  document.getElementById('inp-valor').value = '';
  document.getElementById('resultado-saque').style.display = 'none';
  document.getElementById('sugestoes-box').style.display = 'none';
  limparAlert('alert-saque');
}

/** Envia comando de shutdown ao servidor e exibe mensagem final. */
async function encerrarSistema() {
  if (!confirm('Deseja realmente encerrar o sistema?')) return;
  try {
    await api('POST', '/api/shutdown');
  } catch (_) {
    // Servidor pode ter fechado antes de responder — comportamento esperado
  }
  document.body.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100vh;' +
    'font-family:sans-serif;font-size:1.5rem;color:#aaa;">⏻ Sistema encerrado.</div>';
}

// ── Saldo ─────────────────────────────────────────────────────────────────────

/** Consulta e atualiza o saldo exibido na tela do usuário. */
async function atualizarSaldo() {
  const { ok, data } = await api('GET', `/api/conta/${encodeURIComponent(contaAtualId)}`);
  if (ok) document.getElementById('saldo-display').textContent = data.saldoFormatado;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

/**
 * Stub — painel do cliente possui apenas uma aba (Saque).
 * Mantido para compatibilidade com chamada no fluxo de login.
 */
function ativarTab(_nome) {}

/**
 * Alterna a aba ativa no painel do operador (Admin).
 * @param {'estoque-admin'|'carregar-admin'|'descarregar-admin'} nome
 */
function ativarTabAdmin(nome) {
  const abas = ['estoque-admin', 'carregar-admin', 'descarregar-admin', 'clientes-admin', 'contas-admin'];
  abas.forEach((t, i) => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === nome);
    document.querySelectorAll('#tela-admin .tab')[i].classList.toggle('active', t === nome);
  });
  if (nome === 'clientes-admin') carregarClientesAdmin();
}

// ── Saque ─────────────────────────────────────────────────────────────────────

/** Executa o saque e exibe as cédulas entregues ou sugestões de valor. */
async function realizarSaque() {
  limparAlert('alert-saque');
  document.getElementById('resultado-saque').style.display = 'none';
  document.getElementById('sugestoes-box').style.display = 'none';

  const valorStr = document.getElementById('inp-valor').value.trim().replace(',', '.');
  const valorReais = parseFloat(valorStr);
  if (isNaN(valorReais) || valorReais <= 0) {
    setAlert('alert-saque', 'err', 'Digite um valor válido.');
    return;
  }
  const valorEmCentavos = Math.round(valorReais * 100);

  const { ok, data } = await api('POST', '/api/saque', { contaId: contaAtualId, valorEmCentavos });

  if (ok && data.sucesso) {
    setAlert('alert-saque', 'ok', `✅ ${data.mensagem}`);
    _renderizarCedulas(data.cedulas);
    document.getElementById('resultado-saque').style.display = 'block';
    document.getElementById('inp-valor').value = '';
    atualizarSaldo();
  } else {
    setAlert('alert-saque', 'err', `❌ ${data.mensagem || data.erro}`);
    if (data.sugestoes && data.sugestoes.length > 0) {
      _renderizarSugestoes(data.sugestoes);
      document.getElementById('sugestoes-box').style.display = 'block';
    }
  }
}

/**
 * Preenche o campo de valor com o valor sugerido selecionado.
 * @param {number} centavos
 */
function usarSugestao(centavos) {
  document.getElementById('inp-valor').value = (centavos / 100).toFixed(2);
  document.getElementById('sugestoes-box').style.display = 'none';
  limparAlert('alert-saque');
}

// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * Renderiza a tabela de estoque em um tbody.
 * @param {string} tbodyId - ID do elemento tbody
 * @param {object} data    - Resposta da API /api/estoque
 */
function renderizarEstoque(tbodyId, data) {
  const tbody = document.getElementById(tbodyId);
  if (!data.estoque || data.estoque.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--muted);text-align:center">Caixa vazio</td></tr>';
    return;
  }
  tbody.innerHTML =
    data.estoque.map(item =>
      `<tr><td>${item.descricao}</td><td>${item.quantidade}</td><td>${item.subtotal}</td></tr>`
    ).join('') +
    `<tr class="total-row"><td colspan="2">TOTAL NO CAIXA</td><td>${data.totalFormatado}</td></tr>`;
}

/** Abre o painel do operador carregando estoque e denominações. */
async function mostrarAdmin() {
  await carregarDenominacoes();
  await carregarEstoqueAdmin();
  ativarTabAdmin('estoque-admin');
  mostrarTela('tela-admin');
}

/** Volta para a tela de login a partir do painel admin. */
function voltarLogin() {
  mostrarTela('tela-login');
}

// ── Clientes ──────────────────────────────────────────────────────────────────

/** Cache da lista de contas para filtro local sem nova requisição. */
let _cacheclientes = [];

/** Carrega todas as contas e renderiza a tabela de clientes. */
async function carregarClientesAdmin() {
  limparAlert('alert-clientes');
  const { ok, data } = await api('GET', '/api/admin/contas');
  if (!ok) { setAlert('alert-clientes', 'err', '❌ Erro ao carregar clientes.'); return; }
  _cacheclientes = data.contas;
  _renderizarClientes(_cacheclientes);
}

/**
 * Filtra a tabela de clientes pelo ID digitado na busca.
 * Opera sobre o cache — sem nova requisição.
 */
function filtrarClientes() {
  const termo = document.getElementById('inp-busca-cliente').value.trim().toLowerCase();
  const filtrados = _cacheclientes.filter(c => c.id.toLowerCase().includes(termo));
  _renderizarClientes(filtrados);
}

/**
 * Renderiza a tabela de clientes com opção de consultar saldo individualmente.
 * @param {Array<{id: string, saldoFormatado: string}>} contas
 */
function _renderizarClientes(contas) {
  const tbody = document.getElementById('tbody-clientes-admin');
  if (contas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="color:var(--muted);text-align:center">Nenhuma conta encontrada.</td></tr>';
    return;
  }
  tbody.innerHTML = contas.map(c => `
    <tr>
      <td>${c.id}</td>
      <td style="text-align:right">
        <span id="saldo-${c.id}" style="color:var(--green);font-weight:700">${c.saldoFormatado}</span>
        <button class="btn-ghost" onclick="atualizarSaldoCliente('${c.id}')"
          style="width:auto;padding:3px 10px;font-size:.78rem;margin-left:8px">↺</button>
        <a href="/relatorio.html?conta=${encodeURIComponent(c.id)}" target="_blank"
          style="margin-left:6px;font-size:.78rem;color:var(--accent);text-decoration:none;
                 background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.3);
                 padding:3px 8px;border-radius:6px;">📋</a>
      </td>
    </tr>`
  ).join('');
}

/**
 * Consulta o saldo atualizado de uma conta específica e atualiza o campo na tabela.
 * @param {string} id
 */
async function atualizarSaldoCliente(id) {
  const { ok, data } = await api('GET', `/api/conta/${encodeURIComponent(id)}`);
  if (!ok) return;
  const el = document.getElementById(`saldo-${id}`);
  if (el) el.textContent = data.saldoFormatado;
  // Atualiza também o cache
  const conta = _cacheclientes.find(c => c.id === id);
  if (conta) conta.saldoFormatado = data.saldoFormatado;
}

/**
 * Cadastra uma nova conta via painel do operador.
 */
async function cadastrarConta() {
  limparAlert('alert-contas');

  const contaId       = document.getElementById('inp-nova-conta-id').value.trim();
  const saldoStr      = document.getElementById('inp-nova-conta-saldo').value.trim().replace(',', '.');
  const saldoReais    = parseFloat(saldoStr || '0');
  const saldoEmCentavos = Math.round(saldoReais * 100);

  if (!contaId) {
    setAlert('alert-contas', 'err', 'O ID da conta é obrigatório.');
    return;
  }
  if (isNaN(saldoReais) || saldoReais < 0) {
    setAlert('alert-contas', 'err', 'Informe um saldo inicial válido.');
    return;
  }

  const { ok, data } = await api('POST', '/api/admin/contas', { contaId, saldoEmCentavos });

  if (ok) {
    setAlert('alert-contas', 'ok', `✅ ${data.mensagem} — Saldo: ${data.saldoFormatado}`);
    document.getElementById('inp-nova-conta-id').value    = '';
    document.getElementById('inp-nova-conta-saldo').value = '';
  } else {
    setAlert('alert-contas', 'err', `❌ ${data.erro}`);
  }
}

/** Popula os selects de denominação com dados da API. */
async function carregarDenominacoes() {
  const { ok, data } = await api('GET', '/api/denominacoes');
  if (!ok) return;
  ['sel-denom-carregar', 'sel-denom-descarregar'].forEach(selId => {
    document.getElementById(selId).innerHTML = data.denominacoes.map(d =>
      `<option value="${d.valorEmCentavos}">${d.descricao}</option>`
    ).join('');
  });
}

/** Atualiza a tabela de estoque no painel admin. */
async function carregarEstoqueAdmin() {
  const { ok, data } = await api('GET', '/api/estoque');
  if (!ok) return;
  renderizarEstoque('tbody-estoque-admin', data);
}

/**
 * Executa operação de carregar ou descarregar cédulas.
 * @param {'carregar'|'descarregar'} op
 */
async function operacaoAdmin(op) {
  const alertId = `alert-${op}`;
  limparAlert(alertId);

  const valorEmCentavos = parseInt(document.getElementById(`sel-denom-${op}`).value);
  const quantidade      = parseInt(document.getElementById(`inp-qtd-${op}`).value);

  if (isNaN(quantidade) || quantidade <= 0) {
    setAlert(alertId, 'err', 'Informe uma quantidade válida.');
    return;
  }

  const { ok, data } = await api('POST', `/api/admin/${op}`, {
    operadorId: 'admin', valorEmCentavos, quantidade,
  });

  if (ok) {
    setAlert(alertId, 'ok', `✅ ${data.mensagem}`);
    carregarEstoqueAdmin();
  } else {
    setAlert(alertId, 'err', `❌ ${data.erro}`);
  }
}

// ── Helpers internos (privados por convenção) ─────────────────────────────────

/**
 * Renderiza o grid de cédulas entregues no saque.
 * @param {Array<{quantidade: number, descricao: string}>} cedulas
 */
function _renderizarCedulas(cedulas) {
  document.getElementById('cedulas-grid').innerHTML = cedulas.map(c =>
    `<div class="cedula-chip"><span>${c.quantidade}×</span>${c.descricao}</div>`
  ).join('');
}

/**
 * Renderiza os botões de sugestão de valor.
 * @param {number[]} sugestoes - Array de valores em centavos
 */
function _renderizarSugestoes(sugestoes) {
  document.getElementById('sugestoes-lista').innerHTML = sugestoes.map(s =>
    `<button class="sugestao-btn" onclick="usarSugestao(${s})">${fmtBRL(s)}</button>`
  ).join('');
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inp-conta').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('inp-valor').addEventListener('keydown', e => {
    if (e.key === 'Enter') realizarSaque();
  });
});

// ── Relatório de Movimentações ────────────────────────────────────────────────

/** Busca e exibe movimentações de uma conta (ou todas se o campo estiver vazio). */
async function buscarMovimentacoes() {
  limparAlert('alert-relatorio');
  const contaId = document.getElementById('inp-busca-relatorio').value.trim();
  const url = contaId
    ? `/api/admin/movimentacoes/${encodeURIComponent(contaId)}`
    : '/api/admin/movimentacoes';

  try {
    const { ok, data } = await api('GET', url);
    if (!ok) { setAlert('alert-relatorio', 'err', `❌ ${data.erro ?? 'Erro ao buscar movimentações.'}`); return; }
    _renderizarMovimentacoes(data.movimentacoes ?? []);
  } catch (e) {
    setAlert('alert-relatorio', 'err', e.message);
  }
}

/**
 * Renderiza a tabela de movimentações.
 * @param {Array} movs
 */
function _renderizarMovimentacoes(movs) {
  const tbody = document.getElementById('tbody-relatorio-admin');
  if (!movs.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Nenhuma movimentação encontrada.</td></tr>';
    return;
  }

  const corTipo = {
    SAQUE_REALIZADO:  'var(--green)',
    SAQUE_NEGADO:     'var(--red)',
    SAQUE_IMPOSSIVEL: 'var(--yellow)',
    CARGA:            'var(--accent)',
  };
  const labelTipo = {
    SAQUE_REALIZADO:  '✅ Realizado',
    SAQUE_NEGADO:     '❌ Negado',
    SAQUE_IMPOSSIVEL: '⚠️ Impossível',
    CARGA:            '📦 Carga',
  };

  tbody.innerHTML = movs.map(m => {
    // Suporta tanto formato do log (campo valor string) quanto do repositório (valorFormatado)
    const valorExib = m.valorFormatado ?? m.valor ?? '';
    const conta     = m.contaId ?? '';
    const cor       = corTipo[m.tipo] ?? 'var(--muted)';
    const label     = labelTipo[m.tipo] ?? m.tipo;
    return `
    <tr style="border-left:3px solid ${cor}">
      <td>${m.dataHora}</td>
      <td><strong>${conta}</strong></td>
      <td style="color:${cor};white-space:nowrap">${label}</td>
      <td>${valorExib}</td>
      <td>${m.descricao}</td>
    </tr>`;
  }).join('');
}
