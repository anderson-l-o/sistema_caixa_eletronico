/**
 * Utilitário de formatação monetária.
 * Centraliza a conversão de centavos para BRL, evitando repetição.
 */
export class Formatador {
  /**
   * Converte um valor em centavos para string formatada em BRL.
   * @param centavos - Valor inteiro em centavos (ex: 10000 → "R$ 100,00")
   */
  static brl(centavos: number): string {
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
}
