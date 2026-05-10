import * as path from "path";
import { Inventario } from "./models/Inventario";
import { Conta } from "./models/Conta";
import { RepositorioContas } from "./models/RepositorioContas";
import { CaixaEletronicoService } from "./services/CaixaEletronicoService";
import { ApiServer } from "./server";
import { NotificadorArquivo } from "./notifications/NotificadorArquivo";
import { NotificadorConsole } from "./notifications/NotificadorConsole";
import { exec } from "child_process";

/**
 * Ponto de entrada da aplicação.
 * Configura o sistema (injeção de dependências) e inicia a interface.
 */
function main(): void {
  // ── 1. Inicializa o Inventário ──────────────────────────────────────────
  const inventario = new Inventario();

  // ── 2. Inicializa o Serviço ─────────────────────────────────────────────
  const service = new CaixaEletronicoService(inventario);

  // ── 3. Registra Notificadores (múltiplos permitidos) ────────────────────
  service.registrarNotificador(new NotificadorConsole());
  service.registrarNotificador(new NotificadorArquivo("caixa_eletronico.log"));

  // ── 4. Carrega estoque inicial do caixa ─────────────────────────────────
  //    (Em produção, viria de banco de dados ou arquivo de configuração)
  service.carregarCedulas("sistema", 20000, 10); // 10x R$200
  service.carregarCedulas("sistema", 10000, 20); // 20x R$100
  service.carregarCedulas("sistema",  5000, 30); // 30x R$50
  service.carregarCedulas("sistema",  2000, 40); // 40x R$20
  service.carregarCedulas("sistema",  1000, 50); // 50x R$10
  service.carregarCedulas("sistema",   500, 50); // 50x R$5
  service.carregarCedulas("sistema",   100, 100); // 100x R$1

  // ── 5. Cadastra Contas de Usuário ────────────────────────────────────────
  const repositorioContas = new RepositorioContas();
  repositorioContas.cadastrar(new Conta("001", 500000));  // R$5.000,00
  repositorioContas.cadastrar(new Conta("002", 100000));  // R$1.000,00
  repositorioContas.cadastrar(new Conta("003", 50000));   // R$500,00
  repositorioContas.cadastrar(new Conta("joao", 300000)); // R$3.000,00
  repositorioContas.cadastrar(new Conta("maria", 75000)); // R$750,00

  // ── 6. Inicia o Servidor HTTP (frontend web) ────────────────────────────
  const publicDir = path.join(__dirname, "..", "public");
  const servidor = new ApiServer(service, repositorioContas, publicDir);
  const PORT = 3000;

  process.on("SIGINT", () => {
    console.log("\n\nServidor encerrado.");
    process.exit(0);
  });

  servidor.listen(PORT);
  exec(`start http://localhost:${PORT}`);
}

main();
