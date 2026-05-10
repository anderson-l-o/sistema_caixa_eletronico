import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { CaixaEletronicoService } from "./services/CaixaEletronicoService";
import { RepositorioContas } from "./models/RepositorioContas";
import { Conta } from "./models/Conta";
import { DENOMINACOES } from "./models/Denominacoes";

/**
 * Servidor HTTP que expõe a lógica do CaixaEletronicoService como uma API REST.
 * Usa apenas o módulo nativo 'http' do Node.js — sem frameworks externos.
 *
 * Rotas:
 *   GET  /api/estoque          → estado do caixa (estoque + total)
 *   POST /api/login            → autenticação (body: { contaId })
 *   GET  /api/conta/:id        → dados da conta (saldo)
 *   POST /api/saque            → saque (body: { contaId, valorEmCentavos })
 *   POST /api/admin/carregar   → carga de cédulas (body: { operadorId, valorEmCentavos, quantidade })
 *   POST /api/admin/descarregar→ descarga de cédulas (idem)
 *   POST /api/admin/contas                → cadastra nova conta (body: { contaId, saldoEmCentavos })
 *   GET  /api/admin/contas                → lista todas as contas
 *   GET  /api/admin/movimentacoes         → todas as movimentações
 *   GET  /api/admin/movimentacoes/:contaId→ movimentações de uma conta
 *   GET  /api/denominacoes               → lista de denominações disponíveis
 *   GET  /                     → serve public/index.html
 */
export class ApiServer {
  private readonly server: http.Server;

  constructor(
    private readonly service: CaixaEletronicoService,
    private readonly repositorioContas: RepositorioContas,
    private readonly publicDir: string
  ) {
    this.server = http.createServer((req, res) => this.handle(req, res));
  }

