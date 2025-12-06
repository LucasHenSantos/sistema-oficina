export {};

declare global {
  interface Window {
    electronAPI: {
      // --- KPIS DO DASHBOARD (TIPAGEM CORRIGIDA) ---
      getDailyRevenue: () => Promise<number>;
      countLowStock: () => Promise<number>;
      
      // --- CONFIGURAÇÕES/UTILS ---
      getConfig: (key: string) => Promise<any>;
      setConfig: (key: string, value: any) => Promise<any>;
      
      // --- CLIENTES CRUD ---
      getClientes: () => Promise<any[]>;
      addCliente: (cliente: any) => Promise<any>;
      updateCliente: (cliente: any) => Promise<any>;
      deleteCliente: (id: number) => Promise<boolean>;

      // --- VEÍCULOS CRUD ---
      getVeiculos: () => Promise<any[]>;
      addVeiculo: (veiculo: any) => Promise<any>;
      updateVeiculo: (veiculo: any) => Promise<any>;
      deleteVeiculo: (id: number) => Promise<boolean>;

      // --- PRODUTOS CRUD ---
      getProdutos: () => Promise<any[]>;
      addProduto: (produto: any) => Promise<any>;
      updateProduto: (produto: any) => Promise<any>;
      deleteProduto: (id: number) => Promise<boolean>;

      // --- SERVIÇOS CRUD ---
      getServicos: () => Promise<any[]>;
      addServico: (servico: any) => Promise<any>;
      updateServico: (servico: any) => Promise<any>;
      deleteServico: (id: number) => Promise<boolean>;
      
      // --- ORÇAMENTOS CRUD ---
      getOrcamentos: () => Promise<any[]>;
      addOrcamento: (budget: any) => Promise<any>;
      updateOrcamento: (budget: any) => Promise<any>;
      deleteOrcamento: (id: number) => Promise<boolean>;

      // --- ORDENS DE SERVIÇO CRUD ---
      getOS: () => Promise<any[]>;
      addOS: (order: any) => Promise<any>;
      updateOS: (order: any) => Promise<any>;
      deleteOS: (id: number) => Promise<boolean>;
    };
  }
}