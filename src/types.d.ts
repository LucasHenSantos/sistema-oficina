export { };


declare global {

  /* ==========================================================================
     PAGAMENTAMENTOS
     ========================================================================== */

  type PaymentMethod =
    | 'cash'
    | 'pix'
    | 'debit-card'
    | 'credit-card'
    | 'transfer'
    | 'other';


  type PaymentStatus =
    | 'pending'
    | 'partial'
    | 'paid';


  interface OSPayment {

    id: number;

    orderId: number;

    method:
    PaymentMethod |
    'legacy';

    appliedAmount: number;

    receivedAmount: number;

    changeAmount: number;

    notes?: string | null;

    source?: string | null;

    createdAt: string;

  }


  interface OSPaymentSummary {

    orderId: number;

    total: number;

    paidAmount: number;

    remainingAmount: number;

    paymentStatus: PaymentStatus;

  }


  /* ==========================================================================
     CONTAS A RECEBER
     ========================================================================== */

  interface DebtorItem {

    orderId: number;

    client: string;

    vehicle?: string;

    date?: string;

    total: number;

    paidAmount: number;

    remainingAmount: number;

    paymentStatus: PaymentStatus;

  }


  /* ==========================================================================
     ARQUIVAMENTO
     ========================================================================== */

  interface ArchiveBatchResult {

    success: boolean;

    count: number;

    archivedAt: string;

  }


  interface UnarchiveResult {

    success: boolean;

    id: number;

  }


  /* ==========================================================================
     API DO ELECTRON
     ========================================================================== */

  interface Window {

    electronAPI: {



      /* ======================================================================
         CLIENTE + VEÍCULOS
         ====================================================================== */

      getClientWithVehicles:
      (
        clientName: string
      ) => Promise<{
        client: any;
        vehicles: any[];
      } | null>;


      /* ======================================================================
         DASHBOARD
         ====================================================================== */

      getDailyRevenue:
      () => Promise<number>;


      countLowStock:
      () => Promise<number>;


      /* ======================================================================
         CONFIGURAÇÕES
         ====================================================================== */

      getConfig:
      (
        key: string
      ) => Promise<any>;


      setConfig:
      (
        key: string,
        value: any
      ) => Promise<any>;


      /* ======================================================================
         CLIENTES
         ====================================================================== */

      getClientes:
      () => Promise<any[]>;


      addCliente:
      (
        cliente: any
      ) => Promise<any>;


      updateCliente:
      (
        cliente: any
      ) => Promise<any>;


      deleteCliente:
      (
        id: number
      ) => Promise<boolean>;


      /* ======================================================================
         VEÍCULOS
         ====================================================================== */

      getVeiculos:
      () => Promise<any[]>;


      addVeiculo:
      (
        veiculo: any
      ) => Promise<any>;


      updateVeiculo:
      (
        veiculo: any
      ) => Promise<any>;


      deleteVeiculo:
      (
        id: number
      ) => Promise<boolean>;


      /* ======================================================================
         PRODUTOS
         ====================================================================== */

      getProdutos:
      () => Promise<any[]>;


      searchProdutos:
      (
        searchTerm: string
      ) => Promise<any[]>;


      getProdutoByBarcode:
      (
        barcode: string
      ) => Promise<any | null>;


      setProdutoBarcode:
      (
        productId: number,
        barcode: string
      ) => Promise<{

        success: boolean;

        reason?:
        | 'invalid-product'
        | 'empty-barcode'
        | 'duplicate'
        | 'not-found';

        message?: string;

        product?: any;

        existingProduct?: any;

      }>;


      /* ======================================================================
         ENTRADA DE ESTOQUE
         ====================================================================== */

      addStockEntry:
      (
        barcode: string,
        quantity: number
      ) => Promise<{

        success: boolean;

        reason?:
        | 'empty-barcode'
        | 'invalid-quantity'
        | 'not-found';

        message?: string;

        product?: {

          id: number;

          name: string;

          code?: string;

          barcode?: string;

          brand?: string;

          quantity: number;

          minQuantity?: number;

          costPrice?: number;

          sellPrice?: number;

          [key: string]: any;

        };

        movement?: {

          id: number;

          productId: number;

          type: 'entry';

          quantity: number;

          previousQuantity: number;

          newQuantity: number;

          createdAt: string;

        };

      }>;


      /* ======================================================================
         HISTÓRICO DE ESTOQUE
         ====================================================================== */

      getStockMovements:
      () => Promise<Array<{

        id: number;

        productId: number;

        type:
        | 'entry'
        | 'exit'
        | 'adjustment';

        quantity: number;

        previousQuantity: number;

        newQuantity: number;

        source?: string | null;

        referenceId?: number | null;

        notes?: string | null;

        createdAt: string;

        productName?: string | null;

        productCode?: string | null;

        productBarcode?: string | null;

        productBrand?: string | null;

      }>>;


      /* ======================================================================
         CRUD DE PRODUTOS
         ====================================================================== */

      addProduto:
      (
        produto: any
      ) => Promise<any>;


      updateProduto:
      (
        produto: any
      ) => Promise<any>;


      deleteProduto:
      (
        id: number
      ) => Promise<boolean>;


      /* ======================================================================
         SERVIÇOS
         ====================================================================== */

      getServicos:
      () => Promise<any[]>;


      searchServicos:
      (
        searchTerm: string
      ) => Promise<any[]>;


      addServico:
      (
        servico: any
      ) => Promise<any>;


      updateServico:
      (
        servico: any
      ) => Promise<any>;


      deleteServico:
      (
        id: number
      ) => Promise<boolean>;


      /* ======================================================================
         ORÇAMENTOS
         ====================================================================== */

      getOrcamentos:
      () => Promise<any[]>;


      addOrcamento:
      (
        budget: any
      ) => Promise<any>;


      updateOrcamento:
      (
        budget: any
      ) => Promise<any>;


      deleteOrcamento:
      (
        id: number
      ) => Promise<boolean>;


      /* ======================================================================
         ARQUIVAMENTO DE ORÇAMENTOS
         ====================================================================== */

      archiveCompletedOrcamentos:
      () => Promise<ArchiveBatchResult>;


      getArchivedOrcamentos:
      (
        searchTerm?: string
      ) => Promise<any[]>;


      getArchivedOrcamentosCount:
      () => Promise<number>;


      unarchiveOrcamento:
      (
        id: number
      ) => Promise<UnarchiveResult>;


      /* ======================================================================
         ORDENS DE SERVIÇO
         ====================================================================== */

      getOS:
      () => Promise<any[]>;


      addOS:
      (
        order: any
      ) => Promise<any>;


      finalizeOS:
      (
        id: number
      ) => Promise<{

        success: boolean;

        id: number;

        status: 'completed';

        stockProcessed: number;

        orderId: number;

        total: number;

        paidAmount: number;

        remainingAmount: number;

        paymentStatus: PaymentStatus;

      }>;


      updateOS:
      (
        order: any
      ) => Promise<any>;


      deleteOS:
      (
        id: number
      ) => Promise<{
        success: boolean;
      }>;


      /* ======================================================================
         ARQUIVAMENTO DE ORDENS DE SERVIÇO
         ====================================================================== */

      archiveCompletedOS:
      () => Promise<ArchiveBatchResult>;


      getArchivedOS:
      (
        searchTerm?: string
      ) => Promise<any[]>;


      getArchivedOSCount:
      () => Promise<number>;


      unarchiveOS:
      (
        id: number
      ) => Promise<UnarchiveResult>;


      /* ======================================================================
         PAGAMENTOS DA OS
         ====================================================================== */

      getOSPayments:
      (
        orderId: number
      ) => Promise<OSPayment[]>;


      getOSPaymentSummary:
      (
        orderId: number
      ) => Promise<OSPaymentSummary>;


      addOSPayment:
      (
        orderId: number,

        payment: {

          method: PaymentMethod;

          receivedAmount: number;

          notes?: string;

        }

      ) => Promise<{

        success: boolean;

        payment: OSPayment;

        summary: OSPaymentSummary;

      }>;


      /* ======================================================================
         CONTAS A RECEBER / DEVEDORES
         ====================================================================== */

      getDebtors:
      () => Promise<DebtorItem[]>;

      getAppVersion: () => Promise<{
        version: string;
      }>;

      checkForUpdates: () => Promise<{
        success: boolean;
        development?: boolean;
        version?: string;
        message?: string;
        error?: string;
      }>;

      downloadUpdate: () => Promise<{
        success: boolean;
        development?: boolean;
        message?: string;
        error?: string;
      }>;

      installUpdate: () => Promise<{
        success: boolean;
        error?: string;
      }>;

      onUpdateStatus: (
        callback: (
          data: {
            status:
            | 'checking'
            | 'available'
            | 'up-to-date'
            | 'downloading'
            | 'downloaded'
            | 'error';

            currentVersion?: string;

            version?: string;

            releaseName?: string | null;

            releaseNotes?: string | null | any[];

            releaseDate?: string | null;

            percent?: number;

            bytesPerSecond?: number;

            transferred?: number;

            total?: number;

            message?: string;
          }
        ) => void
      ) => () => void;


      /* ======================================================================
         BACKUP
         ====================================================================== */

      backupDatabase:
      () => Promise<{

        success: boolean;

        path?: string;

        error?: string;

      }>;

      restoreDatabase: () => Promise<{
        success: boolean;
        canceled?: boolean;
        backupPath?: string;
        safetyBackupPath?: string;
        restarting?: boolean;
        error?: string;
      }>;

    };

  }

}