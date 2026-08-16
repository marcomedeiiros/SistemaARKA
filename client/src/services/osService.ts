import { operations } from '../data/operations';
import { OSStatus, ServiceOrder } from '../types';

/**
 * Ordens de serviço.
 *
 * O fechamento da OS (baixa das peças e geração da conta a receber) é feito no
 * servidor e é idempotente: as marcas `stockDeducted` e `receivableCreated`
 * impedem baixa ou cobrança em duplicidade se o status for alterado de novo.
 */
export const osService = {
  generateOSCode(): Promise<string> {
    return operations.nextCode('os');
  },

  createServiceOrder(
    osData: Omit<
      ServiceOrder,
      'id' | 'code' | 'createdAt' | 'updatedAt' | 'stockDeducted' | 'receivableCreated'
    >,
    userName = 'Técnico'
  ): Promise<ServiceOrder> {
    return operations.createServiceOrder({ ...osData, userName });
  },

  updateServiceOrder(
    id: number,
    osData: Partial<ServiceOrder>,
    userName = 'Técnico'
  ): Promise<ServiceOrder> {
    return operations.updateServiceOrder(id, { ...osData, userName });
  },

  changeStatus(id: number, status: OSStatus, userName = 'Técnico'): Promise<ServiceOrder> {
    return operations.changeOsStatus(id, status, userName);
  }
};
