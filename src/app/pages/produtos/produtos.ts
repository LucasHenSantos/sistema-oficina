import {
  Component,
  signal,
  computed,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-produtos',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './produtos.html',
  styleUrl: './produtos.css'
})
export class Produtos implements OnInit {

  /* ==========================================================================
   ENTRADA DE ESTOQUE
   ========================================================================== */

  showStockEntry = signal(false);

  stockEntryBarcode = signal('');

  stockEntryQuantity = signal(1);

  stockEntryProduct = signal<any | null>(null);

  stockEntryMessage = signal('');

  stockEntryState = signal<
    'idle' |
    'searching' |
    'found' |
    'saving' |
    'success' |
    'error'
  >('idle');

  lastStockEntry = signal<{
    productName: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
  } | null>(null);

  /* ==========================================================================
   HISTÓRICO DE ESTOQUE
   ========================================================================== */

  showStockHistory = signal(false);

  stockMovements = signal<any[]>([]);

  stockHistoryLoading = signal(false);

  stockHistoryMessage = signal('');

  stockHistorySearchTerm = signal('');


  filteredStockMovements = computed(() => {

    const term =
      this.stockHistorySearchTerm()
        .trim()
        .toLowerCase();


    if (!term) {

      return this.stockMovements();

    }


    return this.stockMovements().filter(
      movement => {

        const productName =
          String(
            movement.productName || ''
          ).toLowerCase();


        const productCode =
          String(
            movement.productCode || ''
          ).toLowerCase();


        const productBarcode =
          String(
            movement.productBarcode || ''
          ).toLowerCase();


        const productBrand =
          String(
            movement.productBrand || ''
          ).toLowerCase();


        return (
          productName.includes(term) ||
          productCode.includes(term) ||
          productBarcode.includes(term) ||
          productBrand.includes(term)
        );

      }
    );

  });

  /* ==========================================================================
     LISTAGEM
     ========================================================================== */

  searchTerm = signal('');

  products = signal<any[]>([]);

  categories = signal<string[]>([]);


  /* ==========================================================================
     MODAL DE CADASTRO / EDIÇÃO
     ========================================================================== */

  showModal = signal(false);


  currentProduct = signal({

    id: 0,

    code: '',

    barcode: '',

    name: '',

    brand: '',

    category: '',

    quantity: 0,

    minQuantity: 5,

    costPrice: 0,

    sellPrice: 0,

    location: ''

  });


  /* ==========================================================================
     SCANNER RÁPIDO DE UMA LINHA
     ========================================================================== */

  showBarcodeScanner = signal(false);

  scannerProduct = signal<any | null>(null);

  scannerBarcode = signal('');

  scannerMessage = signal('');

  scannerState = signal<
    'idle' |
    'saving' |
    'success' |
    'error'
  >('idle');


  /* ==========================================================================
     MODO SCANNER EM LOTE
     ========================================================================== */

  showBulkScanner = signal(false);

  bulkQueue = signal<any[]>([]);

  bulkIndex = signal(0);

  bulkBarcode = signal('');

  bulkMessage = signal('');

  bulkState = signal<
    'idle' |
    'saving' |
    'success' |
    'error' |
    'finished'
  >('idle');

  bulkTotal = signal(0);

  bulkCompleted = signal(0);


  currentBulkProduct = computed(() => {

    const queue = this.bulkQueue();

    const index = this.bulkIndex();


    if (
      queue.length === 0 ||
      !queue[index]
    ) {
      return null;
    }


    return queue[index];

  });


  productsWithoutBarcode = computed(() => {

    return this.products().filter(product => {

      return !String(
        product.barcode || ''
      ).trim();

    });

  });


  /* ==========================================================================
     INICIALIZAÇÃO
     ========================================================================== */

  ngOnInit(): void {

    this.loadProducts();

  }


  /* ==========================================================================
     CARREGAMENTO
     ========================================================================== */

  async loadProducts() {

    if (!window.electronAPI) {
      return;
    }


    try {

      const data =
        await window.electronAPI.getProdutos();


      this.products.set(
        data || []
      );


      const savedCategories =
        await window.electronAPI.getConfig(
          'categorias_produtos'
        );


      if (
        savedCategories &&
        savedCategories.length > 0
      ) {

        this.categories.set(
          savedCategories
        );


        if (!this.currentProduct().category) {

          this.currentProduct.update(product => ({

            ...product,

            category: savedCategories[0]

          }));

        }

      }

    } catch (error) {

      console.error(
        'Erro ao carregar produtos ou categorias:',
        error
      );

    }

  }


