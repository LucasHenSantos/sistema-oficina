import {
  Component,
  signal,
  effect,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css'
})
export class Configuracoes implements OnInit, OnDestroy {
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

  /* ==========================================================================
   ATUALIZAÇÕES DO SISTEMA
   ========================================================================== */

  appVersion =
    signal('');

  updateStatus =
    signal<
      | 'idle'
      | 'checking'
      | 'available'
      | 'up-to-date'
      | 'downloading'
      | 'downloaded'
      | 'error'
    >(
      'idle'
    );

  availableVersion =
    signal('');

  updatePercent =
    signal(0);

  updateMessage =
    signal('');

  isDevelopmentMode =
    signal(false);

  private removeUpdateStatusListener:
    (() => void) |
    null =
    null;

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

    this.setupUpdater();

  }

  ngOnDestroy(): void {

    if (
      this.removeUpdateStatusListener
    ) {

      this.removeUpdateStatusListener();

      this.removeUpdateStatusListener =
        null;

    }

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
      } catch (error) {
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

  /* ==========================================================================
   ATUALIZAÇÕES DO SISTEMA
   ========================================================================== */

  private async setupUpdater() {

    if (
      !window.electronAPI
    ) {
      return;
    }


    /*
      Primeiro registramos o listener para receber:
      atualização encontrada, progresso, conclusão etc.
    */
    this.removeUpdateStatusListener =
      window.electronAPI.onUpdateStatus(
        (
          data
        ) => {

          this.handleUpdateStatus(
            data
          );

        }
      );


    /*
      Busca a versão atualmente instalada.
    */
    try {

      const result =
        await window.electronAPI
          .getAppVersion();


      this.appVersion.set(
        result.version || ''
      );

    } catch (
    error
    ) {

      console.error(
        'Erro ao obter versão do aplicativo:',
        error
      );

    }

  }


  /* ==========================================================================
     RECEBE EVENTOS DO ELECTRON
     ========================================================================== */

  private handleUpdateStatus(
    data: {
      status:
      | 'checking'
      | 'available'
      | 'up-to-date'
      | 'downloading'
      | 'downloaded'
      | 'error';

      currentVersion?: string;

      version?: string;

      percent?: number;

      message?: string;
    }
  ) {

    if (
      data.currentVersion
    ) {

      this.appVersion.set(
        data.currentVersion
      );

    }


    switch (
    data.status
    ) {

      /* ----------------------------------------------------------------------
         VERIFICANDO
         ---------------------------------------------------------------------- */

      case 'checking':

        this.updateStatus.set(
          'checking'
        );

        this.updateMessage.set(
          'Verificando se existe uma nova versão...'
        );

        this.updatePercent.set(
          0
        );

        break;


      /* ----------------------------------------------------------------------
         NOVA VERSÃO DISPONÍVEL
         ---------------------------------------------------------------------- */

      case 'available':

        this.updateStatus.set(
          'available'
        );

        this.availableVersion.set(
          data.version || ''
        );

        this.updateMessage.set(
          data.version
            ? `Nova versão ${data.version} disponível.`
            : 'Uma nova versão está disponível.'
        );

        this.updatePercent.set(
          0
        );

        break;


      /* ----------------------------------------------------------------------
         JÁ ESTÁ ATUALIZADO
         ---------------------------------------------------------------------- */

      case 'up-to-date':

        this.updateStatus.set(
          'up-to-date'
        );

        this.availableVersion.set(
          ''
        );

        this.updateMessage.set(
          'Você já está usando a versão mais recente.'
        );

        this.updatePercent.set(
          0
        );

        break;


      /* ----------------------------------------------------------------------
         BAIXANDO
         ---------------------------------------------------------------------- */

      case 'downloading':

        this.updateStatus.set(
          'downloading'
        );

        this.updatePercent.set(
          Math.max(
            0,

            Math.min(
              100,
              Number(
                data.percent || 0
              )
            )
          )
        );

        this.updateMessage.set(
          `Baixando atualização... ${Math.round(
            Number(
              data.percent || 0
            )
          )}%`
        );

        break;


      /* ----------------------------------------------------------------------
         DOWNLOAD FINALIZADO
         ---------------------------------------------------------------------- */

      case 'downloaded':

        this.updateStatus.set(
          'downloaded'
        );

        this.availableVersion.set(
          data.version ||
          this.availableVersion()
        );

        this.updatePercent.set(
          100
        );

        this.updateMessage.set(
          'Atualização baixada e pronta para instalar.'
        );

        break;


      /* ----------------------------------------------------------------------
         ERRO
         ---------------------------------------------------------------------- */

      case 'error':

        this.updateStatus.set(
          'error'
        );

        this.updateMessage.set(
          data.message ||
          'Não foi possível verificar as atualizações.'
        );

        break;

    }

  }


  /* ==========================================================================
     VERIFICAR ATUALIZAÇÕES
     ========================================================================== */

  async verificarAtualizacoes() {

    if (
      !window.electronAPI
    ) {
      return;
    }


    this.updateStatus.set(
      'checking'
    );

    this.updateMessage.set(
      'Verificando atualizações...'
    );

    this.updatePercent.set(
      0
    );


    try {

      const result =
        await window.electronAPI
          .checkForUpdates();


      /*
        Em desenvolvimento não fazemos atualização real.
      */
      if (
        result.development
      ) {

        this.isDevelopmentMode.set(
          true
        );

        this.updateStatus.set(
          'idle'
        );

        this.updateMessage.set(
          'Atualizações serão verificadas no aplicativo instalado.'
        );

        return;

      }


      if (
        !result.success
      ) {

        this.updateStatus.set(
          'error'
        );

        this.updateMessage.set(
          result.error ||
          result.message ||
          'Não foi possível verificar atualizações.'
        );

      }

    } catch (
    error: any
    ) {

      console.error(
        'Erro ao verificar atualizações:',
        error
      );


      this.updateStatus.set(
        'error'
      );

      this.updateMessage.set(
        error?.message ||
        'Não foi possível verificar atualizações.'
      );

    }

  }


  /* ==========================================================================
     BAIXAR ATUALIZAÇÃO
     ========================================================================== */

  async baixarAtualizacao() {

    if (
      !window.electronAPI
    ) {
      return;
    }


    this.updateStatus.set(
      'downloading'
    );

    this.updatePercent.set(
      0
    );

    this.updateMessage.set(
      'Preparando download da atualização...'
    );


    try {

      const result =
        await window.electronAPI
          .downloadUpdate();


      if (
        result.development
      ) {

        this.updateStatus.set(
          'idle'
        );

        this.updateMessage.set(
          result.message ||
          'O download funciona somente no aplicativo instalado.'
        );

        return;

      }


      if (
        !result.success
      ) {

        this.updateStatus.set(
          'error'
        );

        this.updateMessage.set(
          result.error ||
          'Não foi possível baixar a atualização.'
        );

      }

    } catch (
    error: any
    ) {

      console.error(
        'Erro ao baixar atualização:',
        error
      );


      this.updateStatus.set(
        'error'
      );

      this.updateMessage.set(
        error?.message ||
        'Não foi possível baixar a atualização.'
      );

    }

  }


  /* ==========================================================================
     INSTALAR ATUALIZAÇÃO
     ========================================================================== */

  async instalarAtualizacao() {

    if (
      !window.electronAPI
    ) {
      return;
    }


    const confirmed =
      confirm(
        'A atualização está pronta para instalar.\n\n' +
        'O Sistema Oficina será fechado e aberto novamente.\n\n' +
        'Deseja instalar agora?'
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      const result =
        await window.electronAPI
          .installUpdate();


      if (
        !result.success
      ) {

        alert(
          result.error ||
          'Não foi possível iniciar a instalação.'
        );

      }

    } catch (
    error: any
    ) {

      console.error(
        'Erro ao instalar atualização:',
        error
      );


      alert(
        error?.message ||
        'Não foi possível instalar a atualização.'
      );

    }

  }

  async realizarBackup() {

    if (window.electronAPI) {
      const result = await window.electronAPI.backupDatabase();
      if (result.success) {
        alert('Backup realizado com sucesso em: ' + result.path);
      } else if (result.error !== 'Operação cancelada') {
        alert('Erro ao realizar backup: ' + result.error);
      }
    }
  }

  async restaurarBackup() {

    if (
      !window.electronAPI
    ) {
      return;
    }


    const confirmed =
      confirm(
        'Deseja restaurar um backup do sistema?\n\n' +
        'O banco de dados atual será substituído pelos dados do arquivo escolhido.\n\n' +
        'Antes da restauração, o sistema criará automaticamente uma cópia de segurança do banco atual.\n\n' +
        'Após concluir, o programa será reiniciado.'
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      const result =
        await window.electronAPI
          .restoreDatabase();


      /*
        Usuário fechou a janela de seleção.
        Não mostramos erro.
      */
      if (
        result.canceled
      ) {
        return;
      }


      if (
        !result.success
      ) {

        alert(
          'Não foi possível restaurar o backup.\n\n' +
          (
            result.error ||
            'Ocorreu um erro desconhecido.'
          )
        );

        return;
      }


      alert(
        'Backup restaurado com sucesso!\n\n' +
        'O sistema será reiniciado para carregar os dados restaurados.'
      );

    } catch (
    error: any
    ) {

      console.error(
        'Erro ao restaurar backup:',
        error
      );


      alert(
        'Não foi possível restaurar o backup.\n\n' +
        (
          error?.message ||
          'Ocorreu um erro inesperado.'
        )
      );

    }

  }
}