/**
 * Denominação monetária suportada pelo caixa eletrônico.
 * Cada valor representa centavos para evitar problemas com ponto flutuante.
 * Ex: 50000 = R$500, 100 = R$1,00 (moeda), 25 = R$0,25
 */
export type Denominacao = number;

/**
 * Contrato para uma cédula ou moeda do sistema.
 */
export interface ICedula {
  readonly valorEmCentavos: Denominacao;
  readonly descricao: string;
}
