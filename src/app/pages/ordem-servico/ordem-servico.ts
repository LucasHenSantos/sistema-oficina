import { Component, signal, computed, OnInit } from '@angular/core';
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

// 2. Interface para o objeto de Ordem de Serviço (RENOMEADA para evitar conflito com a Classe)
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
export class OrdemServico implements OnInit { // Adicionado OnInit
  searchTerm = signal('');
  showModal = signal(false);

  // --- Listas de Apoio (Dados reais do banco) ---
  clientsList = signal<string[]>([]);
  vehiclesList = signal<string[]>([]);
  availableServices = signal<any[]>([]);
  availableProducts = signal<any[]>([]);
  
  // --- OBJETO DA OS ATUAL (usa o novo nome) ---
  currentOrder = signal<OrdemServicoModel>(this.getEmptyOrder());

  // Temporários para os selects de adição
  selectedServiceId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  productQty = signal(1);

  // --- LISTA DE OS (TABELA) (usa o novo nome) ---
  orders = signal<OrdemServicoModel[]>([]);
  
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
      const vehiclesData = await window.electronAPI.getVeiculos();
      const servicesData = await window.electronAPI.getServicos();
      const productsData = await window.electronAPI.getProdutos();

      // Mapeia para o formato de string simples
      this.clientsList.set(clientsData.map((c: any) => c.name));
      this.vehiclesList.set(vehiclesData.map((v: any) => `${v.model} (${v.plate})`));
      
      // Nota: Produtos usam 'sellPrice'
      this.availableServices.set(servicesData);
      this.availableProducts.set(productsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.sellPrice // Usa o preço de venda para calcular na OS
      })));

      // Define cliente/veículo padrão para o formulário se houver dados
      const defaultClient = clientsData[0]?.name || '';
      const defaultVehicle = vehiclesData[0] ? `${vehiclesData[0].model} (${vehiclesData[0].plate})` : '';

      this.currentOrder.set(this.getEmptyOrder(defaultClient, defaultVehicle));

    } catch (error) {
      console.error('Erro ao carregar dados de OS:', error);
    }
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
    const defaultVehicle = this.vehiclesList()[0] || '';
    this.currentOrder.set(this.getEmptyOrder(defaultClient, defaultVehicle));
    this.showModal.set(true);
  }

  editOrder(order: any) {
    // Clona profundo para não editar a referência da tabela
    this.currentOrder.set(JSON.parse(JSON.stringify(order)));
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  // Adicionar Serviço na Lista da OS
  addService() {
    const svcId = this.selectedServiceId();
    const service = this.availableServices().find(s => s.id === svcId);

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
    const product = this.availableProducts().find(p => p.id === prodId);

    if (product && qty > 0) {
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
      // Recalcula o total do orçamento a cada item adicionado/removido
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
    // Recalcula o total final antes de salvar (garantia)
    newOrder.total = newOrder.items.reduce((acc, i) => acc + i.total, 0);

    if (window.electronAPI) {
      try {
        if (newOrder.id === 0) {
          // --- ADICIONAR NOVO ---
          const saved = await window.electronAPI.addOS(newOrder);
          this.orders.update(list => [saved, ...list]);
        } else {
          // --- ATUALIZAR EXISTENTE ---
          await window.electronAPI.updateOS(newOrder);
          this.orders.update(list => list.map(o => o.id === newOrder.id ? newOrder : o));
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

  private getEmptyOrder(defaultClient: string = '', defaultVehicle: string = ''): OrdemServicoModel {
    return {
      id: 0,
      client: defaultClient,
      vehicle: defaultVehicle,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      items: [],
      notes: '',
      total: 0
    };
  }
}