  listen(port: number): void {
    this.server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Porta ${port} já está em uso.`);
        console.error(`   Execute: taskkill /F /IM node.exe`);
        console.error(`   Ou troque a porta no app.ts.\n`);
        process.exit(1);
      } else {
        throw err;
      }
    });

    this.server.listen(port, () => {
      console.log(`\n✅ Servidor iniciado em http://localhost:${port}`);
      console.log(`   Abra o endereço acima no seu navegador.\n`);
    });
  }

  // ─── Dispatcher ───────────────────────────────────────────────────────────

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    // Arquivos estáticos (frontend)
    if (method === "GET" && !url.startsWith("/api")) {
      this.servirArquivoEstatico(url, res);
      return;
    }

    // Lê o body para requisições POST
    if (method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        try {
          const json = body ? JSON.parse(body) : {};
          this.rotear(method, url, json, res);
        } catch {
          this.json(res, 400, { erro: "JSON inválido." });
        }
      });
      return;
    }

    this.rotear(method, url, {}, res);
  }

  // ─── Roteador ─────────────────────────────────────────────────────────────

  private rotear(
    method: string,
    url: string,
    body: Record<string, unknown>,
    res: http.ServerResponse
  ): void {
    // GET /api/denominacoes
    if (method === "GET" && url === "/api/denominacoes") {
      return this.json(res, 200, {
        denominacoes: DENOMINACOES.map(d => ({
          valorEmCentavos: d.valorEmCentavos,
          descricao: d.descricao,
        })),
      });
    }

    // GET /api/estoque
    if (method === "GET" && url === "/api/estoque") {
      return this.json(res, 200, {
        estoque: this.service.consultarEstoque(),
        totalEmCentavos: this.service.consultarValorTotal(),
        totalFormatado: (this.service.consultarValorTotal() / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      });
    }

    // POST /api/login
    if (method === "POST" && url === "/api/login") {
      const contaId = String(body.contaId ?? "").trim();
      const conta = this.repositorioContas.buscarPorId(contaId);
      if (!conta) {
        return this.json(res, 401, { erro: `Conta "${contaId}" não encontrada.` });
      }
      return this.json(res, 200, {
        id: conta.id,
        saldoEmCentavos: conta.saldoEmCentavos,
        saldoFormatado: conta.saldoFormatado,
      });
    }

    // GET /api/conta/:id  →  url = /api/conta/joao
    if (method === "GET" && url.startsWith("/api/conta/")) {
      const contaId = decodeURIComponent(url.slice("/api/conta/".length));
      const conta = this.repositorioContas.buscarPorId(contaId);
      if (!conta) {
        return this.json(res, 404, { erro: `Conta "${contaId}" não encontrada.` });
      }
      return this.json(res, 200, {
        id: conta.id,
        saldoEmCentavos: conta.saldoEmCentavos,
        saldoFormatado: conta.saldoFormatado,
      });
    }

    // POST /api/saque
    if (method === "POST" && url === "/api/saque") {
      const contaId = String(body.contaId ?? "").trim();
      const valorEmCentavos = Number(body.valorEmCentavos);

      if (!contaId || isNaN(valorEmCentavos) || valorEmCentavos <= 0) {
        return this.json(res, 400, { erro: "Parâmetros inválidos." });
      }

      const conta = this.repositorioContas.buscarPorId(contaId);
      if (!conta) {
        return this.json(res, 404, { erro: `Conta "${contaId}" não encontrada.` });
      }

      const resultado = this.service.realizarSaque(conta, valorEmCentavos);
      const status = resultado.sucesso ? 200 : 422;
      return this.json(res, status, resultado);
    }

    // POST /api/admin/carregar
    if (method === "POST" && url === "/api/admin/carregar") {
      return this.operacaoEstoque("carregar", body, res);
    }

    // POST /api/admin/descarregar
    if (method === "POST" && url === "/api/admin/descarregar") {
      return this.operacaoEstoque("descarregar", body, res);
    }

    // GET /api/admin/contas — lista todas as contas
    if (method === "GET" && url === "/api/admin/contas") {
      const contas = this.repositorioContas.listarTodas().map(c => ({
        id: c.id,
        saldoEmCentavos: c.saldoEmCentavos,
        saldoFormatado: c.saldoFormatado,
      }));
      return this.json(res, 200, { contas });
    }

    // POST /api/admin/contas — cadastra nova conta
    if (method === "POST" && url === "/api/admin/contas") {
      const contaId = String(body.contaId ?? "").trim();
      const saldoEmCentavos = Number(body.saldoEmCentavos);

      if (!contaId) {
        return this.json(res, 400, { erro: "O ID da conta é obrigatório." });
      }
      if (isNaN(saldoEmCentavos) || saldoEmCentavos < 0) {
        return this.json(res, 400, { erro: "Saldo inicial inválido." });
      }

      try {
        const novaConta = new Conta(contaId, saldoEmCentavos);
        this.repositorioContas.cadastrar(novaConta);
        
        // Registra a movimentação de criação de conta
        this.service.registrarMovimentacao(
          "admin",
          "CARGA",
          saldoEmCentavos,
          `Conta "${contaId}" criada com saldo inicial de ${novaConta.saldoFormatado}.`
        );
        
        return this.json(res, 201, {
          mensagem: `Conta "${contaId}" cadastrada com sucesso!`,
          id: contaId,
          saldoFormatado: novaConta.saldoFormatado,
        });
      } catch (e: unknown) {
        return this.json(res, 409, { erro: (e as Error).message });
      }
    }

    // POST /api/shutdown — encerra o processo do servidor
    if (method === "POST" && url === "/api/shutdown") {
      this.json(res, 200, { mensagem: "Servidor encerrado." });
      console.log("\n⚠️  Encerramento solicitado via painel. Até logo!\n");
      this.server.close(() => process.exit(0));
      return;
    }

    // GET /api/admin/movimentacoes/:contaId — histórico de um cliente
    if (method === "GET" && url.startsWith("/api/admin/movimentacoes/")) {
      const contaId = decodeURIComponent(url.slice("/api/admin/movimentacoes/".length));
      const movimentacoes = this.lerRelatorioLog(contaId);
      return this.json(res, 200, { movimentacoes });
    }

    // GET /api/admin/movimentacoes — todas as movimentações
    if (method === "GET" && url === "/api/admin/movimentacoes") {
      const movimentacoes = this.lerRelatorioLog();
      return this.json(res, 200, { movimentacoes });
    }

    this.json(res, 404, { erro: "Rota não encontrada." });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private operacaoEstoque(
    operacao: "carregar" | "descarregar",
    body: Record<string, unknown>,
    res: http.ServerResponse
  ): void {
    const operadorId = String(body.operadorId ?? "admin").trim();
    const valorEmCentavos = Number(body.valorEmCentavos);
    const quantidade = Number(body.quantidade);

    if (isNaN(valorEmCentavos) || isNaN(quantidade) || quantidade <= 0) {
      return this.json(res, 400, { erro: "Parâmetros inválidos." });
    }

    try {
      if (operacao === "carregar") {
        this.service.carregarCedulas(operadorId, valorEmCentavos, quantidade);
      } else {
        this.service.descarregarCedulas(operadorId, valorEmCentavos, quantidade);
      }
      return this.json(res, 200, {
        mensagem: `${quantidade}x ${
          DENOMINACOES.find(d => d.valorEmCentavos === valorEmCentavos)?.descricao
        } ${operacao === "carregar" ? "adicionadas" : "removidas"} com sucesso.`,
        totalEmCentavos: this.service.consultarValorTotal(),
      });
    } catch (e: unknown) {
      return this.json(res, 422, { erro: (e as Error).message });
    }
  }

  private servirArquivoEstatico(url: string, res: http.ServerResponse): void {
    const filePath = path.join(
      this.publicDir,
      url === "/" ? "index.html" : url
    );
    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css",
      ".js": "text/javascript",
      ".ico": "image/x-icon",
    };

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }
      res.writeHead(200, { "Content-Type": mimeTypes[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  }

  private json(res: http.ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }

  /**
   * Lê o arquivo caixa_eletronico.log e converte cada linha em um objeto
   * estruturado para exibição no relatório do painel admin.
   */
  private lerRelatorioLog(contaId?: string): object[] {
    const logPath = path.join(process.cwd(), "caixa_eletronico.log");
    if (!fs.existsSync(logPath)) return [];

    const linhas = fs.readFileSync(logPath, "utf-8").split("\n").filter(l => l.trim());

    // Regex para capturar: [data] [TIPO] mensagem
    const re = /^\[(.+?)\] \[(.+?)\] (.+)$/;

    const registros = linhas.map((linha, idx) => {
      const m = linha.match(re);
      if (!m) return null;
      const [, dataHora, tipoRaw, descricao] = m;

      // Determina tipo normalizado e contaId a partir do texto
      let tipo: string;
      let conta = "";
      let valor = "";

      if (tipoRaw === "SAQUE") {
        tipo = "SAQUE_REALIZADO";
        const c = descricao.match(/Conta "(.+?)"/);
        const v = descricao.match(/sacou (R\$\s*[\d.,]+)/);
        conta = c?.[1] ?? "";
        valor = v?.[1] ?? "";
      } else if (tipoRaw === "SAQUE NEGADO") {
        tipo = "SAQUE_NEGADO";
        const c = descricao.match(/Conta "(.+?)"/);
        const v = descricao.match(/saque de (R\$\s*[\d.,]+)|Solicitado:\s*(R\$\s*[\d.,]+)/);
        conta = c?.[1] ?? "";
        valor = v?.[1] ?? v?.[2] ?? "";
      } else if (tipoRaw === "SAQUE IMPOSSÍVEL") {
        tipo = "SAQUE_IMPOSSIVEL";
        const c = descricao.match(/Conta "(.+?)"/);
        const v = descricao.match(/entregar (R\$\s*[\d.,]+)/);
        conta = c?.[1] ?? "";
        valor = v?.[1] ?? "";
      } else if (tipoRaw === "CARGA") {
        tipo = "CARGA";
        // Tenta extrair tanto "Operador" (carga de cédulas) quanto "Conta" (criação de conta)
        let op = descricao.match(/Operador "(.+?)"/);
        let c = descricao.match(/Conta "(.+?)"/);
        conta = op?.[1] ?? c?.[1] ?? "sistema";
        // Extrai valor de saldo inicial se for criação de conta
        let v = descricao.match(/de (R\$\s*[\d.,]+)/);
        valor = v?.[1] ?? "";
      } else {
        tipo = tipoRaw;
      }

      return { id: idx + 1, dataHora, tipo, contaId: conta, valor, descricao };
    }).filter(Boolean) as object[];

    if (contaId) {
      return registros.filter((r: any) => r.contaId === contaId);
    }
    return registros.reverse();
  }
}
