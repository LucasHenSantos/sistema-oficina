const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- NOVO: Cliente e Veículos ---
  getClientWithVehicles: (clientName) => ipcRenderer.invoke('get-client-with-vehicles', clientName),

  // --- KPI HANDLERS ---
  getDailyRevenue: () => ipcRenderer.invoke('get-daily-revenue'),
  countLowStock: () => ipcRenderer.invoke('count-low-stock'),

  // --- CONFIGURAÇÕES/UTILS ---
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),

  // --- CLIENTES ---
  getClientes: () => ipcRenderer.invoke('get-clientes'),
  addCliente: (cliente) => ipcRenderer.invoke('add-cliente', cliente),
  updateCliente: (cliente) => ipcRenderer.invoke('update-cliente', cliente),
  deleteCliente: (id) => ipcRenderer.invoke('delete-cliente', id),

  // --- VEÍCULOS ---
  getVeiculos: () => ipcRenderer.invoke('get-veiculos'),
  addVeiculo: (veiculo) => ipcRenderer.invoke('add-veiculo', veiculo),
  updateVeiculo: (veiculo) => ipcRenderer.invoke('update-veiculo', veiculo),
  deleteVeiculo: (id) => ipcRenderer.invoke('delete-veiculo', id),

  // --- PRODUTOS ---
  getProdutos: () => ipcRenderer.invoke('get-produtos'),
  addProduto: (produto) => ipcRenderer.invoke('add-produto', produto),
  updateProduto: (produto) => ipcRenderer.invoke('update-produto', produto),
  deleteProduto: (id) => ipcRenderer.invoke('delete-produto', id),
  
  // --- SERVIÇOS ---
  getServicos: () => ipcRenderer.invoke('get-servicos'),
  addServico: (servico) => ipcRenderer.invoke('add-servico', servico),
  updateServico: (servico) => ipcRenderer.invoke('update-servico', servico),
  deleteServico: (id) => ipcRenderer.invoke('delete-servico', id),

  // --- ORÇAMENTOS ---
  getOrcamentos: () => ipcRenderer.invoke('get-orcamentos'),
  addOrcamento: (budget) => ipcRenderer.invoke('add-orcamento', budget),
  updateOrcamento: (budget) => ipcRenderer.invoke('update-orcamento', budget),
  deleteOrcamento: (id) => ipcRenderer.invoke('delete-orcamento', id),

  // --- ORDENS DE SERVIÇO ---
  getOS: () => ipcRenderer.invoke('get-os'),
  addOS: (order) => ipcRenderer.invoke('add-os', order),
  updateOS: (order) => ipcRenderer.invoke('update-os', order),
  deleteOS: (id) => ipcRenderer.invoke('delete-os', id),
});