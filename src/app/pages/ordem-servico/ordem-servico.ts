import { Component, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 1. Interfaces para os itens da OS
interface OrderItem {
  type: 'service' | 'product';
  name: string;
  price: number;
  qty: number;
  total: number;
}

// 2. Interface para o objeto de Ordem de Serviço (Model)
interface OrdemServicoModel {
    id: number;
    client: string;
    vehicle: string;
    status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'canceled';
    date: string;
    items: OrderItem[];
    notes: string;
    total: number;
}

@Component({
  selector: 'app-ordem-servico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ordem-servico.html',
  styleUrl: './ordem-servico.css'
})
export class OrdemServico implements OnInit {
  searchTerm = signal('');
  showModal = signal(false);

  // --- Listas de Apoio (Dados reais do banco) ---
  clientsList = signal<string[]>([]);
  vehiclesList = signal<string[]>([]);
  private allVehicles: any[] = []; // Armazena todos os veículos do banco
  availableServices = signal<any[]>([]);
  availableProducts = signal<any[]>([]);
  
  // --- OBJETO DA OS ATUAL ---
  currentOrder = signal<OrdemServicoModel>(this.getEmptyOrder());

  // Temporários para os selects de adição
  selectedServiceId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  productQty = signal(1);

  // --- LISTA DE OS (TABELA) ---
  orders = signal<OrdemServicoModel[]>([]);
  
  // Injeção do ChangeDetectorRef
  constructor(private cdr: ChangeDetectorRef) {} // <--- AJUSTADO

  // --- CICLO DE VIDA: Carrega todos os dados ---
  ngOnInit(): void {
    this.loadData();
  }

  async loadData() {
    if (!window.electronAPI) return;

    try {
      // 1. Carrega a Lista Principal
      const ordersData = await window.electronAPI.getOS();
      this.orders.set(ordersData);
      
      // 2. Carrega Listas de Apoio (Para Selects e itens)
      const clientsData = await window.electronAPI.getClientes();
      this.allVehicles = await window.electronAPI.getVeiculos(); // <--- ARMAZENA TODOS
      const servicesData = await window.electronAPI.getServicos();
      const productsData = await window.electronAPI.getProdutos();

      // Mapeia para o formato de string simples
      this.clientsList.set(clientsData.map((c: any) => c.name));

      // Produtos usam 'sellPrice'
      this.availableServices.set(servicesData);
      this.availableProducts.set(productsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.sellPrice 
      })));

      // Define cliente padrão para o formulário
      const defaultClient = this.clientsList()[0] || '';

      this.currentOrder.set(this.getEmptyOrder(defaultClient));
      this.onClientChange(defaultClient); // <--- FILTRA VEÍCULOS INICIALMENTE
      this.cdr.detectChanges(); // Força detecção de mudanças

    } catch (error) {
      console.error('Erro ao carregar dados de OS:', error);
    }
  }

  // --- NOVO MÉTODO: Lógica de Filtragem de Veículos ---
  /**
   * Filtra a lista de veículos disponíveis com base no cliente selecionado.
   * @param clientName Nome do cliente selecionado.
   */
  onClientChange(clientName: string) {
    const filtered = this.allVehicles.filter((v: any) => v.client === clientName);
    // Formata para exibição (Modelo (Placa))
    const vehiclesFormatted = filtered.map((v: any) => `${v.model} (${v.plate})`);
    
    this.vehiclesList.set(vehiclesFormatted);

    // Seleciona o primeiro veículo automaticamente, ou limpa se não houver.
    this.currentOrder.update(o => ({ ...o, vehicle: vehiclesFormatted[0] || '' }));
  }


  // Filtro
  filteredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.orders().filter(o => 
      o.client.toLowerCase().includes(term) ||
      o.vehicle.toLowerCase().includes(term) ||
      o.id.toString().includes(term)
    );
  });

  // --- HELPER DE VISUALIZAÇÃO ---
  getStatusLabel(status: string) {
    const map: any = {
      'pending': 'Pendente',
      'approved': 'Aprovado',
      'in-progress': 'Em Andamento',
      'completed': 'Finalizado',
      'canceled': 'Cancelado'
    };
    return map[status] || status;
  }

  // --- AÇÕES DO MODAL ---

  openModal() {
    const defaultClient = this.clientsList()[0] || '';
    
    this.currentOrder.set(this.getEmptyOrder(defaultClient));
    this.onClientChange(defaultClient); // <--- FILTRA VEÍCULOS
    this.showModal.set(true);
  }

  editOrder(order: any) {
    // Preserva o ID
    this.currentOrder.set(JSON.parse(JSON.stringify(order)));
    this.onClientChange(order.client); // <--- FILTRA VEÍCULOS DO CLIENTE ATUAL
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  // Adicionar Serviço na Lista da OS
  addService() {
    const svcId = this.selectedServiceId();
    if (svcId === null) return;
    
    // FIX: Usa == (Loose Equality)
    const service = this.availableServices().find(s => s.id == svcId); 

    if (service) {
      const newItem: OrderItem = { type: 'service', name: service.name, price: service.price, qty: 1, total: service.price };
      this.addItem(newItem);
    }
    this.selectedServiceId.set(null); // Reseta select
  }

  // Adicionar Produto na Lista da OS
  addProduct() {
    const prodId = this.selectedProductId();
    const qty = this.productQty();
    if (prodId === null || qty <= 0) return;

    // FIX: Usa == (Loose Equality)
    const product = this.availableProducts().find(p => p.id == prodId);

    if (product) {
      const totalItem = product.price * qty;
      const newItem: OrderItem = { type: 'product', name: product.name, price: product.price, qty: qty, total: totalItem };
      this.addItem(newItem);
    }
    this.selectedProductId.set(null);
    this.productQty.set(1);
  }

  private addItem(item: OrderItem) {
    this.currentOrder.update(o => {
      const newItems = [...o.items, item];
      const newTotal = newItems.reduce((acc, i) => acc + i.total, 0); 
      return { ...o, items: newItems, total: newTotal };
    });
  }

  removeItem(index: number) {
    this.currentOrder.update(o => {
      const newItems = o.items.filter((_, i) => i !== index);
      const newTotal = newItems.reduce((acc, i) => acc + i.total, 0);
      return { ...o, items: newItems, total: newTotal };
    });
  }

  async saveOrder() {
    const newOrder = this.currentOrder();
    newOrder.total = newOrder.items.reduce((acc, i) => acc + i.total, 0);

    if (window.electronAPI) {
      try {
        // CORREÇÃO: Verifica se o ID é diferente de zero (existente)
        if (newOrder.id && newOrder.id !== 0) {
           // --- ATUALIZAR EXISTENTE ---
          await window.electronAPI.updateOS(newOrder);
          await this.loadData();
        } else {
          // --- CRIAR NOVO ---
          await window.electronAPI.addOS(newOrder);
          await this.loadData();
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar OS:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
      this.closeModal();
      console.warn('Modo navegador: Ação não persistida.');
    }
  }

  async deleteOrder(id: number) {
    if(confirm('Tem certeza que deseja excluir esta OS?')) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteOS(id);
          this.orders.update(list => list.filter(o => o.id !== id));
        } catch (error) {
          console.error('Erro ao excluir OS:', error);
          alert('Erro ao excluir do banco.');
        }
      } else {
        this.orders.update(list => list.filter(o => o.id !== id));
      }
    }
  }

  private getEmptyOrder(defaultClient: string = ''): OrdemServicoModel {
    return {
      id: 0,
      client: defaultClient,
      vehicle: '',
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      items: [],
      notes: '',
      total: 0
    };
  }
}