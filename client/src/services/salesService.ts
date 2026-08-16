import { operations } from '../data/operations';
import { Sale } from '../types';

/**
 * Vendas / PDV.
 *
 * A regra fica no servidor: registrar a venda, dar baixa no estoque de cada
 * item e gerar a conta a receber acontecem em uma única transação.
 */
export const salesService = {
  generateSaleCode(): Promise<string> {
    return operations.nextCode('sale');
  },

  createSale(
    saleData: Omit<Sale, 'id' | 'code' | 'createdAt'>,
    sellerName = 'Vendedor'
  ): Promise<Sale> {
    return operations.createSale({ ...saleData, sellerName: saleData.sellerName ?? sellerName });
  },

  /**
   * Cancela a venda preservando o histórico: o registro passa a
   * `status: 'cancelada'`, os itens voltam ao estoque e a conta a receber
   * vinculada é cancelada.
   */
  cancelSale(id: number, userName = 'Sistema'): Promise<Sale> {
    return operations.cancelSale(id, userName);
  }
};
