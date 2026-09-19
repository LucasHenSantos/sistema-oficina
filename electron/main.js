const {
  app,
  BrowserWindow,
  ipcMain,
  dialog
} = require('electron');

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const {
  autoUpdater
} = require(
  'electron-updater'
);


let db;
let win;
let updateDownloaded =
  false;


/* ==========================================================================
   BANCO DE DADOS
   ========================================================================== */

function initDatabase() {

  const dbPath =
    path.join(
      app.getPath('userData'),
      'oficina.db'
    );


  console.log(
    'Banco de dados em:',
    dbPath
  );


  db =
    new sqlite3.Database(
      dbPath,

      (err) => {

        if (err) {

          console.error(
            'Erro ao abrir o banco:',
            err.message
          );

          return;

        }


        console.log(
          'Conectado ao SQLite.'
        );


        createTables();

      }
    );

}


/* ==========================================================================
   CRIAÇÃO E MIGRAÇÃO DAS TABELAS
   ========================================================================== */

function createTables() {

  const sqlClientes = `
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      cars TEXT,
      lastVisit TEXT,
      status TEXT,
      statusLabel TEXT
    )
  `;


  const sqlVeiculos = `
    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT NOT NULL,
      model TEXT,
      brand TEXT,
      year INTEGER,
      color TEXT,
      client TEXT,
      status TEXT,
      lastService TEXT
    )
  `;


  const sqlProdutos = `
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      barcode TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      quantity INTEGER,
      minQuantity INTEGER,
      costPrice REAL,
      sellPrice REAL,
      location TEXT
    )
  `;


  const sqlServicos = `
    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      time TEXT,
      price REAL
    )
  `;


  const sqlOS = `
  CREATE TABLE IF NOT EXISTS ordens_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    status TEXT,
    date TEXT,
    items TEXT,
    notes TEXT,
    total REAL,
    paymentStatus TEXT DEFAULT 'pending',
    stockProcessed INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    archivedAt TEXT
  )
`;


  const sqlOrcamentos = `
  CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    date TEXT,
    validUntil TEXT,
    status TEXT,
    total REAL,
    items TEXT,
    notes TEXT,
    archived INTEGER DEFAULT 0,
    archivedAt TEXT
  )
`;


  const sqlConfig = `
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `;


  const sqlMovimentacoesEstoque = `
    CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      product_id INTEGER NOT NULL,

      type TEXT NOT NULL,

      quantity INTEGER NOT NULL,

      previous_quantity INTEGER NOT NULL,

      new_quantity INTEGER NOT NULL,

      source TEXT,

      reference_id INTEGER,

      notes TEXT,

      created_at TEXT NOT NULL
    )
  `;


  /* ==========================================================================
     PAGAMENTOS
     ========================================================================== */

  const sqlPagamentos = `
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      os_id INTEGER NOT NULL,

      method TEXT NOT NULL,

      applied_amount REAL NOT NULL,

      received_amount REAL NOT NULL,

      change_amount REAL NOT NULL DEFAULT 0,

      notes TEXT,

      source TEXT DEFAULT 'manual',

      created_at TEXT NOT NULL
    )
  `;


  db.serialize(
    () => {

      db.run(
        sqlClientes
      );

      db.run(
        sqlVeiculos
      );

      db.run(
        sqlProdutos
      );

      db.run(
        sqlServicos
      );

      db.run(
        sqlOS
      );

      db.run(
        sqlOrcamentos
      );

      db.run(
        sqlConfig
      );

      db.run(
        sqlMovimentacoesEstoque
      );

      db.run(
        sqlPagamentos
      );


      /* ----------------------------------------------------------------------
         ÍNDICES DO ESTOQUE
         ---------------------------------------------------------------------- */

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto
        ON movimentacoes_estoque(product_id)
      `);


      db.run(`
        CREATE INDEX IF NOT EXISTS idx_movimentacoes_data
        ON movimentacoes_estoque(created_at)
      `);


      /* ----------------------------------------------------------------------
         ÍNDICES DE PAGAMENTO
         ---------------------------------------------------------------------- */

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_pagamentos_os
        ON pagamentos(os_id)
      `);


      db.run(`
        CREATE INDEX IF NOT EXISTS idx_pagamentos_data
        ON pagamentos(created_at)
      `);

      /* ----------------------------------------------------------------------
   MIGRAÇÃO: ARQUIVAMENTO
   ---------------------------------------------------------------------- */

      db.run(
        `
  ALTER TABLE ordens_servico
  ADD COLUMN archived INTEGER DEFAULT 0
  `,

        () => { }
      );


      db.run(
        `
  ALTER TABLE ordens_servico
  ADD COLUMN archivedAt TEXT
  `,

        () => { }
      );


      db.run(
        `
  ALTER TABLE orcamentos
  ADD COLUMN archived INTEGER DEFAULT 0
  `,

        () => { }
      );


      db.run(
        `
  ALTER TABLE orcamentos
  ADD COLUMN archivedAt TEXT
  `,

        () => { }
      );


      /*
        Normaliza bancos antigos.
      */

      db.run(`
  UPDATE ordens_servico
  SET archived = 0
  WHERE archived IS NULL
`);


      db.run(`
  UPDATE orcamentos
  SET archived = 0
  WHERE archived IS NULL
`);


      /*
        Índices para deixar listagem e histórico rápidos
        mesmo depois de milhares de registros.
      */

      db.run(`
  CREATE INDEX IF NOT EXISTS idx_os_archived_status
  ON ordens_servico(archived, status)
`);


      db.run(`
  CREATE INDEX IF NOT EXISTS idx_orcamentos_archived_status
  ON orcamentos(archived, status)
`);


      db.run(`
  CREATE INDEX IF NOT EXISTS idx_os_archived_date
  ON ordens_servico(archivedAt)
`);


      db.run(`
  CREATE INDEX IF NOT EXISTS idx_orcamentos_archived_date
  ON orcamentos(archivedAt)
`);

      /* ----------------------------------------------------------------------
         MIGRAÇÃO: PAYMENT STATUS
         ---------------------------------------------------------------------- */

      db.run(
        `
        ALTER TABLE ordens_servico
        ADD COLUMN paymentStatus TEXT DEFAULT 'pending'
        `,

        () => { }
      );


      /* ----------------------------------------------------------------------
         MIGRAÇÃO DE PAGAMENTOS ANTIGOS

         Se antes a OS estava simplesmente marcada como "paid",
         geramos um pagamento histórico equivalente ao total da OS.

         Assim não perdemos o que o sistema antigo considerava pago.
         ---------------------------------------------------------------------- */

      db.run(
        `
        INSERT INTO pagamentos (
          os_id,
          method,
          applied_amount,
          received_amount,
          change_amount,
          notes,
          source,
          created_at
        )

        SELECT
          os.id,

          'legacy',

          ROUND(
            COALESCE(
              os.total,
              0
            ),
            2
          ),

          ROUND(
            COALESCE(
              os.total,
              0
            ),
            2
          ),

          0,

          'Pagamento migrado do sistema antigo',

          'legacy-payment-status-migration',

          COALESCE(
            NULLIF(
              os.date,
              ''
            ),
            date('now')
          ) || 'T12:00:00.000Z'

        FROM ordens_servico os

        WHERE
          LOWER(
            COALESCE(
              os.paymentStatus,
              ''
            )
          ) IN (
            'paid',
            'pago'
          )

          AND ROUND(
            COALESCE(
              os.total,
              0
            ),
            2
          ) > 0

          AND NOT EXISTS (
            SELECT 1

            FROM pagamentos p

            WHERE p.os_id = os.id
          )
        `,

        () => { }
      );


      /* ----------------------------------------------------------------------
         MIGRAÇÃO: ESTOQUE PROCESSADO
         ---------------------------------------------------------------------- */

      db.run(
        `
        ALTER TABLE ordens_servico
        ADD COLUMN stockProcessed INTEGER DEFAULT 0
        `,

        (err) => {

          /*
            Se a coluna acabou de ser criada, as OS antigas
            já finalizadas são consideradas processadas.

            Assim não retiramos estoque retroativamente.
          */

          if (!err) {

            db.run(
              `
              UPDATE ordens_servico

              SET stockProcessed = 1

              WHERE status = 'completed'
              `
            );

          }

        }
      );


      /* ----------------------------------------------------------------------
         MIGRAÇÃO: BARCODE
         ---------------------------------------------------------------------- */

      db.run(
        `
        ALTER TABLE produtos
        ADD COLUMN barcode TEXT
        `,

        () => { }
      );


      /* ----------------------------------------------------------------------
         BARCODE ÚNICO
         ---------------------------------------------------------------------- */

      db.run(
        `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_barcode_unique

        ON produtos(barcode)

        WHERE barcode IS NOT NULL
          AND TRIM(barcode) <> ''
        `
      );


      /* ----------------------------------------------------------------------
         ÍNDICES AUXILIARES
         ---------------------------------------------------------------------- */

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_produtos_codigo
        ON produtos(code)
      `);


      db.run(`
        CREATE INDEX IF NOT EXISTS idx_produtos_nome
        ON produtos(name COLLATE NOCASE)
      `);


      db.run(`
        CREATE INDEX IF NOT EXISTS idx_servicos_nome
        ON servicos(name COLLATE NOCASE)
      `);

    }
  );

}


/* ==========================================================================
   HELPERS SQLITE
   ========================================================================== */

function dbRunPromise(
  sql,
  params = []
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      db.run(
        sql,
        params,

        function (err) {

          if (err) {

            reject(
              err
            );

            return;

          }


          resolve({

            lastID:
              this.lastID,

            changes:
              this.changes

          });

        }
      );

    }
  );

}


function dbGetPromise(
  sql,
  params = []
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      db.get(
        sql,
        params,

        (
          err,
          row
        ) => {

          if (err) {

            reject(
              err
            );

            return;

          }


          resolve(
            row ||
            null
          );

        }
      );

    }
  );

}


/* ==========================================================================
   HELPERS DE DINHEIRO

   Fazemos as contas em centavos para evitar:

   0.1 + 0.2 = 0.30000000000000004

   O pequeno dragão do JavaScript.
   ========================================================================== */

function moneyToCents(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return NaN;

  }


  return Math.round(
    (
      number +
      Number.EPSILON
    ) * 100
  );

}


function centsToMoney(
  cents
) {

  return (
    Math.round(
      Number(
        cents
      ) || 0
    ) / 100
  );

}


/* ==========================================================================
   STATUS AUTOMÁTICO DO PAGAMENTO
   ========================================================================== */

function getPaymentStatusFromCents(
  totalCents,
  paidCents
) {

  if (
    paidCents <= 0
  ) {

    return 'pending';

  }


  if (
    paidCents <
    totalCents
  ) {

    return 'partial';

  }


  return 'paid';

}


/* ==========================================================================
   RESUMO FINANCEIRO DA OS
   ========================================================================== */

async function getOSPaymentSummary(
  orderId,
  totalOverride = null
) {

  let total;


  if (
    totalOverride === null ||
    totalOverride === undefined
  ) {

    const order =
      await dbGetPromise(
        `
        SELECT
          id,
          total

        FROM ordens_servico

        WHERE id = ?

        LIMIT 1
        `,

        [
          orderId
        ]
      );


    if (!order) {

      throw new Error(
        `Ordem de Serviço #${orderId} não encontrada.`
      );

    }


    total =
      Number(
        order.total || 0
      );

  } else {

    total =
      Number(
        totalOverride || 0
      );

  }


  const paidRow =
    await dbGetPromise(
      `
      SELECT
        COALESCE(
          SUM(applied_amount),
          0
        ) AS paidAmount

      FROM pagamentos

      WHERE os_id = ?
      `,

      [
        orderId
      ]
    );


  const totalCents =
    Math.max(
      0,

      moneyToCents(
        total
      ) || 0
    );


  const paidCents =
    Math.max(
      0,

      moneyToCents(
        paidRow?.paidAmount ||
        0
      ) || 0
    );


  const remainingCents =
    Math.max(
      0,

      totalCents -
      paidCents
    );


  const paymentStatus =
    getPaymentStatusFromCents(
      totalCents,
      paidCents
    );


  return {

    orderId:
      Number(
        orderId
      ),

    total:
      centsToMoney(
        totalCents
      ),

    paidAmount:
      centsToMoney(
        paidCents
      ),

    remainingAmount:
      centsToMoney(
        remainingCents
      ),

    paymentStatus

  };

}