  /* ==========================================================================
     PESQUISA
     ========================================================================== */

  filteredProducts = computed(() => {

    const term =
      this.searchTerm()
        .trim()
        .toLowerCase();


    if (!term) {
      return this.products();
    }


    return this.products().filter(product => {

      const name =
        String(product.name || '')
          .toLowerCase();


      const code =
        String(product.code || '')
          .toLowerCase();


      const barcode =
        String(product.barcode || '')
          .toLowerCase();


      const brand =
        String(product.brand || '')
          .toLowerCase();


      return (

        name.includes(term) ||

        code.includes(term) ||

        barcode.includes(term) ||

        brand.includes(term)

      );

    });

  });


  /* ==========================================================================
     STATUS DO ESTOQUE
     ========================================================================== */

  getStockStatusClass(
    qty: number,
    min: number
  ): 'status-ok' | 'status-low' | 'status-empty' {

    if (qty === 0) {
      return 'status-empty';
    }


    if (qty <= min) {
      return 'status-low';
    }


    return 'status-ok';

  }


  getStockStatusText(
    qty: number,
    min: number
  ): string {

    if (qty === 0) {
      return 'Esgotado';
    }


    if (qty <= min) {
      return 'Baixo';
    }


    return 'Em Estoque';

  }


  /* ==========================================================================
     NOVO PRODUTO
     ========================================================================== */

  openModal() {

    const defaultCategory =
      this.categories()[0] || '';


    this.currentProduct.set({

      id: 0,

      code: '',

      barcode: '',

      name: '',

      brand: '',

      category: defaultCategory,

      quantity: 0,

      minQuantity: 5,

      costPrice: 0,

      sellPrice: 0,

      location: ''

    });


    this.showModal.set(true);

  }


  /* ==========================================================================
     EDITAR PRODUTO
     ========================================================================== */

  editProduct(product: any) {

    this.currentProduct.set({

      ...product,

      barcode:
        product.barcode || ''

    });


    this.showModal.set(true);

  }


  /* ==========================================================================
     FECHAR MODAL
     ========================================================================== */

  closeModal() {

    this.showModal.set(false);

  }


  /* ==========================================================================
     SALVAR PRODUTO
     ========================================================================== */

  async saveProduct() {

    const product =
      this.currentProduct();


    const productToSave = {

      ...product,


      code:
        String(
          product.code || ''
        ).trim(),


      barcode:
        String(
          product.barcode || ''
        ).trim(),


      name:
        String(
          product.name || ''
        ).trim(),


      brand:
        String(
          product.brand || ''
        ).trim(),


      location:
        String(
          product.location || ''
        ).trim()

    };


    if (!productToSave.name) {

      alert(
        'Informe o nome do produto.'
      );

      return;

    }


    if (!window.electronAPI) {
      return;
    }


    try {

      if (
        productToSave.id &&
        productToSave.id !== 0
      ) {

        await window.electronAPI.updateProduto(
          productToSave
        );

      } else {

        await window.electronAPI.addProduto(
          productToSave
        );

      }


      await this.loadProducts();


      this.closeModal();

    } catch (error: any) {

      console.error(
        'Erro ao salvar produto:',
        error
      );


      const message =
        String(
          error?.message || ''
        );


      if (
        message
          .toLowerCase()
          .includes('código de barras')
      ) {

        alert(
          'Este código de barras já está cadastrado em outro produto.'
        );

        return;

      }


      alert(
        'Erro ao salvar o produto.'
      );

    }

  }


  /* ==========================================================================
     EXCLUIR PRODUTO
     ========================================================================== */

  async deleteProduct(id: number) {

    const confirmed =
      confirm(
        'Remover este produto do estoque?'
      );


    if (!confirmed) {
      return;
    }


    if (!window.electronAPI) {

      this.products.update(list =>

        list.filter(
          product =>
            product.id !== id
        )

      );

      return;

    }


    try {

      await window.electronAPI.deleteProduto(
        id
      );


      this.products.update(list =>

        list.filter(
          product =>
            product.id !== id
        )

      );

    } catch (error) {

      console.error(
        'Erro ao excluir produto:',
        error
      );


      alert(
        'Erro ao excluir do banco.'
      );

    }

  }


