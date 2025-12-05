import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.css'
})
export class Veiculos implements OnInit {
  searchTerm = signal('');
  showModal = signal(false);

  // Lista de proprietários (Carregada do Banco de Clientes)
  ownersList = signal<string[]>([]); 

  // Objeto do Veículo
  currentVehicle = signal({
    id: 0,
    plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    color: '',
    client: '',
    lastService: '-',
    status: 'delivered' // ou 'in-shop'
  });

  // Lista de Veículos (Carregada do Banco)
  vehicles = signal<any[]>([]);

  filteredVehicles = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.vehicles().filter(v => 
      v.plate.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.client.toLowerCase().includes(term)
    );
  });

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.loadData();

    // Verifica se veio do Dashboard com ordem de abrir modal
    this.route.queryParams.subscribe(params => {
      if (params['open'] === 'true') {
        this.openModal();
      }
    });
  }

  async loadData() {
    if (window.electronAPI) {
      try {
        // 1. Busca Veículos do Banco
        const dataVehicles = await window.electronAPI.getVeiculos();
        this.vehicles.set(dataVehicles);

        // 2. Busca Clientes para preencher o Select de Proprietários
        const dataClients = await window.electronAPI.getClientes();
        // Mapeamos apenas os nomes para facilitar o select simples
        this.ownersList.set(dataClients.map((c: any) => c.name));
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    }
  }

  // --- AÇÕES ---

  openModal() {
    // Se tiver clientes, seleciona o primeiro por padrão
    const defaultClient = this.ownersList().length > 0 ? this.ownersList()[0] : '';
    
    this.currentVehicle.set({
      id: 0,
      plate: '',
      model: '',
      brand: '',
      year: 2024,
      color: '',
      client: defaultClient,
      lastService: '-',
      status: 'in-shop'
    });
    this.showModal.set(true);
  }

  editVehicle(vehicle: any) {
    this.currentVehicle.set({ ...vehicle });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveVehicle() {
    const newVehicle = this.currentVehicle();
    newVehicle.plate = newVehicle.plate.toUpperCase();

    if (window.electronAPI) {
      try {
        if (newVehicle.id === 0) {
          // --- CRIAR ---
          const saved = await window.electronAPI.addVeiculo(newVehicle);
          this.vehicles.update(list => [...list, saved]);
        } else {
          // --- ATUALIZAR ---
          await window.electronAPI.updateVeiculo(newVehicle);
          this.vehicles.update(list => list.map(v => v.id === newVehicle.id ? newVehicle : v));
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar veículo:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
      // Fallback para navegador (sem banco)
      this.vehicles.update(list => {
        if (newVehicle.id === 0) {
          return [...list, { ...newVehicle, id: new Date().getTime() }];
        } else {
          return list.map(v => v.id === newVehicle.id ? newVehicle : v);
        }
      });
      this.closeModal();
    }
  }

  async deleteVehicle(id: number) {
    if(confirm('Remover este veículo?')) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteVeiculo(id);
          this.vehicles.update(list => list.filter(v => v.id !== id));
        } catch (error) {
          console.error('Erro ao excluir:', error);
        }
      } else {
        this.vehicles.update(list => list.filter(v => v.id !== id));
      }
    }
  }
}