/* ==========================================================================
   SINCRONIZAR STATUS FINANCEIRO
   ========================================================================== */

async function syncOSPaymentStatus(
  orderId,
  totalOverride = null
) {

  const summary =
    await getOSPaymentSummary(
      orderId,
      totalOverride
    );


  await dbRunPromise(
    `
    UPDATE ordens_servico

    SET paymentStatus = ?

    WHERE id = ?
    `,

    [
      summary.paymentStatus,
      orderId
    ]
  );


  return summary;

}


/* ==========================================================================
   PRODUTOS DA OS
   ========================================================================== */

function getOSProductItems(
  items = []
) {

  const quantities =
    new Map();


  for (
    const item of items
  ) {

    if (
      item.type !==
      'product'
    ) {

      continue;

    }


    const productId =
      Number(
        item.id
      );


    const quantity =
      Number(
        item.qty || 0
      );


    if (
      !Number.isInteger(
        productId
      ) ||

      productId <= 0
    ) {

      throw new Error(
        `O produto "${item.name || 'Sem nome'}" não possui identificação válida para movimentar o estoque.`
      );

    }


    if (
      !Number.isInteger(
        quantity
      ) ||

      quantity <= 0
    ) {

      throw new Error(
        `Quantidade inválida para o produto "${item.name || 'Sem nome'}".`
      );

    }


    const currentQuantity =
      quantities.get(
        productId
      ) || 0;


    quantities.set(
      productId,
      currentQuantity +
      quantity
    );

  }


  return Array.from(
    quantities.entries()
  ).map(
    (
      [
        productId,
        quantity
      ]
    ) => ({

      productId,

      quantity

    })
  );

}


/* ==========================================================================
   ASSINATURA DOS PRODUTOS
   ========================================================================== */

function getOSProductSignature(
  items = []
) {

  const quantities =
    new Map();


  for (
    const item of items
  ) {

    if (
      item.type !==
      'product'
    ) {

      continue;

    }


    const productId =
      Number(
        item.id
      );


    const quantity =
      Number(
        item.qty || 0
      );


    const key =
      (
        Number.isInteger(
          productId
        ) &&

        productId > 0
      )

        ? `id:${productId}`

        : `legacy:${String(
          item.name || ''
        )
          .trim()
          .toLowerCase()}`;


    const currentQuantity =
      quantities.get(
        key
      ) || 0;


    quantities.set(
      key,
      currentQuantity +
      quantity
    );

  }


  return Array.from(
    quantities.entries()
  )
    .sort(
      (
        a,
        b
      ) =>
        a[0].localeCompare(
          b[0]
        )
    )
    .map(
      (
        [
          key,
          quantity
        ]
      ) =>
        `${key}:${quantity}`
    )
    .join('|');

}


/* ==========================================================================
   BAIXA DE ESTOQUE PELA OS
   ========================================================================== */

async function processOSStockExit(
  orderId,
  items = []
) {

  const products =
    getOSProductItems(
      items
    );


  for (
    const item of products
  ) {

    const product =
      await dbGetPromise(
        `
        SELECT
          id,
          name,
          quantity

        FROM produtos

        WHERE id = ?

        LIMIT 1
        `,

        [
          item.productId
        ]
      );


    if (!product) {

      throw new Error(
        'Um dos produtos da OS não foi encontrado no estoque.'
      );

    }


    const previousQuantity =
      Number(
        product.quantity || 0
      );


    const requestedQuantity =
      Number(
        item.quantity
      );


    if (
      previousQuantity <
      requestedQuantity
    ) {

      throw new Error(
        `Estoque insuficiente para "${product.name}". Disponível: ${previousQuantity}. Necessário: ${requestedQuantity}.`
      );

    }


    const newQuantity =
      previousQuantity -
      requestedQuantity;


    await dbRunPromise(
      `
      UPDATE produtos

      SET quantity = ?

      WHERE id = ?
      `,

      [
        newQuantity,
        product.id
      ]
    );


    await dbRunPromise(
      `
      INSERT INTO movimentacoes_estoque (
        product_id,
        type,
        quantity,
        previous_quantity,
        new_quantity,
        source,
        reference_id,
        notes,
        created_at
      )

      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `,

      [
        product.id,

        'exit',

        requestedQuantity,

        previousQuantity,

        newQuantity,

        'service-order',

        orderId,

        `Saída automática pela OS #${orderId}`,

        new Date()
          .toISOString()
      ]
    );

  }


  await dbRunPromise(
    `
    UPDATE ordens_servico

    SET stockProcessed = 1

    WHERE id = ?
    `,

    [
      orderId
    ]
  );

}

/* ==========================================================================
   ATUALIZAÇÃO AUTOMÁTICA
   ========================================================================== */

function sendUpdateStatus(
  data
) {

  if (
    !win ||
    win.isDestroyed()
  ) {
    return;
  }


  win.webContents.send(
    'update-status',
    data
  );

}


/* ==========================================================================
   CONFIGURAÇÃO DO AUTO UPDATER
   ========================================================================== */

function setupAutoUpdater() {

  /*
    Queremos que o usuário escolha quando baixar.
    Assim não consumimos internet escondido.
  */
  autoUpdater.autoDownload =
    false;


  /*
    No electron-builder 26, evitamos instalar
    automaticamente ao simplesmente fechar o programa.

    A instalação acontecerá pelo nosso botão
    "Reiniciar e instalar".
  */
  autoUpdater.autoInstallOnAppQuit =
    false;


  /* ------------------------------------------------------------------------
     VERIFICANDO
     ------------------------------------------------------------------------ */

  autoUpdater.on(
    'checking-for-update',

    () => {

      sendUpdateStatus({

        status:
          'checking',

        currentVersion:
          app.getVersion()

      });

    }
  );


  /* ------------------------------------------------------------------------
     NOVA VERSÃO DISPONÍVEL
     ------------------------------------------------------------------------ */

  autoUpdater.on(
    'update-available',

    (
      info
    ) => {

      updateDownloaded =
        false;


      sendUpdateStatus({

        status:
          'available',

        currentVersion:
          app.getVersion(),

        version:
          info.version,

        releaseName:
          info.releaseName || null,

        releaseNotes:
          info.releaseNotes || null,

        releaseDate:
          info.releaseDate || null

      });

    }
  );


  /* ------------------------------------------------------------------------
     SISTEMA JÁ ESTÁ ATUALIZADO
     ------------------------------------------------------------------------ */

  autoUpdater.on(
    'update-not-available',

    (
      info
    ) => {

      updateDownloaded =
        false;


      sendUpdateStatus({

        status:
          'up-to-date',

        currentVersion:
          app.getVersion(),

        version:
          info?.version ||
          app.getVersion()

      });

    }
  );


  /* ------------------------------------------------------------------------
     PROGRESSO DO DOWNLOAD
     ------------------------------------------------------------------------ */

  autoUpdater.on(
    'download-progress',

    (
      progress
    ) => {

      sendUpdateStatus({

        status:
          'downloading',

        currentVersion:
          app.getVersion(),

        percent:
          Math.round(
            Number(
              progress.percent || 0
            )
          ),

        bytesPerSecond:
          Number(
            progress.bytesPerSecond || 0
          ),

        transferred:
          Number(
            progress.transferred || 0
          ),

        total:
          Number(
            progress.total || 0
          )

      });

    }
  );


  /* ------------------------------------------------------------------------
     DOWNLOAD CONCLUÍDO
     ------------------------------------------------------------------------ */

  autoUpdater.on(
    'update-downloaded',

    (
      info
    ) => {

      updateDownloaded =
        true;


      sendUpdateStatus({

        status:
          'downloaded',

        currentVersion:
          app.getVersion(),

        version:
          info.version,

        releaseName:
          info.releaseName || null

      });

    }
  );


  /* ------------------------------------------------------------------------
     ERRO
     ------------------------------------------------------------------------ */

  autoUpdater.on(
    'error',

    (
      error
    ) => {

      console.error(
        'Erro no atualizador:',
        error
      );


      sendUpdateStatus({

        status:
          'error',

        currentVersion:
          app.getVersion(),

        message:
          error?.message ||
          'Não foi possível verificar as atualizações.'

      });

    }
  );

}