  /* ==========================================================================
     FUNÇÕES AUXILIARES DO SCANNER
     ========================================================================== */

  private focusInput(
    elementId: string
  ) {

    setTimeout(() => {

      const input =
        document.getElementById(
          elementId
        ) as HTMLInputElement | null;


      if (input) {

        input.focus();

        input.select();

      }

    }, 50);

  }


  private updateProductLocally(
    updatedProduct: any
  ) {

    this.products.update(list => {

      return list.map(product => {

        if (
          product.id ===
          updatedProduct.id
        ) {

          return {
            ...product,
            ...updatedProduct
          };

        }


        return product;

      });

    });

  }


  /* ==========================================================================
     SCANNER RÁPIDO DE UMA LINHA
     ========================================================================== */

  openBarcodeScanner(
    product: any
  ) {

    this.scannerProduct.set(
      product
    );


    this.scannerBarcode.set('');

    this.scannerMessage.set('');

    this.scannerState.set(
      'idle'
    );


    this.showBarcodeScanner.set(
      true
    );


    this.focusInput(
      'quick-barcode-input'
    );

  }


  closeBarcodeScanner() {

    if (
      this.scannerState() ===
      'saving'
    ) {
      return;
    }


    this.showBarcodeScanner.set(
      false
    );


    this.scannerProduct.set(
      null
    );


    this.scannerBarcode.set('');

    this.scannerMessage.set('');

    this.scannerState.set(
      'idle'
    );

  }


  onQuickScannerKeydown(
    event: KeyboardEvent
  ) {

    if (
      event.key === 'Escape'
    ) {

      event.preventDefault();

      this.closeBarcodeScanner();

      return;

    }


    if (
      event.key !== 'Enter'
    ) {
      return;
    }


    event.preventDefault();


    this.saveQuickBarcode();

  }


  async saveQuickBarcode() {

    const product =
      this.scannerProduct();


    const barcode =
      String(
        this.scannerBarcode() || ''
      ).trim();


    if (!product) {
      return;
    }


    if (!barcode) {

      this.scannerState.set(
        'error'
      );


      this.scannerMessage.set(
        'Nenhum código foi lido.'
      );


      this.focusInput(
        'quick-barcode-input'
      );

      return;

    }


    if (!window.electronAPI) {
      return;
    }


    this.scannerState.set(
      'saving'
    );


    this.scannerMessage.set(
      'Salvando código...'
    );


    try {

      const result =
        await window.electronAPI.setProdutoBarcode(
          product.id,
          barcode
        );


      if (!result.success) {

        this.scannerState.set(
          'error'
        );


        if (
          result.reason ===
          'duplicate'
        ) {

          const existing =
            result.existingProduct;


          if (existing) {

            this.scannerMessage.set(
              `Este código já pertence ao produto "${existing.name}".`
            );

          } else {

            this.scannerMessage.set(
              'Este código já está cadastrado em outro produto.'
            );

          }

        } else {

          this.scannerMessage.set(
            result.message ||
            'Não foi possível salvar o código.'
          );

        }


        this.scannerBarcode.set('');


        this.focusInput(
          'quick-barcode-input'
        );


        return;

      }


      if (result.product) {

        this.updateProductLocally(
          result.product
        );

      }


      this.scannerState.set(
        'success'
      );


      this.scannerMessage.set(
        'Código de barras salvo com sucesso.'
      );


      /*
        Dá um pequeno instante para o funcionário
        enxergar a confirmação antes do modal fechar.
      */

      setTimeout(() => {

        this.closeBarcodeScanner();

      }, 650);

    } catch (error) {

      console.error(
        'Erro ao salvar código de barras:',
        error
      );


      this.scannerState.set(
        'error'
      );


      this.scannerMessage.set(
        'Erro ao salvar o código de barras.'
      );


      this.scannerBarcode.set('');


      this.focusInput(
        'quick-barcode-input'
      );

    }

  }


  /* ==========================================================================
     MODO SCANNER EM LOTE
     ========================================================================== */

