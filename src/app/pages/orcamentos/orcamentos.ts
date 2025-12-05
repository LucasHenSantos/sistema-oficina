import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class Orcamentos {
  searchTerm = signal('');
  showModal = signal(false);

  // Dados Mockados
  clientsList = signal(['Roberto Silva', 'Ana Júlia Costa', 'Transportadora Veloz', 'Carlos Eduardo']);
  vehiclesList = signal(['Honda Civic 2018', 'Jeep Renegade', 'Volvo FH 540', 'Fiat Strada']);
  
  availableServices = signal([
    { id: 1, name: 'Troca de Óleo', price: 80 },
    { id: 2, name: 'Alinhamento 3D', price: 120 },
    { id: 3, name: 'Mão de Obra (Hora)', price: 150 }
  ]);

  availableProducts = signal([
    { id: 101, name: 'Óleo Sintético 5W30', price: 45 },
    { id: 102, name: 'Filtro de Óleo', price: 30 },
    { id: 103, name: 'Pastilha de Freio', price: 180 }
  ]);

  budgets = signal<Orcamento[]>([
    {
      id: 1050,
      client: 'Roberto Silva',
      vehicle: 'Honda Civic 2018',
      date: '2024-12-05',
      validUntil: '2024-12-20',
      status: 'pending',
      total: 355.00,
      items: [
        { type: 'service', id: 1, name: 'Troca de Óleo', qty: 1, price: 80, total: 80 },
        { type: 'product', id: 101, name: 'Óleo Sintético 5W30', qty: 4, price: 45, total: 180 },
        { type: 'product', id: 102, name: 'Filtro de Óleo', qty: 1, price: 30, total: 30 },
        { type: 'service', id: 3, name: 'Mão de Obra (Hora)', qty: 0.5, price: 130, total: 65 }
      ],
      notes: 'Cliente pediu para verificar pastilhas também.'
    }
  ]);

  currentBudget = signal<Orcamento>(this.getEmptyBudget());

  // Controles de Adição
  selectedServiceId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  productQty = signal(1);

  // Dados da Empresa (Carregados do Config)
  companyData = signal<any>(null);

  constructor() {
    this.loadCompanyData();
  }

  private loadCompanyData() {
    const saved = localStorage.getItem('oficina_dados_empresa');
    if (saved) {
      this.companyData.set(JSON.parse(saved));
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

  deleteBudget(id: number) {
    if (confirm('Excluir este orçamento?')) {
      this.budgets.update(list => list.filter(b => b.id !== id));
    }
  }

  saveBudget() {
    const budget = this.currentBudget();
    budget.total = budget.items.reduce((acc, i) => acc + i.total, 0);

    this.budgets.update(list => {
      if (budget.id === 0) {
        budget.id = Math.max(...list.map(b => b.id), 1000) + 1;
        return [budget, ...list];
      } else {
        return list.map(b => b.id === budget.id ? budget : b);
      }
    });
    this.closeModal();
  }

  // --- ITENS ---

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
      this.addItem({ type: 'product', id: prod.id, name: prod.name, qty: qty, price: prod.price, total: prod.price * qty });
      this.selectedProductId.set(null);
      this.productQty.set(1);
    }
  }

  private addItem(item: OrcamentoItem) {
    this.currentBudget.update(b => ({ ...b, items: [...b.items, item] }));
  }

  removeItem(index: number) {
    this.currentBudget.update(b => ({ ...b, items: b.items.filter((_, i) => i !== index) }));
  }

  // --- IMPRESSÃO ---
  
  // CORREÇÃO: Agora aceita um argumento opcional
  printBudget(budget?: Orcamento) {
    if (budget) {
      this.currentBudget.set(JSON.parse(JSON.stringify(budget)));
    }
    // Pequeno delay para garantir que o Angular renderize os dados no template de impressão antes de abrir a janela
    setTimeout(() => window.print(), 100);
  }

  getStatusLabel(status: string) {
    const map: any = { 'pending': 'Pendente', 'approved': 'Aprovado', 'rejected': 'Rejeitado' };
    return map[status] || status;
  }

  private getEmptyBudget(): Orcamento {
    return {
      id: 0, client: '', vehicle: '', date: new Date().toISOString().split('T')[0],
      validUntil: '', status: 'pending', total: 0, items: [], notes: ''
    };
  }
}