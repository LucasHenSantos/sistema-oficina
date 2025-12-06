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
  // --- TEMA (Aparência) ---
  theme = signal<'light' | 'dark'>(this.loadTheme());

  // --- DADOS DA OFICINA ---
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

  // --- CATEGORIAS DE PRODUTOS ---
  newProductCategoryName = signal(''); 
  productCategories = signal<string[]>([]); 
  
  // --- CATEGORIAS DE SERVIÇOS (RESTAURO) ---
  newServiceCategoryName = signal(''); 
  serviceCategories = signal<string[]>([]); 

  constructor() {
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
      
      // 2. Carrega Categorias de PRODUTOS
      await this.loadAndSetCategories('categorias_produtos', this.productCategories, 
        ['Óleos e Fluidos', 'Filtros', 'Freios', 'Suspensão', 'Motor', 'Pneus', 'Acessórios', 'Outros']);

      // 3. Carrega Categorias de SERVIÇOS (RESTAURO)
      await this.loadAndSetCategories('categorias_servicos', this.serviceCategories,
        ['Mecânica Geral', 'Elétrica', 'Revisão', 'Pintura', 'Funilaria', 'Diagnóstico']);

    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }
  
  private async loadAndSetCategories(key: string, signal: any, defaults: string[]) {
      const savedCategories = await window.electronAPI.getConfig(key);
      
      if (savedCategories && savedCategories.length > 0) {
        signal.set(savedCategories);
      } else {
        signal.set(defaults);
        await this.saveCategories(key, defaults);
      }
  }


  // --- MÉTODOS DE TEMA ---
  toggleTheme(mode: 'light' | 'dark') {
    this.theme.set(mode);
  }

  private loadTheme(): 'light' | 'dark' {
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
  
  // --- MÉTODOS DE CATEGORIAS GENÉRICOS ---
  private async saveCategories(key: string, cats: string[]) {
    if (window.electronAPI) {
      try {
         await window.electronAPI.setConfig(key, cats);
      } catch(error) {
        console.error(`Erro ao salvar categorias para a chave ${key}:`, error);
      }
    }
  }
  
  // --- MÉTODOS DE CATEGORIAS DE PRODUTOS ---
  async addProductCategory() {
    const name = this.newProductCategoryName().trim();
    if (name && !this.productCategories().includes(name)) {
      this.productCategories.update(list => [...list, name]);
      await this.saveCategories('categorias_produtos', this.productCategories());
      this.newProductCategoryName.set('');
    } else if (this.productCategories().includes(name)) {
      alert('Esta categoria de produto já existe!');
    }
  }

  async removeProductCategory(category: string) {
    if (confirm(`Remover a categoria de produto "${category}"?`)) {
      this.productCategories.update(list => list.filter(c => c !== category));
      await this.saveCategories('categorias_produtos', this.productCategories());
    }
  }
  
  // --- MÉTODOS DE CATEGORIAS DE SERVIÇOS ---
  async addServiceCategory() {
    const name = this.newServiceCategoryName().trim();
    if (name && !this.serviceCategories().includes(name)) {
      this.serviceCategories.update(list => [...list, name]);
      await this.saveCategories('categorias_servicos', this.serviceCategories());
      this.newServiceCategoryName.set('');
    } else if (this.serviceCategories().includes(name)) {
      alert('Esta categoria de serviço já existe!');
    }
  }

  async removeServiceCategory(category: string) {
    if (confirm(`Remover a categoria de serviço "${category}"?`)) {
      this.serviceCategories.update(list => list.filter(c => c !== category));
      await this.saveCategories('categorias_servicos', this.serviceCategories());
    }
  }
}