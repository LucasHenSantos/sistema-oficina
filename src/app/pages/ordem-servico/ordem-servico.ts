import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ordem-servico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ordem-servico.html',
  styleUrl: './ordem-servico.css'
})
export class OrdemServico {
  searchTerm = signal('');
  showModal = signal(false);

  // --- MOCKS DE DADOS (Simulando o Banco para os Selects) ---
  clientsList = signal(['Roberto Silva', 'Ana Júlia Costa', 'Carlos Eduardo', 'Transportadora Veloz']);
  vehiclesList = signal(['Chevrolet Onix (ABC-1234)', 'Jeep Renegade (XYZ-9876)', 'Ford Ka (HJK-4567)']);
  
  // Catálogo para adicionar na OS
  availableServices = signal([
    { id: 1, name: 'Troca de Óleo', price: 80.00 },
    { id: 2, name: 'Alinhamento 3D', price: 150.00 },
    { id: 3, name: 'Diagnóstico Scanner', price: 120.00 },
    { id: 4, name: 'Mão de Obra Geral (Hora)', price: 100.00 }
  ]);

  availableProducts = signal([
    { id: 1, name: 'Óleo 5W30', price: 45.00 },
    { id: 2, name: 'Filtro de Ar', price: 35.00 },
    { id: 3, name: 'Pastilha de Freio', price: 120.00 },
    { id: 4, name: 'Fluido de Freio', price: 25.00 }
  ]);

  // --- OBJETO DA OS ATUAL ---
  currentOrder = signal({
    id: 0,
    client: '',
    vehicle: '',
    status: 'pending', // pending, approved, in-progress, completed, canceled
    date: new Date().toISOString().split('T')[0],
    items: [] as any[], // Lista mista de serviços e produtos adicionados
    notes: '',
    total: 0
  });

  // Temporários para os selects de adição
  selectedServiceId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  productQty = signal(1);

  // --- LISTA DE OS (TABELA) ---
  orders = signal([
    {
      id: 1024,
      client: 'Roberto Silva',
      vehicle: 'Chevrolet Onix',
      status: 'completed',
      date: '2024-12-01',
      total: 250.00,
      items: [
        { type: 'service', name: 'Troca de Óleo', price: 80.00, qty: 1, total: 80.00 },
        { type: 'product', name: 'Óleo 5W30', price: 45.00, qty: 3, total: 135.00 },
        { type: 'product', name: 'Filtro de Óleo', price: 35.00, qty: 1, total: 35.00 }
      ]
    },
    {
      id: 1025,
      client: 'Ana Júlia Costa',
      vehicle: 'Jeep Renegade',
      status: 'in-progress',
      date: '2024-12-05',
      total: 150.00,
      items: [
        { type: 'service', name: 'Alinhamento 3D', price: 150.00, qty: 1, total: 150.00 }
      ]
    }
  ]);

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
    this.currentOrder.set({
      id: 0,
      client: '',
      vehicle: '',
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      items: [],
      notes: '',
      total: 0
    });
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
    if (!svcId) return;

    const service = this.availableServices().find(s => s.id == svcId);
    if (service) {
      this.currentOrder.update(o => {
        const newItem = { type: 'service', name: service.name, price: service.price, qty: 1, total: service.price };
        return { 
          ...o, 
          items: [...o.items, newItem],
          total: o.total + newItem.total
        };
      });
    }
    this.selectedServiceId.set(null); // Reseta select
  }

  // Adicionar Produto na Lista da OS
  addProduct() {
    const prodId = this.selectedProductId();
    const qty = this.productQty();
    if (!prodId || qty <= 0) return;

    const product = this.availableProducts().find(p => p.id == prodId);
    if (product) {
      this.currentOrder.update(o => {
        const totalItem = product.price * qty;
        const newItem = { type: 'product', name: product.name, price: product.price, qty: qty, total: totalItem };
        return { 
          ...o, 
          items: [...o.items, newItem],
          total: o.total + totalItem
        };
      });
    }
    this.selectedProductId.set(null);
    this.productQty.set(1);
  }

  removeItem(index: number) {
    this.currentOrder.update(o => {
      const item = o.items[index];
      const newTotal = o.total - item.total;
      const newItems = o.items.filter((_, i) => i !== index);
      return { ...o, items: newItems, total: newTotal };
    });
  }

  saveOrder() {
    const newOrder = this.currentOrder();
    this.orders.update(list => {
      if (newOrder.id === 0) {
        return [...list, { ...newOrder, id: Math.floor(Math.random() * 10000) }];
      } else {
        return list.map(o => o.id === newOrder.id ? newOrder : o);
      }
    });
    this.closeModal();
  }

  deleteOrder(id: number) {
    if(confirm('Tem certeza que deseja excluir esta OS?')) {
      this.orders.update(list => list.filter(o => o.id !== id));
    }
  }
}