  openBulkBarcodeScanner() {

    const withoutBarcode =
      this.products().filter(product => {

        return !String(
          product.barcode || ''
        ).trim();

      });


    if (
      withoutBarcode.length === 0
    ) {

      alert(
        'Todos os produtos já possuem código de barras cadastrado.'
      );

      return;

    }


    /*
      Criamos uma fila independente.

      Assim ela não muda de posição enquanto a listagem
      principal é atualizada.
    */

    this.bulkQueue.set(
      [...withoutBarcode]
    );


    this.bulkIndex.set(0);

    this.bulkBarcode.set('');

    this.bulkMessage.set('');

    this.bulkState.set(
      'idle'
    );

    this.bulkTotal.set(
      withoutBarcode.length
    );

    this.bulkCompleted.set(0);


    this.showBulkScanner.set(
      true
    );


    this.focusInput(
      'bulk-barcode-input'
    );

  }


  closeBulkBarcodeScanner() {

    if (
      this.bulkState() ===
      'saving'
    ) {
      return;
    }


    this.showBulkScanner.set(
      false
    );


    this.bulkQueue.set([]);

    this.bulkIndex.set(0);

    this.bulkBarcode.set('');

    this.bulkMessage.set('');

    this.bulkState.set(
      'idle'
    );

    this.bulkTotal.set(0);

    this.bulkCompleted.set(0);

  }


  onBulkScannerKeydown(
    event: KeyboardEvent
  ) {

    if (
      event.key === 'Escape'
    ) {

      event.preventDefault();

      this.closeBulkBarcodeScanner();

      return;

    }


    if (
      event.key !== 'Enter'
    ) {
      return;
    }


    event.preventDefault();


    this.saveBulkBarcode();

  }


  async saveBulkBarcode() {

    const product =
      this.currentBulkProduct();


    const barcode =
      String(
        this.bulkBarcode() || ''
      ).trim();


    if (!product) {
      return;
    }


    if (!barcode) {

      this.bulkState.set(
        'error'
      );


      this.bulkMessage.set(
        'Nenhum código foi lido.'
      );


      this.focusInput(
        'bulk-barcode-input'
      );

      return;

    }


    if (!window.electronAPI) {
      return;
    }


    this.bulkState.set(
      'saving'
    );


    this.bulkMessage.set(
      'Salvando...'
    );


    try {

      const result =
        await window.electronAPI.setProdutoBarcode(
          product.id,
          barcode
        );


      if (!result.success) {

        this.bulkState.set(
          'error'
        );


        if (
          result.reason ===
          'duplicate'
        ) {

          const existing =
            result.existingProduct;


          if (existing) {

            this.bulkMessage.set(
              `Código já utilizado por "${existing.name}".`
            );

          } else {

            this.bulkMessage.set(
              'Este código já pertence a outro produto.'
            );

          }

        } else {

          this.bulkMessage.set(
            result.message ||
            'Não foi possível salvar.'
          );

        }


        this.bulkBarcode.set('');


        this.focusInput(
          'bulk-barcode-input'
        );


        return;

      }


      if (result.product) {

        this.updateProductLocally(
          result.product
        );

      }


      this.bulkCompleted.update(
        value =>
          value + 1
      );


      /*
        Retira o produto concluído da fila.
      */

      const queue =
        [...this.bulkQueue()];


      const index =
        this.bulkIndex();


      queue.splice(
        index,
        1
      );


      this.bulkQueue.set(
        queue
      );


      this.bulkBarcode.set('');


      /*
        Terminamos todos os produtos.
      */

      if (
        queue.length === 0
      ) {

        this.bulkState.set(
          'finished'
        );


        this.bulkMessage.set(
          'Todos os produtos da fila foram atualizados.'
        );


        return;

      }


      /*
        Se removemos o último item da fila,
        voltamos para o novo último índice.
      */

      if (
        index >= queue.length
      ) {

        this.bulkIndex.set(
          queue.length - 1
        );

      }


      this.bulkState.set(
        'success'
      );


      this.bulkMessage.set(
        'Salvo! Pronto para o próximo produto.'
      );


      /*
        Depois de alguns milissegundos,
        limpa a mensagem e deixa o campo pronto
        para o próximo "bip".
      */

      setTimeout(() => {

        if (
          this.bulkState() !==
          'finished'
        ) {

          this.bulkState.set(
            'idle'
          );


          this.bulkMessage.set('');


          this.focusInput(
            'bulk-barcode-input'
          );

        }

      }, 350);

    } catch (error) {

      console.error(
        'Erro no cadastro em lote:',
        error
      );


      this.bulkState.set(
        'error'
      );


      this.bulkMessage.set(
        'Erro ao salvar o código.'
      );


      this.bulkBarcode.set('');


      this.focusInput(
        'bulk-barcode-input'
      );

    }

  }