/* ==========================================================================
   VERIFICAÇÃO AUTOMÁTICA AO ABRIR
   ========================================================================== */

async function checkForUpdatesAutomatically() {

  /*
    O updater deve trabalhar no aplicativo instalado.

    Durante:
      npm run start:desktop

    ele não tentará procurar atualização.
  */
  if (
    !app.isPackaged
  ) {

    console.log(
      'Atualização automática ignorada em modo de desenvolvimento.'
    );

    return;

  }


  try {

    await autoUpdater
      .checkForUpdates();

  } catch (
  error
  ) {

    console.error(
      'Erro ao verificar atualizações automaticamente:',
      error
    );

  }

}


/* ==========================================================================
   IPC
   ========================================================================== */

function setupIpcHandlers() {


  /* =========================================================================
     CLIENTE + VEÍCULOS
     ========================================================================= */

  ipcMain.handle(
    'get-client-with-vehicles',

    async (
      event,
      clientName
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.get(
            `
            SELECT *

            FROM clientes

            WHERE name = ?
            `,

            [
              clientName
            ],

            (
              err,
              clientRow
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              if (!clientRow) {

                resolve(
                  null
                );

                return;

              }


              db.all(
                `
                SELECT *

                FROM veiculos

                WHERE client = ?
                `,

                [
                  clientName
                ],

                (
                  err,
                  vehicleRows
                ) => {

                  if (err) {

                    reject(
                      err
                    );

                    return;

                  }


                  clientRow.cars =
                    clientRow.cars

                      ? JSON.parse(
                        clientRow.cars
                      )

                      : [];


                  resolve({

                    client:
                      clientRow,

                    vehicles:
                      vehicleRows

                  });

                }
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     DASHBOARD
     ========================================================================= */

  ipcMain.handle(
    'get-daily-revenue',

    async () => {

      const today =
        new Date()
          .toISOString()
          .split('T')[0];


      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.get(
            `
            SELECT
              SUM(total) AS dailyRevenue

            FROM ordens_servico

            WHERE status = 'completed'
              AND date = ?
            `,

            [
              today
            ],

            (
              err,
              row
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                row?.dailyRevenue ||
                0
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'count-low-stock',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.get(
            `
            SELECT
              COUNT(id) AS lowStockCount

            FROM produtos

            WHERE quantity <= minQuantity
            `,

            [],

            (
              err,
              row
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                row?.lowStockCount ||
                0
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     CONFIGURAÇÕES
     ========================================================================= */

  ipcMain.handle(
    'get-config',

    async (
      event,
      key
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.get(
            `
            SELECT value

            FROM config

            WHERE key = ?
            `,

            [
              key
            ],

            (
              err,
              row
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                row
                  ? JSON.parse(
                    row.value
                  )
                  : null
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'set-config',

    async (
      event,
      key,
      value
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.run(
            `
            INSERT OR REPLACE INTO config (
              key,
              value
            )

            VALUES (
              ?,
              ?
            )
            `,

            [
              key,

              JSON.stringify(
                value
              )
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                value
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     CLIENTES
     ========================================================================= */

  ipcMain.handle(
    'get-clientes',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT *

            FROM clientes
            `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows.map(
                  row => ({

                    ...row,

                    cars:
                      row.cars

                        ? JSON.parse(
                          row.cars
                        )

                        : []

                  })
                )
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'add-cliente',

    async (
      event,
      cliente
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          const carsJson =
            JSON.stringify(
              cliente.cars ||
              []
            );


          db.run(
            `
            INSERT INTO clientes (
              name,
              phone,
              email,
              cars,
              lastVisit,
              status,
              statusLabel
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
            `,

            [
              cliente.name,
              cliente.phone,
              cliente.email,
              carsJson,
              cliente.lastVisit,
              cliente.status,
              cliente.statusLabel
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve({

                id:
                  this.lastID,

                ...cliente,

                cars:
                  cliente.cars ||
                  []

              });

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'update-cliente',

    async (
      event,
      cliente
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          const carsJson =
            JSON.stringify(
              cliente.cars ||
              []
            );


          db.run(
            `
            UPDATE clientes

            SET
              name = ?,
              phone = ?,
              email = ?,
              cars = ?,
              lastVisit = ?,
              status = ?,
              statusLabel = ?

            WHERE id = ?
            `,

            [
              cliente.name,
              cliente.phone,
              cliente.email,
              carsJson,
              cliente.lastVisit,
              cliente.status,
              cliente.statusLabel,
              cliente.id
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                cliente
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'delete-cliente',

    async (
      event,
      id
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.run(
            `
            DELETE FROM clientes

            WHERE id = ?
            `,

            [
              id
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                true
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     VEÍCULOS
     ========================================================================= */

  ipcMain.handle(
    'get-veiculos',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT *

            FROM veiculos
            `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'add-veiculo',

    async (
      event,
      veiculo
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.run(
            `
            INSERT INTO veiculos (
              plate,
              model,
              brand,
              year,
              color,
              client,
              status,
              lastService
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
            `,

            [
              veiculo.plate,
              veiculo.model,
              veiculo.brand,
              veiculo.year,
              veiculo.color,
              veiculo.client,
              veiculo.status,
              veiculo.lastService
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve({

                id:
                  this.lastID,

                ...veiculo

              });

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'update-veiculo',

    async (
      event,
      veiculo
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.run(
            `
            UPDATE veiculos

            SET
              plate = ?,
              model = ?,
              brand = ?,
              year = ?,
              color = ?,
              client = ?,
              status = ?,
              lastService = ?

            WHERE id = ?
            `,

            [
              veiculo.plate,
              veiculo.model,
              veiculo.brand,
              veiculo.year,
              veiculo.color,
              veiculo.client,
              veiculo.status,
              veiculo.lastService,
              veiculo.id
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                veiculo
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'delete-veiculo',

    async (
      event,
      id
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.run(
            `
            DELETE FROM veiculos

            WHERE id = ?
            `,

            [
              id
            ],

            function (err) {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                true
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     PRODUTOS
     ========================================================================= */

  ipcMain.handle(
    'get-produtos',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT *

            FROM produtos

            ORDER BY name COLLATE NOCASE
            `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     PESQUISAR PRODUTOS
     ========================================================================= */

  ipcMain.handle(
    'search-produtos',

    async (
      event,
      searchTerm
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          const term =
            String(
              searchTerm ||
              ''
            ).trim();


          if (!term) {

            resolve(
              []
            );

            return;

          }


          const contains =
            `%${term}%`;


          const startsWith =
            `${term}%`;


          db.all(
            `
            SELECT *

            FROM produtos

            WHERE
              name LIKE ? COLLATE NOCASE

              OR code LIKE ? COLLATE NOCASE

              OR barcode = ?

              OR brand LIKE ? COLLATE NOCASE

            ORDER BY

              CASE

                WHEN barcode = ?
                  THEN 0

                WHEN code = ? COLLATE NOCASE
                  THEN 1

                WHEN name = ? COLLATE NOCASE
                  THEN 2

                WHEN name LIKE ? COLLATE NOCASE
                  THEN 3

                ELSE 4

              END,

              name COLLATE NOCASE

            LIMIT 20
            `,

            [
              contains,
              contains,
              term,
              contains,

              term,
              term,
              term,
              startsWith
            ],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     PRODUTO POR BARCODE
     ========================================================================= */

  ipcMain.handle(
    'get-produto-by-barcode',

    async (
      event,
      barcode
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          const normalizedBarcode =
            String(
              barcode ||
              ''
            ).trim();


          if (
            !normalizedBarcode
          ) {

            resolve(
              null
            );

            return;

          }


          db.get(
            `
            SELECT *

            FROM produtos

            WHERE barcode = ?

            LIMIT 1
            `,

            [
              normalizedBarcode
            ],

            (
              err,
              row
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                row ||
                null
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     ENTRADA DE ESTOQUE
     ========================================================================= */

  ipcMain.handle(
    'add-stock-entry',

    async (
      event,
      barcode,
      quantity
    ) => {

      const normalizedBarcode =
        String(
          barcode ||
          ''
        ).trim();


      const normalizedQuantity =
        Number(
          quantity
        );


      if (
        !normalizedBarcode
      ) {

        return {

          success:
            false,

          reason:
            'empty-barcode',

          message:
            'Informe ou escaneie um código de barras.'

        };

      }


      if (
        !Number.isInteger(
          normalizedQuantity
        ) ||

        normalizedQuantity <= 0
      ) {

        return {

          success:
            false,

          reason:
            'invalid-quantity',

          message:
            'A quantidade deve ser um número inteiro maior que zero.'

        };

      }


      await dbRunPromise(
        'BEGIN IMMEDIATE TRANSACTION'
      );


      try {

        const product =
          await dbGetPromise(
            `
            SELECT *

            FROM produtos

            WHERE barcode = ?

            LIMIT 1
            `,

            [
              normalizedBarcode
            ]
          );


        if (!product) {

          await dbRunPromise(
            'ROLLBACK'
          );


          return {

            success:
              false,

            reason:
              'not-found',

            message:
              'Nenhum produto encontrado com este código de barras.'

          };

        }


        const previousQuantity =
          Number(
            product.quantity || 0
          );


        const newQuantity =
          previousQuantity +
          normalizedQuantity;


        await dbRunPromise(
          `
          UPDATE produtos

          SET quantity = ?

          WHERE id = ?
          `,

          [
            newQuantity,
            product.id
          ]
        );


        const createdAt =
          new Date()
            .toISOString();


        const movementResult =
          await dbRunPromise(
            `
            INSERT INTO movimentacoes_estoque (
              product_id,
              type,
              quantity,
              previous_quantity,
              new_quantity,
              source,
              reference_id,
              notes,
              created_at
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
            `,

            [
              product.id,

              'entry',

              normalizedQuantity,

              previousQuantity,

              newQuantity,

              'manual-barcode-entry',

              null,

              null,

              createdAt
            ]
          );


        await dbRunPromise(
          'COMMIT'
        );


        return {

          success:
            true,

          product: {

            ...product,

            quantity:
              newQuantity

          },

          movement: {

            id:
              movementResult.lastID,

            productId:
              product.id,

            type:
              'entry',

            quantity:
              normalizedQuantity,

            previousQuantity,

            newQuantity,

            createdAt

          }

        };

      } catch (error) {

        try {

          await dbRunPromise(
            'ROLLBACK'
          );

        } catch { }


        throw error;

      }

    }
  );


  /* =========================================================================
     HISTÓRICO DE ESTOQUE
     ========================================================================= */

  ipcMain.handle(
    'get-stock-movements',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT

              m.id,

              m.product_id AS productId,

              m.type,

              m.quantity,

              m.previous_quantity AS previousQuantity,

              m.new_quantity AS newQuantity,

              m.source,

              m.reference_id AS referenceId,

              m.notes,

              m.created_at AS createdAt,

              p.name AS productName,

              p.code AS productCode,

              p.barcode AS productBarcode,

              p.brand AS productBrand

            FROM movimentacoes_estoque m

            LEFT JOIN produtos p
              ON p.id = m.product_id

            ORDER BY
              m.created_at DESC,
              m.id DESC

            LIMIT 200
            `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows ||
                []
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     ASSOCIAR BARCODE
     ========================================================================= */

  ipcMain.handle(
    'set-produto-barcode',

    async (
      event,
      productId,
      barcode
    ) => {

      const id =
        Number(
          productId
        );


      const normalizedBarcode =
        String(
          barcode ||
          ''
        ).trim();


      if (
        !Number.isInteger(
          id
        ) ||

        id <= 0
      ) {

        return {

          success:
            false,

          reason:
            'invalid-product',

          message:
            'Produto inválido.'

        };

      }


      if (
        !normalizedBarcode
      ) {

        return {

          success:
            false,

          reason:
            'empty-barcode',

          message:
            'O código de barras não pode estar vazio.'

        };

      }


      const existingProduct =
        await dbGetPromise(
          `
          SELECT
            id,
            code,
            barcode,
            name,
            brand

          FROM produtos

          WHERE barcode = ?

          LIMIT 1
          `,

          [
            normalizedBarcode
          ]
        );


      if (
        existingProduct &&

        Number(
          existingProduct.id
        ) !==
        id
      ) {

        return {

          success:
            false,

          reason:
            'duplicate',

          message:
            'Este código de barras já pertence a outro produto.',

          existingProduct

        };

      }


      const targetProduct =
        await dbGetPromise(
          `
          SELECT id

          FROM produtos

          WHERE id = ?

          LIMIT 1
          `,

          [
            id
          ]
        );


      if (
        !targetProduct
      ) {

        return {

          success:
            false,

          reason:
            'not-found',

          message:
            'Produto não encontrado.'

        };

      }


      try {

        await dbRunPromise(
          `
          UPDATE produtos

          SET barcode = ?

          WHERE id = ?
          `,

          [
            normalizedBarcode,
            id
          ]
        );

      } catch (error) {

        if (
          error.code ===
          'SQLITE_CONSTRAINT'
        ) {

          return {

            success:
              false,

            reason:
              'duplicate',

            message:
              'Este código de barras já está cadastrado em outro produto.'

          };

        }


        throw error;

      }


      const updatedProduct =
        await dbGetPromise(
          `
          SELECT *

          FROM produtos

          WHERE id = ?

          LIMIT 1
          `,

          [
            id
          ]
        );


      return {

        success:
          true,

        product:
          updatedProduct

      };

    }
  );


  /* =========================================================================
     ADICIONAR PRODUTO
     ========================================================================= */

  ipcMain.handle(
    'add-produto',

    async (
      event,
      prod
    ) => {

      const barcode =
        String(
          prod.barcode ||
          ''
        ).trim() ||
        null;


      try {

        const result =
          await dbRunPromise(
            `
            INSERT INTO produtos (
              code,
              barcode,
              name,
              brand,
              category,
              quantity,
              minQuantity,
              costPrice,
              sellPrice,
              location
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
            `,

            [
              prod.code,
              barcode,
              prod.name,
              prod.brand,
              prod.category,
              prod.quantity,
              prod.minQuantity,
              prod.costPrice,
              prod.sellPrice,
              prod.location
            ]
          );


        return {

          id:
            result.lastID,

          ...prod,

          barcode

        };

      } catch (error) {

        if (
          error.code ===
          'SQLITE_CONSTRAINT'
        ) {

          throw new Error(
            'Já existe um produto cadastrado com este código de barras.'
          );

        }


        throw error;

      }

    }
  );


  /* =========================================================================
     ATUALIZAR PRODUTO
     ========================================================================= */

  ipcMain.handle(
    'update-produto',

    async (
      event,
      prod
    ) => {

      const barcode =
        String(
          prod.barcode ||
          ''
        ).trim() ||
        null;


      try {

        await dbRunPromise(
          `
          UPDATE produtos

          SET
            code = ?,
            barcode = ?,
            name = ?,
            brand = ?,
            category = ?,
            quantity = ?,
            minQuantity = ?,
            costPrice = ?,
            sellPrice = ?,
            location = ?

          WHERE id = ?
          `,

          [
            prod.code,
            barcode,
            prod.name,
            prod.brand,
            prod.category,
            prod.quantity,
            prod.minQuantity,
            prod.costPrice,
            prod.sellPrice,
            prod.location,
            prod.id
          ]
        );


        return {

          ...prod,

          barcode

        };

      } catch (error) {

        if (
          error.code ===
          'SQLITE_CONSTRAINT'
        ) {

          throw new Error(
            'Já existe um produto cadastrado com este código de barras.'
          );

        }


        throw error;

      }

    }
  );


  ipcMain.handle(
    'delete-produto',

    async (
      event,
      id
    ) => {

      await dbRunPromise(
        `
        DELETE FROM produtos

        WHERE id = ?
        `,

        [
          id
        ]
      );


      return true;

    }
  );


  /* =========================================================================
     SERVIÇOS
     ========================================================================= */

  ipcMain.handle(
    'get-servicos',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT *

            FROM servicos

            ORDER BY name COLLATE NOCASE
            `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'search-servicos',

    async (
      event,
      searchTerm
    ) => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          const term =
            String(
              searchTerm ||
              ''
            ).trim();


          if (!term) {

            resolve(
              []
            );

            return;

          }


          const contains =
            `%${term}%`;


          const startsWith =
            `${term}%`;


          db.all(
            `
            SELECT *

            FROM servicos

            WHERE
              name LIKE ? COLLATE NOCASE

              OR description LIKE ? COLLATE NOCASE

              OR category LIKE ? COLLATE NOCASE

            ORDER BY

              CASE

                WHEN name = ? COLLATE NOCASE
                  THEN 0

                WHEN name LIKE ? COLLATE NOCASE
                  THEN 1

                ELSE 2

              END,

              name COLLATE NOCASE

            LIMIT 20
            `,

            [
              contains,
              contains,
              contains,
              term,
              startsWith
            ],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'add-servico',

    async (
      event,
      svc
    ) => {

      const result =
        await dbRunPromise(
          `
          INSERT INTO servicos (
            name,
            description,
            category,
            time,
            price
          )

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
          )
          `,

          [
            svc.name,
            svc.description,
            svc.category,
            svc.time,
            svc.price
          ]
        );


      return {

        id:
          result.lastID,

        ...svc

      };

    }
  );


  ipcMain.handle(
    'update-servico',

    async (
      event,
      svc
    ) => {

      await dbRunPromise(
        `
        UPDATE servicos

        SET
          name = ?,
          description = ?,
          category = ?,
          time = ?,
          price = ?

        WHERE id = ?
        `,

        [
          svc.name,
          svc.description,
          svc.category,
          svc.time,
          svc.price,
          svc.id
        ]
      );


      return svc;

    }
  );


  ipcMain.handle(
    'delete-servico',

    async (
      event,
      id
    ) => {

      await dbRunPromise(
        `
        DELETE FROM servicos

        WHERE id = ?
        `,

        [
          id
        ]
      );


      return true;

    }
  );


  /* =========================================================================
   ORÇAMENTOS
   ========================================================================= */

  ipcMain.handle(
    'get-orcamentos',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
          SELECT *

          FROM orcamentos

          WHERE COALESCE(archived, 0) = 0

          ORDER BY id DESC
          `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows.map(
                  row => ({

                    ...row,

                    items:
                      row.items

                        ? JSON.parse(
                          row.items
                        )

                        : []

                  })
                )
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'add-orcamento',

    async (
      event,
      budget
    ) => {

      const itemsJson =
        JSON.stringify(
          budget.items ||
          []
        );


      const result =
        await dbRunPromise(
          `
        INSERT INTO orcamentos (
          client,
          vehicle,
          date,
          validUntil,
          status,
          total,
          items,
          notes,
          archived,
          archivedAt
        )

        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
        `,

          [
            budget.client,
            budget.vehicle,
            budget.date,
            budget.validUntil,
            budget.status,
            budget.total,
            itemsJson,
            budget.notes,
            0,
            null
          ]
        );


      return {

        id:
          result.lastID,

        ...budget,

        archived:
          0,

        archivedAt:
          null

      };

    }
  );


  ipcMain.handle(
    'update-orcamento',

    async (
      event,
      budget
    ) => {

      const itemsJson =
        JSON.stringify(
          budget.items ||
          []
        );


      await dbRunPromise(
        `
      UPDATE orcamentos

      SET
        client = ?,
        vehicle = ?,
        date = ?,
        validUntil = ?,
        status = ?,
        total = ?,
        items = ?,
        notes = ?

      WHERE id = ?
      `,

        [
          budget.client,
          budget.vehicle,
          budget.date,
          budget.validUntil,
          budget.status,
          budget.total,
          itemsJson,
          budget.notes,
          budget.id
        ]
      );


      return budget;

    }
  );


  ipcMain.handle(
    'delete-orcamento',

    async (
      event,
      id
    ) => {

      await dbRunPromise(
        `
      DELETE FROM orcamentos

      WHERE id = ?
      `,

        [
          id
        ]
      );


      return true;

    }
  );


  /* =========================================================================
     ARQUIVAMENTO DE ORÇAMENTOS
  
     Pendente continua ativo.
  
     Aprovado e rejeitado são considerados concluídos
     para o arquivamento em lote.
     ========================================================================= */

  ipcMain.handle(
    'archive-completed-orcamentos',

    async () => {

      const archivedAt =
        new Date()
          .toISOString();


      const result =
        await dbRunPromise(
          `
        UPDATE orcamentos

        SET
          archived = 1,
          archivedAt = ?

        WHERE COALESCE(archived, 0) = 0

          AND status IN (
            'approved',
            'rejected'
          )
        `,

          [
            archivedAt
          ]
        );


      return {

        success:
          true,

        count:
          Number(
            result.changes ||
            0
          ),

        archivedAt

      };

    }
  );


  ipcMain.handle(
    'get-archived-orcamentos-count',

    async () => {

      const row =
        await dbGetPromise(
          `
        SELECT
          COUNT(id) AS total

        FROM orcamentos

        WHERE COALESCE(archived, 0) = 1
        `
        );


      return Number(
        row?.total ||
        0
      );

    }
  );


  ipcMain.handle(
    'get-archived-orcamentos',

    async (
      event,
      searchTerm = ''
    ) => {

      const term =
        String(
          searchTerm ||
          ''
        ).trim();


      const contains =
        `%${term}%`;


      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
          SELECT *

          FROM orcamentos

          WHERE COALESCE(archived, 0) = 1

            AND (
              ? = ''

              OR client LIKE ? COLLATE NOCASE

              OR vehicle LIKE ? COLLATE NOCASE

              OR CAST(id AS TEXT) LIKE ?

              OR date LIKE ?

              OR validUntil LIKE ?

              OR status LIKE ? COLLATE NOCASE
            )

          ORDER BY
            archivedAt DESC,
            id DESC

          LIMIT 500
          `,

            [
              term,
              contains,
              contains,
              contains,
              contains,
              contains,
              contains
            ],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                (
                  rows ||
                  []
                ).map(
                  row => ({

                    ...row,

                    archived:
                      Number(
                        row.archived ||
                        0
                      ),

                    items:
                      row.items

                        ? JSON.parse(
                          row.items
                        )

                        : []

                  })
                )
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'unarchive-orcamento',

    async (
      event,
      id
    ) => {

      const budgetId =
        Number(
          id
        );


      if (
        !Number.isInteger(
          budgetId
        ) ||

        budgetId <= 0
      ) {

        throw new Error(
          'Orçamento inválido.'
        );

      }


      const result =
        await dbRunPromise(
          `
        UPDATE orcamentos

        SET
          archived = 0,
          archivedAt = NULL

        WHERE id = ?
          AND COALESCE(archived, 0) = 1
        `,

          [
            budgetId
          ]
        );


      if (
        Number(
          result.changes ||
          0
        ) === 0
      ) {

        throw new Error(
          `Orçamento #${budgetId} não foi encontrado nos arquivados.`
        );

      }


      return {

        success:
          true,

        id:
          budgetId

      };

    }
  );


  /* =========================================================================
     ORDENS DE SERVIÇO
     ========================================================================= */

  ipcMain.handle(
    'get-os',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
          SELECT

            os.*,

            COALESCE(
              (
                SELECT SUM(
                  p.applied_amount
                )

                FROM pagamentos p

                WHERE p.os_id = os.id
              ),
              0
            ) AS paidAmount

          FROM ordens_servico os

          WHERE COALESCE(os.archived, 0) = 0

          ORDER BY os.id DESC
          `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                rows.map(
                  row => {

                    const totalCents =
                      Math.max(
                        0,

                        moneyToCents(
                          row.total || 0
                        ) || 0
                      );


                    const paidCents =
                      Math.max(
                        0,

                        moneyToCents(
                          row.paidAmount || 0
                        ) || 0
                      );


                    const remainingCents =
                      Math.max(
                        0,

                        totalCents -
                        paidCents
                      );


                    return {

                      ...row,

                      archived:
                        Number(
                          row.archived ||
                          0
                        ),

                      stockProcessed:
                        Number(
                          row.stockProcessed ||
                          0
                        ),

                      paidAmount:
                        centsToMoney(
                          paidCents
                        ),

                      remainingAmount:
                        centsToMoney(
                          remainingCents
                        ),

                      paymentStatus:
                        getPaymentStatusFromCents(
                          totalCents,
                          paidCents
                        ),

                      items:
                        row.items

                          ? JSON.parse(
                            row.items
                          )

                          : []

                    };

                  }
                )
              );

            }
          );

        }
      );

    }
  );

  /* =========================================================================
   ARQUIVAMENTO DE ORDENS DE SERVIÇO

   Arquivar NÃO desfaz:

   - estoque
   - pagamentos
   - dívida
   - histórico

   É apenas organização da listagem.
   ========================================================================= */

  ipcMain.handle(
    'archive-completed-os',

    async () => {

      const archivedAt =
        new Date()
          .toISOString();


      const result =
        await dbRunPromise(
          `
        UPDATE ordens_servico

        SET
          archived = 1,
          archivedAt = ?

WHERE COALESCE(archived, 0) = 0

  AND status = 'completed'

  AND paymentStatus = 'paid'
        `,

          [
            archivedAt
          ]
        );


      return {

        success:
          true,

        count:
          Number(
            result.changes ||
            0
          ),

        archivedAt

      };

    }
  );


  ipcMain.handle(
    'get-archived-os-count',

    async () => {

      const row =
        await dbGetPromise(
          `
        SELECT
          COUNT(id) AS total

        FROM ordens_servico

        WHERE COALESCE(archived, 0) = 1
        `
        );


      return Number(
        row?.total ||
        0
      );

    }
  );


  ipcMain.handle(
    'get-archived-os',

    async (
      event,
      searchTerm = ''
    ) => {

      const term =
        String(
          searchTerm ||
          ''
        ).trim();


      const contains =
        `%${term}%`;


      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
          SELECT

            os.*,

            COALESCE(
              (
                SELECT SUM(
                  p.applied_amount
                )

                FROM pagamentos p

                WHERE p.os_id = os.id
              ),
              0
            ) AS paidAmount

          FROM ordens_servico os

          WHERE COALESCE(os.archived, 0) = 1

            AND (
              ? = ''

              OR os.client LIKE ? COLLATE NOCASE

              OR os.vehicle LIKE ? COLLATE NOCASE

              OR CAST(os.id AS TEXT) LIKE ?

              OR os.date LIKE ?

              OR os.status LIKE ? COLLATE NOCASE
            )

          ORDER BY
            os.archivedAt DESC,
            os.id DESC

          LIMIT 500
          `,

            [
              term,
              contains,
              contains,
              contains,
              contains,
              contains
            ],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                (
                  rows ||
                  []
                ).map(
                  row => {

                    const totalCents =
                      Math.max(
                        0,

                        moneyToCents(
                          row.total ||
                          0
                        ) || 0
                      );


                    const paidCents =
                      Math.max(
                        0,

                        moneyToCents(
                          row.paidAmount ||
                          0
                        ) || 0
                      );


                    const remainingCents =
                      Math.max(
                        0,

                        totalCents -
                        paidCents
                      );


                    return {

                      ...row,

                      archived:
                        Number(
                          row.archived ||
                          0
                        ),

                      stockProcessed:
                        Number(
                          row.stockProcessed ||
                          0
                        ),

                      paidAmount:
                        centsToMoney(
                          paidCents
                        ),

                      remainingAmount:
                        centsToMoney(
                          remainingCents
                        ),

                      paymentStatus:
                        getPaymentStatusFromCents(
                          totalCents,
                          paidCents
                        ),

                      items:
                        row.items

                          ? JSON.parse(
                            row.items
                          )

                          : []

                    };

                  }
                )
              );

            }
          );

        }
      );

    }
  );


  ipcMain.handle(
    'unarchive-os',

    async (
      event,
      id
    ) => {

      const orderId =
        Number(
          id
        );


      if (
        !Number.isInteger(
          orderId
        ) ||

        orderId <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      const result =
        await dbRunPromise(
          `
        UPDATE ordens_servico

        SET
          archived = 0,
          archivedAt = NULL

        WHERE id = ?
          AND COALESCE(archived, 0) = 1
        `,

          [
            orderId
          ]
        );


      if (
        Number(
          result.changes ||
          0
        ) === 0
      ) {

        throw new Error(
          `Ordem de Serviço #${orderId} não foi encontrada nos arquivados.`
        );

      }


      return {

        success:
          true,

        id:
          orderId

      };

    }
  );

  /* =========================================================================
     ADICIONAR OS
     ========================================================================= */

  ipcMain.handle(
    'add-os',

    async (
      event,
      order
    ) => {

      const items =
        Array.isArray(
          order.items
        )

          ? order.items

          : [];


      const itemsJson =
        JSON.stringify(
          items
        );


      const totalCents =
        moneyToCents(
          order.total || 0
        );


      if (
        !Number.isInteger(
          totalCents
        ) ||

        totalCents < 0
      ) {

        throw new Error(
          'O total da Ordem de Serviço é inválido.'
        );

      }


      const total =
        centsToMoney(
          totalCents
        );


      await dbRunPromise(
        'BEGIN IMMEDIATE TRANSACTION'
      );


      try {

        const insertResult =
          await dbRunPromise(
            `
            INSERT INTO ordens_servico (
  client,
  vehicle,
  status,
  date,
  items,
  notes,
  total,
  paymentStatus,
  stockProcessed,
  archived,
  archivedAt
)

VALUES (
  ?,
  ?,
  ?,
  ?,
  ?,
  ?,
  ?,
  ?,
  ?,
  ?,
  ?
)
            `,

            [
              order.client,
              order.vehicle,
              order.status,
              order.date,
              itemsJson,
              order.notes || '',
              total,
              'pending',
              0,
              0,
              null
            ]
          );


        const orderId =
          insertResult.lastID;


        let stockProcessed =
          0;


        if (
          order.status ===
          'completed'
        ) {

          await processOSStockExit(
            orderId,
            items
          );


          stockProcessed =
            1;

        }


        const paymentSummary =
          await syncOSPaymentStatus(
            orderId,
            total
          );


        await dbRunPromise(
          'COMMIT'
        );


        return {

          ...order,

          id:
            orderId,

          items,

          total,

          stockProcessed,

          ...paymentSummary

        };

      } catch (error) {

        try {

          await dbRunPromise(
            'ROLLBACK'
          );

        } catch (
        rollbackError
        ) {

          console.error(
            'Erro ao desfazer criação da OS:',
            rollbackError
          );

        }


        console.error(
          'Erro ao adicionar OS:',
          error
        );


        throw error;

      }

    }
  );

  /* =========================================================================
   FINALIZAR ORDEM DE SERVIÇO

   Finalização rápida pela listagem.

   Ao finalizar:
   - muda o status para completed
   - processa a saída do estoque
   - mantém pagamentos normalmente
   - a OS passa a ficar bloqueada para edição
   ========================================================================= */

  ipcMain.handle(
    'finalize-os',

    async (
      event,
      id
    ) => {

      const orderId =
        Number(
          id
        );


      if (
        !Number.isInteger(
          orderId
        ) ||

        orderId <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      await dbRunPromise(
        'BEGIN IMMEDIATE TRANSACTION'
      );


      try {

        const currentOrder =
          await dbGetPromise(
            `
          SELECT
            id,
            status,
            items,
            total,
            stockProcessed

          FROM ordens_servico

          WHERE id = ?

          LIMIT 1
          `,

            [
              orderId
            ]
          );


        if (
          !currentOrder
        ) {

          throw new Error(
            `Ordem de Serviço #${orderId} não encontrada.`
          );

        }


        /* ------------------------------------------------------------------
           JÁ ESTÁ FINALIZADA
           ------------------------------------------------------------------ */

        if (
          currentOrder.status ===
          'completed'
        ) {

          throw new Error(
            'Esta Ordem de Serviço já está finalizada.'
          );

        }


        /* ------------------------------------------------------------------
           CANCELADA NÃO PODE SER FINALIZADA
           ------------------------------------------------------------------ */

        if (
          currentOrder.status ===
          'canceled'
        ) {

          throw new Error(
            'Uma Ordem de Serviço cancelada não pode ser finalizada.'
          );

        }


        let items =
          [];


        try {

          items =
            currentOrder.items

              ? JSON.parse(
                currentOrder.items
              )

              : [];

        } catch {

          items =
            [];

        }


        const wasStockProcessed =
          Number(
            currentOrder.stockProcessed ||
            0
          ) === 1;


        /* ------------------------------------------------------------------
           PROCESSA ESTOQUE
  
           processOSStockExit já valida estoque insuficiente e executa
           tudo dentro da mesma transação.
           ------------------------------------------------------------------ */

        if (
          !wasStockProcessed
        ) {

          await processOSStockExit(
            orderId,
            items
          );

        }


        /* ------------------------------------------------------------------
           FINALIZA
           ------------------------------------------------------------------ */

        await dbRunPromise(
          `
        UPDATE ordens_servico

        SET status = 'completed'

        WHERE id = ?
        `,

          [
            orderId
          ]
        );


        /*
          Pagamento não precisa estar quitado para finalizar.
  
          A oficina terminou o serviço, mas o cliente pode continuar
          com saldo em aberto.
  
          Assim:
          serviço finalizado != serviço pago
        */

        const paymentSummary =
          await syncOSPaymentStatus(
            orderId,
            currentOrder.total
          );


        await dbRunPromise(
          'COMMIT'
        );


        return {

          success:
            true,

          id:
            orderId,

          status:
            'completed',

          stockProcessed:
            1,

          ...paymentSummary

        };

      } catch (error) {

        try {

          await dbRunPromise(
            'ROLLBACK'
          );

        } catch (
        rollbackError
        ) {

          console.error(
            'Erro ao desfazer finalização da OS:',
            rollbackError
          );

        }


        console.error(
          'Erro ao finalizar Ordem de Serviço:',
          error
        );


        throw error;

      }

    }
  );


  /* =========================================================================
     ATUALIZAR OS
     ========================================================================= */

  ipcMain.handle(
    'update-os',

    async (
      event,
      order
    ) => {

      const orderId =
        Number(
          order.id
        );


      if (
        !Number.isInteger(
          orderId
        ) ||

        orderId <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      const items =
        Array.isArray(
          order.items
        )

          ? order.items

          : [];


      const itemsJson =
        JSON.stringify(
          items
        );


      const newTotalCents =
        moneyToCents(
          order.total || 0
        );


      if (
        !Number.isInteger(
          newTotalCents
        ) ||

        newTotalCents < 0
      ) {

        throw new Error(
          'O total da Ordem de Serviço é inválido.'
        );

      }


      const newTotal =
        centsToMoney(
          newTotalCents
        );


      await dbRunPromise(
        'BEGIN IMMEDIATE TRANSACTION'
      );


      try {

        const currentOrder =
          await dbGetPromise(
            `
            SELECT
              id,
              client,
              status,
              items,
              total,
              stockProcessed

            FROM ordens_servico

            WHERE id = ?

            LIMIT 1
            `,

            [
              orderId
            ]
          );


        if (
          !currentOrder
        ) {

          throw new Error(
            `Ordem de Serviço #${orderId} não encontrada.`
          );

        }

        /* ------------------------------------------------------------------
   OS FINALIZADA NÃO PODE MAIS SER EDITADA
   ------------------------------------------------------------------ */

        if (
          currentOrder.status ===
          'completed'
        ) {

          throw new Error(
            'Esta Ordem de Serviço já foi finalizada e não pode mais ser editada.'
          );

        }


        const paymentSummaryBefore =
          await getOSPaymentSummary(
            orderId,
            currentOrder.total
          );


        const paidCents =
          moneyToCents(
            paymentSummaryBefore
              .paidAmount
          );


        /* ------------------------------------------------------------------
           PROTEÇÕES FINANCEIRAS
           ------------------------------------------------------------------ */

        if (
          paidCents > 0 &&

          String(
            currentOrder.client || ''
          ) !==

          String(
            order.client || ''
          )
        ) {

          throw new Error(
            'O cliente desta OS não pode ser alterado porque já existem pagamentos registrados.'
          );

        }


        /*
          Exemplo:

          OS R$ 500
          já pago R$ 300

          não pode editar a OS para R$ 200.
        */

        if (
          newTotalCents <
          paidCents
        ) {

          throw new Error(
            `O total da OS não pode ser menor que o valor já pago. Já pago: R$ ${paymentSummaryBefore.paidAmount.toFixed(2)}.`
          );

        }


        if (
          paidCents > 0 &&

          order.status ===
          'canceled'
        ) {

          throw new Error(
            'Esta OS possui pagamentos registrados e não pode ser cancelada sem estornar os pagamentos primeiro.'
          );

        }


        const wasStockProcessed =
          Number(
            currentOrder.stockProcessed ||
            0
          ) === 1;


        /* ------------------------------------------------------------------
           PROTEÇÕES DE ESTOQUE
           ------------------------------------------------------------------ */

        if (
          wasStockProcessed
        ) {

          if (
            order.status !==
            'completed'
          ) {

            throw new Error(
              'Esta OS já teve o estoque processado e não pode sair do status Finalizado. Use um estorno de estoque para reabrir esta OS.'
            );

          }


          let previousItems =
            [];


          try {

            previousItems =
              JSON.parse(
                currentOrder.items ||
                '[]'
              );

          } catch {

            previousItems =
              [];

          }


          const previousProductSignature =
            getOSProductSignature(
              previousItems
            );


          const newProductSignature =
            getOSProductSignature(
              items
            );


          if (
            previousProductSignature !==
            newProductSignature
          ) {

            throw new Error(
              'Os produtos desta OS não podem ser alterados porque o estoque já foi baixado. Para corrigir as peças, será necessário estornar a OS primeiro.'
            );

          }

        }


        const nextPaymentStatus =
          getPaymentStatusFromCents(
            newTotalCents,
            paidCents
          );


        await dbRunPromise(
          `
          UPDATE ordens_servico

          SET
            client = ?,
            vehicle = ?,
            status = ?,
            date = ?,
            items = ?,
            notes = ?,
            total = ?,
            paymentStatus = ?

          WHERE id = ?
          `,

          [
            order.client,
            order.vehicle,
            order.status,
            order.date,
            itemsJson,
            order.notes || '',
            newTotal,
            nextPaymentStatus,
            orderId
          ]
        );


        let stockProcessed =
          wasStockProcessed
            ? 1
            : 0;


        if (
          order.status ===
          'completed' &&

          !wasStockProcessed
        ) {

          await processOSStockExit(
            orderId,
            items
          );


          stockProcessed =
            1;

        }


        const paymentSummary =
          await syncOSPaymentStatus(
            orderId,
            newTotal
          );


        await dbRunPromise(
          'COMMIT'
        );


        return {

          ...order,

          id:
            orderId,

          items,

          total:
            newTotal,

          stockProcessed,

          ...paymentSummary

        };

      } catch (error) {

        try {

          await dbRunPromise(
            'ROLLBACK'
          );

        } catch (
        rollbackError
        ) {

          console.error(
            'Erro ao desfazer atualização da OS:',
            rollbackError
          );

        }


        console.error(
          'Erro ao atualizar OS:',
          error
        );


        throw error;

      }

    }
  );


  /* =========================================================================
     EXCLUIR OS
     ========================================================================= */

  ipcMain.handle(
    'delete-os',

    async (
      event,
      id
    ) => {

      const orderId =
        Number(
          id
        );


      if (
        !Number.isInteger(
          orderId
        ) ||

        orderId <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      const order =
        await dbGetPromise(
          `
          SELECT
            id,
            stockProcessed

          FROM ordens_servico

          WHERE id = ?

          LIMIT 1
          `,

          [
            orderId
          ]
        );


      if (
        !order
      ) {

        throw new Error(
          `Ordem de Serviço #${orderId} não encontrada.`
        );

      }


      if (
        Number(
          order.stockProcessed ||
          0
        ) === 1
      ) {

        throw new Error(
          'Esta OS não pode ser excluída porque já movimentou o estoque. Será necessário estornar a OS antes da exclusão.'
        );

      }


      const paymentCount =
        await dbGetPromise(
          `
          SELECT
            COUNT(id) AS total

          FROM pagamentos

          WHERE os_id = ?
          `,

          [
            orderId
          ]
        );


      if (
        Number(
          paymentCount?.total ||
          0
        ) > 0
      ) {

        throw new Error(
          'Esta OS não pode ser excluída porque possui pagamentos registrados. Estorne os pagamentos antes da exclusão.'
        );

      }


      await dbRunPromise(
        `
        DELETE FROM ordens_servico

        WHERE id = ?
        `,

        [
          orderId
        ]
      );


      return {

        success:
          true

      };

    }
  );


  /* =========================================================================
     HISTÓRICO DE PAGAMENTOS DE UMA OS
     ========================================================================= */

  ipcMain.handle(
    'get-os-payments',

    async (
      event,
      orderId
    ) => {

      const id =
        Number(
          orderId
        );


      if (
        !Number.isInteger(
          id
        ) ||

        id <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT

              id,

              os_id AS orderId,

              method,

              applied_amount AS appliedAmount,

              received_amount AS receivedAmount,

              change_amount AS changeAmount,

              notes,

              source,

              created_at AS createdAt

            FROM pagamentos

            WHERE os_id = ?

            ORDER BY
              created_at DESC,
              id DESC
            `,

            [
              id
            ],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              resolve(
                (
                  rows ||
                  []
                ).map(
                  payment => ({

                    ...payment,

                    appliedAmount:
                      centsToMoney(
                        moneyToCents(
                          payment.appliedAmount ||
                          0
                        ) || 0
                      ),

                    receivedAmount:
                      centsToMoney(
                        moneyToCents(
                          payment.receivedAmount ||
                          0
                        ) || 0
                      ),

                    changeAmount:
                      centsToMoney(
                        moneyToCents(
                          payment.changeAmount ||
                          0
                        ) || 0
                      )

                  })
                )
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
     RESUMO DE PAGAMENTO
     ========================================================================= */

  ipcMain.handle(
    'get-os-payment-summary',

    async (
      event,
      orderId
    ) => {

      const id =
        Number(
          orderId
        );


      if (
        !Number.isInteger(
          id
        ) ||

        id <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      return getOSPaymentSummary(
        id
      );

    }
  );


  /* =========================================================================
     REGISTRAR PAGAMENTO
     ========================================================================= */

  ipcMain.handle(
    'add-os-payment',

    async (
      event,
      orderId,
      payment
    ) => {

      const id =
        Number(
          orderId
        );


      if (
        !Number.isInteger(
          id
        ) ||

        id <= 0
      ) {

        throw new Error(
          'Ordem de Serviço inválida.'
        );

      }


      /*
        Métodos aceitos internamente.

        Depois no frontend mostramos os nomes bonitos:
        Dinheiro, PIX, Cartão de Débito etc.
      */

      const allowedMethods =
        new Set([

          'cash',

          'pix',

          'debit-card',

          'credit-card',

          'transfer',

          'other'

        ]);


      const method =
        String(
          payment?.method ||
          ''
        ).trim();


      if (
        !allowedMethods.has(
          method
        )
      ) {

        throw new Error(
          'Selecione uma forma de pagamento válida.'
        );

      }


      const receivedCents =
        moneyToCents(
          payment?.receivedAmount ??
          payment?.amount ??
          0
        );


      if (
        !Number.isInteger(
          receivedCents
        ) ||

        receivedCents <= 0
      ) {

        throw new Error(
          'Informe um valor recebido maior que zero.'
        );

      }


      await dbRunPromise(
        'BEGIN IMMEDIATE TRANSACTION'
      );


      try {

        const order =
          await dbGetPromise(
            `
            SELECT
              id,
              client,
              total,
              status

            FROM ordens_servico

            WHERE id = ?

            LIMIT 1
            `,

            [
              id
            ]
          );


        if (
          !order
        ) {

          throw new Error(
            `Ordem de Serviço #${id} não encontrada.`
          );

        }


        if (
          order.status ===
          'canceled'
        ) {

          throw new Error(
            'Não é possível registrar pagamento em uma OS cancelada.'
          );

        }


        const summaryBefore =
          await getOSPaymentSummary(
            id,
            order.total
          );


        const remainingCents =
          moneyToCents(
            summaryBefore
              .remainingAmount
          );


        if (
          remainingCents <= 0
        ) {

          throw new Error(
            'Esta Ordem de Serviço já está totalmente paga.'
          );

        }


        let appliedCents =
          receivedCents;


        let changeCents =
          0;


        /* ------------------------------------------------------------------
           DINHEIRO

           Se a dívida é R$ 150 e recebe R$ 200:

           recebido = 200
           aplicado = 150
           troco = 50
           ------------------------------------------------------------------ */

        if (
          method ===
          'cash'
        ) {

          appliedCents =
            Math.min(
              receivedCents,
              remainingCents
            );


          changeCents =
            Math.max(
              0,

              receivedCents -
              remainingCents
            );

        }

        /*
          PIX, cartão e transferência não devem passar
          do saldo pendente.

          Não queremos um PIX de R$ 200 numa conta de R$ 150
          gerando "troco PIX".
        */

        else if (
          receivedCents >
          remainingCents
        ) {

          throw new Error(
            `O valor informado é maior que o saldo pendente de R$ ${summaryBefore.remainingAmount.toFixed(2)}. Para PIX, cartão e transferência, informe no máximo o saldo da OS.`
          );

        }


        const createdAt =
          new Date()
            .toISOString();


        const notes =
          String(
            payment?.notes ||
            ''
          ).trim();


        const insertResult =
          await dbRunPromise(
            `
            INSERT INTO pagamentos (
              os_id,
              method,
              applied_amount,
              received_amount,
              change_amount,
              notes,
              source,
              created_at
            )

            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
            `,

            [
              id,

              method,

              centsToMoney(
                appliedCents
              ),

              centsToMoney(
                receivedCents
              ),

              centsToMoney(
                changeCents
              ),

              notes ||
              null,

              'manual',

              createdAt
            ]
          );


        const summary =
          await syncOSPaymentStatus(
            id,
            order.total
          );


        await dbRunPromise(
          'COMMIT'
        );


        return {

          success:
            true,

          payment: {

            id:
              insertResult.lastID,

            orderId:
              id,

            method,

            appliedAmount:
              centsToMoney(
                appliedCents
              ),

            receivedAmount:
              centsToMoney(
                receivedCents
              ),

            changeAmount:
              centsToMoney(
                changeCents
              ),

            notes:
              notes ||
              null,

            source:
              'manual',

            createdAt

          },

          summary

        };

      } catch (error) {

        try {

          await dbRunPromise(
            'ROLLBACK'
          );

        } catch (
        rollbackError
        ) {

          console.error(
            'Erro ao desfazer pagamento:',
            rollbackError
          );

        }


        console.error(
          'Erro ao registrar pagamento:',
          error
        );


        throw error;

      }

    }
  );


  /* =========================================================================
     CLIENTES DEVEDORES

     Já deixamos o backend pronto para futuramente criar a tela
     "Contas a Receber".
     ========================================================================= */

  ipcMain.handle(
    'get-debtors',

    async () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          db.all(
            `
            SELECT

              os.id AS orderId,

              os.client,

              os.vehicle,

              os.date,

              os.total,

              os.status,

              COALESCE(
                SUM(
                  p.applied_amount
                ),
                0
              ) AS paidAmount

            FROM ordens_servico os

            LEFT JOIN pagamentos p
              ON p.os_id = os.id

            WHERE
              os.status <> 'canceled'

            GROUP BY
              os.id,
              os.client,
              os.vehicle,
              os.date,
              os.total,
              os.status

            ORDER BY
              os.client COLLATE NOCASE,
              os.date,
              os.id
            `,

            [],

            (
              err,
              rows
            ) => {

              if (err) {

                reject(
                  err
                );

                return;

              }


              const debts =
                (
                  rows ||
                  []
                )
                  .map(
                    row => {

                      const totalCents =
                        Math.max(
                          0,

                          moneyToCents(
                            row.total ||
                            0
                          ) || 0
                        );


                      const paidCents =
                        Math.max(
                          0,

                          moneyToCents(
                            row.paidAmount ||
                            0
                          ) || 0
                        );


                      const remainingCents =
                        Math.max(
                          0,

                          totalCents -
                          paidCents
                        );


                      return {

                        orderId:
                          Number(
                            row.orderId
                          ),

                        client:
                          row.client,

                        vehicle:
                          row.vehicle,

                        date:
                          row.date,

                        total:
                          centsToMoney(
                            totalCents
                          ),

                        paidAmount:
                          centsToMoney(
                            paidCents
                          ),

                        remainingAmount:
                          centsToMoney(
                            remainingCents
                          ),

                        paymentStatus:
                          getPaymentStatusFromCents(
                            totalCents,
                            paidCents
                          )

                      };

                    }
                  )
                  .filter(
                    row =>
                      row.remainingAmount >
                      0
                  );


              resolve(
                debts
              );

            }
          );

        }
      );

    }
  );


  /* =========================================================================
   ATUALIZAÇÕES DO SISTEMA
   ========================================================================= */

  ipcMain.handle(
    'get-app-version',

    async () => {

      return {
        version:
          app.getVersion()
      };

    }
  );


  ipcMain.handle(
    'check-for-updates',

    async () => {

      if (
        !app.isPackaged
      ) {

        return {

          success:
            false,

          development:
            true,

          version:
            app.getVersion(),

          message:
            'A verificação de atualizações funciona no aplicativo instalado.'

        };

      }


      try {

        await autoUpdater
          .checkForUpdates();


        return {

          success:
            true,

          version:
            app.getVersion()

        };

      } catch (
      error
      ) {

        console.error(
          'Erro ao verificar atualização:',
          error
        );


        return {

          success:
            false,

          version:
            app.getVersion(),

          error:
            error?.message ||
            'Não foi possível verificar atualizações.'

        };

      }

    }
  );


  ipcMain.handle(
    'download-update',

    async () => {

      if (
        !app.isPackaged
      ) {

        return {

          success:
            false,

          development:
            true,

          message:
            'O download de atualizações funciona no aplicativo instalado.'

        };

      }


      try {

        await autoUpdater
          .downloadUpdate();


        return {
          success:
            true
        };

      } catch (
      error
      ) {

        console.error(
          'Erro ao baixar atualização:',
          error
        );


        return {

          success:
            false,

          error:
            error?.message ||
            'Não foi possível baixar a atualização.'

        };

      }

    }
  );


  ipcMain.handle(
    'install-update',

    async () => {

      if (
        !updateDownloaded
      ) {

        return {

          success:
            false,

          error:
            'Nenhuma atualização está pronta para instalar.'

        };

      }


      /*
        A instalação só deve ser chamada depois
        do evento update-downloaded.
      */
      setTimeout(
        () => {

          autoUpdater
            .quitAndInstall();

        },

        500
      );


      return {
        success:
          true
      };

    }
  );


  /* =========================================================================
     BACKUP
     ========================================================================= */

  ipcMain.handle(
    'backup-database',

    async () => {

      const dbPath =
        path.join(
          app.getPath(
            'userData'
          ),

          'oficina.db'
        );


      const {
        filePath
      } =
        await dialog.showSaveDialog({

          title:
            'Exportar Backup do Banco de Dados',

          defaultPath:
            path.join(

              app.getPath(
                'downloads'
              ),

              `backup_oficina_${new Date()
                .toISOString()
                .split('T')[0]
              }.db`

            ),

          filters: [

            {

              name:
                'SQLite Database',

              extensions:
                [
                  'db'
                ]

            }

          ]

        });


      if (
        !filePath
      ) {

        return {

          success:
            false,

          error:
            'Operação cancelada'

        };

      }


      try {

        fs.copyFileSync(
          dbPath,
          filePath
        );


        return {

          success:
            true,

          path:
            filePath

        };

      } catch (error) {

        console.error(
          'Erro ao copiar arquivo:',
          error
        );


        return {

          success:
            false,

          error:
            error.message

        };

      }

    }
  );

  /* =========================================================================
   RESTAURAR BACKUP DO BANCO DE DADOS
   ========================================================================= */

  ipcMain.handle(
    'restore-database',

    async () => {

      const dbPath =
        path.join(
          app.getPath(
            'userData'
          ),

          'oficina.db'
        );


      /* ----------------------------------------------------------------------
         SELECIONAR O ARQUIVO
         ---------------------------------------------------------------------- */

      const result =
        await dialog.showOpenDialog({

          title:
            'Selecionar Backup do Sistema',

          properties: [
            'openFile'
          ],

          filters: [

            {
              name:
                'Backup SQLite',

              extensions: [
                'db'
              ]
            }

          ]

        });


      if (
        result.canceled ||
        !result.filePaths ||
        result.filePaths.length === 0
      ) {

        return {

          success:
            false,

          canceled:
            true

        };

      }


      const backupPath =
        result.filePaths[0];


      /* ----------------------------------------------------------------------
         NÃO PERMITE SELECIONAR O PRÓPRIO BANCO EM USO
         ---------------------------------------------------------------------- */

      if (
        path.resolve(
          backupPath
        ) ===
        path.resolve(
          dbPath
        )
      ) {

        return {

          success:
            false,

          error:
            'O arquivo selecionado já é o banco de dados atual.'

        };

      }


      /* ----------------------------------------------------------------------
         VALIDAR O BACKUP ANTES DE MEXER NO BANCO ATUAL
         ---------------------------------------------------------------------- */

      try {

        await new Promise(
          (
            resolve,
            reject
          ) => {

            const testDb =
              new sqlite3.Database(

                backupPath,

                sqlite3.OPEN_READONLY,

                (openError) => {

                  if (
                    openError
                  ) {

                    reject(
                      new Error(
                        'O arquivo selecionado não pôde ser aberto como banco SQLite.'
                      )
                    );

                    return;

                  }


                  testDb.get(

                    'PRAGMA integrity_check',

                    (
                      integrityError,
                      integrityRow
                    ) => {

                      if (
                        integrityError
                      ) {

                        testDb.close();

                        reject(
                          new Error(
                            'Não foi possível verificar a integridade do backup.'
                          )
                        );

                        return;

                      }


                      const integrityValue =
                        integrityRow
                          ? Object.values(
                            integrityRow
                          )[0]
                          : null;


                      if (
                        String(
                          integrityValue || ''
                        ).toLowerCase() !==
                        'ok'
                      ) {

                        testDb.close();

                        reject(
                          new Error(
                            'O arquivo selecionado parece estar corrompido.'
                          )
                        );

                        return;

                      }


                      /*
                        Confirmamos também se o arquivo realmente
                        parece pertencer ao Sistema Oficina.
                      */

                      testDb.all(

                        `
                      SELECT name

                      FROM sqlite_master

                      WHERE
                        type = 'table'
                        AND name IN (
                          'clientes',
                          'veiculos',
                          'produtos',
                          'servicos',
                          'ordens_servico',
                          'orcamentos',
                          'config'
                        )
                      `,

                        [],

                        (
                          tablesError,
                          rows
                        ) => {

                          if (
                            tablesError
                          ) {

                            testDb.close();

                            reject(
                              new Error(
                                'Não foi possível validar as tabelas do backup.'
                              )
                            );

                            return;

                          }


                          const tables =
                            new Set(
                              (
                                rows || []
                              ).map(
                                row =>
                                  row.name
                              )
                            );


                          const requiredTables = [

                            'clientes',

                            'veiculos',

                            'produtos',

                            'servicos',

                            'ordens_servico',

                            'orcamentos',

                            'config'

                          ];


                          const valid =
                            requiredTables.every(
                              table =>
                                tables.has(
                                  table
                                )
                            );


                          testDb.close(
                            () => {

                              if (
                                !valid
                              ) {

                                reject(
                                  new Error(
                                    'O arquivo selecionado não parece ser um backup válido do Sistema Oficina.'
                                  )
                                );

                                return;

                              }


                              resolve(
                                true
                              );

                            }
                          );

                        }
                      );

                    }
                  );

                }
              );

          }
        );

      } catch (
      validationError
      ) {

        console.error(
          'Backup inválido:',
          validationError
        );


        return {

          success:
            false,

          error:
            validationError.message ||
            'Backup inválido.'

        };

      }


      /* ----------------------------------------------------------------------
         FECHAR O BANCO ATUAL
         ---------------------------------------------------------------------- */

      try {

        if (
          db
        ) {

          await new Promise(
            (
              resolve,
              reject
            ) => {

              db.close(
                (closeError) => {

                  if (
                    closeError
                  ) {

                    reject(
                      closeError
                    );

                    return;

                  }


                  db =
                    null;


                  resolve(
                    true
                  );

                }
              );

            }
          );

        }

      } catch (
      closeError
      ) {

        console.error(
          'Erro ao fechar o banco atual:',
          closeError
        );


        return {

          success:
            false,

          error:
            'Não foi possível preparar o banco atual para restauração.'

        };

      }


      /* ----------------------------------------------------------------------
         BACKUP DE SEGURANÇA AUTOMÁTICO
         ---------------------------------------------------------------------- */

      const safeBackupDirectory =
        path.join(

          app.getPath(
            'userData'
          ),

          'backups_automaticos'

        );


      fs.mkdirSync(

        safeBackupDirectory,

        {
          recursive:
            true
        }

      );


      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            '-'
          );


      const safetyBackupPath =
        path.join(

          safeBackupDirectory,

          `antes_restauracao_${timestamp}.db`

        );


      try {

        /*
          Primeiro preservamos o banco atual.
        */

        if (
          fs.existsSync(
            dbPath
          )
        ) {

          fs.copyFileSync(

            dbPath,

            safetyBackupPath

          );

        }


        /*
          Arquivos auxiliares do SQLite podem conter
          estado antigo. Como o banco já está fechado,
          podemos removê-los antes da substituição.
        */

        const walPath =
          `${dbPath}-wal`;


        const shmPath =
          `${dbPath}-shm`;


        if (
          fs.existsSync(
            walPath
          )
        ) {

          fs.unlinkSync(
            walPath
          );

        }


        if (
          fs.existsSync(
            shmPath
          )
        ) {

          fs.unlinkSync(
            shmPath
          );

        }


        /*
          Agora substituímos o banco pelo backup escolhido.
        */

        fs.copyFileSync(

          backupPath,

          dbPath

        );


        /*
          Reiniciamos o aplicativo depois que o IPC
          tiver tempo de devolver a resposta para a tela.
  
          Ao abrir novamente, initDatabase() executará
          também as migrações que existirem na versão atual.
        */

        setTimeout(
          () => {

            app.relaunch();

            app.exit(
              0
            );

          },

          1200
        );


        return {

          success:
            true,

          backupPath,

          safetyBackupPath,

          restarting:
            true

        };

      } catch (
      restoreError
      ) {

        console.error(
          'Erro ao restaurar backup:',
          restoreError
        );


        /*
          Se alguma coisa falhar DEPOIS de termos feito
          a cópia de segurança, tentamos devolver o banco
          anterior para o lugar.
        */

        try {

          if (
            fs.existsSync(
              safetyBackupPath
            )
          ) {

            fs.copyFileSync(

              safetyBackupPath,

              dbPath

            );

          }

        } catch (
        rollbackError
        ) {

          console.error(
            'Erro ao recuperar banco anterior:',
            rollbackError
          );

        }


        /*
          Reabre o banco para o programa continuar
          funcionando caso a restauração falhe.
        */

        try {

          initDatabase();

        } catch (
        reopenError
        ) {

          console.error(
            'Erro ao reabrir banco após falha:',
            reopenError
          );

        }


        return {

          success:
            false,

          error:
            restoreError.message ||
            'Não foi possível restaurar o backup.'

        };

      }

    }
  );

}


/* ==========================================================================
   JANELA PRINCIPAL
   ========================================================================== */

function createWindow() {

  win =
    new BrowserWindow({

      width:
        1200,

      height:
        800,

      webPreferences: {

        preload:
          path.join(
            __dirname,
            'preload.js'
          ),

        contextIsolation:
          true,

        nodeIntegration:
          false

      }

    });


  win.loadURL(
    `file://${path.join(
      __dirname,
      '../dist/sistema-oficina/index.html'
    )}`
  );

}


/* ==========================================================================
   CICLO DE VIDA DO ELECTRON
   ========================================================================== */

app.whenReady().then(
  () => {

    initDatabase();

    setupIpcHandlers();

    setupAutoUpdater();

    createWindow();


    /*
      Esperamos alguns segundos para não disputar
      internet/CPU com a abertura inicial do sistema.
    */
    setTimeout(
      () => {

        checkForUpdatesAutomatically();

      },

      5000
    );


    app.on(
      'activate',

      () => {

        if (
          BrowserWindow
            .getAllWindows()
            .length === 0
        ) {

          createWindow();

        }

      }
    );

  }
);


app.on(
  'window-all-closed',

  () => {

    if (
      process.platform !==
      'darwin'
    ) {

      if (db) {

        db.close();

      }


      app.quit();

    }

  }
);