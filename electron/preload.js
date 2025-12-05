const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
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

  getProdutos: () => ipcRenderer.invoke('get-produtos'),
  addProduto: (produto) => ipcRenderer.invoke('add-produto', produto),
  updateProduto: (produto) => ipcRenderer.invoke('update-produto', produto),
  deleteProduto: (id) => ipcRenderer.invoke('delete-produto', id),

  // (Adicione outros métodos aqui conforme o desenvolvimento)
});