  /* ==========================================================================
   ABRIR ENTRADA DE ESTOQUE
   ========================================================================== */

  openStockEntry() {

    this.showStockEntry.set(true);

    this.resetStockEntry();

    setTimeout(
      () => {

        this.focusStockEntryBarcode();

      },
      100
    );

  }


  /* ==========================================================================
     FECHAR ENTRADA DE ESTOQUE
     ========================================================================== */

  closeStockEntry() {

    this.showStockEntry.set(false);

    this.resetStockEntry();

  }


  /* ==========================================================================
     RESET DA ENTRADA
     ========================================================================== */

  private resetStockEntry() {

    this.stockEntryBarcode.set('');

    this.stockEntryQuantity.set(1);

    this.stockEntryProduct.set(null);

    this.stockEntryMessage.set('');

    this.stockEntryState.set('idle');

  }


  /* ==========================================================================
     FOCO NO CAMPO DE CÓDIGO DE BARRAS
     ========================================================================== */

  private focusStockEntryBarcode() {

    setTimeout(
      () => {

        const input =
          document.getElementById(
            'stock-entry-barcode-input'
          ) as HTMLInputElement | null;


        if (input) {

          input.focus();

          input.select();

        }

      },
      50
    );

  }


  /* ==========================================================================
     FOCO NA QUANTIDADE
     ========================================================================== */

  private focusStockEntryQuantity() {

    setTimeout(
      () => {

        const input =
          document.getElementById(
            'stock-entry-quantity-input'
          ) as HTMLInputElement | null;


        if (input) {

          input.focus();

          input.select();

        }

      },
      50
    );

  }


  /* ==========================================================================
     ALTERAÇÃO MANUAL DO CÓDIGO
     ========================================================================== */

  onStockEntryBarcodeChange(
    value: string
  ) {

    this.stockEntryBarcode.set(
      String(value || '')
    );


    /*
      Se o funcionário alterar o código depois de
      localizar um produto, invalidamos a seleção anterior.
    */

    if (
      this.stockEntryProduct()
    ) {

      this.stockEntryProduct.set(null);

      this.stockEntryMessage.set('');

      this.stockEntryState.set('idle');

    }

  }


  /* ==========================================================================
     ENTER NO CAMPO DO CÓDIGO DE BARRAS
     ========================================================================== */

  async onStockEntryBarcodeKeydown(
    event: KeyboardEvent
  ) {

    if (
      event.key !== 'Enter'
    ) {
      return;
    }


    event.preventDefault();


    await this.findStockEntryProduct();

  }


  /* ==========================================================================
     LOCALIZAR PRODUTO
     ========================================================================== */

  async findStockEntryProduct() {

    const barcode =
      this.stockEntryBarcode()
        .trim();


    if (!barcode) {

      this.stockEntryProduct.set(null);

      this.stockEntryState.set('error');

      this.stockEntryMessage.set(
        'Escaneie ou informe um código de barras.'
      );


      this.focusStockEntryBarcode();

      return;

    }


    if (!window.electronAPI) {

      this.stockEntryState.set('error');

      this.stockEntryMessage.set(
        'Electron não está disponível.'
      );

      return;

    }


    this.stockEntryState.set(
      'searching'
    );


    this.stockEntryMessage.set(
      'Localizando produto...'
    );


    try {

      const product =
        await window.electronAPI.getProdutoByBarcode(
          barcode
        );


      if (!product) {

        this.stockEntryProduct.set(null);

        this.stockEntryState.set('error');

        this.stockEntryMessage.set(
          'Produto não encontrado. Verifique se o código de barras já está cadastrado.'
        );


        this.focusStockEntryBarcode();

        return;

      }


      this.stockEntryProduct.set(
        product
      );


      this.stockEntryQuantity.set(1);


      this.stockEntryState.set(
        'found'
      );


      this.stockEntryMessage.set(
        'Produto encontrado. Informe a quantidade recebida.'
      );


      /*
        Depois do BIP + Enter do scanner,
        mandamos o cursor direto para quantidade.
      */

      this.focusStockEntryQuantity();

    } catch (error) {

      console.error(
        'Erro ao localizar produto para entrada:',
        error
      );


      this.stockEntryProduct.set(null);

      this.stockEntryState.set('error');

      this.stockEntryMessage.set(
        'Erro ao localizar o produto.'
      );


      this.focusStockEntryBarcode();

    }

  }


