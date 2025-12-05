import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces simplificadas (Baseadas nas suas originais)
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
  status: 'pending' | 'approved' | 'rejected';
  total: number;
  items: OrcamentoItem[];
  notes: string;
}

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orcamentos.html',
  styleUrl: './orcamentos.css'
})
export class Orcamentos implements OnInit {
  searchTerm = signal('');
  showModal = signal(false);

  // Listas de Apoio (Dados reais do banco)
  clientsList = signal<string[]>([]);
  vehiclesList = signal<string[]>([]);
  
  availableServices = signal<any[]>([]);
  availableProducts = signal<any[]>([]);

  // Lista Principal (Dados reais do banco)
  budgets = signal<Orcamento[]>([]);

  currentBudget = signal<Orcamento>(this.getEmptyBudget());

  // Controles de Adição
  selectedServiceId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  productQty = signal(1);

  // Dados da Empresa (para o rodapé da impressão)
  companyData = signal<any>(null);

  // --- CICLO DE VIDA ---
  ngOnInit(): void {
    this.loadData();
  }

  async loadData() {
    if (!window.electronAPI) return;

    try {
      // 1. Carrega a Lista Principal
      const budgetsData = await window.electronAPI.getOrcamentos();
      this.budgets.set(budgetsData);
      
      // 2. Carrega Listas de Apoio (Para Selects)
      const clientsData = await window.electronAPI.getClientes();
      const vehiclesData = await window.electronAPI.getVeiculos();
      const servicesData = await window.electronAPI.getServicos();
      const productsData = await window.electronAPI.getProdutos();
      const companyConfig = await window.electronAPI.getConfig('dados_empresa');

      // Mapeia para o formato de string simples
      this.clientsList.set(clientsData.map((c: any) => c.name));
      this.vehiclesList.set(vehiclesData.map((v: any) => `${v.model} (${v.plate})`));
      
      this.availableServices.set(servicesData);
      this.availableProducts.set(productsData);

      // Carrega dados da empresa para impressão
      if (companyConfig) {
        this.companyData.set(companyConfig);
      }

      // Define cliente/veículo padrão se houver
      this.currentBudget.update(b => ({
          ...b,
          client: clientsData[0]?.name || '',
          vehicle: vehiclesData[0] ? `${vehiclesData[0].model} (${vehiclesData[0].plate})` : ''
      }));

    } catch (error) {
      console.error('Erro ao carregar dados de orçamento:', error);
    }
  }

  filteredBudgets = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.budgets().filter(b => 
      b.client.toLowerCase().includes(term) || 
      b.vehicle.toLowerCase().includes(term) ||
      b.id.toString().includes(term)
    );
  });

  // --- AÇÕES ---

  openModal() {
    this.currentBudget.set(this.getEmptyBudget());
    this.showModal.set(true);
  }

  editBudget(budget: Orcamento) {
    this.currentBudget.set(JSON.parse(JSON.stringify(budget)));
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async deleteBudget(id: number) {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteOrcamento(id);
          this.budgets.update(list => list.filter(b => b.id !== id));
        } catch (error) {
          console.error('Erro ao excluir orçamento:', error);
        }
      } else {
        this.budgets.update(list => list.filter(b => b.id !== id));
      }
    }
  }

  async saveBudget() {
    const budget = this.currentBudget();
    // Recalcula o total final antes de salvar (garantia)
    budget.total = budget.items.reduce((acc, i) => acc + i.total, 0);

    if (window.electronAPI) {
      try {
        if (budget.id === 0) {
          // --- ADICIONAR NOVO ---
          const saved = await window.electronAPI.addOrcamento(budget);
          this.budgets.update(list => [saved, ...list]);
        } else {
          // --- ATUALIZAR EXISTENTE ---
          await window.electronAPI.updateOrcamento(budget);
          this.budgets.update(list => list.map(b => b.id === budget.id ? budget : b));
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar orçamento:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
      this.closeModal();
    }
  }

  // --- ITENS (Cálculo no Frontend) ---

  addService() {
    const svc = this.availableServices().find(s => s.id === this.selectedServiceId());
    if (svc) {
      this.addItem({ type: 'service', id: svc.id, name: svc.name, qty: 1, price: svc.price, total: svc.price });
      this.selectedServiceId.set(null);
    }
  }

  addProduct() {
    const prod = this.availableProducts().find(p => p.id === this.selectedProductId());
    const qty = this.productQty();
    if (prod && qty > 0) {
      this.addItem({ type: 'product', id: prod.id, name: prod.name, qty: qty, price: prod.sellPrice, total: prod.sellPrice * qty });
      this.selectedProductId.set(null);
      this.productQty.set(1);
    }
  }

  private addItem(item: OrcamentoItem) {
    this.currentBudget.update(b => {
      const newItems = [...b.items, item];
      // Recalcula o total do orçamento a cada item adicionado/removido
      const newTotal = newItems.reduce((acc, i) => acc + i.total, 0); 
      return { ...b, items: newItems, total: newTotal };
    });
  }

  removeItem(index: number) {
    this.currentBudget.update(b => {
      const newItems = b.items.filter((_, i) => i !== index);
      const newTotal = newItems.reduce((acc, i) => acc + i.total, 0);
      return { ...b, items: newItems, total: newTotal };
    });
  }

  // --- IMPRESSÃO ---
  
  printBudget(budget?: Orcamento) {
    if (budget) {
      this.currentBudget.set(JSON.parse(JSON.stringify(budget)));
    }
    setTimeout(() => window.print(), 200);
  }

  getStatusLabel(status: string) {
    const map: any = { 'pending': 'Pendente', 'approved': 'Aprovado', 'rejected': 'Rejeitado' };
    return map[status] || status;
  }

  private getEmptyBudget(): Orcamento {
    // Busca os valores padrões atuais
    const defaultClient = this.clientsList()[0] || '';
    const defaultVehicle = this.vehiclesList()[0] || '';
    
    return {
      id: 0, client: defaultClient, vehicle: defaultVehicle, date: new Date().toISOString().split('T')[0],
      validUntil: '', status: 'pending', total: 0, items: [], notes: ''
    };
  }
}