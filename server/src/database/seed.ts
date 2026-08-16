import { transaction } from './connection.js';
import { repositories, tableOrder, repositoryFor } from './repositories.js';
import type { TableName } from '../types.js';

const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString();
const day = (offsetDays = 0) => iso(offsetDays).split('T')[0]!;

/** Remove todos os registros de todas as coleções. */
export function clearAllTables(): void {
  for (const name of tableOrder) {
    repositoryFor(name)?.clear();
  }
}

/** `true` quando o banco ainda não tem nenhum usuário cadastrado. */
export function isDatabaseEmpty(): boolean {
  return repositories.users.count() === 0;
}

/** Quantidade esperada de registros por coleção após o seed. */
const EXPECTED_COUNTS: Partial<Record<TableName, number>> = {
  users: 4,
  companySettings: 1,
  suppliers: 2,
  categories: 4,
  products: 6,
  services: 4,
  customers: 3,
  serviceOrders: 2,
  sales: 2,
  stockMovements: 3,
  accountsReceivable: 3,
  accountsPayable: 2
};

/**
 * Confere o resultado do seed antes de confirmar a transação.
 *
 * Sem isso, um seed parcial (alguma coleção terminando vazia) passaria em
 * silêncio e a aplicação subiria com dados incompletos.
 */
