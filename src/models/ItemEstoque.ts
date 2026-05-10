import { ICedula } from "./ICedula";

/**
 * Representa uma entrada no inventário: uma denominação e sua quantidade em estoque.
 */
export interface ItemEstoque {
  cedula: ICedula;
  quantidade: number;
}
