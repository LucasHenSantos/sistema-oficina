import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-servicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicos.html',
  styleUrl: './servicos.css'
})
export class Servicos implements OnInit { 
  searchTerm = signal('');
  showModal = signal(false);

  // Lista de categorias (Carregada do Banco de Configurações)
  categories = signal<string[]>([]); 

  currentService = signal({
    id: 0,
    name: '',
    description: '',
    category: '', 
    time: '',
    price: 0
  });

  services = signal<any[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  async loadData() {
    if (!window.electronAPI) return;

    try {
      // 1. Carrega Serviços do Banco
      const servicesData = await window.electronAPI.getServicos();
      this.services.set(servicesData);
      
      // 2. Carrega as Categorias salvas em Configurações (CHAVE CORRIGIDA)
      const savedCategories = await window.electronAPI.getConfig('categorias_servicos'); 
      if (savedCategories && savedCategories.length > 0) {
         this.categories.set(savedCategories);
         // Define a primeira categoria carregada como padrão do formulário
         this.currentService.update(s => ({...s, category: savedCategories[0]}));
      }

    } catch (error) {
      console.error('Erro ao carregar serviços ou categorias:', error);
    }
  }


  filteredServices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.services().filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term)
    );
  });

  openNewServiceModal() {
    // Seta a categoria padrão (primeira da lista)
    const defaultCat = this.categories()[0] || '';

    this.currentService.set({
      id: 0,
      name: '',
      description: '',
      category: defaultCat, 
      time: '',
      price: 0
    });
    this.showModal.set(true);
  }

  editService(service: any) {
    this.currentService.set({ ...service });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveService() {
    const newSvc = this.currentService();

    if (window.electronAPI) {
      try {
        if (newSvc.id && newSvc.id !== 0) {
          // --- ATUALIZAR EXISTENTE ---
          await window.electronAPI.updateServico(newSvc);
          await this.loadData(); // Recarrega
        } else {
          // --- CRIAR NOVO ---
          await window.electronAPI.addServico(newSvc);
          await this.loadData(); // Recarrega
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
       this.closeModal();
       console.warn('Modo navegador: Ação não persistida.');
    }
  }

  async deleteService(id: number) {
    if(confirm('Tem certeza que deseja remover este serviço do catálogo?')) {
       if (window.electronAPI) {
        try {
          await window.electronAPI.deleteServico(id);
          this.services.update(list => list.filter(s => s.id !== id));
        } catch (error) {
          console.error('Erro ao excluir:', error);
          alert('Erro ao excluir do banco.');
        }
      } else {
        this.services.update(list => list.filter(s => s.id !== id));
      }
    }
  }
}