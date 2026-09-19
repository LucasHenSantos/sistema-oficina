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

interface OrcamentoItem {
  type: 'service' | 'product';

  id: number;

  name: string;

  qty: number;

  price: number;

  total: number;
}


interface Orcamento {
  id: number;

  client: string;

  vehicle: string;

  date: string;

  validUntil: string;

  status:
  | 'pending'
  | 'approved'
  | 'rejected';

  total: number;

  items: OrcamentoItem[];

  notes: string;

  archived?: number;

  archivedAt?: string | null;
}


/* ==========================================================================
   COMPONENTE
   ========================================================================== */

@Component({
  selector: 'app-orcamentos',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './orcamentos.html',

  styleUrl: './orcamentos.css'
})
export class Orcamentos implements OnInit {

  /* ==========================================================================
     LISTAGEM DE ORÇAMENTOS
     ========================================================================== */

  searchTerm = signal('');

  budgets = signal<Orcamento[]>([]);

  /* ==========================================================================
   ARQUIVAMENTO
   ========================================================================== */

  archivedCount = signal(0);

  showArchivedModal = signal(false);

  archivedBudgets = signal<Orcamento[]>([]);

  archivedSearchTerm = signal('');

  archivedLoading = signal(false);

  archivedMessage = signal('');


  private archivedSearchTimer:
    ReturnType<typeof setTimeout> | null = null;

  private archivedSearchRequest = 0;


  archivableBudgetsCount = computed(() => {

    return this.budgets().filter(
      budget =>
        budget.status === 'approved' ||
        budget.status === 'rejected'
    ).length;

  });


  /* ==========================================================================
     MODAIS
     ========================================================================== */

  showModal = signal(false);

  showViewModal = signal(false);


  /* ==========================================================================
     CLIENTES E VEÍCULOS
     ========================================================================== */

  clientsList = signal<string[]>([]);

  private allVehicles: any[] = [];

  availableVehicles = signal<string[]>([]);


  /* ==========================================================================
     COMPATIBILIDADE TEMPORÁRIA

     Esses signals permanecem aqui porque o HTML atual ainda contém os
     selects antigos.

     No próximo passo vamos substituir esses selects pelos novos campos
     de busca.

     Não carregamos mais milhares de serviços/produtos aqui.
     ========================================================================== */

  availableServices = signal<any[]>([]);

  availableProducts = signal<any[]>([]);

  selectedServiceId = signal<number | null>(null);

  selectedProductId = signal<number | null>(null);


  /* ==========================================================================
     BUSCA DE SERVIÇOS
     ========================================================================== */

  serviceSearchTerm = signal('');

  serviceSearchResults = signal<any[]>([]);

  serviceSearchLoading = signal(false);

  serviceDropdownOpen = signal(false);

  serviceActiveIndex = signal(-1);


  private serviceSearchTimer:
    ReturnType<typeof setTimeout> | null = null;

  /*
    Serve para evitar que uma resposta antiga de busca
    sobrescreva uma busca mais recente.
  */
  private serviceSearchRequest = 0;


  /* ==========================================================================
     BUSCA DE PRODUTOS
     ========================================================================== */

  productSearchTerm = signal('');

  productSearchResults = signal<any[]>([]);

  productSearchLoading = signal(false);

  productDropdownOpen = signal(false);

  productActiveIndex = signal(-1);

  productQty = signal(1);


  private productSearchTimer:
    ReturnType<typeof setTimeout> | null = null;

  private productSearchRequest = 0;


  /* ==========================================================================
     ORÇAMENTO ATUAL
     ========================================================================== */

  currentBudget = signal<Orcamento>(
    this.getEmptyBudget()
  );


  budgetItemToView =
    signal<Orcamento | null>(null);


  /* ==========================================================================
     EMPRESA
     ========================================================================== */

  companyData = signal<any>(null);


  /* ==========================================================================
     CONSTRUTOR
     ========================================================================== */

  constructor(
    private cdr: ChangeDetectorRef
  ) { }


