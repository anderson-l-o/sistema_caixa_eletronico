import { IConta } from "./IConta";

/**
 * Implementação da conta de usuário.
 */
export class Conta implements IConta {
  readonly id: string;
  private _saldoEmCentavos: number;

  constructor(id: string, saldoInicialEmCentavos: number) {
    if (!id || id.trim() === "") {
      throw new Error("O identificador da conta não pode ser vazio.");
    }
    if (saldoInicialEmCentavos < 0) {
      throw new Error("O saldo inicial não pode ser negativo.");
    }
    this.id = id;
    this._saldoEmCentavos = saldoInicialEmCentavos;
  }

  get saldoEmCentavos(): number {
    return this._saldoEmCentavos;
  }

  /** Retorna o saldo formatado em Reais */
  get saldoFormatado(): string {
    return (this._saldoEmCentavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /**
   * Debita um valor do saldo da conta.
   * Lança erro se saldo insuficiente.
   */
  debitar(valorEmCentavos: number): void {
    if (valorEmCentavos <= 0) {
      throw new Error("O valor a debitar deve ser positivo.");
    }
    if (this._saldoEmCentavos < valorEmCentavos) {
      throw new Error(
        `Saldo insuficiente. Saldo: ${this.saldoFormatado}, ` +
        `Solicitado: ${(valorEmCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      );
    }
    this._saldoEmCentavos -= valorEmCentavos;
  }

  /** Credita um valor ao saldo da conta. */
  creditar(valorEmCentavos: number): void {
    if (valorEmCentavos <= 0) {
      throw new Error("O valor a creditar deve ser positivo.");
    }
    this._saldoEmCentavos += valorEmCentavos;
  }
}
