import { Component, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css'
})
export class Configuracoes implements OnInit { 
  // --- TEMA (Aparência) - Mantém localStorage ---
  theme = signal<'light' | 'dark'>(this.loadTheme());

  // --- DADOS DA OFICINA (Para Orçamentos e Relatórios) ---
  companyData = signal({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    pixKey: '',
    bankInfo: '',
    quoteFooterText: 'Orçamento válido por 15 dias.'
  });

  // --- CATEGORIAS (Gestão) ---
  newCategoryName = signal('');
  // Lista de categorias será carregada do banco
  categories = signal<string[]>([]); 

  constructor() {
    // Efeito: Sempre que o tema mudar, aplica no corpo do HTML e salva LOCALMENTE
    effect(() => {
      const currentTheme = this.theme();
      document.body.setAttribute('data-theme', currentTheme);
      localStorage.setItem('oficina_theme', currentTheme);
      
      if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    });
  }

  // --- Ciclo de Vida: Carrega dados do banco ao iniciar ---
  ngOnInit(): void {
    this.loadAllData();
  }

  private async loadAllData() {
    if (!window.electronAPI) return;

    try {
      // 1. Carrega Dados da Empresa
      const savedCompanyData = await window.electronAPI.getConfig('dados_empresa');
      if (savedCompanyData) {
        this.companyData.set(savedCompanyData);
      }
      
      // 2. Carrega Categorias
      const savedCategories = await window.electronAPI.getConfig('categorias');
      
      if (savedCategories && savedCategories.length > 0) {
        this.categories.set(savedCategories);
      } else {
        // Se não houver categorias no banco, carrega os padrões e salva no banco
        const defaultCats = ['Manutenção', 'Suspensão', 'Elétrica', 'Freios', 'Estética', 'Motor', 'Ar Condicionado', 'Pneus', 'Outros'];
        this.categories.set(defaultCats);
        await this.saveCategories(defaultCats);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }


  // --- MÉTODOS DE TEMA ---
  toggleTheme(mode: 'light' | 'dark') {
    this.theme.set(mode);
  }

  private loadTheme(): 'light' | 'dark' {
    // Carrega do localStorage de forma síncrona
    return (localStorage.getItem('oficina_theme') as 'light' | 'dark') || 'light';
  }

  // --- MÉTODOS DA EMPRESA ---
  async saveCompanyData() {
    if (window.electronAPI) {
      try {
        await window.electronAPI.setConfig('dados_empresa', this.companyData());
        alert('Dados da empresa atualizados com sucesso!');
      } catch (error) {
        console.error('Erro ao salvar dados da empresa:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    }
  }
  
  // --- MÉTODOS DE CATEGORIAS ---
  async addCategory() {
    const name = this.newCategoryName().trim();
    if (name && !this.categories().includes(name)) {
      this.categories.update(list => [...list, name]);
      await this.saveCategories(this.categories());
      this.newCategoryName.set('');
    } else if (this.categories().includes(name)) {
      alert('Esta categoria já existe!');
    }
  }

  async removeCategory(index: number) {
    if (confirm('Remover esta categoria?')) {
      this.categories.update(list => list.filter((_, i) => i !== index));
      await this.saveCategories(this.categories());
    }
  }
  
  // Salva o array de categorias no banco.
  private async saveCategories(cats: string[]) {
    if (window.electronAPI) {
      try {
         // O Electron salva como JSON string e usa a chave 'categorias'
         await window.electronAPI.setConfig('categorias', cats);
      } catch(error) {
        console.error('Erro ao salvar categorias:', error);
      }
    }
  }
}