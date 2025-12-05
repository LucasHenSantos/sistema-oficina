import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-servicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicos.html',
  styleUrl: './servicos.css'
})
export class Servicos {
  // Sinais de Controle
  searchTerm = signal('');
  showModal = signal(false);

  // --- CONFIGURAÇÃO DE CATEGORIAS ---
  // Lista centralizada de categorias para o dropdown
  categories = signal([
    'Manutenção',
    'Suspensão',
    'Elétrica',
    'Freios',
    'Estética',
    'Motor',
    'Ar Condicionado',
    'Pneus',
    'Outros'
  ]);

  // Objeto para o Formulário (Edição/Criação)
  currentService = signal({
    id: 0,
    name: '',
    description: '',
    category: 'Manutenção', // Valor inicial
    time: '',
    price: 0
  });

  // Dados Iniciais (Catálogo Fictício)
  services = signal([
    {
      id: 1,
      name: 'Troca de Óleo e Filtro',
      description: 'Mão de obra para drenagem e substituição',
      category: 'Manutenção',
      time: '45 min',
      price: 80.00
    },
    {
      id: 2,
      name: 'Alinhamento 3D + Balanceamento',
      description: 'Ajuste de geometria e peso de rodas (4 pneus)',
      category: 'Suspensão',
      time: '1h 30m',
      price: 150.00
    },
    {
      id: 3,
      name: 'Diagnóstico Eletrônico (Scanner)',
      description: 'Varredura completa de módulos e sensores',
      category: 'Elétrica',
      time: '30 min',
      price: 120.00
    },
    {
      id: 4,
      name: 'Troca de Pastilhas (Dianteira)',
      description: 'Substituição do par dianteiro',
      category: 'Freios',
      time: '1h',
      price: 100.00
    },
    {
      id: 5,
      name: 'Lavagem Completa + Cera',
      description: 'Externa, interna e aplicação de cera protetora',
      category: 'Estética',
      time: '2h',
      price: 90.00
    }
  ]);

  // Filtro de Busca (Computed Signal)
  filteredServices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.services().filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term)
    );
  });

  // --- Funções do Modal e Ações ---

  openNewServiceModal() {
    // Reseta o formulário e define a categoria padrão como a primeira da lista
    this.currentService.set({
      id: 0,
      name: '',
      description: '',
      category: this.categories()[0], 
      time: '',
      price: 0
    });
    this.showModal.set(true);
  }

  editService(service: any) {
    // Cria uma cópia para não alterar a tabela em tempo real antes de salvar
    this.currentService.set({ ...service });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveService() {
    const newSvc = this.currentService();

    this.services.update(list => {
      if (newSvc.id === 0) {
        // Adicionar Novo (Gera ID baseado no timestamp para simular BD)
        const newId = new Date().getTime();
        return [...list, { ...newSvc, id: newId }];
      } else {
        // Atualizar Existente
        return list.map(s => s.id === newSvc.id ? newSvc : s);
      }
    });

    this.closeModal();
  }

  deleteService(id: number) {
    if(confirm('Tem certeza que deseja remover este serviço do catálogo?')) {
      this.services.update(list => list.filter(s => s.id !== id));
    }
  }
}