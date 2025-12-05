import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produtos.html',
  styleUrl: './produtos.css'
})
export class Produtos implements OnInit { // Implementa OnInit
  searchTerm = signal('');
  showModal = signal(false);

  // Categorias de Peças (Mantidas localmente, podem vir do banco de Configurações no futuro)
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

  // Lista de Produtos (agora inicializada vazia)
  products = signal<any[]>([]);

  // --- Ciclo de Vida: Carrega os dados ao iniciar ---
  ngOnInit(): void {
    this.loadProducts();
  }
  
  async loadProducts() {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getProdutos();
        this.products.set(data);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
    }
  }

  // Filtro de Busca
  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.products().filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  });

  // --- Helpers Visuais (Mantidos do código original) ---
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
      category: this.categories()[0], // Define a primeira categoria como padrão
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

  async saveProduct() {
    const newProd = this.currentProduct();

    if (window.electronAPI) {
      try {
        if (newProd.id === 0) {
          // --- CRIAR NOVO ---
          const saved = await window.electronAPI.addProduto(newProd);
          this.products.update(list => [...list, saved]);
        } else {
          // --- ATUALIZAR EXISTENTE ---
          await window.electronAPI.updateProduto(newProd);
          this.products.update(list => list.map(p => p.id === newProd.id ? newProd : p));
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
      // Fallback para modo navegador (manteremos por enquanto, mas não salva)
      this.products.update(list => {
        if (newProd.id === 0) {
          return [...list, { ...newProd, id: new Date().getTime() }];
        } else {
          return list.map(p => p.id === newProd.id ? newProd : p);
        }
      });
      this.closeModal();
    }
  }

  async deleteProduct(id: number) {
    if(confirm('Remover este produto do estoque?')) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteProduto(id);
          this.products.update(list => list.filter(p => p.id !== id));
        } catch (error) {
          console.error('Erro ao excluir:', error);
          alert('Erro ao excluir do banco.');
        }
      } else {
        this.products.update(list => list.filter(p => p.id !== id));
      }
    }
  }
}