  /* ==========================================================================
     ENTER NA QUANTIDADE
     ========================================================================== */

  async onStockEntryQuantityKeydown(
    event: KeyboardEvent
  ) {

    if (
      event.key !== 'Enter'
    ) {
      return;
    }


    event.preventDefault();


    await this.confirmStockEntry();

  }


  /* ==========================================================================
     CONFIRMAR ENTRADA
     ========================================================================== */

  async confirmStockEntry() {

    const product =
      this.stockEntryProduct();


    if (!product) {

      this.stockEntryState.set('error');

      this.stockEntryMessage.set(
        'Primeiro escaneie um produto.'
      );


      this.focusStockEntryBarcode();

      return;

    }


    const barcode =
      this.stockEntryBarcode()
        .trim();


    const quantity =
      Number(
        this.stockEntryQuantity()
      );


    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {

      this.stockEntryState.set('error');

      this.stockEntryMessage.set(
        'Informe uma quantidade inteira maior que zero.'
      );


      this.focusStockEntryQuantity();

      return;

    }


    if (!window.electronAPI) {

      this.stockEntryState.set('error');

      this.stockEntryMessage.set(
        'Electron não está disponível.'
      );

      return;

    }


    this.stockEntryState.set(
      'saving'
    );


    this.stockEntryMessage.set(
      'Registrando entrada...'
    );


    try {

      const result =
        await window.electronAPI.addStockEntry(
          barcode,
          quantity
        );


      /* --------------------------------------------------------------------
         ERRO RETORNADO PELO BACKEND
         -------------------------------------------------------------------- */

      if (!result.success) {

        this.stockEntryState.set(
          'error'
        );


        if (
          result.reason ===
          'not-found'
        ) {

          this.stockEntryProduct.set(null);

        }


        this.stockEntryMessage.set(
          result.message ||
          'Não foi possível registrar a entrada.'
        );


        if (
          result.reason ===
          'invalid-quantity'
        ) {

          this.focusStockEntryQuantity();

        } else {

          this.focusStockEntryBarcode();

        }


        return;

      }


      if (
        !result.product ||
        !result.movement
      ) {

        this.stockEntryState.set(
          'error'
        );

        this.stockEntryMessage.set(
          'A entrada foi processada, mas o retorno do estoque está incompleto.'
        );

        return;

      }


      /* --------------------------------------------------------------------
         GUARDA O RESUMO DA ÚLTIMA ENTRADA
         -------------------------------------------------------------------- */

      this.lastStockEntry.set({

        productName:
          result.product.name,

        quantity:
          result.movement.quantity,

        previousQuantity:
          result.movement.previousQuantity,

        newQuantity:
          result.movement.newQuantity

      });


      /* --------------------------------------------------------------------
         ATUALIZA O PRODUTO NA TABELA SEM PRECISAR RECARREGAR TUDO
         -------------------------------------------------------------------- */

      this.products.update(
        list =>
          list.map(
            item =>
              Number(item.id) ===
                Number(result.product!.id)

                ? {
                  ...item,
                  quantity:
                    result.product!.quantity
                }

                : item
          )
      );


      this.stockEntryState.set(
        'success'
      );


      this.stockEntryMessage.set(
        `Entrada registrada: +${quantity} unidade${quantity === 1 ? '' : 's'}.`
      );


      /*
        Mantemos a confirmação na tela por alguns
        instantes e já preparamos o próximo BIP.
      */

      setTimeout(
        () => {

          if (
            !this.showStockEntry()
          ) {
            return;
          }


          this.stockEntryBarcode.set('');

          this.stockEntryQuantity.set(1);

          this.stockEntryProduct.set(null);

          this.stockEntryMessage.set('');

          this.stockEntryState.set('idle');


          this.focusStockEntryBarcode();

        },
        850
      );

    } catch (error) {

      console.error(
        'Erro ao registrar entrada de estoque:',
        error
      );


      this.stockEntryState.set(
        'error'
      );


      this.stockEntryMessage.set(
        'Erro ao registrar a entrada no estoque.'
      );


      this.focusStockEntryQuantity();

    }

  }

