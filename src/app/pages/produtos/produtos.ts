import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produtos.html',
  styleUrl: './produtos.css'
})
export class Produtos {
  searchTerm = signal('');
  showModal = signal(false);

  // Categorias de Peças (Poderia vir das configurações futuramente)
  categories = signal([
    'Óleos e Fluidos',
    'Filtros',
    'Freios',
    'Suspensão',
    'Motor',
    'Pneus',
    'Acessórios',
    'Outros'
  ]);

  // Objeto do Formulário
  currentProduct = signal({
    id: 0,
    code: '',
    name: '',
    brand: '',
    category: 'Óleos e Fluidos',
    quantity: 0,
    minQuantity: 5, // Ponto de alerta
    costPrice: 0,
    sellPrice: 0,
    location: '' // Ex: Prateleira A1
  });

  // Dados Mockados (Simulação do Banco)
  products = signal([
    {
      id: 1,
      code: 'OLE-5W30',
      name: 'Óleo Sintético 5W30',
      brand: 'Castrol',
      category: 'Óleos e Fluidos',
      quantity: 12,
      minQuantity: 10,
      costPrice: 25.00,
      sellPrice: 45.00,
      location: 'Prateleira A1'
    },
    {
      id: 2,
      code: 'FIL-AR-ONIX',
      name: 'Filtro de Ar (Onix/Prisma)',
      brand: 'TecFil',
      category: 'Filtros',
      quantity: 3, // ESTOQUE BAIXO
      minQuantity: 5,
      costPrice: 15.00,
      sellPrice: 35.00,
      location: 'Prateleira B3'
    },
    {
      id: 3,
      code: 'PAS-DIANT-KA',
      name: 'Pastilha de Freio Dianteira (Ford Ka)',
      brand: 'Cobreq',
      category: 'Freios',
      quantity: 8,
      minQuantity: 4,
      costPrice: 60.00,
      sellPrice: 120.00,
      location: 'Gaveta F2'
    },
    {
      id: 4,
      code: 'PNEU-175-70-14',
      name: 'Pneu 175/70 R14',
      brand: 'Pirelli',
      category: 'Pneus',
      quantity: 0, // ZERADO
      minQuantity: 4,
      costPrice: 280.00,
      sellPrice: 450.00,
      location: 'Depósito'
    }
  ]);

  // Filtro de Busca
  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.products().filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  });

  // --- Helpers Visuais ---
  getStockStatus(qty: number, min: number): 'ok' | 'low' | 'empty' {
    if (qty === 0) return 'empty';
    if (qty <= min) return 'low';
    return 'ok';
  }

  getStockLabel(qty: number, min: number): string {
    if (qty === 0) return 'Esgotado';
    if (qty <= min) return 'Baixo';
    return 'Normal';
  }

  // --- Ações do CRUD ---
  openModal() {
    this.currentProduct.set({
      id: 0,
      code: '',
      name: '',
      brand: '',
      category: 'Óleos e Fluidos',
      quantity: 0,
      minQuantity: 5,
      costPrice: 0,
      sellPrice: 0,
      location: ''
    });
    this.showModal.set(true);
  }

  editProduct(product: any) {
    this.currentProduct.set({ ...product });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveProduct() {
    const newProd = this.currentProduct();
    this.products.update(list => {
      if (newProd.id === 0) {
        return [...list, { ...newProd, id: new Date().getTime() }];
      } else {
        return list.map(p => p.id === newProd.id ? newProd : p);
      }
    });
    this.closeModal();
  }

  deleteProduct(id: number) {
    if(confirm('Remover este produto do estoque?')) {
      this.products.update(list => list.filter(p => p.id !== id));
    }
  }
}