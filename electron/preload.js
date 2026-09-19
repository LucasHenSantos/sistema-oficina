const {
  contextBridge,
  ipcRenderer
} = require('electron');


contextBridge.exposeInMainWorld(
  'electronAPI',

  {
    /* ========================================================================
       CLIENTE + VEÍCULOS
       ======================================================================== */

    getClientWithVehicles:
      (clientName) =>
        ipcRenderer.invoke(
          'get-client-with-vehicles',
          clientName
        ),


    /* ========================================================================
       DASHBOARD
       ======================================================================== */

    getDailyRevenue:
      () =>
        ipcRenderer.invoke(
          'get-daily-revenue'
        ),


    countLowStock:
      () =>
        ipcRenderer.invoke(
          'count-low-stock'
        ),


    /* ========================================================================
       CONFIGURAÇÕES
       ======================================================================== */

    getConfig:
      (key) =>
        ipcRenderer.invoke(
          'get-config',
          key
        ),


    setConfig:
      (
        key,
        value
      ) =>
        ipcRenderer.invoke(
          'set-config',
          key,
          value
        ),

    /* ==========================================================================
ATUALIZAÇÕES DO SISTEMA
========================================================================== */

    getAppVersion:
      () =>
        ipcRenderer.invoke(
          'get-app-version'
        ),

    checkForUpdates:
      () =>
        ipcRenderer.invoke(
          'check-for-updates'
        ),

    downloadUpdate:
      () =>
        ipcRenderer.invoke(
          'download-update'
        ),

    installUpdate:
      () =>
        ipcRenderer.invoke(
          'install-update'
        ),

    onUpdateStatus:
      (
        callback
      ) => {

        const listener =
          (
            _event,
            data
          ) => {

            callback(
              data
            );

          };


        ipcRenderer.on(
          'update-status',
          listener
        );


        /*
          Retorna uma função para o Angular
          conseguir remover o listener quando necessário.
        */
        return () => {

          ipcRenderer.removeListener(
            'update-status',
            listener
          );

        };

      },


    /* ========================================================================
       CLIENTES
       ======================================================================== */

    getClientes:
      () =>
        ipcRenderer.invoke(
          'get-clientes'
        ),


    addCliente:
      (cliente) =>
        ipcRenderer.invoke(
          'add-cliente',
          cliente
        ),


    updateCliente:
      (cliente) =>
        ipcRenderer.invoke(
          'update-cliente',
          cliente
        ),


    deleteCliente:
      (id) =>
        ipcRenderer.invoke(
          'delete-cliente',
          id
        ),


    /* ========================================================================
       VEÍCULOS
       ======================================================================== */

    getVeiculos:
      () =>
        ipcRenderer.invoke(
          'get-veiculos'
        ),


    addVeiculo:
      (veiculo) =>
        ipcRenderer.invoke(
          'add-veiculo',
          veiculo
        ),


    updateVeiculo:
      (veiculo) =>
        ipcRenderer.invoke(
          'update-veiculo',
          veiculo
        ),


    deleteVeiculo:
      (id) =>
        ipcRenderer.invoke(
          'delete-veiculo',
          id
        ),


    /* ========================================================================
       PRODUTOS
       ======================================================================== */

    getProdutos:
      () =>
        ipcRenderer.invoke(
          'get-produtos'
        ),


    searchProdutos:
      (searchTerm) =>
        ipcRenderer.invoke(
          'search-produtos',
          searchTerm
        ),


    getProdutoByBarcode:
      (barcode) =>
        ipcRenderer.invoke(
          'get-produto-by-barcode',
          barcode
        ),


    setProdutoBarcode:
      (
        productId,
        barcode
      ) =>
        ipcRenderer.invoke(
          'set-produto-barcode',
          productId,
          barcode
        ),


    addStockEntry:
      (
        barcode,
        quantity
      ) =>
        ipcRenderer.invoke(
          'add-stock-entry',
          barcode,
          quantity
        ),


    getStockMovements:
      () =>
        ipcRenderer.invoke(
          'get-stock-movements'
        ),


    addProduto:
      (produto) =>
        ipcRenderer.invoke(
          'add-produto',
          produto
        ),


    updateProduto:
      (produto) =>
        ipcRenderer.invoke(
          'update-produto',
          produto
        ),


    deleteProduto:
      (id) =>
        ipcRenderer.invoke(
          'delete-produto',
          id
        ),


    /* ========================================================================
       SERVIÇOS
       ======================================================================== */

    getServicos:
      () =>
        ipcRenderer.invoke(
          'get-servicos'
        ),


    searchServicos:
      (searchTerm) =>
        ipcRenderer.invoke(
          'search-servicos',
          searchTerm
        ),


    addServico:
      (servico) =>
        ipcRenderer.invoke(
          'add-servico',
          servico
        ),


    updateServico:
      (servico) =>
        ipcRenderer.invoke(
          'update-servico',
          servico
        ),


    deleteServico:
      (id) =>
        ipcRenderer.invoke(
          'delete-servico',
          id
        ),


    /* ========================================================================
       ORÇAMENTOS
       ======================================================================== */

    getOrcamentos:
      () =>
        ipcRenderer.invoke(
          'get-orcamentos'
        ),


    addOrcamento:
      (budget) =>
        ipcRenderer.invoke(
          'add-orcamento',
          budget
        ),


    updateOrcamento:
      (budget) =>
        ipcRenderer.invoke(
          'update-orcamento',
          budget
        ),


    deleteOrcamento:
      (id) =>
        ipcRenderer.invoke(
          'delete-orcamento',
          id
        ),


    /* ========================================================================
       ARQUIVAMENTO DE ORÇAMENTOS
       ======================================================================== */

    archiveCompletedOrcamentos:
      () =>
        ipcRenderer.invoke(
          'archive-completed-orcamentos'
        ),


    getArchivedOrcamentos:
      (
        searchTerm = ''
      ) =>
        ipcRenderer.invoke(
          'get-archived-orcamentos',
          searchTerm
        ),


    getArchivedOrcamentosCount:
      () =>
        ipcRenderer.invoke(
          'get-archived-orcamentos-count'
        ),


    unarchiveOrcamento:
      (id) =>
        ipcRenderer.invoke(
          'unarchive-orcamento',
          id
        ),


    /* ========================================================================
       ORDENS DE SERVIÇO
       ======================================================================== */

    getOS:
      () =>
        ipcRenderer.invoke(
          'get-os'
        ),


    addOS:
      (order) =>
        ipcRenderer.invoke(
          'add-os',
          order
        ),


    finalizeOS:
      (id) =>
        ipcRenderer.invoke(
          'finalize-os',
          id
        ),


    updateOS:
      (order) =>
        ipcRenderer.invoke(
          'update-os',
          order
        ),


    deleteOS:
      (id) =>
        ipcRenderer.invoke(
          'delete-os',
          id
        ),


    /* ========================================================================
       ARQUIVAMENTO DE ORDENS DE SERVIÇO
       ======================================================================== */

    archiveCompletedOS:
      () =>
        ipcRenderer.invoke(
          'archive-completed-os'
        ),


    getArchivedOS:
      (
        searchTerm = ''
      ) =>
        ipcRenderer.invoke(
          'get-archived-os',
          searchTerm
        ),


    getArchivedOSCount:
      () =>
        ipcRenderer.invoke(
          'get-archived-os-count'
        ),


    unarchiveOS:
      (id) =>
        ipcRenderer.invoke(
          'unarchive-os',
          id
        ),


    /* ========================================================================
       PAGAMENTOS DA ORDEM DE SERVIÇO
       ======================================================================== */

    getOSPayments:
      (orderId) =>
        ipcRenderer.invoke(
          'get-os-payments',
          orderId
        ),


    getOSPaymentSummary:
      (orderId) =>
        ipcRenderer.invoke(
          'get-os-payment-summary',
          orderId
        ),


    addOSPayment:
      (
        orderId,
        payment
      ) =>
        ipcRenderer.invoke(
          'add-os-payment',
          orderId,
          payment
        ),


    /* ========================================================================
       CONTAS A RECEBER / DEVEDORES
       ======================================================================== */

    getDebtors:
      () =>
        ipcRenderer.invoke(
          'get-debtors'
        ),


    /* ========================================================================
       BACKUP
       ======================================================================== */

    backupDatabase:
      () =>
        ipcRenderer.invoke(
          'backup-database'
        ),

    restoreDatabase:
      () =>
        ipcRenderer.invoke(
          'restore-database'
        )
  }
);