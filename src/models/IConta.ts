/**
 * Contrato para a conta de um usuário no sistema de caixa eletrônico.
 */
export interface IConta {
  /** Identificador único para autenticação (ex: número da conta). */
  readonly id: string;

  /** Saldo atual da conta em centavos. */
  readonly saldoEmCentavos: number;

  /** Debita um valor do saldo da conta. */
  debitar(valorEmCentavos: number): void;

  /** Credita um valor ao saldo da conta. */
  creditar(valorEmCentavos: number): void;
}
