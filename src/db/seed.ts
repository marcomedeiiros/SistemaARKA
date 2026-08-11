import { db } from './db';

export async function seedDatabase(force = false) {
  const usersCount = await db.users.count();
  if (usersCount > 0 && !force) {
    return;
  }

  if (force) {
    await Promise.all([
      db.users.clear(),
      db.customers.clear(),
      db.suppliers.clear(),
      db.categories.clear(),
      db.products.clear(),
      db.services.clear(),
      db.stockMovements.clear(),
      db.sales.clear(),
      db.serviceOrders.clear(),
      db.accountsReceivable.clear(),
      db.accountsPayable.clear(),
      db.companySettings.clear()
    ]);
  }

  // 1. Seed Users
  const users = [
    {
      name: 'Carlos Oliveira (Admin)',
      email: 'admin@arka.com.br',
      role: 'admin',
      active: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      createdAt: new Date().toISOString()
    },
    {
      name: 'Mariana Santos (Vendedora)',
      email: 'vendas@arka.com.br',
      role: 'seller',
      active: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
      createdAt: new Date().toISOString()
    },
    {
      name: 'Roberto Técnico',
      email: 'tecnico@arka.com.br',
      role: 'technician',
      active: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      createdAt: new Date().toISOString()
    },
    {
      name: 'Fernanda Lima (Financeiro)',
      email: 'financeiro@arka.com.br',
      role: 'financial',
      active: true,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
      createdAt: new Date().toISOString()
    }
  ];
  await db.users.bulkAdd(users);

  // 2. Company Settings
  const companySettings = {
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
    termsAndConditions: 'Garantia de 90 dias para serviços executados e peças substituídas.'
  };
  await db.companySettings.add(companySettings);

  // 3. Suppliers
  const suppliers = [
    {
      name: 'TechComponentes Distribuidora S.A.',
      document: '45.890.123/0001-44',
      phone: '(11) 4004-9988',
      whatsapp: '(11) 99887-1122',
      email: 'comercial@techcomponentes.com.br',
      address: 'Rua Sta Ifigênia, 450 - Centro, SP',
      notes: 'Fornecedor principal de peças e hardwares eletrônicos.',
      createdAt: new Date().toISOString()
    },
    {
      name: 'Mega Suprimentos Empresariais LTDA',
      document: '18.234.567/0001-88',
      phone: '(11) 3322-5544',
      whatsapp: '(11) 97766-5544',
      email: 'pedidos@megasuprimentos.com.br',
      address: 'Av. das Nações Unidas, 12901 - Brooklin, SP',
      notes: 'Fornecedor de cabos, conectores e insumos.',
      createdAt: new Date().toISOString()
    }
  ];
  const supplierIds = await db.suppliers.bulkAdd(suppliers, { allKeys: true });

  // 4. Categories
  const categories = [
    { name: 'Hardware & Informática', description: 'Peças e periféricos para computadores e notebooks' },
    { name: 'Redes & Conectividade', description: 'Roteadores, switches e cabos de rede' },
    { name: 'Segurança Eletrônica', description: 'Câmeras, DVRs e sensores' },
    { name: 'Insumos & Acessórios', description: 'Cabos, conectores, colas e ferramentas' }
  ];
  const categoryIds = await db.categories.bulkAdd(categories, { allKeys: true });

  // 5. Products
  const products = [
    {
      sku: 'PRD-001',
      name: 'SSD NVMe M.2 1TB Kingston NV2',
      description: 'Leitura de até 3500MB/s e gravação de até 2100MB/s',
      categoryId: categoryIds[0],
      categoryName: 'Hardware & Informática',
      brand: 'Kingston',
      unit: 'UN',
      costPrice: 280.00,
      salePrice: 450.00,
      currentStock: 18,
      minStock: 5,
      supplierId: supplierIds[0],
      supplierName: 'TechComponentes Distribuidora S.A.',
      barcode: '789890123401',
      imageUrl: 'https://images.unsplash.com/photo-1597872250970-45d2906b3e34?auto=format&fit=crop&w=300&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      sku: 'PRD-002',
      name: 'Memória RAM 16GB DDR4 3200MHz Corsair Vengeance',
      description: 'Memória de alto desempenho para notebooks e desktops',
      categoryId: categoryIds[0],
      categoryName: 'Hardware & Informática',
      brand: 'Corsair',
      unit: 'UN',
      costPrice: 190.00,
      salePrice: 320.00,
      currentStock: 12,
      minStock: 4,
      supplierId: supplierIds[0],
      supplierName: 'TechComponentes Distribuidora S.A.',
      barcode: '789890123402',
      imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=300&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      sku: 'PRD-003',
      name: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit',
      description: 'Dual Band AX1500 com tecnologia Wi-Fi 6',
      categoryId: categoryIds[1],
      categoryName: 'Redes & Conectividade',
      brand: 'TP-Link',
      unit: 'UN',
      costPrice: 160.00,
      salePrice: 280.00,
      currentStock: 3, // Estoque baixo!
      minStock: 5,
      supplierId: supplierIds[1],
      supplierName: 'Mega Suprimentos Empresariais LTDA',
      barcode: '789890123403',
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=300&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      sku: 'PRD-004',
      name: 'Fonte de Alimentação ATX 600W 80 Plus Bronze EVGA',
      description: 'Fonte com certificação 80 Plus Bronze e PFC ativo',
      categoryId: categoryIds[0],
      categoryName: 'Hardware & Informática',
      brand: 'EVGA',
      unit: 'UN',
      costPrice: 220.00,
      salePrice: 380.00,
      currentStock: 2, // Estoque baixo!
      minStock: 5,
      supplierId: supplierIds[0],
      supplierName: 'TechComponentes Distribuidora S.A.',
      barcode: '789890123404',
      imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=300&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      sku: 'PRD-005',
      name: 'Cabo de Rede UTP Cat6 100m Furukawa',
      description: 'Caixa de cabo de rede de alta velocidade 100% cobre',
      categoryId: categoryIds[1],
      categoryName: 'Redes & Conectividade',
      brand: 'Furukawa',
      unit: 'CX',
      costPrice: 180.00,
      salePrice: 310.00,
      currentStock: 7,
      minStock: 3,
      supplierId: supplierIds[1],
      supplierName: 'Mega Suprimentos Empresariais LTDA',
      barcode: '789890123405',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      sku: 'PRD-006',
      name: 'Pasta Térmica Alta Condutividade Noctua NT-H1 3.5g',
      description: 'Pasta térmica profissional para processadores e placas de vídeo',
      categoryId: categoryIds[3],
      categoryName: 'Insumos & Acessórios',
      brand: 'Noctua',
      unit: 'UN',
      costPrice: 35.00,
      salePrice: 75.00,
      currentStock: 25,
      minStock: 8,
      supplierId: supplierIds[1],
      supplierName: 'Mega Suprimentos Empresariais LTDA',
      barcode: '789890123406',
      imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=300&q=80',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  const productIds = await db.products.bulkAdd(products, { allKeys: true });

  // 6. Services Catalog
  const services = [
    {
      name: 'Formatação e Instalação de Sistema Operacional',
      description: 'Formatação limpa, instalação do Windows/Linux, drivers e programas essenciais.',
      category: 'Software & SO',
      price: 150.00,
      estimatedDuration: '2h',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      name: 'Limpeza Preventiva e Troca de Pasta Térmica',
      description: 'Desmontagem completa, remoção de poeira e aplicação de pasta térmica de alta performance.',
      category: 'Manutenção',
      price: 120.00,
      estimatedDuration: '1h 30min',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      name: 'Diagnóstico Técnico Avançado de Hardware',
      description: 'Testes de bancada para identificação de falhas em placa-mãe, memória ou fonte.',
      category: 'Diagnóstico',
      price: 80.00,
      estimatedDuration: '1h',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      name: 'Instalação e Configuração de Redes Wi-Fi Empresariais',
      description: 'Passagem de cabos, crimpagem e configuração de pontos de acesso.',
      category: 'Redes',
      price: 250.00,
      estimatedDuration: '3h',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];
  await db.services.bulkAdd(services);

  // 7. Customers
  const customers = [
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  const customerIds = await db.customers.bulkAdd(customers, { allKeys: true });

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // 8. Service Orders (OS)
  const serviceOrders = [
    {
      code: 'OS #000001',
      customerId: customerIds[0],
      customerName: 'Grupo Comercial Alfa LTDA',
      customerPhone: '(11) 2233-4455',
      customerDocument: '23.456.789/0001-12',
      technicianName: 'Roberto Técnico',
      openingDate: lastWeek,
      completionDate: yesterday,
      status: 'concluida' as const,
      problemDescription: 'Servidor de arquivos desligando sozinho após 10 minutos de uso.',
      diagnosis: 'Fonte de alimentação defeituosa e pasta térmica totalmente ressecada.',
      executedSolution: 'Substituição da fonte de 600W EVGA, limpeza interna e troca de pasta térmica.',
      products: [
        {
          productId: productIds[3],
          productName: 'Fonte de Alimentação ATX 600W 80 Plus Bronze EVGA',
          sku: 'PRD-004',
          quantity: 1,
          unitPrice: 380.00,
          discount: 0,
          total: 380.00
        },
        {
          productId: productIds[5],
          productName: 'Pasta Térmica Alta Condutividade Noctua NT-H1 3.5g',
          sku: 'PRD-006',
          quantity: 1,
          unitPrice: 75.00,
          discount: 5.00,
          total: 70.00
        }
      ],
      services: [
        {
          name: 'Limpeza Preventiva e Troca de Pasta Térmica',
          quantity: 1,
          unitPrice: 120.00,
          total: 120.00
        },
        {
          name: 'Diagnóstico Técnico Avançado de Hardware',
          quantity: 1,
          unitPrice: 80.00,
          total: 80.00
        }
      ],
      productsTotal: 450.00,
      servicesTotal: 200.00,
      discount: 50.00,
      surcharge: 0,
      total: 600.00,
      stockDeducted: true,
      receivableCreated: true,
      notes: 'Equipamento testado sob estresse por 4 horas com temperaturas normais.',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      code: 'OS #000002',
      customerId: customerIds[1],
      customerName: 'Dr. Lucas Mendes Silva',
      customerPhone: '(11) 3099-8877',
      customerDocument: '345.678.901-22',
      technicianName: 'Roberto Técnico',
      openingDate: todayStr,
      status: 'em_execucao' as const,
      problemDescription: 'Notebook lento ao iniciar e abrir programas do consultório.',
      diagnosis: 'HD mecânico antigo apresentando bad sectors. Recomendado upgrade para SSD 1TB.',
      products: [
        {
          productId: productIds[0],
          productName: 'SSD NVMe M.2 1TB Kingston NV2',
          sku: 'PRD-001',
          quantity: 1,
          unitPrice: 450.00,
          discount: 0,
          total: 450.00
        }
      ],
      services: [
        {
          name: 'Formatação e Instalação de Sistema Operacional',
          quantity: 1,
          unitPrice: 150.00,
          total: 150.00
        }
      ],
      productsTotal: 450.00,
      servicesTotal: 150.00,
      discount: 0,
      surcharge: 0,
      total: 600.00,
      stockDeducted: false,
      receivableCreated: false,
      notes: 'Aguardando backup dos arquivos do cliente para concluir formatação.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  const osIds = await db.serviceOrders.bulkAdd(serviceOrders, { allKeys: true });

  // 9. Sales (Vendas / PDV)
  const sales = [
    {
      code: 'Venda #000001',
      customerId: customerIds[2],
      customerName: 'Empório & Mercearia São José',
      items: [
        {
          productId: productIds[2],
          productName: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit',
          sku: 'PRD-003',
          unit: 'UN',
          quantity: 2,
          unitPrice: 280.00,
          discount: 0,
          subtotal: 560.00
        },
        {
          productId: productIds[4],
          productName: 'Cabo de Rede UTP Cat6 100m Furukawa',
          sku: 'PRD-005',
          unit: 'CX',
          quantity: 1,
          unitPrice: 310.00,
          discount: 10.00,
          subtotal: 300.00
        }
      ],
      subtotal: 870.00,
      discount: 10.00,
      surcharge: 0,
      total: 860.00,
      paymentMethod: 'pix' as const,
      installments: 1,
      status: 'concluida' as const,
      sellerName: 'Mariana Santos',
      notes: 'Venda com emissão de nota fiscal rápida.',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      code: 'Venda #000002',
      customerId: customerIds[1],
      customerName: 'Dr. Lucas Mendes Silva',
      items: [
        {
          productId: productIds[1],
          productName: 'Memória RAM 16GB DDR4 3200MHz Corsair Vengeance',
          sku: 'PRD-002',
          unit: 'UN',
          quantity: 1,
          unitPrice: 320.00,
          discount: 20.00,
          subtotal: 300.00
        }
      ],
      subtotal: 320.00,
      discount: 20.00,
      surcharge: 0,
      total: 300.00,
      paymentMethod: 'cartao_credito' as const,
      installments: 2,
      status: 'concluida' as const,
      sellerName: 'Mariana Santos',
      notes: 'Venda efetuada na loja.',
      createdAt: new Date().toISOString()
    }
  ];
  const saleIds = await db.sales.bulkAdd(sales, { allKeys: true });

  // 10. Stock Movements Audit History
  await db.stockMovements.bulkAdd([
    {
      productId: productIds[0],
      productName: 'SSD NVMe M.2 1TB Kingston NV2',
      type: 'entrada',
      quantity: 20,
      previousStock: 0,
      newStock: 20,
      reason: 'Carga inicial de estoque / Nota Fiscal 9941',
      referenceType: 'manual',
      userName: 'Carlos Oliveira (Admin)',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      productId: productIds[3],
      productName: 'Fonte de Alimentação ATX 600W 80 Plus Bronze EVGA',
      type: 'os',
      quantity: 1,
      previousStock: 3,
      newStock: 2,
      reason: 'Saída - Produto utilizado na OS #000001',
      referenceType: 'os',
      referenceId: osIds[0],
      userName: 'Roberto Técnico',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      productId: productIds[2],
      productName: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit',
      type: 'venda',
      quantity: 2,
      previousStock: 5,
      newStock: 3,
      reason: 'Saída - Produto vendido na Venda #000001',
      referenceType: 'sale',
      referenceId: saleIds[0],
      userName: 'Mariana Santos',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    }
  ]);

  // 11. Accounts Receivable (Contas a Receber)
  await db.accountsReceivable.bulkAdd([
    {
      code: 'REC #000001',
      customerId: customerIds[0],
      customerName: 'Grupo Comercial Alfa LTDA',
      description: 'Lançamento automático referente à OS #000001',
      amount: 600.00,
      paidAmount: 600.00,
      dueDate: yesterday,
      paymentDate: yesterday,
      paymentMethod: 'pix',
      status: 'pago',
      originType: 'os',
      originId: osIds[0],
      originCode: 'OS #000001',
      category: 'Ordem de Serviço',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      code: 'REC #000002',
      customerId: customerIds[2],
      customerName: 'Empório & Mercearia São José',
      description: 'Lançamento automático referente à Venda #000001',
      amount: 860.00,
      paidAmount: 860.00,
      dueDate: todayStr,
      paymentDate: todayStr,
      paymentMethod: 'pix',
      status: 'pago',
      originType: 'sale',
      originId: saleIds[0],
      originCode: 'Venda #000001',
      category: 'Vendas',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      code: 'REC #000003',
      customerId: customerIds[1],
      customerName: 'Dr. Lucas Mendes Silva',
      description: 'Lançamento referente à Venda #000002',
      amount: 300.00,
      paidAmount: 0.00,
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'pendente',
      originType: 'sale',
      originId: saleIds[1],
      originCode: 'Venda #000002',
      category: 'Vendas',
      createdAt: new Date().toISOString()
    }
  ]);

  // 12. Accounts Payable (Contas a Pagar)
  await db.accountsPayable.bulkAdd([
    {
      code: 'PAG #000001',
      supplierId: supplierIds[0],
      supplierName: 'TechComponentes Distribuidora S.A.',
      description: 'Compra de peças para estoque - NF 9941',
      category: 'Fornecedor / Estoque',
      amount: 1450.00,
      paidAmount: 1450.00,
      dueDate: yesterday,
      paymentDate: yesterday,
      paymentMethod: 'transferencia',
      status: 'pago',
      notes: 'Pagamento efetuado via TED bancária.',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      code: 'PAG #000002',
      supplierName: 'Enel Distribuição SP',
      description: 'Conta de Energia Elétrica - Mês Atual',
      category: 'Energia / Utilidades',
      amount: 380.50,
      paidAmount: 0.00,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: 'pendente',
      createdAt: new Date().toISOString()
    }
  ]);
}
