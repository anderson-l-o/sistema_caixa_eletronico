import { ICedula } from "./ICedula";
import { Cedula } from "./Cedula";

/**
 * Catálogo de denominações disponíveis no sistema.
 * Para adicionar ou remover denominações, basta editar este arquivo
 * sem necessidade de alterar nenhuma outra parte do código central.
 */
export const DENOMINACOES: ICedula[] = [
  new Cedula(50000, "R$ 500,00"),
  new Cedula(20000, "R$ 200,00"),
  new Cedula(10000, "R$ 100,00"),
  new Cedula(5000,  "R$ 50,00"),
  new Cedula(2000,  "R$ 20,00"),
  new Cedula(1000,  "R$ 10,00"),
  new Cedula(500,   "R$ 5,00"),
  new Cedula(200,   "R$ 2,00"),
  new Cedula(100,   "R$ 1,00"),
  new Cedula(50,    "R$ 0,50"),
  new Cedula(25,    "R$ 0,25"),
  new Cedula(10,    "R$ 0,10"),
  new Cedula(5,     "R$ 0,05"),
];
