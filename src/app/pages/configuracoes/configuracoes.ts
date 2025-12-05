import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css'
})
export class Configuracoes {
  // --- TEMA (Aparência) ---
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
  categories = signal<string[]>(this.loadCategories());

  constructor() {
    // Carrega dados da empresa ao iniciar
    this.loadCompanyData();

    // Efeito: Sempre que o tema mudar, aplica no corpo do HTML e salva
    effect(() => {
      const currentTheme = this.theme();
      document.body.setAttribute('data-theme', currentTheme);
      localStorage.setItem('oficina_theme', currentTheme);
      
      // Opcional: Adiciona classe específica se seu CSS global depender disso
      if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    });
  }

  // --- MÉTODOS DE TEMA ---
  toggleTheme(mode: 'light' | 'dark') {
    this.theme.set(mode);
  }

  private loadTheme(): 'light' | 'dark' {
    return (localStorage.getItem('oficina_theme') as 'light' | 'dark') || 'light';
  }

  // --- MÉTODOS DA EMPRESA ---
  saveCompanyData() {
    localStorage.setItem('oficina_dados_empresa', JSON.stringify(this.companyData()));
    alert('Dados da empresa atualizados com sucesso!');
  }

  private loadCompanyData() {
    const saved = localStorage.getItem('oficina_dados_empresa');
    if (saved) {
      this.companyData.set(JSON.parse(saved));
    }
  }

  // --- MÉTODOS DE CATEGORIAS ---
  addCategory() {
    const name = this.newCategoryName().trim();
    if (name && !this.categories().includes(name)) {
      this.categories.update(list => [...list, name]);
      this.saveCategories();
      this.newCategoryName.set('');
    } else if (this.categories().includes(name)) {
      alert('Esta categoria já existe!');
    }
  }

  removeCategory(index: number) {
    if (confirm('Remover esta categoria?')) {
      this.categories.update(list => list.filter((_, i) => i !== index));
      this.saveCategories();
    }
  }

  private loadCategories(): string[] {
    const saved = localStorage.getItem('oficina_categorias');
    return saved ? JSON.parse(saved) : [
      'Manutenção', 'Suspensão', 'Elétrica', 'Freios', 'Estética', 
      'Motor', 'Ar Condicionado', 'Pneus', 'Outros'
    ];
  }

  private saveCategories() {
    localStorage.setItem('oficina_categorias', JSON.stringify(this.categories()));
  }
}