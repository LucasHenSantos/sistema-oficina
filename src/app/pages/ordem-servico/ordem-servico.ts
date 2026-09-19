import {
  Component,
  signal,
  computed,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


/* ==========================================================================
   INTERFACES
   ========================================================================== */

interface OrderItem {
  type: 'service' | 'product';
  id?: number;
  name: string;
  price: number;
  qty: number;
  total: number;
}

interface OrdemServicoModel {
  id: number;
  client: string;
  vehicle: string;

  status:
  | 'pending'
  | 'approved'
  | 'in-progress'
  | 'completed'
  | 'canceled';

  date: string;
  items: OrderItem[];
  notes: string;
  total: number;

  paymentStatus?: PaymentStatus | string;

  paidAmount?: number;

  remainingAmount?: number;

  stockProcessed?: number;

  archived?: number;

  archivedAt?: string | null;
}


/* ==========================================================================
   COMPONENTE
   ========================================================================== */

@Component({
  selector: 'app-ordem-servico',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './ordem-servico.html',

  styleUrl: './ordem-servico.css'
})
export class OrdemServico implements OnInit {

  /* ==========================================================================
     LISTAGEM
     ========================================================================== */

  searchTerm = signal('');

  orders =
    signal<OrdemServicoModel[]>([]);


  /* ==========================================================================
 ARQUIVAMENTO
 ========================================================================== */

  archivedCount =
    signal(0);


  showArchivedModal =
    signal(false);


  archivedOrders =
    signal<OrdemServicoModel[]>([]);


  archivedSearchTerm =
    signal('');


  archivedLoading =
    signal(false);


  archivedMessage =
    signal('');


  private archivedSearchTimer:
    ReturnType<typeof setTimeout> | null = null;


  private archivedSearchRequest = 0;


  /* ==========================================================================
     QUANTIDADE DE OS DISPONÍVEIS PARA ARQUIVAR
     ========================================================================== */

  completedOrdersAvailableCount =
    computed(
      () =>
        this.orders()
          .filter(
            order =>
              order.status ===
              'completed'
              &&
              order.paymentStatus ===
              'paid'
          )
          .length
    );

  /* ==========================================================================
     MODAL DA OS
     ========================================================================== */

  showModal = signal(false);


  /* ==========================================================================
     CLIENTES E VEÍCULOS
     ========================================================================== */

  clientsList =
    signal<string[]>([]);

  vehiclesList =
    signal<string[]>([]);

  private allVehicles: any[] = [];


  /* ==========================================================================
     COMPATIBILIDADE
     ========================================================================== */

  availableServices =
    signal<any[]>([]);

  availableProducts =
    signal<any[]>([]);

  selectedServiceId =
    signal<number | null>(null);

  selectedProductId =
    signal<number | null>(null);


  /* ==========================================================================
     BUSCA DE SERVIÇOS
     ========================================================================== */

  serviceSearchTerm =
    signal('');

  serviceSearchResults =
    signal<any[]>([]);

  serviceSearchLoading =
    signal(false);

  serviceDropdownOpen =
    signal(false);

  serviceActiveIndex =
    signal(-1);


  private serviceSearchTimer:
    ReturnType<typeof setTimeout> | null = null;

  private serviceSearchRequest = 0;


  /* ==========================================================================
     BUSCA DE PRODUTOS
     ========================================================================== */

  productSearchTerm =
    signal('');

  productSearchResults =
    signal<any[]>([]);

  productSearchLoading =
    signal(false);

  productDropdownOpen =
    signal(false);

  productActiveIndex =
    signal(-1);

  productQty =
    signal(1);


  private productSearchTimer:
    ReturnType<typeof setTimeout> | null = null;

  private productSearchRequest = 0;


  /* ==========================================================================
     OS ATUAL
     ========================================================================== */

  currentOrder =
    signal<OrdemServicoModel>(
      this.getEmptyOrder()
    );


  /* ==========================================================================
     ESTOQUE PROCESSADO
     ========================================================================== */

  isStockLocked =
    computed(
      () =>
        Number(
          this.currentOrder()
            .stockProcessed || 0
        ) === 1
    );


  /* ==========================================================================
     CAIXA / PAGAMENTOS
     ========================================================================== */

  showPaymentModal =
    signal(false);


  paymentOrder =
    signal<OrdemServicoModel | null>(
      null
    );


  paymentSummary =
    signal<OSPaymentSummary | null>(
      null
    );


  paymentHistory =
    signal<OSPayment[]>([]);


  paymentMethod =
    signal<PaymentMethod>(
      'pix'
    );


  paymentReceivedAmount =
    signal<number | null>(
      null
    );


  paymentNotes =
    signal('');


  paymentLoading =
    signal(false);


  paymentSaving =
    signal(false);


  paymentMessage =
    signal('');


  paymentMessageType =
    signal<
      'idle' |
      'success' |
      'error'
    >(
      'idle'
    );


  paymentMethods: Array<{
    value: PaymentMethod;
    label: string;
  }> = [

      {
        value: 'cash',
        label: 'Dinheiro'
      },

      {
        value: 'pix',
        label: 'PIX'
      },

      {
        value: 'debit-card',
        label: 'Cartão de Débito'
      },

      {
        value: 'credit-card',
        label: 'Cartão de Crédito'
      },

      {
        value: 'transfer',
        label: 'Transferência'
      },

      {
        value: 'other',
        label: 'Outro'
      }

    ];


  /* ==========================================================================
     VALOR QUE SERÁ APLICADO
     ========================================================================== */

  paymentAppliedAmount =
    computed(
      () => {

        const summary =
          this.paymentSummary();


        const received =
          Number(
            this.paymentReceivedAmount() || 0
          );


        if (
          !summary ||
          received <= 0
        ) {

          return 0;

        }


        /*
          Em dinheiro pode receber mais que a dívida.

          Exemplo:

          dívida: 100
          recebeu: 150

          aplicado: 100
          troco: 50
        */

        if (
          this.paymentMethod() ===
          'cash'
        ) {

          return this.roundMoney(
            Math.min(
              received,

              Number(
                summary.remainingAmount || 0
              )
            )
          );

        }


        return this.roundMoney(
          received
        );

      }
    );


  /* ==========================================================================
     TROCO
     ========================================================================== */

  paymentChangeAmount =
    computed(
      () => {

        const summary =
          this.paymentSummary();


        if (
          !summary ||
          this.paymentMethod() !==
          'cash'
        ) {

          return 0;

        }


        const received =
          Number(
            this.paymentReceivedAmount() || 0
          );


        return this.roundMoney(
          Math.max(
            0,

            received -
            Number(
              summary.remainingAmount || 0
            )
          )
        );

      }
    );


  /* ==========================================================================
     SALDO DEPOIS DO PAGAMENTO
     ========================================================================== */

  paymentRemainingAfter =
    computed(
      () => {

        const summary =
          this.paymentSummary();


        if (!summary) {

          return 0;

        }


        return this.roundMoney(
          Math.max(

            0,

            Number(
              summary.remainingAmount || 0
            )
            -
            Number(
              this.paymentAppliedAmount() || 0
            )

          )
        );

      }
    );


  /* ==========================================================================
     IMPRESSÃO
     ========================================================================== */

  companyData =
    signal<any>(
      null
    );


  osItemToView =
    signal<OrdemServicoModel | null>(
      null
    );


  /* ==========================================================================
     CONSTRUTOR
     ========================================================================== */

  constructor(
    private cdr:
      ChangeDetectorRef
  ) { }


  /* ==========================================================================
     INICIALIZAÇÃO
     ========================================================================== */

  ngOnInit(): void {

    this.loadData();

  }


  /* ==========================================================================
     CARREGAMENTO PRINCIPAL
     ========================================================================== */

  async loadData() {

    if (
      !window.electronAPI
    ) {

      return;

    }


    try {

      const ordersData =
        await window.electronAPI
          .getOS();

      const archivedCount =
        await window.electronAPI
          .getArchivedOSCount();


      const clientsData =
        await window.electronAPI
          .getClientes();


      this.allVehicles =
        await window.electronAPI
          .getVeiculos();


      const companyConfig =
        await window.electronAPI
          .getConfig(
            'dados_empresa'
          );


      this.orders.set(
        ordersData || []
      );

      this.archivedCount.set(
        Number(
          archivedCount || 0
        )
      );


      this.clientsList.set(
        (clientsData || [])
          .map(
            (client: any) =>
              client.name
          )
      );


      this.companyData.set(
        companyConfig
      );


      const defaultClient =
        this.clientsList()[0] || '';


      this.currentOrder.set(
        this.getEmptyOrder(
          defaultClient
        )
      );


      this.onClientChange(
        defaultClient
      );


      this.cdr.detectChanges();

    } catch (error) {

      console.error(
        'Erro ao carregar dados de OS:',
        error
      );

    }

  }


  /* ==========================================================================
     FILTRO DA LISTAGEM
     ========================================================================== */

  filteredOrders =
    computed(
      () => {

        const term =
          this.searchTerm()
            .trim()
            .toLowerCase();


        if (!term) {

          return this.orders();

        }


        return this.orders()
          .filter(
            order =>

              String(
                order.client || ''
              )
                .toLowerCase()
                .includes(term)

              ||

              String(
                order.vehicle || ''
              )
                .toLowerCase()
                .includes(term)

              ||

              String(
                order.id || ''
              )
                .toLowerCase()
                .includes(term)
          );

      }
    );


  /* ==========================================================================
     CLIENTE / VEÍCULO
     ========================================================================== */

  onClientChange(
    clientName: string
  ) {

    const filtered =
      this.allVehicles
        .filter(
          vehicle =>
            vehicle.client ===
            clientName
        );


    const vehiclesFormatted =
      filtered.map(
        vehicle =>
          `${vehicle.model} (${vehicle.plate})`
      );


    this.vehiclesList.set(
      vehiclesFormatted
    );


    this.currentOrder.update(
      order => ({

        ...order,

        vehicle:
          vehiclesFormatted[0] || ''

      })
    );

  }


  /* ==========================================================================
     STATUS DA OS
     ========================================================================== */

  getStatusLabel(
    status: string
  ) {

    const map:
      Record<string, string> = {

      pending:
        'Pendente',

      approved:
        'Aprovado',

      'in-progress':
        'Em Andamento',

      completed:
        'Finalizado',

      canceled:
        'Cancelado'

    };


    return (
      map[status] ||
      status
    );

  }

  /* ==========================================================================
   ARQUIVAR ORDENS CONCLUÍDAS
   ========================================================================== */

  async archiveCompletedOrders() {

    const available =
      this.completedOrdersAvailableCount();


    if (
      available <= 0
    ) {

      alert(
        'Não há Ordens de Serviço finalizadas e totalmente pagas disponíveis para arquivar.');

      return;

    }


    const confirmed =
      confirm(
        `Arquivar ${available} ${available === 1
          ? 'Ordem de Serviço finalizada e paga'
          : 'Ordens de Serviço finalizadas e pagas'
        }?\n\n` +
        'Nenhum registro será excluído. ' +
        'As OS continuarão disponíveis no histórico de arquivados.'
      );


    if (!confirmed) {

      return;

    }


    if (
      !window.electronAPI
    ) {

      return;

    }


    try {

      const result =
        await window.electronAPI
          .archiveCompletedOS();


      const archived =
        Number(
          result?.count || 0
        );


      if (
        archived <= 0
      ) {

        alert(
          'Nenhuma Ordem de Serviço foi arquivada.'
        );

        return;

      }


      /*
        Recarrega a tela principal.
  
        Como getOS() já retorna somente registros
        não arquivados, os concluídos desaparecem
        automaticamente da listagem.
      */

      await this.loadData();


      /*
        Se o histórico estiver aberto por algum motivo,
        atualiza também os arquivados.
      */

      if (
        this.showArchivedModal()
      ) {

        await this.loadArchivedOrders();

      }


      alert(
        `${archived} ${archived === 1
          ? 'Ordem de Serviço foi arquivada.'
          : 'Ordens de Serviço foram arquivadas.'
        }`
      );

    } catch (error) {

      console.error(
        'Erro ao arquivar Ordens de Serviço:',
        error
      );


      alert(
        'Não foi possível arquivar as Ordens de Serviço.'
      );

    }

  }


  /* ==========================================================================
     ABRIR HISTÓRICO DE ARQUIVADAS
     ========================================================================== */

  async openArchivedOrders() {

    this.showArchivedModal.set(
      true
    );


    this.archivedSearchTerm.set(
      ''
    );


    this.archivedMessage.set(
      ''
    );


    this.archivedOrders.set(
      []
    );


    await this.loadArchivedOrders(
      ''
    );

  }


  /* ==========================================================================
     FECHAR HISTÓRICO
     ========================================================================== */

  closeArchivedOrders() {

    if (
      this.archivedSearchTimer
    ) {

      clearTimeout(
        this.archivedSearchTimer
      );


      this.archivedSearchTimer =
        null;

    }


    /*
      Invalida eventual consulta que ainda esteja
      esperando resposta do banco.
    */

    this.archivedSearchRequest++;


    this.showArchivedModal.set(
      false
    );


    this.archivedSearchTerm.set(
      ''
    );


    this.archivedOrders.set(
      []
    );


    this.archivedMessage.set(
      ''
    );


    this.archivedLoading.set(
      false
    );

  }


  /* ==========================================================================
     PESQUISA NOS ARQUIVADOS
     ========================================================================== */

  onArchivedSearchChange(
    value: string
  ) {

    const term =
      String(
        value || ''
      );


    this.archivedSearchTerm.set(
      term
    );


    if (
      this.archivedSearchTimer
    ) {

      clearTimeout(
        this.archivedSearchTimer
      );

    }


    /*
      Pequeno debounce para não consultar SQLite
      a cada tecla instantaneamente.
    */

    this.archivedSearchTimer =
      setTimeout(
        () => {

          this.loadArchivedOrders(
            term
          );

        },

        250
      );

  }


  /* ==========================================================================
     CARREGAR OS ARQUIVADAS
     ========================================================================== */

  async loadArchivedOrders(
    searchTerm:
      string =
      this.archivedSearchTerm()
  ) {

    if (
      !window.electronAPI
    ) {

      return;

    }


    const requestId =
      ++this.archivedSearchRequest;


    this.archivedLoading.set(
      true
    );


    this.archivedMessage.set(
      ''
    );


    try {

      const results =
        await window.electronAPI
          .getArchivedOS(
            String(
              searchTerm || ''
            ).trim()
          );


      /*
        Se outra pesquisa começou depois desta,
        ignoramos a resposta antiga.
      */

      if (
        requestId !==
        this.archivedSearchRequest
      ) {

        return;

      }


      const safeResults =
        results || [];


      this.archivedOrders.set(
        safeResults
      );


      if (
        safeResults.length === 0
      ) {

        if (
          String(
            searchTerm || ''
          ).trim()
        ) {

          this.archivedMessage.set(
            'Nenhuma OS arquivada encontrada para esta pesquisa.'
          );

        } else {

          this.archivedMessage.set(
            'Nenhuma Ordem de Serviço arquivada.'
          );

        }

      }

    } catch (error) {

      if (
        requestId !==
        this.archivedSearchRequest
      ) {

        return;

      }


      console.error(
        'Erro ao carregar OS arquivadas:',
        error
      );


      this.archivedOrders.set(
        []
      );


      this.archivedMessage.set(
        'Não foi possível carregar as Ordens de Serviço arquivadas.'
      );

    } finally {

      if (
        requestId ===
        this.archivedSearchRequest
      ) {

        this.archivedLoading.set(
          false
        );

      }

    }

  }


  /* ==========================================================================
     DESARQUIVAR OS
     ========================================================================== */

  async unarchiveOrder(
    order: OrdemServicoModel
  ) {

    if (
      !order ||
      !order.id
    ) {

      return;

    }


    const confirmed =
      confirm(
        `Desarquivar a OS #${order.id}?\n\n` +
        'Ela voltará para a listagem principal. ' +
        'Estoque, pagamentos e histórico continuarão exatamente como estão.'
      );


    if (!confirmed) {

      return;

    }


    if (
      !window.electronAPI
    ) {

      return;

    }


    try {

      await window.electronAPI
        .unarchiveOS(
          order.id
        );


      /*
        Remove imediatamente da janela de arquivados.
      */

      this.archivedOrders.update(
        list =>
          list.filter(
            item =>
              Number(
                item.id
              )
              !==
              Number(
                order.id
              )
          )
      );


      /*
        Atualiza listagem principal e contador.
      */

      await this.loadData();


      /*
        Se havia uma pesquisa ativa, rodamos novamente
        para manter o histórico coerente.
      */

      if (
        this.showArchivedModal()
      ) {

        await this.loadArchivedOrders(
          this.archivedSearchTerm()
        );

      }

    } catch (error) {

      console.error(
        'Erro ao desarquivar Ordem de Serviço:',
        error
      );


      alert(
        'Não foi possível desarquivar esta Ordem de Serviço.'
      );

    }

  }


  /* ==========================================================================
     NOVA OS
     ========================================================================== */

  openModal() {

    const defaultClient =
      this.clientsList()[0] || '';


    this.currentOrder.set(
      this.getEmptyOrder(
        defaultClient
      )
    );


    this.onClientChange(
      defaultClient
    );


    this.resetItemSearches();


    this.showModal.set(
      true
    );

  }

  /* ==========================================================================
   FINALIZAR ORDEM DE SERVIÇO
   ========================================================================== */

  async finalizeOrder(
    order: OrdemServicoModel
  ) {

    if (
      !order ||
      !order.id
    ) {

      return;

    }


    if (
      order.status ===
      'completed'
    ) {

      alert(
        'Esta Ordem de Serviço já está finalizada.'
      );

      return;

    }


    if (
      order.status ===
      'canceled'
    ) {

      alert(
        'Uma Ordem de Serviço cancelada não pode ser finalizada.'
      );

      return;

    }


    const confirmed =
      confirm(
        `Deseja finalizar a OS #${order.id}?\n\n` +
        'Após a finalização:\n\n' +
        '• as peças serão baixadas do estoque\n' +
        '• a OS ficará bloqueada para edição\n' +
        '• pagamentos continuarão disponíveis normalmente\n\n' +
        'Deseja continuar?'
      );


    if (
      !confirmed
    ) {

      return;

    }


    try {

      const result =
        await window.electronAPI
          .finalizeOS(
            order.id
          );


      if (
        !result?.success
      ) {

        alert(
          'Não foi possível finalizar esta Ordem de Serviço.'
        );

        return;

      }


      /*
        Atualiza a linha imediatamente.
  
        Depois o loadData() confirma tudo novamente
        com os dados oficiais do banco.
      */

      this.orders.update(
        orders =>
          orders.map(
            item => {

              if (
                Number(item.id) !==
                Number(order.id)
              ) {

                return item;

              }


              return {

                ...item,

                status:
                  'completed',

                stockProcessed:
                  1,

                paidAmount:
                  Number(
                    result.paidAmount || 0
                  ),

                remainingAmount:
                  Number(
                    result.remainingAmount || 0
                  ),

                paymentStatus:
                  result.paymentStatus

              };

            }
          )
      );


      /*
        Recarrega porque isso também atualiza:
  
        - contador de arquivamento
        - valores financeiros
        - contador de arquivadas
        - estado oficial vindo do SQLite
      */

      await this.loadData();


      alert(
        `OS #${order.id} finalizada com sucesso.`
      );

    } catch (
    error: any
    ) {

      console.error(
        'Erro ao finalizar Ordem de Serviço:',
        error
      );


      const message =
        String(
          error?.message ||
          ''
        );


      /*
        Electron normalmente devolve erros IPC com
        texto adicional antes da mensagem original.
  
        Por isso usamos includes().
      */

      if (
        message
          .toLowerCase()
          .includes(
            'estoque insuficiente'
          )
      ) {

        alert(
          'Não foi possível finalizar a OS porque não há estoque suficiente para uma ou mais peças.\n\n' +
          message
        );

        return;

      }


      if (
        message
          .toLowerCase()
          .includes(
            'não foi encontrado no estoque'
          )
      ) {

        alert(
          'Não foi possível finalizar a OS porque uma das peças não foi encontrada no estoque.'
        );

        return;

      }


      if (
        message
          .toLowerCase()
          .includes(
            'já está finalizada'
          )
      ) {

        alert(
          'Esta Ordem de Serviço já está finalizada.'
        );


        await this.loadData();

        return;

      }


      alert(
        'Não foi possível finalizar esta Ordem de Serviço.\n\n' +
        (
          message ||
          'Ocorreu um erro inesperado.'
        )
      );

    }

  }


  /* ==========================================================================
     EDITAR OS
     ========================================================================== */

  editOrder(
    order: OrdemServicoModel
  ) {

    if (
      order.status ===
      'completed'
    ) {

      alert(
        'Esta Ordem de Serviço já foi finalizada e não pode mais ser editada.'
      );

      return;

    }



    const orderCopy:
      OrdemServicoModel =
      JSON.parse(
        JSON.stringify(
          order
        )
      );


    this.currentOrder.set({

      ...orderCopy,

      items:
        orderCopy.items || [],


      paidAmount:
        Number(
          orderCopy.paidAmount || 0
        ),


      remainingAmount:
        Number(
          orderCopy.remainingAmount ??
          orderCopy.total ??
          0
        ),


      stockProcessed:
        Number(
          orderCopy.stockProcessed || 0
        )

    });


    /*
      Carrega os veículos do cliente.
    */

    this.onClientChange(
      order.client
    );


    /*
      onClientChange seleciona o primeiro veículo.

      Como estamos editando uma OS existente,
      restauramos o veículo original.
    */

    this.currentOrder.update(
      current => ({

        ...current,

        vehicle:
          order.vehicle

      })
    );


    this.resetItemSearches();


    this.showModal.set(
      true
    );

  }


  /* ==========================================================================
     FECHAR MODAL
     ========================================================================== */

  closeModal() {

    this.showModal.set(
      false
    );


    this.resetItemSearches();

  }


  /* ==========================================================================
     RESET DAS BUSCAS
     ========================================================================== */

  private resetItemSearches() {

    if (
      this.serviceSearchTimer
    ) {

      clearTimeout(
        this.serviceSearchTimer
      );


      this.serviceSearchTimer =
        null;

    }


    if (
      this.productSearchTimer
    ) {

      clearTimeout(
        this.productSearchTimer
      );


      this.productSearchTimer =
        null;

    }


    /*
      Invalida buscas antigas.
    */

    this.serviceSearchRequest++;

    this.productSearchRequest++;


    this.serviceSearchTerm.set(
      ''
    );

    this.serviceSearchResults.set(
      []
    );

    this.serviceSearchLoading.set(
      false
    );

    this.serviceDropdownOpen.set(
      false
    );

    this.serviceActiveIndex.set(
      -1
    );


    this.productSearchTerm.set(
      ''
    );

    this.productSearchResults.set(
      []
    );

    this.productSearchLoading.set(
      false
    );

    this.productDropdownOpen.set(
      false
    );

    this.productActiveIndex.set(
      -1
    );

    this.productQty.set(
      1
    );


    this.selectedServiceId.set(
      null
    );

    this.selectedProductId.set(
      null
    );


    this.availableServices.set(
      []
    );

    this.availableProducts.set(
      []
    );

  }


  /* ==========================================================================
     BUSCA DE SERVIÇOS
     ========================================================================== */

  onServiceSearchChange(
    value: string
  ) {

    const term =
      String(
        value || ''
      );


    this.serviceSearchTerm.set(
      term
    );


    this.serviceActiveIndex.set(
      -1
    );


    if (
      this.serviceSearchTimer
    ) {

      clearTimeout(
        this.serviceSearchTimer
      );

    }


    const normalized =
      term.trim();


    if (!normalized) {

      this.serviceSearchRequest++;


      this.serviceSearchResults.set(
        []
      );

      this.availableServices.set(
        []
      );

      this.serviceSearchLoading.set(
        false
      );

      this.serviceDropdownOpen.set(
        false
      );


      return;

    }


    this.serviceSearchLoading.set(
      true
    );


    this.serviceDropdownOpen.set(
      true
    );


    this.serviceSearchTimer =
      setTimeout(
        () => {

          this.performServiceSearch(
            normalized
          );

        },

        200
      );

  }


  private async performServiceSearch(
    term: string
  ) {

    if (
      !window.electronAPI
    ) {

      return;

    }


    const requestId =
      ++this.serviceSearchRequest;


    try {

      const results =
        await window.electronAPI
          .searchServicos(
            term
          );


      if (
        requestId !==
        this.serviceSearchRequest
      ) {

        return;

      }


      const safeResults =
        results || [];


      this.serviceSearchResults.set(
        safeResults
      );


      this.availableServices.set(
        safeResults
      );


      this.serviceSearchLoading.set(
        false
      );


      this.serviceDropdownOpen.set(
        true
      );


      this.serviceActiveIndex.set(

        safeResults.length > 0

          ? 0

          : -1

      );

    } catch (error) {

      if (
        requestId !==
        this.serviceSearchRequest
      ) {

        return;

      }


      console.error(
        'Erro ao pesquisar serviços:',
        error
      );


      this.serviceSearchResults.set(
        []
      );

      this.availableServices.set(
        []
      );

      this.serviceSearchLoading.set(
        false
      );

      this.serviceActiveIndex.set(
        -1
      );

    }

  }


  onServiceSearchFocus() {

    if (
      this.serviceSearchTerm()
        .trim()
    ) {

      this.serviceDropdownOpen.set(
        true
      );

    }

  }


  onServiceSearchBlur() {

    setTimeout(
      () => {

        this.serviceDropdownOpen.set(
          false
        );

      },

      150
    );

  }


  onServiceSearchKeydown(
    event: KeyboardEvent
  ) {

    const results =
      this.serviceSearchResults();


    /* ----------------------------------------------------------------------
       SETA PARA BAIXO
       ---------------------------------------------------------------------- */

    if (
      event.key ===
      'ArrowDown'
    ) {

      event.preventDefault();


      if (
        results.length === 0
      ) {

        return;

      }


      this.serviceActiveIndex.set(
        Math.min(
          this.serviceActiveIndex() + 1,
          results.length - 1
        )
      );


      return;

    }


    /* ----------------------------------------------------------------------
       SETA PARA CIMA
       ---------------------------------------------------------------------- */

    if (
      event.key ===
      'ArrowUp'
    ) {

      event.preventDefault();


      if (
        results.length === 0
      ) {

        return;

      }


      this.serviceActiveIndex.set(
        Math.max(
          this.serviceActiveIndex() - 1,
          0
        )
      );


      return;

    }


    /* ----------------------------------------------------------------------
       ESC
       ---------------------------------------------------------------------- */

    if (
      event.key ===
      'Escape'
    ) {

      event.preventDefault();


      this.serviceDropdownOpen.set(
        false
      );


      return;

    }


    /* ----------------------------------------------------------------------
       ENTER
       ---------------------------------------------------------------------- */

    if (
      event.key ===
      'Enter'
    ) {

      event.preventDefault();


      if (
        results.length === 0
      ) {

        return;

      }


      const index =

        this.serviceActiveIndex() >= 0

          ? this.serviceActiveIndex()

          : 0;


      const service =
        results[index];


      if (service) {

        this.selectService(
          service
        );

      }

    }

  }


  /* ==========================================================================
     SELECIONAR SERVIÇO
     ========================================================================== */

  selectService(
    service: any
  ) {

    if (!service) {

      return;

    }


    const price =
      Number(
        service.price || 0
      );


    const newItem:
      OrderItem = {

      type:
        'service',

      id:
        Number(
          service.id
        ),

      name:
        String(
          service.name || ''
        ),

      price,

      qty:
        1,

      total:
        price

    };


    this.addItem(
      newItem
    );


    this.clearServiceSearch();

  }


  private clearServiceSearch() {

    if (
      this.serviceSearchTimer
    ) {

      clearTimeout(
        this.serviceSearchTimer
      );


      this.serviceSearchTimer =
        null;

    }


    this.serviceSearchRequest++;


    this.serviceSearchTerm.set(
      ''
    );

    this.serviceSearchResults.set(
      []
    );

    this.availableServices.set(
      []
    );

    this.serviceSearchLoading.set(
      false
    );

    this.serviceDropdownOpen.set(
      false
    );

    this.serviceActiveIndex.set(
      -1
    );

    this.selectedServiceId.set(
      null
    );

  }


  /* ==========================================================================
     BUSCA DE PRODUTOS
     ========================================================================== */

  onProductSearchChange(
    value: string
  ) {

    if (
      this.isStockLocked()
    ) {

      this.productSearchTerm.set(
        ''
      );

      this.productSearchResults.set(
        []
      );

      this.productDropdownOpen.set(
        false
      );


      return;

    }


    const term =
      String(
        value || ''
      );


    this.productSearchTerm.set(
      term
    );


    this.productActiveIndex.set(
      -1
    );


    if (
      this.productSearchTimer
    ) {

      clearTimeout(
        this.productSearchTimer
      );

    }


    const normalized =
      term.trim();


    if (!normalized) {

      this.productSearchRequest++;


      this.productSearchResults.set(
        []
      );

      this.availableProducts.set(
        []
      );

      this.productSearchLoading.set(
        false
      );

      this.productDropdownOpen.set(
        false
      );


      return;

    }


    this.productSearchLoading.set(
      true
    );


    this.productDropdownOpen.set(
      true
    );


    this.productSearchTimer =
      setTimeout(
        () => {

          this.performProductSearch(
            normalized
          );

        },

        200
      );

  }


  private async performProductSearch(
    term: string
  ) {

    if (
      !window.electronAPI
    ) {

      return;

    }


    const requestId =
      ++this.productSearchRequest;


    try {

      const results =
        await window.electronAPI
          .searchProdutos(
            term
          );


      if (
        requestId !==
        this.productSearchRequest
      ) {

        return;

      }


      const safeResults =
        results || [];


      this.productSearchResults.set(
        safeResults
      );


      this.availableProducts.set(
        safeResults
      );


      this.productSearchLoading.set(
        false
      );


      this.productDropdownOpen.set(
        true
      );


      this.productActiveIndex.set(

        safeResults.length > 0

          ? 0

          : -1

      );

    } catch (error) {

      if (
        requestId !==
        this.productSearchRequest
      ) {

        return;

      }


      console.error(
        'Erro ao pesquisar produtos:',
        error
      );


      this.productSearchResults.set(
        []
      );

      this.availableProducts.set(
        []
      );

      this.productSearchLoading.set(
        false
      );

      this.productActiveIndex.set(
        -1
      );

    }

  }


  onProductSearchFocus() {

    if (
      this.isStockLocked()
    ) {

      this.productDropdownOpen.set(
        false
      );


      return;

    }


    if (
      this.productSearchTerm()
        .trim()
    ) {

      this.productDropdownOpen.set(
        true
      );

    }

  }


  onProductSearchBlur() {

    setTimeout(
      () => {

        this.productDropdownOpen.set(
          false
        );

      },

      150
    );

  }


  /* ==========================================================================
     TECLADO / SCANNER
     ========================================================================== */

  async onProductSearchKeydown(
    event: KeyboardEvent
  ) {

    if (
      this.isStockLocked()
    ) {

      event.preventDefault();


      this.productDropdownOpen.set(
        false
      );


      return;

    }


    const results =
      this.productSearchResults();


    if (
      event.key ===
      'ArrowDown'
    ) {

      event.preventDefault();


      if (
        results.length === 0
      ) {

        return;

      }


      this.productActiveIndex.set(
        Math.min(
          this.productActiveIndex() + 1,
          results.length - 1
        )
      );


      return;

    }


    if (
      event.key ===
      'ArrowUp'
    ) {

      event.preventDefault();


      if (
        results.length === 0
      ) {

        return;

      }


      this.productActiveIndex.set(
        Math.max(
          this.productActiveIndex() - 1,
          0
        )
      );


      return;

    }


    if (
      event.key ===
      'Escape'
    ) {

      event.preventDefault();


      this.productDropdownOpen.set(
        false
      );


      return;

    }


    if (
      event.key !==
      'Enter'
    ) {

      return;

    }


    event.preventDefault();


    const term =
      this.productSearchTerm()
        .trim();


    if (!term) {

      return;

    }


    /*
      Primeiro tenta código de barras.
    */

    const foundByBarcode =
      await this.tryAddProductByBarcode(
        term
      );


    if (
      foundByBarcode
    ) {

      return;

    }


    /*
      Se não for barcode, usa o resultado destacado.
    */

    const currentResults =
      this.productSearchResults();


    if (
      currentResults.length === 0
    ) {

      return;

    }


    const index =

      this.productActiveIndex() >= 0

        ? this.productActiveIndex()

        : 0;


    const product =
      currentResults[index];


    if (product) {

      this.selectProduct(
        product
      );

    }

  }


  /* ==========================================================================
     BARCODE
     ========================================================================== */

  private async tryAddProductByBarcode(
    barcode: string
  ): Promise<boolean> {

    if (
      this.isStockLocked()
    ) {

      return false;

    }


    if (
      !window.electronAPI
    ) {

      return false;

    }


    try {

      const product =
        await window.electronAPI
          .getProdutoByBarcode(
            barcode
          );


      if (!product) {

        return false;

      }


      this.productSearchRequest++;


      if (
        this.productSearchTimer
      ) {

        clearTimeout(
          this.productSearchTimer
        );


        this.productSearchTimer =
          null;

      }


      this.selectProduct(
        product
      );


      return true;

    } catch (error) {

      console.error(
        'Erro ao buscar produto por código de barras:',
        error
      );


      return false;

    }

  }


  /* ==========================================================================
     SELECIONAR PRODUTO
     ========================================================================== */

  selectProduct(
    product: any
  ) {

    if (
      this.isStockLocked()
    ) {

      alert(
        this.getStockLockMessage()
      );


      return;

    }


    if (!product) {

      return;

    }


    const quantity =
      Math.max(
        1,

        Number(
          this.productQty() || 1
        )
      );


    const price =
      Number(
        product.sellPrice || 0
      );


    const newItem:
      OrderItem = {

      type:
        'product',

      id:
        Number(
          product.id
        ),

      name:
        String(
          product.name || ''
        ),

      price,

      qty:
        quantity,

      total:
        price *
        quantity

    };


    this.addOrIncrementProduct(
      newItem
    );


    this.clearProductSearch();

  }


  /* ==========================================================================
     PRODUTO REPETIDO
     ========================================================================== */

  private addOrIncrementProduct(
    item: OrderItem
  ) {

    if (
      this.isStockLocked()
    ) {

      return;

    }


    this.currentOrder.update(
      order => {

        const items =
          [
            ...order.items
          ];


        const existingIndex =
          items.findIndex(
            existing => {

              if (
                existing.type !==
                'product'
              ) {

                return false;

              }


              if (
                existing.id !== undefined &&
                existing.id !== null
              ) {

                return (

                  Number(
                    existing.id
                  )

                  ===

                  Number(
                    item.id
                  )

                );

              }


              /*
                Compatibilidade com OS antigas.
              */

              return (

                String(
                  existing.name
                )
                  .trim()
                  .toLowerCase()

                ===

                String(
                  item.name
                )
                  .trim()
                  .toLowerCase()

              );

            }
          );


        if (
          existingIndex === -1
        ) {

          items.push(
            item
          );

        } else {

          const existing = {

            ...items[
            existingIndex
            ]

          };


          existing.qty =

            Number(
              existing.qty || 0
            )

            +

            Number(
              item.qty || 0
            );


          existing.total =

            Number(
              existing.price || 0
            )

            *

            existing.qty;


          if (
            !existing.id &&
            item.id
          ) {

            existing.id =
              item.id;

          }


          items[
            existingIndex
          ] =
            existing;

        }


        return {

          ...order,

          items,

          total:
            this.calculateItemsTotal(
              items
            )

        };

      }
    );

  }


  private clearProductSearch() {

    if (
      this.productSearchTimer
    ) {

      clearTimeout(
        this.productSearchTimer
      );


      this.productSearchTimer =
        null;

    }


    this.productSearchRequest++;


    this.productSearchTerm.set(
      ''
    );

    this.productSearchResults.set(
      []
    );

    this.availableProducts.set(
      []
    );

    this.productSearchLoading.set(
      false
    );

    this.productDropdownOpen.set(
      false
    );

    this.productActiveIndex.set(
      -1
    );

    this.selectedProductId.set(
      null
    );

    this.productQty.set(
      1
    );

  }


  /* ==========================================================================
     MÉTODOS DE COMPATIBILIDADE
     ========================================================================== */

  addService() {

    const serviceId =
      this.selectedServiceId();


    if (
      serviceId === null
    ) {

      return;

    }


    const service =
      this.availableServices()
        .find(
          item =>

            Number(
              item.id
            )

            ===

            Number(
              serviceId
            )
        );


    if (service) {

      this.selectService(
        service
      );

    }

  }


  addProduct() {

    if (
      this.isStockLocked()
    ) {

      alert(
        this.getStockLockMessage()
      );


      return;

    }


    const productId =
      this.selectedProductId();


    if (
      productId === null
    ) {

      return;

    }


    const product =
      this.availableProducts()
        .find(
          item =>

            Number(
              item.id
            )

            ===

            Number(
              productId
            )
        );


    if (product) {

      this.selectProduct(
        product
      );

    }

  }


  /* ==========================================================================
     ITENS DA OS
     ========================================================================== */

  private addItem(
    item: OrderItem
  ) {

    this.currentOrder.update(
      order => {

        const newItems = [

          ...order.items,

          item

        ];


        return {

          ...order,

          items:
            newItems,

          total:
            this.calculateItemsTotal(
              newItems
            )

        };

      }
    );

  }


  removeItem(
    index: number
  ) {

    const item =
      this.currentOrder()
        .items[index];


    /*
      Serviço pode continuar sendo alterado.

      Produto fica bloqueado depois da baixa de estoque.
    */

    if (
      item?.type ===
      'product'
      &&
      this.isStockLocked()
    ) {

      alert(
        this.getStockLockMessage()
      );


      return;

    }


    this.currentOrder.update(
      order => {

        const newItems =
          order.items.filter(
            (
              _,
              itemIndex
            ) =>
              itemIndex !==
              index
          );


        return {

          ...order,

          items:
            newItems,

          total:
            this.calculateItemsTotal(
              newItems
            )

        };

      }
    );

  }


  /* ==========================================================================
     CALCULAR TOTAL DOS ITENS
     ========================================================================== */

  private calculateItemsTotal(
    items: OrderItem[]
  ): number {

    return this.roundMoney(
      items.reduce(
        (
          accumulator,
          item
        ) =>

          accumulator +

          Number(
            item.total || 0
          ),

        0
      )
    );

  }


  /* ==========================================================================
     BLOQUEIO DE ESTOQUE
     ========================================================================== */

  canEditStockItems(): boolean {

    return !this.isStockLocked();

  }


  getStockLockMessage(): string {

    if (
      !this.isStockLocked()
    ) {

      return '';

    }


    return (

      'O estoque desta Ordem de Serviço já foi processado. ' +

      'Os produtos, quantidades e o status Finalizado estão protegidos.'

    );

  }


  /* ==========================================================================
     SALVAR OS
     ========================================================================== */

  async saveOrder() {

    const order = {

      ...this.currentOrder(),

      items: [
        ...this.currentOrder().items
      ]

    };


    order.total =
      this.calculateItemsTotal(
        order.items
      );


    if (
      !window.electronAPI
    ) {

      this.closeModal();


      console.warn(
        'Modo navegador: ação não persistida.'
      );


      return;

    }


    try {

      let savedOrder: any;


      if (
        order.id &&
        order.id !== 0
      ) {

        savedOrder =
          await window.electronAPI
            .updateOS(
              order
            );

      } else {

        savedOrder =
          await window.electronAPI
            .addOS(
              order
            );

      }


      if (
        savedOrder &&
        Number(
          savedOrder.id
        ) > 0
      ) {

        this.currentOrder.set({

          ...this.currentOrder(),

          ...savedOrder

        });

      }


      await this.loadData();


      this.closeModal();

    } catch (error: any) {

      console.error(
        'Erro ao salvar OS:',
        error
      );


      const rawMessage =
        String(

          error?.message ||

          error ||

          ''

        );


      /* ----------------------------------------------------------------------
         ESTOQUE INSUFICIENTE
         ---------------------------------------------------------------------- */

      const insufficientStock =
        rawMessage.match(
          /Estoque insuficiente para "[^"]+".*?(?=(?:\n|$))/
        );


      if (
        insufficientStock
      ) {

        alert(
          insufficientStock[0]
        );


        return;

      }


      /* ----------------------------------------------------------------------
         PRODUTO ANTIGO SEM ID
         ---------------------------------------------------------------------- */

      const invalidProduct =
        rawMessage.match(
          /O produto "[^"]+" não possui identificação válida para movimentar o estoque\./
        );


      if (
        invalidProduct
      ) {

        alert(

          invalidProduct[0] +

          '\n\nRemova esse item da OS e adicione o produto novamente pela busca.'

        );


        return;

      }


      /* ----------------------------------------------------------------------
         PRODUTO NÃO EXISTE MAIS
         ---------------------------------------------------------------------- */

      if (
        rawMessage.includes(
          'não foi encontrado no estoque'
        )
      ) {

        alert(

          'Um dos produtos desta OS não existe mais no cadastro de produtos.\n\n' +

          'Remova o item da OS ou cadastre novamente o produto antes de finalizar.'

        );


        return;

      }


      /* ----------------------------------------------------------------------
         ESTOQUE JÁ PROCESSADO
         ---------------------------------------------------------------------- */

      if (
        rawMessage.includes(
          'já teve o estoque processado'
        )
      ) {

        alert(

          'Esta Ordem de Serviço já teve o estoque processado.\n\n' +

          'Ela deve permanecer como Finalizada. Para reabrir a OS, será necessário fazer um estorno de estoque.'

        );


        return;

      }


      if (
        rawMessage.includes(
          'Os produtos desta OS não podem ser alterados'
        )
      ) {

        alert(

          'As peças desta Ordem de Serviço estão protegidas porque o estoque já foi baixado.\n\n' +

          'Para corrigir produtos ou quantidades, será necessário estornar a OS primeiro.'

        );


        return;

      }


      /* ----------------------------------------------------------------------
         TOTAL MENOR QUE O JÁ PAGO
         ---------------------------------------------------------------------- */

      if (
        rawMessage.includes(
          'não pode ser menor que o valor já pago'
        )
      ) {

        alert(
          'O total desta OS não pode ficar menor que o valor que o cliente já pagou.'
        );


        return;

      }


      /* ----------------------------------------------------------------------
         CLIENTE COM PAGAMENTOS
         ---------------------------------------------------------------------- */

      if (
        rawMessage.includes(
          'cliente desta OS não pode ser alterado'
        )
      ) {

        alert(
          'O cliente desta OS não pode ser alterado porque já existem pagamentos registrados.'
        );


        return;

      }


      /* ----------------------------------------------------------------------
         CANCELAMENTO COM PAGAMENTOS
         ---------------------------------------------------------------------- */

      if (
        rawMessage.includes(
          'não pode ser cancelada sem estornar os pagamentos'
        )
      ) {

        alert(
          'Esta OS possui pagamentos registrados. Para cancelar, será necessário estornar os pagamentos primeiro.'
        );


        return;

      }


      /* ----------------------------------------------------------------------
         OS INVÁLIDA
         ---------------------------------------------------------------------- */

      if (
        rawMessage.includes(
          'Ordem de Serviço inválida'
        )
        ||
        rawMessage.includes(
          'Ordem de Serviço #'
        )
      ) {

        alert(
          'Não foi possível localizar esta Ordem de Serviço no banco de dados.'
        );


        return;

      }


      /* ----------------------------------------------------------------------
         ERRO GENÉRICO
         ---------------------------------------------------------------------- */

      alert(

        'Não foi possível salvar a Ordem de Serviço.\n\n' +

        'Nenhuma alteração de estoque ou pagamento foi realizada.'

      );

    }

  }


  /* ==========================================================================
     EXCLUIR OS
     ========================================================================== */

  async deleteOrder(
    id: number
  ) {

    const targetOrder =
      this.orders()
        .find(
          order =>

            Number(
              order.id
            )

            ===

            Number(
              id
            )
        );


    /* ----------------------------------------------------------------------
       ESTOQUE JÁ MOVIMENTADO
       ---------------------------------------------------------------------- */

    if (
      Number(
        targetOrder?.stockProcessed || 0
      ) === 1
    ) {

      alert(

        'Esta Ordem de Serviço não pode ser excluída porque já movimentou o estoque.\n\n' +

        'Será necessário estornar a OS antes da exclusão.'

      );


      return;

    }


    /* ----------------------------------------------------------------------
       PAGAMENTOS JÁ REGISTRADOS
       ---------------------------------------------------------------------- */

    if (
      Number(
        targetOrder?.paidAmount || 0
      ) > 0
    ) {

      alert(

        'Esta Ordem de Serviço não pode ser excluída porque possui pagamentos registrados.\n\n' +

        'Primeiro será necessário estornar os pagamentos.'

      );


      return;

    }


    const confirmed =
      confirm(
        'Tem certeza que deseja excluir esta OS?'
      );


    if (!confirmed) {

      return;

    }


    if (
      !window.electronAPI
    ) {

      this.orders.update(
        list =>
          list.filter(
            order =>
              order.id !==
              id
          )
      );


      return;

    }


    try {

      await window.electronAPI
        .deleteOS(
          id
        );


      this.orders.update(
        list =>
          list.filter(
            order =>
              order.id !==
              id
          )
      );

    } catch (error: any) {

      console.error(
        'Erro ao excluir OS:',
        error
      );


      const rawMessage =
        String(

          error?.message ||

          error ||

          ''

        );


      if (
        rawMessage.includes(
          'já movimentou o estoque'
        )
        ||
        rawMessage.includes(
          'estornar a OS'
        )
      ) {

        alert(

          'Esta Ordem de Serviço não pode ser excluída porque já movimentou o estoque.\n\n' +

          'Será necessário estornar a OS antes da exclusão.'

        );


        return;

      }


      if (
        rawMessage.includes(
          'possui pagamentos registrados'
        )
      ) {

        alert(

          'Esta Ordem de Serviço possui pagamentos registrados e não pode ser excluída.\n\n' +

          'Primeiro será necessário estornar os pagamentos.'

        );


        return;

      }


      alert(
        'Não foi possível excluir a Ordem de Serviço.'
      );

    }

  }


  /* ==========================================================================
     ABRIR CAIXA DA OS
     ========================================================================== */

  async openPaymentModal(
    os: OrdemServicoModel
  ) {

    if (
      !os ||
      !os.id ||
      Number(
        os.id
      ) <= 0
    ) {

      alert(
        'Salve a Ordem de Serviço antes de registrar um pagamento.'
      );


      return;

    }


    if (
      os.status ===
      'canceled'
    ) {

      alert(
        'Não é possível receber pagamento de uma Ordem de Serviço cancelada.'
      );


      return;

    }


    this.paymentOrder.set(
      JSON.parse(
        JSON.stringify(
          os
        )
      )
    );


    this.paymentMethod.set(
      'pix'
    );


    this.paymentReceivedAmount.set(
      null
    );


    this.paymentNotes.set(
      ''
    );


    this.paymentMessage.set(
      ''
    );


    this.paymentMessageType.set(
      'idle'
    );


    this.paymentSummary.set(
      null
    );


    this.paymentHistory.set(
      []
    );


    this.showPaymentModal.set(
      true
    );


    await this.loadPaymentData();

  }


  /* ==========================================================================
     FECHAR CAIXA
     ========================================================================== */

  closePaymentModal() {

    if (
      this.paymentSaving()
    ) {

      return;

    }


    this.showPaymentModal.set(
      false
    );


    this.paymentOrder.set(
      null
    );


    this.paymentSummary.set(
      null
    );


    this.paymentHistory.set(
      []
    );


    this.paymentReceivedAmount.set(
      null
    );


    this.paymentNotes.set(
      ''
    );


    this.paymentMessage.set(
      ''
    );


    this.paymentMessageType.set(
      'idle'
    );

  }


  /* ==========================================================================
     CARREGAR RESUMO + HISTÓRICO
     ========================================================================== */

  async loadPaymentData() {

    const order =
      this.paymentOrder();


    if (
      !order ||
      !window.electronAPI
    ) {

      return;

    }


    this.paymentLoading.set(
      true
    );


    try {

      const [
        summary,
        history
      ] =
        await Promise.all([

          window.electronAPI
            .getOSPaymentSummary(
              order.id
            ),

          window.electronAPI
            .getOSPayments(
              order.id
            )

        ]);


      this.paymentSummary.set(
        summary
      );


      this.paymentHistory.set(
        history || []
      );


      this.updateOrderFinancialState(
        order.id,
        summary
      );

    } catch (error: any) {

      console.error(
        'Erro ao carregar pagamentos da OS:',
        error
      );


      this.paymentMessageType.set(
        'error'
      );


      this.paymentMessage.set(
        'Não foi possível carregar os dados financeiros desta OS.'
      );

    } finally {

      this.paymentLoading.set(
        false
      );

    }

  }


  /* ==========================================================================
     CONFIRMAR PAGAMENTO
     ========================================================================== */

  async confirmPayment() {

    const order =
      this.paymentOrder();


    const summary =
      this.paymentSummary();


    if (
      !order ||
      !summary
    ) {

      return;

    }


    if (
      !window.electronAPI
    ) {

      this.paymentMessageType.set(
        'error'
      );


      this.paymentMessage.set(
        'Electron não está disponível.'
      );


      return;

    }


    const receivedAmount =
      this.roundMoney(
        Number(
          this.paymentReceivedAmount() || 0
        )
      );


    if (
      !Number.isFinite(
        receivedAmount
      )
      ||
      receivedAmount <= 0
    ) {

      this.paymentMessageType.set(
        'error'
      );


      this.paymentMessage.set(
        'Informe um valor recebido maior que zero.'
      );


      return;

    }


    const remainingAmount =
      this.roundMoney(
        Number(
          summary.remainingAmount || 0
        )
      );


    if (
      remainingAmount <= 0
    ) {

      this.paymentMessageType.set(
        'error'
      );


      this.paymentMessage.set(
        'Esta Ordem de Serviço já está totalmente paga.'
      );


      return;

    }


    /*
      Apenas dinheiro pode ser maior que a dívida,
      pois nesse caso existe troco.
    */

    if (
      this.paymentMethod() !==
      'cash'
      &&
      receivedAmount >
      remainingAmount
    ) {

      this.paymentMessageType.set(
        'error'
      );


      this.paymentMessage.set(
        `Para esta forma de pagamento, informe no máximo R$ ${remainingAmount.toFixed(2)}.`
      );


      return;

    }


    this.paymentSaving.set(
      true
    );


    this.paymentMessage.set(
      ''
    );


    this.paymentMessageType.set(
      'idle'
    );


    try {

      const result =
        await window.electronAPI
          .addOSPayment(

            order.id,

            {
              method:
                this.paymentMethod(),

              receivedAmount,

              notes:
                this.paymentNotes()
                  .trim()
            }

          );


      this.paymentSummary.set(
        result.summary
      );


      this.paymentHistory.update(
        current => [

          result.payment,

          ...current

        ]
      );


      this.updateOrderFinancialState(
        order.id,
        result.summary
      );


      /*
        Limpa o formulário para um possível
        próximo pagamento.
      */

      this.paymentReceivedAmount.set(
        null
      );


      this.paymentNotes.set(
        ''
      );


      /* ----------------------------------------------------------------------
         TROCO
         ---------------------------------------------------------------------- */

      if (
        Number(
          result.payment
            .changeAmount || 0
        ) > 0
      ) {

        this.paymentMessage.set(

          `Pagamento registrado. Troco a devolver: R$ ${Number(
            result.payment.changeAmount
          ).toFixed(2)

          }.`

        );

      }

      /* ----------------------------------------------------------------------
         TOTALMENTE PAGO
         ---------------------------------------------------------------------- */

      else if (
        result.summary
          .paymentStatus ===
        'paid'
      ) {

        this.paymentMessage.set(
          'Pagamento registrado. Esta OS está totalmente paga.'
        );

      }

      /* ----------------------------------------------------------------------
         PAGAMENTO PARCIAL
         ---------------------------------------------------------------------- */

      else {

        this.paymentMessage.set(

          `Pagamento registrado. Saldo restante: R$ ${Number(
            result.summary
              .remainingAmount
          ).toFixed(2)

          }.`

        );

      }


      this.paymentMessageType.set(
        'success'
      );

    } catch (error: any) {

      console.error(
        'Erro ao registrar pagamento:',
        error
      );


      const rawMessage =
        String(

          error?.message ||

          error ||

          ''

        );


      const knownMessages = [

        'Selecione uma forma de pagamento válida.',

        'Informe um valor recebido maior que zero.',

        'Esta Ordem de Serviço já está totalmente paga.',

        'Não é possível registrar pagamento em uma OS cancelada.'

      ];


      const known =
        knownMessages.find(
          message =>
            rawMessage.includes(
              message
            )
        );


      this.paymentMessageType.set(
        'error'
      );


      if (known) {

        this.paymentMessage.set(
          known
        );

      }

      else if (
        rawMessage.includes(
          'valor informado é maior que o saldo pendente'
        )
      ) {

        this.paymentMessage.set(

          'O valor informado é maior que o saldo pendente. ' +

          'Para PIX, cartão ou transferência, informe somente até o valor da dívida.'

        );

      }

      else {

        this.paymentMessage.set(
          'Não foi possível registrar o pagamento.'
        );

      }

    } finally {

      this.paymentSaving.set(
        false
      );

    }

  }


  /* ==========================================================================
     ATUALIZAR FINANCEIRO NA LISTAGEM
     ========================================================================== */

  private updateOrderFinancialState(
    orderId: number,
    summary: OSPaymentSummary
  ) {

    this.orders.update(
      list =>
        list.map(
          order =>

            Number(
              order.id
            )

              ===

              Number(
                orderId
              )

              ? {

                ...order,

                paidAmount:
                  summary.paidAmount,

                remainingAmount:
                  summary.remainingAmount,

                paymentStatus:
                  summary.paymentStatus

              }

              : order
        )
    );


    /*
      Atualiza a OS aberta no modal.
    */

    if (
      Number(
        this.currentOrder().id
      )

      ===

      Number(
        orderId
      )
    ) {

      this.currentOrder.update(
        order => ({

          ...order,

          paidAmount:
            summary.paidAmount,

          remainingAmount:
            summary.remainingAmount,

          paymentStatus:
            summary.paymentStatus

        })
      );

    }


    /*
      Atualiza a cópia usada pelo caixa.
    */

    const paymentOrder =
      this.paymentOrder();


    if (
      paymentOrder
      &&
      Number(
        paymentOrder.id
      )

      ===

      Number(
        orderId
      )
    ) {

      this.paymentOrder.set({

        ...paymentOrder,

        paidAmount:
          summary.paidAmount,

        remainingAmount:
          summary.remainingAmount,

        paymentStatus:
          summary.paymentStatus

      });

    }

  }


  /* ==========================================================================
     COMPATIBILIDADE COM O HTML ANTIGO

     O antigo select de pagamento ainda pode chamar este método.

     Agora ele NÃO muda o status manualmente.
     Ele simplesmente abre o caixa.
     ========================================================================== */

  async updatePayment(
    os: OrdemServicoModel,
    _newStatus: string
  ) {

    await this.openPaymentModal(
      os
    );

  }


  /* ==========================================================================
     FORMA DE PAGAMENTO
     ========================================================================== */

  getPaymentMethodLabel(
    method: string
  ): string {

    const map:
      Record<string, string> = {

      cash:
        'Dinheiro',

      pix:
        'PIX',

      'debit-card':
        'Cartão de Débito',

      'credit-card':
        'Cartão de Crédito',

      transfer:
        'Transferência',

      other:
        'Outro',

      legacy:
        'Pagamento antigo'

    };


    return (

      map[method]

      ||

      method

      ||

      'Pagamento'

    );

  }


  /* ==========================================================================
     STATUS FINANCEIRO
     ========================================================================== */

  getPaymentStatusLabel(
    status?: string
  ): string {

    const map:
      Record<string, string> = {

      pending:
        'Pendente',

      partial:
        'Parcial',

      paid:
        'Pago'

    };


    return (

      map[
      String(
        status ||
        'pending'
      )
      ]

      ||

      'Pendente'

    );

  }


  getPaymentStatusClass(
    status?: string
  ): string {

    switch (
    String(
      status ||
      'pending'
    )
    ) {

      case 'paid':

        return 'payment-paid';


      case 'partial':

        return 'payment-partial';


      default:

        return 'payment-pending';

    }

  }


  /* ==========================================================================
     VALORES FINANCEIROS
     ========================================================================== */

  getOrderPaidAmount(
    os: OrdemServicoModel
  ): number {

    return this.roundMoney(
      Number(
        os.paidAmount || 0
      )
    );

  }


  getOrderRemainingAmount(
    os: OrdemServicoModel
  ): number {

    if (
      os.remainingAmount !==
      undefined
      &&
      os.remainingAmount !==
      null
    ) {

      return this.roundMoney(
        Number(
          os.remainingAmount || 0
        )
      );

    }


    return this.roundMoney(
      Math.max(

        0,

        Number(
          os.total || 0
        )

        -

        Number(
          os.paidAmount || 0
        )

      )
    );

  }


  /* ==========================================================================
     ARREDONDAMENTO DE DINHEIRO
     ========================================================================== */

  private roundMoney(
    value: number
  ): number {

    return (

      Math.round(

        (
          Number(
            value || 0
          )

          +

          Number.EPSILON
        )

        *

        100

      )

      /

      100

    );

  }


  /* ==========================================================================
     IMPRESSÃO
     ========================================================================== */

  printOS(
    os?: OrdemServicoModel
  ) {

    if (os) {

      this.osItemToView.set(
        JSON.parse(
          JSON.stringify(
            os
          )
        )
      );

    } else {

      this.osItemToView.set(
        JSON.parse(
          JSON.stringify(
            this.currentOrder()
          )
        )
      );

    }


    setTimeout(
      () => {

        window.print();

      },

      200
    );

  }


  /* ==========================================================================
     OS VAZIA
     ========================================================================== */

  private getEmptyOrder(
    defaultClient:
      string = ''
  ): OrdemServicoModel {

    return {

      id:
        0,


      client:
        defaultClient,


      vehicle:
        '',


      status:
        'pending',


      date:
        new Date()
          .toISOString()
          .split('T')[0],


      items:
        [],


      notes:
        '',


      total:
        0,


      paymentStatus:
        'pending',


      paidAmount:
        0,


      remainingAmount:
        0,


      stockProcessed:
        0,


      archived:
        0,


      archivedAt:
        null

    };

  }

}