  /* ==========================================================================
     CICLO DE VIDA
     ========================================================================== */

  ngOnInit(): void {

    this.loadData();

  }


  /* ==========================================================================
     CARREGAMENTO PRINCIPAL
     ========================================================================== */

  async loadData() {

    if (!window.electronAPI) {
      return;
    }


    try {

      const budgetsData =
        await window.electronAPI.getOrcamentos();

      const archivedCount =
        await window.electronAPI.getArchivedOrcamentosCount();


      const clientsData =
        await window.electronAPI.getClientes();


      this.allVehicles =
        await window.electronAPI.getVeiculos();


      const companyConfig =
        await window.electronAPI.getConfig(
          'dados_empresa'
        );


      this.budgets.set(
        budgetsData || []
      );

      this.archivedCount.set(
        Number(
          archivedCount || 0
        )
      );


      this.clientsList.set(
        (clientsData || []).map(
          (client: any) =>
            client.name
        )
      );


      this.companyData.set(
        companyConfig
      );


      /*
        Importante:

        NÃO carregamos mais todos os serviços e produtos aqui.

        Antes:

        getServicos()
        getProdutos()

        Isso funcionava com poucos registros, mas se torna ruim
        quando o banco possui milhares de itens.

        Agora o banco será consultado somente quando o funcionário
        realmente pesquisar alguma coisa.
      */


      const defaultClient =
        this.clientsList()[0] || '';


      this.currentBudget.set(
        this.getEmptyBudget(
          defaultClient
        )
      );


      this.onClientChange(
        defaultClient
      );


      this.cdr.detectChanges();

    } catch (error) {

      console.error(
        'Erro ao carregar dados de orçamento:',
        error
      );

    }

  }


  /* ==========================================================================
     FILTRO DA LISTAGEM
     ========================================================================== */

  filteredBudgets = computed(() => {

    const term =
      this.searchTerm()
        .trim()
        .toLowerCase();


    if (!term) {
      return this.budgets();
    }


    return this.budgets().filter(
      budget => {

        return (

          String(
            budget.client || ''
          )
            .toLowerCase()
            .includes(term)

          ||

          String(
            budget.vehicle || ''
          )
            .toLowerCase()
            .includes(term)

          ||

          String(
            budget.id || ''
          )
            .toLowerCase()
            .includes(term)

        );

      }
    );

  });

  /* ==========================================================================
   ARQUIVAR ORÇAMENTOS CONCLUÍDOS
   ========================================================================== */

  async archiveCompletedBudgets() {

    const available =
      this.archivableBudgetsCount();


    if (available <= 0) {

      alert(
        'Não há orçamentos aprovados ou rejeitados disponíveis para arquivar.'
      );

      return;

    }


    const confirmed =
      confirm(
        `Arquivar ${available} ${available === 1
          ? 'orçamento concluído'
          : 'orçamentos concluídos'
        }?\n\n` +
        'Serão arquivados os orçamentos Aprovados e Rejeitados.\n' +
        'Orçamentos Pendentes continuarão na tela principal.\n\n' +
        'Nenhum registro será excluído.'
      );


    if (!confirmed) {
      return;
    }


    if (!window.electronAPI) {
      return;
    }


    try {

      const result =
        await window.electronAPI
          .archiveCompletedOrcamentos();


      const archived =
        Number(
          result?.count || 0
        );


      await this.loadData();


      if (
        this.showArchivedModal()
      ) {

        await this.loadArchivedBudgets(
          this.archivedSearchTerm()
        );

      }


      if (
        archived <= 0
      ) {

        alert(
          'Nenhum orçamento foi arquivado.'
        );

        return;

      }


      alert(
        `${archived} ${archived === 1
          ? 'orçamento foi arquivado.'
          : 'orçamentos foram arquivados.'
        }`
      );

    } catch (error) {

      console.error(
        'Erro ao arquivar orçamentos:',
        error
      );


      alert(
        'Não foi possível arquivar os orçamentos.'
      );

    }

  }


