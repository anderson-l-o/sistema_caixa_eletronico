/**
 * Tipos de movimentação registrados no sistema.
 */
export type TipoMovimentacao =
  | "SAQUE_REALIZADO"
  | "SAQUE_NEGADO"
  | "SAQUE_IMPOSSIVEL"
  | "CARGA";

/**
 * Representa uma movimentação registrada para uma conta.
 */
export interface Movimentacao {
  readonly id:          number;
  readonly contaId:     string;
  readonly tipo:        TipoMovimentacao;
  readonly valor:       number;       // em centavos
  readonly valorFormatado: string;
  readonly descricao:   string;
  readonly dataHora:    string;       // ISO 8601
}
