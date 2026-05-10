import { Conta } from "./Conta";

/**
 * Repositório em memória de contas de usuários.
 * Responsável por armazenar e recuperar contas pelo identificador único.
 */
export class RepositorioContas {
  private readonly contas: Map<string, Conta> = new Map();

  /** Cadastra uma nova conta. Lança erro se o ID já existir. */
  cadastrar(conta: Conta): void {
    if (this.contas.has(conta.id)) {
      throw new Error(`Já existe uma conta com o ID "${conta.id}".`);
    }
    this.contas.set(conta.id, conta);
  }

  /** Busca uma conta por ID. Retorna undefined se não encontrada. */
  buscarPorId(id: string): Conta | undefined {
    return this.contas.get(id);
  }

  /** Retorna todas as contas cadastradas. */
  listarTodas(): Conta[] {
    return Array.from(this.contas.values());
  }
}