  /* ==========================================================================
   ABRIR HISTÓRICO DE ESTOQUE
   ========================================================================== */

  async openStockHistory() {

    this.showStockHistory.set(true);

    this.stockHistorySearchTerm.set('');

    this.stockHistoryMessage.set('');


    await this.loadStockMovements();

  }


  /* ==========================================================================
     FECHAR HISTÓRICO
     ========================================================================== */

  closeStockHistory() {

    this.showStockHistory.set(false);

    this.stockHistorySearchTerm.set('');

    this.stockHistoryMessage.set('');

  }


  /* ==========================================================================
     CARREGAR MOVIMENTAÇÕES
     ========================================================================== */

  async loadStockMovements() {

    if (!window.electronAPI) {

      this.stockHistoryMessage.set(
        'Electron não está disponível.'
      );

      return;

    }


    this.stockHistoryLoading.set(true);

    this.stockHistoryMessage.set('');


    try {

      const movements =
        await window.electronAPI.getStockMovements();


      this.stockMovements.set(
        movements || []
      );


      if (
        !movements ||
        movements.length === 0
      ) {

        this.stockHistoryMessage.set(
          'Nenhuma movimentação de estoque registrada.'
        );

      }

    } catch (error) {

      console.error(
        'Erro ao carregar histórico de estoque:',
        error
      );


      this.stockMovements.set([]);


      this.stockHistoryMessage.set(
        'Erro ao carregar o histórico de estoque.'
      );

    } finally {

      this.stockHistoryLoading.set(false);

    }

  }


  /* ==========================================================================
     NOME DO TIPO DE MOVIMENTAÇÃO
     ========================================================================== */

  getStockMovementLabel(
    type: string
  ): string {

    switch (type) {

      case 'entry':
        return 'Entrada';

      case 'exit':
        return 'Saída';

      case 'adjustment':
        return 'Ajuste';

      default:
        return type || 'Movimentação';

    }

  }


  /* ==========================================================================
     CLASSE VISUAL DA MOVIMENTAÇÃO
     ========================================================================== */

  getStockMovementClass(
    type: string
  ): string {

    switch (type) {

      case 'entry':
        return 'movement-entry';

      case 'exit':
        return 'movement-exit';

      case 'adjustment':
        return 'movement-adjustment';

      default:
        return '';

    }

  }


  /* ==========================================================================
     SINAL DA QUANTIDADE
     ========================================================================== */

  getStockMovementQuantity(
    movement: any
  ): string {

    const quantity =
      Number(
        movement.quantity || 0
      );


    if (
      movement.type === 'entry'
    ) {

      return `+${quantity}`;

    }


    if (
      movement.type === 'exit'
    ) {

      return `-${quantity}`;

    }


    return String(
      quantity
    );

  }


  /* ==========================================================================
     NAVEGAÇÃO NO MODO EM LOTE
     ========================================================================== */

  nextBulkProduct() {

    const queue =
      this.bulkQueue();


    if (
      queue.length <= 1
    ) {
      return;
    }


    let nextIndex =
      this.bulkIndex() + 1;


    if (
      nextIndex >=
      queue.length
    ) {

      nextIndex = 0;

    }


    this.bulkIndex.set(
      nextIndex
    );


    this.bulkBarcode.set('');

    this.bulkMessage.set('');

    this.bulkState.set(
      'idle'
    );


    this.focusInput(
      'bulk-barcode-input'
    );

  }


  previousBulkProduct() {

    const queue =
      this.bulkQueue();


    if (
      queue.length <= 1
    ) {
      return;
    }


    let previousIndex =
      this.bulkIndex() - 1;


    if (
      previousIndex < 0
    ) {

      previousIndex =
        queue.length - 1;

    }


    this.bulkIndex.set(
      previousIndex
    );


    this.bulkBarcode.set('');

    this.bulkMessage.set('');

    this.bulkState.set(
      'idle'
    );


    this.focusInput(
      'bulk-barcode-input'
    );

  }


  /* ==========================================================================
     INFORMAÇÕES DO MODO EM LOTE
     ========================================================================== */

  getBulkRemaining(): number {

    return this.bulkQueue().length;

  }


  getBulkProgress(): number {

    const total =
      this.bulkTotal();


    if (total === 0) {
      return 0;
    }


    return Math.round(
      (
        this.bulkCompleted() /
        total
      ) * 100
    );

  }

}