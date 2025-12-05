export {};

declare global {
  interface Window {
    electronAPI: {
      // --- CLIENTES CRUD ---
      getClientes: () => Promise<any[]>;
      addCliente: (cliente: any) => Promise<any>;
      updateCliente: (cliente: any) => Promise<any>;
      deleteCliente: (id: number) => Promise<boolean>; // Retorna boolean para sucesso/falha

      // --- VEÍCULOS CRUD (ADICIONADO) ---
      getVeiculos: () => Promise<any[]>;
      addVeiculo: (veiculo: any) => Promise<any>;
      updateVeiculo: (veiculo: any) => Promise<any>;
      deleteVeiculo: (id: number) => Promise<boolean>; // Retorna boolean para sucesso/falha

      getProdutos: () => Promise<any[]>;
      addProduto: (produto: any) => Promise<any>;
      updateProduto: (produto: any) => Promise<any>;
      deleteProduto: (id: number) => Promise<boolean>;
    };

  }
}