  /* ==========================================================================
     ABRIR HISTÓRICO DE ORÇAMENTOS ARQUIVADOS
     ========================================================================== */

  async openArchivedBudgets() {

    this.showArchivedModal.set(
      true
    );


    this.archivedSearchTerm.set(
      ''
    );


    this.archivedMessage.set(
      ''
    );


    this.archivedBudgets.set(
      []
    );


    await this.loadArchivedBudgets(
      ''
    );

  }


  /* ==========================================================================
     FECHAR HISTÓRICO
     ========================================================================== */

  closeArchivedBudgets() {

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
      Invalida alguma pesquisa antiga
      que ainda esteja esperando o SQLite.
    */
    this.archivedSearchRequest++;


    this.showArchivedModal.set(
      false
    );


    this.archivedSearchTerm.set(
      ''
    );


    this.archivedBudgets.set(
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


    this.archivedSearchTimer =
      setTimeout(
        () => {

          this.loadArchivedBudgets(
            term
          );

        },

        250
      );

  }


  /* ==========================================================================
     CARREGAR ORÇAMENTOS ARQUIVADOS
     ========================================================================== */

  async loadArchivedBudgets(
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
          .getArchivedOrcamentos(
            String(
              searchTerm || ''
            ).trim()
          );


      /*
        Se outra pesquisa começou depois,
        ignoramos a resposta antiga.
      */
      if (
        requestId !==
        this.archivedSearchRequest
      ) {

        return;

      }


      const safeResults =
        (results || []) as Orcamento[];


      this.archivedBudgets.set(
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
            'Nenhum orçamento arquivado encontrado para esta pesquisa.'
          );

        } else {

          this.archivedMessage.set(
            'Nenhum orçamento arquivado.'
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
        'Erro ao carregar orçamentos arquivados:',
        error
      );


      this.archivedBudgets.set(
        []
      );


      this.archivedMessage.set(
        'Não foi possível carregar os orçamentos arquivados.'
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
     DESARQUIVAR ORÇAMENTO
     ========================================================================== */

  async unarchiveBudget(
    budget: Orcamento
  ) {

    if (
      !budget ||
      !budget.id
    ) {

      return;

    }


    const confirmed =
      confirm(
        `Desarquivar o Orçamento #${budget.id}?\n\n` +
        'Ele voltará para a listagem principal e poderá ser consultado normalmente.'
      );


    if (
      !confirmed
    ) {

      return;

    }


    if (
      !window.electronAPI
    ) {

      return;

    }


    try {

      await window.electronAPI
        .unarchiveOrcamento(
          budget.id
        );


      /*
        Atualiza a listagem principal e
        o contador de arquivados.
      */
      await this.loadData();


      /*
        Mantém o modal aberto e atualiza
        a pesquisa atual.
      */
      if (
        this.showArchivedModal()
      ) {

        await this.loadArchivedBudgets(
          this.archivedSearchTerm()
        );

      }

    } catch (error) {

      console.error(
        'Erro ao desarquivar orçamento:',
        error
      );


      alert(
        'Não foi possível desarquivar este orçamento.'
      );

    }

  }


  /* ==========================================================================
     CLIENTE / VEÍCULO
     ========================================================================== */

  onClientChange(
    clientName: string
  ) {

    const filtered =
      this.allVehicles.filter(
        vehicle =>
          vehicle.client ===
          clientName
      );


    const vehiclesFormatted =
      filtered.map(
        vehicle =>
          `${vehicle.model} (${vehicle.plate})`
      );


    this.availableVehicles.set(
      vehiclesFormatted
    );


    this.currentBudget.update(
      budget => ({
        ...budget,

        vehicle:
          vehiclesFormatted[0] || ''
      })
    );

  }


  /* ==========================================================================
     VISUALIZAÇÃO
     ========================================================================== */

  viewBudget(
    budget: Orcamento
  ) {

    this.budgetItemToView.set(
      JSON.parse(
        JSON.stringify(
          budget
        )
      )
    );


    this.showViewModal.set(
      true
    );

  }


  closeViewModal() {

    this.showViewModal.set(
      false
    );


    this.budgetItemToView.set(
      null
    );

  }


  /* ==========================================================================
     ABRIR NOVO ORÇAMENTO
     ========================================================================== */

  openModal() {

    const defaultClient =
      this.clientsList()[0] || '';


    this.currentBudget.set(
      this.getEmptyBudget(
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
     EDITAR ORÇAMENTO
     ========================================================================== */

  editBudget(
    budget: Orcamento
  ) {

    this.currentBudget.set(
      JSON.parse(
        JSON.stringify(
          budget
        )
      )
    );


    this.onClientChange(
      budget.client
    );


    /*
      onClientChange define o primeiro veículo da lista.

      Como estamos editando, restauramos o veículo original
      depois de atualizar a lista disponível.
    */
    this.currentBudget.update(
      current => ({
        ...current,

        vehicle:
          budget.vehicle
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
     EXCLUIR
     ========================================================================== */

  async deleteBudget(
    id: number
  ) {

    const confirmed =
      confirm(
        'Tem certeza que deseja excluir este orçamento?'
      );


    if (!confirmed) {
      return;
    }


    if (!window.electronAPI) {

      this.budgets.update(
        list =>
          list.filter(
            budget =>
              budget.id !== id
          )
      );

      return;

    }


    try {

      await window.electronAPI.deleteOrcamento(
        id
      );


      this.budgets.update(
        list =>
          list.filter(
            budget =>
              budget.id !== id
          )
      );

    } catch (error) {

      console.error(
        'Erro ao excluir orçamento:',
        error
      );


      alert(
        'Erro ao excluir o orçamento.'
      );

    }

  }


  /* ==========================================================================
     SALVAR ORÇAMENTO
     ========================================================================== */

  async saveBudget() {

    const budget = {
      ...this.currentBudget()
    };


    budget.total =
      budget.items.reduce(
        (
          accumulator,
          item
        ) =>
          accumulator +
          Number(item.total || 0),

        0
      );


    if (!window.electronAPI) {

      this.closeModal();

      return;

    }


    try {

      if (
        budget.id &&
        budget.id !== 0
      ) {

        await window.electronAPI.updateOrcamento(
          budget
        );

      } else {

        await window.electronAPI.addOrcamento(
          budget
        );

      }


      await this.loadData();


      this.closeModal();

    } catch (error) {

      console.error(
        'Erro ao salvar orçamento:',
        error
      );


      alert(
        'Erro ao salvar no banco de dados.'
      );

    }

  }


  /* ==========================================================================
     CONVERTER ORÇAMENTO EM OS
     ========================================================================== */

  async convertToOS(
    budget: Orcamento
  ) {

    if (
      budget.status !==
      'approved'
    ) {

      alert(
        'Apenas orçamentos com status "Aprovado" podem ser convertidos em Ordem de Serviço.'
      );

      return;

    }


    const confirmed =
      confirm(
        `Converter o Orçamento #${budget.id} para uma nova Ordem de Serviço?`
      );


    if (!confirmed) {
      return;
    }


    if (!window.electronAPI) {
      return;
    }


    const osData = {

      client:
        budget.client,

      vehicle:
        budget.vehicle,

      items:
        budget.items,

      notes:
        `Gerado a partir do Orçamento #${budget.id}. Notas originais: ${budget.notes}`,

      total:
        budget.total,

      date:
        new Date()
          .toISOString()
          .split('T')[0],

      status:
        'in-progress',

      paymentStatus:
        'pending'

    };


    try {

      await window.electronAPI.addOS(
        osData
      );


      alert(
        `Orçamento #${budget.id} convertido com sucesso em Ordem de Serviço!`
      );

    } catch (error) {

      console.error(
        'Erro ao converter orçamento para OS:',
        error
      );


      alert(
        'Erro ao tentar converter para Ordem de Serviço no banco de dados.'
      );

    }

  }


  /* ==========================================================================
     RESET DAS BUSCAS
     ========================================================================== */

  private resetItemSearches() {

    if (this.serviceSearchTimer) {

      clearTimeout(
        this.serviceSearchTimer
      );

      this.serviceSearchTimer = null;

    }


    if (this.productSearchTimer) {

      clearTimeout(
        this.productSearchTimer
      );

      this.productSearchTimer = null;

    }


    /*
      Invalida qualquer busca assíncrona antiga.
    */
    this.serviceSearchRequest++;

    this.productSearchRequest++;


    this.serviceSearchTerm.set('');

    this.serviceSearchResults.set([]);

    this.serviceSearchLoading.set(false);

    this.serviceDropdownOpen.set(false);

    this.serviceActiveIndex.set(-1);


    this.productSearchTerm.set('');

    this.productSearchResults.set([]);

    this.productSearchLoading.set(false);

    this.productDropdownOpen.set(false);

    this.productActiveIndex.set(-1);


    this.productQty.set(1);


    /*
      Compatibilidade com o HTML antigo.
    */
    this.selectedServiceId.set(null);

    this.selectedProductId.set(null);

    this.availableServices.set([]);

    this.availableProducts.set([]);

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


    /*
      Cancela a busca anterior caso o usuário ainda
      esteja digitando.
    */
    if (this.serviceSearchTimer) {

      clearTimeout(
        this.serviceSearchTimer
      );

    }


    const normalized =
      term.trim();


    if (!normalized) {

      this.serviceSearchRequest++;

      this.serviceSearchResults.set([]);

      this.availableServices.set([]);

      this.serviceSearchLoading.set(false);

      this.serviceDropdownOpen.set(false);

      return;

    }


    this.serviceSearchLoading.set(
      true
    );


    this.serviceDropdownOpen.set(
      true
    );


    /*
      Debounce de 200ms.

      Se o funcionário digitar "troca de óleo",
      não fazemos uma consulta ao SQLite para cada letra.
    */
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

    if (!window.electronAPI) {
      return;
    }


    const requestId =
      ++this.serviceSearchRequest;


    try {

      const results =
        await window.electronAPI.searchServicos(
          term
        );


      /*
        Se outra busca começou enquanto esta estava
        no banco, ignoramos esta resposta antiga.
      */
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


      /*
        Mantemos sincronizado apenas temporariamente
        para o HTML antigo continuar compilando.
      */
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


      this.serviceSearchResults.set([]);

      this.availableServices.set([]);

      this.serviceSearchLoading.set(false);

      this.serviceActiveIndex.set(-1);

    }

  }


  onServiceSearchFocus() {

    if (
      this.serviceSearchTerm().trim()
    ) {

      this.serviceDropdownOpen.set(
        true
      );

    }

  }


  onServiceSearchBlur() {

    /*
      Pequeno atraso para permitir clicar em um resultado
      antes do dropdown desaparecer.
    */
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


      const nextIndex =
        Math.min(
          this.serviceActiveIndex() + 1,
          results.length - 1
        );


      this.serviceActiveIndex.set(
        nextIndex
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


      const previousIndex =
        Math.max(
          this.serviceActiveIndex() - 1,
          0
        );


      this.serviceActiveIndex.set(
        previousIndex
      );


      return;

    }


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


    this.addItem({

      type:
        'service',

      id:
        Number(service.id),

      name:
        String(
          service.name || ''
        ),

      qty:
        1,

      price,

      total:
        price

    });


    this.clearServiceSearch();

  }


  private clearServiceSearch() {

    if (this.serviceSearchTimer) {

      clearTimeout(
        this.serviceSearchTimer
      );

      this.serviceSearchTimer = null;

    }


    this.serviceSearchRequest++;


    this.serviceSearchTerm.set('');

    this.serviceSearchResults.set([]);

    this.availableServices.set([]);

    this.serviceSearchLoading.set(false);

    this.serviceDropdownOpen.set(false);

    this.serviceActiveIndex.set(-1);

    this.selectedServiceId.set(null);

  }


  /* ==========================================================================
     BUSCA DE PRODUTOS
     ========================================================================== */

  onProductSearchChange(
    value: string
  ) {

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


    if (this.productSearchTimer) {

      clearTimeout(
        this.productSearchTimer
      );

    }


    const normalized =
      term.trim();


    if (!normalized) {

      this.productSearchRequest++;

      this.productSearchResults.set([]);

      this.availableProducts.set([]);

      this.productSearchLoading.set(false);

      this.productDropdownOpen.set(false);

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

    if (!window.electronAPI) {
      return;
    }


    const requestId =
      ++this.productSearchRequest;


    try {

      const results =
        await window.electronAPI.searchProdutos(
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


      /*
        Compatibilidade temporária com os selects antigos.
      */
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


      this.productSearchResults.set([]);

      this.availableProducts.set([]);

      this.productSearchLoading.set(false);

      this.productActiveIndex.set(-1);

    }

  }


  onProductSearchFocus() {

    if (
      this.productSearchTerm().trim()
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
     TECLADO / SCANNER NO CAMPO DE PRODUTOS
     ========================================================================== */

  async onProductSearchKeydown(
    event: KeyboardEvent
  ) {

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


      const nextIndex =
        Math.min(
          this.productActiveIndex() + 1,
          results.length - 1
        );


      this.productActiveIndex.set(
        nextIndex
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


      const previousIndex =
        Math.max(
          this.productActiveIndex() - 1,
          0
        );


      this.productActiveIndex.set(
        previousIndex
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
      Primeiro tratamos o conteúdo como possível
      código de barras.

      Isso é o que permite:

      apontar o scanner
            ↓
      BIP
            ↓
      código + Enter
            ↓
      produto adicionado imediatamente
    */
    const foundByBarcode =
      await this.tryAddProductByBarcode(
        term
      );


    if (foundByBarcode) {
      return;
    }


    /*
      Se não era código de barras, Enter seleciona o
      resultado atualmente destacado.
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
     BUSCA EXATA POR CÓDIGO DE BARRAS
     ========================================================================== */

  private async tryAddProductByBarcode(
    barcode: string
  ): Promise<boolean> {

    if (!window.electronAPI) {
      return false;
    }


    try {

      const product =
        await window.electronAPI.getProdutoByBarcode(
          barcode
        );


      if (!product) {
        return false;
      }


      /*
        Invalida a busca que possivelmente estava aguardando
        o debounce enquanto o scanner enviava os números.
      */
      this.productSearchRequest++;


      if (this.productSearchTimer) {

        clearTimeout(
          this.productSearchTimer
        );

        this.productSearchTimer = null;

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


    this.addOrIncrementProduct({

      type:
        'product',

      id:
        Number(product.id),

      name:
        String(
          product.name || ''
        ),

      qty:
        quantity,

      price,

      total:
        price * quantity

    });


    this.clearProductSearch();

  }


  /* ==========================================================================
     PRODUTO REPETIDO = AUMENTA QUANTIDADE
     ========================================================================== */

  private addOrIncrementProduct(
    item: OrcamentoItem
  ) {

    this.currentBudget.update(
      budget => {

        const items =
          [...budget.items];


        const existingIndex =
          items.findIndex(
            existing =>
              existing.type ===
              'product'

              &&

              Number(existing.id) ===
              Number(item.id)
          );


        /*
          Produto ainda não está no orçamento.
        */
        if (
          existingIndex === -1
        ) {

          items.push(
            item
          );

        } else {

          /*
            Produto já existe.

            Em vez de:

            Filtro  1
            Filtro  1
            Filtro  1

            fazemos:

            Filtro  3
          */

          const existing = {
            ...items[
            existingIndex
            ]
          };


          existing.qty =
            Number(existing.qty || 0)
            +
            Number(item.qty || 0);


          existing.total =
            existing.price *
            existing.qty;


          items[
            existingIndex
          ] = existing;

        }


        const total =
          items.reduce(
            (
              accumulator,
              current
            ) =>
              accumulator +
              Number(
                current.total || 0
              ),

            0
          );


        return {

          ...budget,

          items,

          total

        };

      }
    );

  }


  private clearProductSearch() {

    if (this.productSearchTimer) {

      clearTimeout(
        this.productSearchTimer
      );

      this.productSearchTimer = null;

    }


    this.productSearchRequest++;


    this.productSearchTerm.set('');

    this.productSearchResults.set([]);

    this.availableProducts.set([]);

    this.productSearchLoading.set(false);

    this.productDropdownOpen.set(false);

    this.productActiveIndex.set(-1);

    this.selectedProductId.set(null);

    this.productQty.set(1);

  }


  /* ==========================================================================
     MÉTODOS LEGADOS

     Eles permanecem temporariamente porque o HTML atual ainda chama
     addService() e addProduct().

     No próximo passo os selects serão removidos.
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
      this.availableServices().find(
        item =>
          Number(item.id) ===
          Number(serviceId)
      );


    if (service) {

      this.selectService(
        service
      );

    }

  }


  addProduct() {

    const productId =
      this.selectedProductId();


    if (
      productId === null
    ) {
      return;
    }


    const product =
      this.availableProducts().find(
        item =>
          Number(item.id) ===
          Number(productId)
      );


    if (product) {

      this.selectProduct(
        product
      );

    }

  }


  /* ==========================================================================
     ADICIONAR ITEM GENÉRICO
     ========================================================================== */

  private addItem(
    item: OrcamentoItem
  ) {

    this.currentBudget.update(
      budget => {

        const newItems = [
          ...budget.items,
          item
        ];


        const newTotal =
          newItems.reduce(
            (
              accumulator,
              current
            ) =>
              accumulator +
              Number(
                current.total || 0
              ),

            0
          );


        return {

          ...budget,

          items:
            newItems,

          total:
            newTotal

        };

      }
    );

  }


  /* ==========================================================================
     REMOVER ITEM
     ========================================================================== */

  removeItem(
    index: number
  ) {

    this.currentBudget.update(
      budget => {

        const newItems =
          budget.items.filter(
            (
              _,
              itemIndex
            ) =>
              itemIndex !==
              index
          );


        const newTotal =
          newItems.reduce(
            (
              accumulator,
              item
            ) =>
              accumulator +
              Number(
                item.total || 0
              ),

            0
          );


        return {

          ...budget,

          items:
            newItems,

          total:
            newTotal

        };

      }
    );

  }


  /* ==========================================================================
     IMPRESSÃO
     ========================================================================== */

  printBudget(
    budget?: Orcamento
  ) {

    if (budget) {

      this.budgetItemToView.set(
        JSON.parse(
          JSON.stringify(
            budget
          )
        )
      );

    } else {

      this.budgetItemToView.set(
        JSON.parse(
          JSON.stringify(
            this.currentBudget()
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
     STATUS
     ========================================================================== */

  getStatusLabel(
    status: string
  ) {

    const map: Record<string, string> = {

      pending:
        'Pendente',

      approved:
        'Aprovado',

      rejected:
        'Rejeitado'

    };


    return (
      map[status] ||
      status
    );

  }


  /* ==========================================================================
     NOVO ORÇAMENTO VAZIO
     ========================================================================== */

  private getEmptyBudget(
    defaultClient:
      string = ''
  ): Orcamento {

    return {

      id:
        0,

      client:
        defaultClient,

      vehicle:
        '',

      date:
        new Date()
          .toISOString()
          .split('T')[0],

      validUntil:
        '',

      status:
        'pending',

      total:
        0,

      items:
        [],

      notes:
        '',

      archived:
        0,

      archivedAt:
        null

    };

  }

}