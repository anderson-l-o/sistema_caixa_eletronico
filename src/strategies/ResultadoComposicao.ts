/**
 * Resultado de uma tentativa de composição de saque.
 */
export interface ResultadoComposicao {
  /** Indica se foi possível compor o valor solicitado. */
  sucesso: boolean;
  /**
   * Mapa de denominação (valorEmCentavos) -> quantidade a usar.
   * Preenchido apenas quando sucesso = true.
   */
  composicao?: Map<number, number>;
  /** Mensagem descritiva do resultado. */
  mensagem: string;
}