function verifySeed(): void {
  const problems: string[] = [];

  for (const [name, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = repositoryFor(name)?.count() ?? 0;
    if (actual !== expected) {
      problems.push(`${name}: esperado ${expected}, obtido ${actual}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Seed inconsistente ${problems.join('; ')}`);
  }
}

/**
 * Popula o banco com o catálogo de demonstração do Sistemas Arka.
 * Sempre limpa antes, para o resultado ser determinístico.
 */
export function seedDatabase(): void {
  transaction(() => {
    clearAllTables();

    const now = iso();
    const todayStr = day();
    const yesterday = day(-1);
    const lastWeek = day(-7);

    // 1. Usuários
    repositories.users.insertMany([
      {
        name: 'Carlos Oliveira (Admin)',
        email: 'admin@arka.com.br',
        role: 'admin',
        active: true,
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        createdAt: now
      },
      {
        name: 'Mariana Santos (Vendedora)',
        email: 'vendas@arka.com.br',
        role: 'seller',
        active: true,
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
        createdAt: now
      },
      {
        name: 'Roberto Técnico',
        email: 'tecnico@arka.com.br',
        role: 'technician',
        active: true,
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
        createdAt: now
      },
      {
        name: 'Fernanda Lima (Financeiro)',
        email: 'financeiro@arka.com.br',
        role: 'financial',
        active: true,
        avatarUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
        createdAt: now
      }
    ]);

    // 2. Dados da empresa
    repositories.companySettings.insert({
      name: 'Arka Soluções Empresariais LTDA',
      tradeName: 'Sistemas Arka',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 3456-7890',
      whatsapp: '(11) 98765-4321',
      email: 'contato@sistemasarka.com.br',
      address: 'Av. Paulista, 1000 - Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      allowNegativeStock: false,
      termsAndConditions:
        'Garantia de 90 dias para serviços executados e peças substituídas.'
    });

    // 3. Fornecedores
    const suppliers = repositories.suppliers.insertMany([
      {
        name: 'TechComponentes Distribuidora S.A.',
        document: '45.890.123/0001-44',
        phone: '(11) 4004-9988',
        whatsapp: '(11) 99887-1122',
        email: 'comercial@techcomponentes.com.br',
        address: 'Rua Sta Ifigênia, 450 - Centro, SP',
        notes: 'Fornecedor principal de peças e hardwares eletrônicos.',
        createdAt: now
      },
      {
        name: 'Mega Suprimentos Empresariais LTDA',
        document: '18.234.567/0001-88',
        phone: '(11) 3322-5544',
        whatsapp: '(11) 97766-5544',
        email: 'pedidos@megasuprimentos.com.br',
        address: 'Av. das Nações Unidas, 12901 - Brooklin, SP',
        notes: 'Fornecedor de cabos, conectores e insumos.',
        createdAt: now
      }
    ]);

    // 4. Categorias
    const categories = repositories.categories.insertMany([
      {
        name: 'Hardware & Informática',
        description: 'Peças e periféricos para computadores e notebooks'
      },
      { name: 'Redes & Conectividade', description: 'Roteadores, switches e cabos de rede' },
      { name: 'Segurança Eletrônica', description: 'Câmeras, DVRs e sensores' },
      { name: 'Insumos & Acessórios', description: 'Cabos, conectores, colas e ferramentas' }
    ]);

    // 5. Produtos
    const products = repositories.products.insertMany([
      {
        sku: 'PRD-001',
        name: 'SSD NVMe M.2 1TB Kingston NV2',
        description: 'Leitura de até 3500MB/s e gravação de até 2100MB/s',
        categoryId: categories[0]!.id!,
        categoryName: 'Hardware & Informática',
        brand: 'Kingston',
        unit: 'UN',
        costPrice: 280,
        salePrice: 450,
        currentStock: 18,
        minStock: 5,
        supplierId: suppliers[0]!.id!,
        supplierName: 'TechComponentes Distribuidora S.A.',
        barcode: '789890123401',
        imageUrl:
          'https://images.unsplash.com/photo-1597872250970-45d2906b3e34?auto=format&fit=crop&w=300&q=80',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'PRD-002',
        name: 'Memória RAM 16GB DDR4 3200MHz Corsair Vengeance',
        description: 'Memória de alto desempenho para notebooks e desktops',
        categoryId: categories[0]!.id!,
        categoryName: 'Hardware & Informática',
        brand: 'Corsair',
        unit: 'UN',
        costPrice: 190,
        salePrice: 320,
        currentStock: 12,
        minStock: 4,
        supplierId: suppliers[0]!.id!,
        supplierName: 'TechComponentes Distribuidora S.A.',
        barcode: '789890123402',
        imageUrl:
          'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=300&q=80',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'PRD-003',
        name: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit',
        description: 'Dual Band AX1500 com tecnologia Wi-Fi 6',
        categoryId: categories[1]!.id!,
        categoryName: 'Redes & Conectividade',
        brand: 'TP-Link',
        unit: 'UN',
        costPrice: 160,
        salePrice: 280,
        currentStock: 3, // estoque baixo de propósito
        minStock: 5,
        supplierId: suppliers[1]!.id!,
        supplierName: 'Mega Suprimentos Empresariais LTDA',
        barcode: '789890123403',
        imageUrl:
          'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=80',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'PRD-004',
        name: 'Fonte de Alimentação ATX 600W 80 Plus Bronze EVGA',
        description: 'Fonte com certificação 80 Plus Bronze e PFC ativo',
        categoryId: categories[0]!.id!,
        categoryName: 'Hardware & Informática',
        brand: 'EVGA',
        unit: 'UN',
        costPrice: 220,
        salePrice: 380,
        currentStock: 2, // estoque baixo de propósito
        minStock: 5,
        supplierId: suppliers[0]!.id!,
        supplierName: 'TechComponentes Distribuidora S.A.',
        barcode: '789890123404',
        imageUrl:
          'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=300&q=80',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'PRD-005',
        name: 'Cabo de Rede UTP Cat6 100m Furukawa',
        description: 'Caixa de cabo de rede de alta velocidade 100% cobre',
        categoryId: categories[1]!.id!,
        categoryName: 'Redes & Conectividade',
        brand: 'Furukawa',
        unit: 'CX',
        costPrice: 180,
        salePrice: 310,
        currentStock: 7,
        minStock: 3,
        supplierId: suppliers[1]!.id!,
        supplierName: 'Mega Suprimentos Empresariais LTDA',
        barcode: '789890123405',
        imageUrl:
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        sku: 'PRD-006',
        name: 'Pasta Térmica Alta Condutividade Noctua NT-H1 3.5g',
        description: 'Pasta térmica profissional para processadores e placas de vídeo',
        categoryId: categories[3]!.id!,
        categoryName: 'Insumos & Acessórios',
        brand: 'Noctua',
        unit: 'UN',
        costPrice: 35,
        salePrice: 75,
        currentStock: 25,
        minStock: 8,
        supplierId: suppliers[1]!.id!,
        supplierName: 'Mega Suprimentos Empresariais LTDA',
        barcode: '789890123406',
        imageUrl:
          'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=300&q=80',
        active: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 6. Catálogo de serviços
    repositories.services.insertMany([
      {
        name: 'Formatação e Instalação de Sistema Operacional',
        description:
          'Formatação limpa, instalação do Windows/Linux, drivers e programas essenciais.',
        category: 'Software & SO',
        price: 150,
        estimatedDuration: '2h',
        active: true,
        createdAt: now
      },
      {
        name: 'Limpeza Preventiva e Troca de Pasta Térmica',
        description:
          'Desmontagem completa, remoção de poeira e aplicação de pasta térmica de alta performance.',
        category: 'Manutenção',
        price: 120,
        estimatedDuration: '1h 30min',
        active: true,
        createdAt: now
      },
      {
        name: 'Diagnóstico Técnico Avançado de Hardware',
        description:
          'Testes de bancada para identificação de falhas em placa-mãe, memória ou fonte.',
        category: 'Diagnóstico',
        price: 80,
        estimatedDuration: '1h',
        active: true,
        createdAt: now
      },
      {
        name: 'Instalação e Configuração de Redes Wi-Fi Empresariais',
        description: 'Passagem de cabos, crimpagem e configuração de pontos de acesso.',
        category: 'Redes',
        price: 250,
        estimatedDuration: '3h',
        active: true,
        createdAt: now
      }
    ]);

    // 7. Clientes
    const customers = repositories.customers.insertMany([
      {
        name: 'Grupo Comercial Alfa LTDA',
        document: '23.456.789/0001-12',
        phone: '(11) 2233-4455',
        whatsapp: '(11) 98877-6655',
        email: 'ti@grupoalfa.com.br',
        zipCode: '04538-132',
        address: 'Rua Funchal',
        number: '418',
        neighborhood: 'Vila Olímpia',
        city: 'São Paulo',
        state: 'SP',
        notes: 'Cliente corporativo vip. Faturamento em até 30 dias.',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Dr. Lucas Mendes Silva',
        document: '345.678.901-22',
        phone: '(11) 3099-8877',
        whatsapp: '(11) 97123-4567',
        email: 'lucas.mendes@clinica.com.br',
        zipCode: '01415-000',
        address: 'Alameda Santos',
        number: '1200',
        neighborhood: 'Cerqueira César',
        city: 'São Paulo',
        state: 'SP',
        notes: 'Manutenção periódica nos computadores do consultório.',
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Empório & Mercearia São José',
        document: '88.990.112/0001-33',
        phone: '(11) 3221-9090',
        whatsapp: '(11) 99112-2334',
        email: 'financeiro@emporiosaojose.com.br',
        zipCode: '03102-000',
        address: 'Rua da Mooca',
        number: '1500',
        neighborhood: 'Mooca',
        city: 'São Paulo',
        state: 'SP',
        notes: 'Sistema de caixas e PDV.',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 8. Ordens de serviço
    const serviceOrders = repositories.serviceOrders.insertMany([
      {
        code: 'OS #000001',
        customerId: customers[0]!.id!,
        customerName: 'Grupo Comercial Alfa LTDA',
        customerPhone: '(11) 2233-4455',
        customerDocument: '23.456.789/0001-12',
        technicianName: 'Roberto Técnico',
        openingDate: lastWeek,
        completionDate: yesterday,
        status: 'concluida',
        problemDescription:
          'Servidor de arquivos desligando sozinho após 10 minutos de uso.',
        requestedService:
          '1. Testar a fonte em bancada e confirmar a falha\n' +
          '2. Substituir a fonte por uma de 600W com certificação 80 Plus\n' +
          '3. Fazer limpeza interna completa e trocar a pasta térmica\n' +
          '4. Rodar teste de estresse por no mínimo 4 horas monitorando temperatura',
        diagnosis: 'Fonte de alimentação defeituosa e pasta térmica totalmente ressecada.',
        executedSolution:
          'Substituição da fonte de 600W EVGA, limpeza interna e troca de pasta térmica.',
        products: [
          {
            productId: products[3]!.id!,
            productName: 'Fonte de Alimentação ATX 600W 80 Plus Bronze EVGA',
            sku: 'PRD-004',
            quantity: 1,
            unitPrice: 380,
            discount: 0,
            total: 380
          },
          {
            productId: products[5]!.id!,
            productName: 'Pasta Térmica Alta Condutividade Noctua NT-H1 3.5g',
            sku: 'PRD-006',
            quantity: 1,
            unitPrice: 75,
            discount: 5,
            total: 70
          }
        ],
        services: [
          {
            name: 'Limpeza Preventiva e Troca de Pasta Térmica',
            quantity: 1,
            unitPrice: 120,
            total: 120
          },
          {
            name: 'Diagnóstico Técnico Avançado de Hardware',
            quantity: 1,
            unitPrice: 80,
            total: 80
          }
        ],
        productsTotal: 450,
        servicesTotal: 200,
        discount: 50,
        surcharge: 0,
        total: 600,
        stockDeducted: true,
        receivableCreated: true,
        notes: 'Equipamento testado sob estresse por 4 horas com temperaturas normais.',
        createdAt: iso(-7),
        updatedAt: now
      },
      {
        code: 'OS #000002',
        customerId: customers[1]!.id!,
        customerName: 'Dr. Lucas Mendes Silva',
        customerPhone: '(11) 3099-8877',
        customerDocument: '345.678.901-22',
        technicianName: 'Roberto Técnico',
        openingDate: todayStr,
        status: 'em_execucao',
        problemDescription: 'Notebook lento ao iniciar e abrir programas do consultório.',
        requestedService:
          '1. Fazer backup completo dos arquivos do usuário antes de qualquer intervenção\n' +
          '2. Substituir o HD pelo SSD NVMe de 1TB\n' +
          '3. Instalar o Windows, drivers e os programas do consultório\n' +
          '4. Restaurar o backup e conferir com o cliente antes de entregar',
        diagnosis:
          'HD mecânico antigo apresentando bad sectors. Recomendado upgrade para SSD 1TB.',
        products: [
          {
            productId: products[0]!.id!,
            productName: 'SSD NVMe M.2 1TB Kingston NV2',
            sku: 'PRD-001',
            quantity: 1,
            unitPrice: 450,
            discount: 0,
            total: 450
          }
        ],
        services: [
          {
            name: 'Formatação e Instalação de Sistema Operacional',
            quantity: 1,
            unitPrice: 150,
            total: 150
          }
        ],
        productsTotal: 450,
        servicesTotal: 150,
        discount: 0,
        surcharge: 0,
        total: 600,
        stockDeducted: false,
        receivableCreated: false,
        notes: 'Aguardando backup dos arquivos do cliente para concluir formatação.',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 9. Vendas
    const sales = repositories.sales.insertMany([
      {
        code: 'Venda #000001',
        customerId: customers[2]!.id!,
        customerName: 'Empório & Mercearia São José',
        items: [
          {
            productId: products[2]!.id!,
            productName: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit',
            sku: 'PRD-003',
            unit: 'UN',
            quantity: 2,
            unitPrice: 280,
            discount: 0,
            subtotal: 560
          },
          {
            productId: products[4]!.id!,
            productName: 'Cabo de Rede UTP Cat6 100m Furukawa',
            sku: 'PRD-005',
            unit: 'CX',
            quantity: 1,
            unitPrice: 310,
            discount: 10,
            subtotal: 300
          }
        ],
        subtotal: 870,
        discount: 10,
        surcharge: 0,
        total: 860,
        paymentMethod: 'pix',
        installments: 1,
        status: 'concluida',
        sellerName: 'Mariana Santos',
        notes: 'Venda com emissão de nota fiscal rápida.',
        createdAt: iso(-3)
      },
      {
        code: 'Venda #000002',
        customerId: customers[1]!.id!,
        customerName: 'Dr. Lucas Mendes Silva',
        items: [
          {
            productId: products[1]!.id!,
            productName: 'Memória RAM 16GB DDR4 3200MHz Corsair Vengeance',
            sku: 'PRD-002',
            unit: 'UN',
            quantity: 1,
            unitPrice: 320,
            discount: 20,
            subtotal: 300
          }
        ],
        subtotal: 320,
        discount: 20,
        surcharge: 0,
        total: 300,
        paymentMethod: 'cartao_credito',
        installments: 2,
        status: 'concluida',
        sellerName: 'Mariana Santos',
        notes: 'Venda efetuada na loja.',
        createdAt: now
      }
    ]);

    // 10. Histórico de movimentações de estoque
    repositories.stockMovements.insertMany([
      {
        productId: products[0]!.id!,
        productName: 'SSD NVMe M.2 1TB Kingston NV2',
        type: 'entrada',
        quantity: 20,
        previousStock: 0,
        newStock: 20,
        reason: 'Carga inicial de estoque / Nota Fiscal 9941',
        referenceType: 'manual',
        userName: 'Carlos Oliveira (Admin)',
        createdAt: iso(-10)
      },
      {
        productId: products[3]!.id!,
        productName: 'Fonte de Alimentação ATX 600W 80 Plus Bronze EVGA',
        type: 'os',
        quantity: 1,
        previousStock: 3,
        newStock: 2,
        reason: 'Saída - Produto utilizado na OS #000001',
        referenceType: 'os',
        referenceId: serviceOrders[0]!.id!,
        userName: 'Roberto Técnico',
        createdAt: iso(-1)
      },
      {
        productId: products[2]!.id!,
        productName: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit',
        type: 'venda',
        quantity: 2,
        previousStock: 5,
        newStock: 3,
        reason: 'Saída - Produto vendido na Venda #000001',
        referenceType: 'sale',
        referenceId: sales[0]!.id!,
        userName: 'Mariana Santos',
        createdAt: iso(-3)
      }
    ]);

    // 11. Contas a receber
    repositories.accountsReceivable.insertMany([
      {
        code: 'REC #000001',
        customerId: customers[0]!.id!,
        customerName: 'Grupo Comercial Alfa LTDA',
        description: 'Lançamento automático referente à OS #000001',
        amount: 600,
        paidAmount: 600,
        dueDate: yesterday,
        paymentDate: yesterday,
        paymentMethod: 'pix',
        status: 'pago',
        originType: 'os',
        originId: serviceOrders[0]!.id!,
        originCode: 'OS #000001',
        category: 'Ordem de Serviço',
        createdAt: iso(-1)
      },
      {
        code: 'REC #000002',
        customerId: customers[2]!.id!,
        customerName: 'Empório & Mercearia São José',
        description: 'Lançamento automático referente à Venda #000001',
        amount: 860,
        paidAmount: 860,
        dueDate: todayStr,
        paymentDate: todayStr,
        paymentMethod: 'pix',
        status: 'pago',
        originType: 'sale',
        originId: sales[0]!.id!,
        originCode: 'Venda #000001',
        category: 'Vendas',
        createdAt: iso(-3)
      },
      {
        code: 'REC #000003',
        customerId: customers[1]!.id!,
        customerName: 'Dr. Lucas Mendes Silva',
        description: 'Lançamento referente à Venda #000002',
        amount: 300,
        paidAmount: 0,
        dueDate: day(15),
        status: 'pendente',
        originType: 'sale',
        originId: sales[1]!.id!,
        originCode: 'Venda #000002',
        category: 'Vendas',
        createdAt: now
      }
    ]);

    // 12. Contas a pagar
    repositories.accountsPayable.insertMany([
      {
        code: 'PAG #000001',
        supplierId: suppliers[0]!.id!,
        supplierName: 'TechComponentes Distribuidora S.A.',
        description: 'Compra de peças para estoque - NF 9941',
        category: 'Fornecedor / Estoque',
        amount: 1450,
        paidAmount: 1450,
        dueDate: yesterday,
        paymentDate: yesterday,
        paymentMethod: 'transferencia',
        status: 'pago',
        notes: 'Pagamento efetuado via TED bancária.',
        createdAt: iso(-10)
      },
      {
        code: 'PAG #000002',
        supplierName: 'Enel Distribuição SP',
        description: 'Conta de Energia Elétrica - Mês Atual',
        category: 'Energia / Utilidades',
        amount: 380.5,
        paidAmount: 0,
        dueDate: day(5),
        status: 'pendente',
        createdAt: now
      }
    ]);

    // Falha alto e reverte tudo se alguma coleção não ficou como esperado.
    verifySeed();
  });
}
