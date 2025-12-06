import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces simplificadas
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

  budgets = signal<Orcamento[]>([]);

  currentBudget = signal<Orcamento>(this.getEmptyBudget());

  // Controles de Adição
  selectedServiceId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  productQty = signal(1);

  // Dados da Empresa (Carregados do Config)
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
      const defaultClient = this.clientsList()[0] || '';
      const defaultVehicle = this.vehiclesList()[0] || '';
      this.currentBudget.set(this.getEmptyBudget(defaultClient, defaultVehicle));

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

  // --- NOVO MÉTODO DE CONVERSÃO ---
  async convertToOS(budget: Orcamento) {
    if (budget.status !== 'approved') {
        alert('Apenas orçamentos com status "Aprovado" podem ser convertidos em Ordem de Serviço.');
        return;
    }

    if (confirm(`Converter o Orçamento #${budget.id} para uma nova Ordem de Serviço?`)) {
        if (!window.electronAPI) return;

        const osData = {
            client: budget.client,
            vehicle: budget.vehicle,
            items: budget.items, 
            notes: `Gerado a partir do Orçamento #${budget.id}. Notas originais: ${budget.notes}`,
            total: budget.total,
            date: new Date().toISOString().split('T')[0],
            status: 'in-progress'
        };

        try {
            await window.electronAPI.addOS(osData);
            alert(`Orçamento #${budget.id} convertido com sucesso em Ordem de Serviço!`);
            
            // Recarrega para que o novo OS apareça no Dashboard/OS
            await this.loadData(); 

        } catch (error) {
            console.error('Erro ao converter orçamento para OS:', error);
            alert('Erro ao tentar converter para Ordem de Serviço no banco de dados.');
        }
    }
  }
  
  // --- AÇÕES CRUD (CORRIGIDO) ---

  openModal() {
    this.currentBudget.set(this.getEmptyBudget());
    this.showModal.set(true);
  }

  editBudget(budget: Orcamento) {
    // Preserva o ID
    this.currentBudget.set(JSON.parse(JSON.stringify(budget)));
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  deleteBudget(id: number) {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      if (window.electronAPI) {
        try {
          window.electronAPI.deleteOrcamento(id);
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
    budget.total = budget.items.reduce((acc, i) => acc + i.total, 0);

    if (window.electronAPI) {
      try {
        // CORREÇÃO: Verifica se o ID é diferente de zero (existente)
        if (budget.id && budget.id !== 0) {
           // --- ATUALIZAR EXISTENTE ---
          await window.electronAPI.updateOrcamento(budget);
          await this.loadData();
        } else {
          // --- CRIAR NOVO ---
          await window.electronAPI.addOrcamento(budget);
          await this.loadData();
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
    const svcId = this.selectedServiceId();
    if (svcId === null) return;
    
    // FIX: Usa == (Loose Equality) para encontrar o ID
    const svc = this.availableServices().find(s => s.id == svcId);
    if (svc) {
      this.addItem({ type: 'service', id: svc.id, name: svc.name, qty: 1, price: svc.price, total: svc.price });
      this.selectedServiceId.set(null);
    }
  }

  addProduct() {
    const prodId = this.selectedProductId();
    const qty = this.productQty();
    if (prodId === null || qty <= 0) return;
    
    // FIX: Usa == (Loose Equality) para encontrar o ID
    const prod = this.availableProducts().find(p => p.id == prodId);
    if (prod) {
      this.addItem({ type: 'product', id: prod.id, name: prod.name, qty: qty, price: prod.sellPrice, total: prod.sellPrice * qty });
      this.selectedProductId.set(null);
      this.productQty.set(1);
    }
  }

  private addItem(item: OrcamentoItem) {
    this.currentBudget.update(b => {
      const newItems = [...b.items, item];
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

  // --- HELPERS ---
  
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

  private getEmptyBudget(defaultClient: string = '', defaultVehicle: string = ''): Orcamento {
    return {
      id: 0, client: defaultClient, vehicle: defaultVehicle, date: new Date().toISOString().split('T')[0],
      validUntil: '', status: 'pending', total: 0, items: [], notes: ''
    };
  }
}