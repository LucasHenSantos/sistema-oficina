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
export class Produtos implements OnInit { 
  searchTerm = signal('');
  showModal = signal(false);

  categories = signal<string[]>([]); 

  currentProduct = signal({
    id: 0,
    code: '',
    name: '',
    brand: '',
    category: '', 
    quantity: 0,
    minQuantity: 5, 
    costPrice: 0,
    sellPrice: 0,
    location: ''
  });

  products = signal<any[]>([]);

  ngOnInit(): void {
    this.loadProducts();
  }
  
  async loadProducts() {
    if (!window.electronAPI) return;

    try {
      const data = await window.electronAPI.getProdutos();
      this.products.set(data);
      
      const savedCategories = await window.electronAPI.getConfig('categorias_produtos');
      
      if (savedCategories && savedCategories.length > 0) {
         this.categories.set(savedCategories);
         this.currentProduct.update(p => ({...p, category: savedCategories[0]}));
      }

    } catch (error) {
      console.error('Erro ao carregar produtos ou categorias:', error);
    }
  }

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.products().filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  });

  // --- FUNÇÕES DE STATUS CORRIGIDAS ---
  
  // Retorna a CLASSE CSS que define a cor
  getStockStatusClass(qty: number, min: number): 'status-ok' | 'status-low' | 'status-empty' {
    if (qty === 0) return 'status-empty';
    if (qty <= min) return 'status-low';
    return 'status-ok';
  }

  // Retorna o TEXTO para a badge
  getStockStatusText(qty: number, min: number): string {
    if (qty === 0) return 'Esgotado';
    if (qty <= min) return 'Baixo';
    return 'Em Estoque';
  }

  // --- AÇÕES CRUD ---
  
  openModal() {
    const defaultCat = this.categories()[0] || '';
    
    this.currentProduct.set({
      id: 0,
      code: '',
      name: '',
      brand: '',
      category: defaultCat,
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
        if (newProd.id && newProd.id !== 0) {
          await window.electronAPI.updateProduto(newProd);
          await this.loadProducts(); 
        } else {
          await window.electronAPI.addProduto(newProd);
          await this.loadProducts(); 
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
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