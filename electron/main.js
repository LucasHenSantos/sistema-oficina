const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let db;
let win;

// 1. Inicializa o Banco de Dados
function initDatabase() {
  // O banco será salvo na pasta de dados do aplicativo para persistência
  const dbPath = path.join(app.getPath('userData'), 'oficina.db');
  console.log('Banco de dados em:', dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao abrir o banco:', err.message);
    } else {
      console.log('Conectado ao SQLite.');
      createTables();
    }
  });
}

// 2. Cria as Tabelas Iniciais (Baseado no mock de dados do Angular)
function createTables() {
  // CLIENTES (cars será JSON string)
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
  
  // VEÍCULOS
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

  // PRODUTOS/ESTOQUE
  const sqlProdutos = `
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
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
  
  // SERVIÇOS
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

  // ORDENS DE SERVIÇO (items será JSON string)
  const sqlOS = `
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client TEXT NOT NULL,
      vehicle TEXT NOT NULL,
      status TEXT,
      date TEXT,
      items TEXT, 
      notes TEXT,
      total REAL
    )
  `;

  // ORÇAMENTOS (items será JSON string)
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
      notes TEXT
    )
  `;

  // CONFIGURAÇÕES (Para guardar categorias e dados da empresa, como JSON)
  const sqlConfig = `
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `;

  db.run(sqlClientes);
  db.run(sqlVeiculos);
  db.run(sqlProdutos);
  db.run(sqlServicos);
  db.run(sqlOS);
  db.run(sqlOrcamentos);
  db.run(sqlConfig);
}

// 3. Define as funções que o Angular vai chamar (IPC Handlers)
function setupIpcHandlers() {
  
  // --- UTILS / CONFIGURAÇÕES CRUD (Para categorias, por exemplo) ---

  ipcMain.handle('get-config', async (event, key) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT value FROM config WHERE key = ?", [key], (err, row) => {
        if (err) reject(err);
        // Retorna o valor JSON desserializado, ou null se não houver
        else resolve(row ? JSON.parse(row.value) : null);
      });
    });
  });

  ipcMain.handle('set-config', async (event, key, value) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`;
      const jsonValue = JSON.stringify(value);
      db.run(sql, [key, jsonValue], function(err) {
        if (err) reject(err);
        else resolve(value);
      });
    });
  });

  // --- CLIENTES CRUD ---

  ipcMain.handle('get-clientes', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM clientes", [], (err, rows) => {
        if (err) reject(err);
        // Converte o campo 'cars' de volta para array
        else resolve(rows.map(row => ({ 
          ...row, 
          cars: row.cars ? JSON.parse(row.cars) : [] 
        })));
      });
    });
  });

  ipcMain.handle('add-cliente', async (event, cliente) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO clientes (name, phone, email, cars, lastVisit, status, statusLabel) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const carsJson = JSON.stringify(cliente.cars || []);

      db.run(sql, [cliente.name, cliente.phone, cliente.email, carsJson, cliente.lastVisit, cliente.status, cliente.statusLabel], function(err) {
        if (err) reject(err);
        else resolve({ 
          id: this.lastID, 
          ...cliente,
          cars: cliente.cars || [] 
        });
      });
    });
  });
  
  ipcMain.handle('update-cliente', async (event, cliente) => {
    return new Promise((resolve, reject) => {
      const sql = "UPDATE clientes SET name=?, phone=?, email=?, cars=?, lastVisit=?, status=?, statusLabel=? WHERE id=?";
      const carsJson = JSON.stringify(cliente.cars || []);
      
      db.run(sql, [cliente.name, cliente.phone, cliente.email, carsJson, cliente.lastVisit, cliente.status, cliente.statusLabel, cliente.id], function(err) {
        if (err) reject(err);
        else resolve(cliente);
      });
    });
  });

  ipcMain.handle('delete-cliente', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM clientes WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
  
  // --- VEÍCULOS CRUD ---

  ipcMain.handle('get-veiculos', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM veiculos", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('add-veiculo', async (event, veiculo) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO veiculos (plate, model, brand, year, color, client, status, lastService) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      db.run(sql, [veiculo.plate, veiculo.model, veiculo.brand, veiculo.year, veiculo.color, veiculo.client, veiculo.status, veiculo.lastService], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...veiculo });
      });
    });
  });

  ipcMain.handle('update-veiculo', async (event, veiculo) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE veiculos SET plate=?, model=?, brand=?, year=?, color=?, client=?, status=?, lastService=? WHERE id=?`;
      db.run(sql, [veiculo.plate, veiculo.model, veiculo.brand, veiculo.year, veiculo.color, veiculo.client, veiculo.status, veiculo.lastService, veiculo.id], function(err) {
        if (err) reject(err);
        else resolve(veiculo);
      });
    });
  });

  ipcMain.handle('delete-veiculo', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM veiculos WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });

  // --- PRODUTOS CRUD ---
  ipcMain.handle('get-produtos', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM produtos", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('add-produto', async (event, prod) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO produtos (code, name, brand, category, quantity, minQuantity, costPrice, sellPrice, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
      db.run(sql, [prod.code, prod.name, prod.brand, prod.category, prod.quantity, prod.minQuantity, prod.costPrice, prod.sellPrice, prod.location], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...prod });
      });
    });
  });

  ipcMain.handle('update-produto', async (event, prod) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE produtos SET code=?, name=?, brand=?, category=?, quantity=?, minQuantity=?, costPrice=?, sellPrice=?, location=? WHERE id=?`;
      db.run(sql, [prod.code, prod.name, prod.brand, prod.category, prod.quantity, prod.minQuantity, prod.costPrice, prod.sellPrice, prod.location, prod.id], function(err) {
        if (err) reject(err);
        else resolve(prod);
      });
    });
  });

  ipcMain.handle('delete-produto', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM produtos WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });

  // --- SERVIÇOS CRUD ---
  ipcMain.handle('get-servicos', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM servicos", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('add-servico', async (event, svc) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO servicos (name, description, category, time, price) VALUES (?, ?, ?, ?, ?)";
      db.run(sql, [svc.name, svc.description, svc.category, svc.time, svc.price], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...svc });
      });
    });
  });

  ipcMain.handle('update-servico', async (event, svc) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE servicos SET name=?, description=?, category=?, time=?, price=? WHERE id=?`;
      db.run(sql, [svc.name, svc.description, svc.category, svc.time, svc.price, svc.id], function(err) {
        if (err) reject(err);
        else resolve(svc);
      });
    });
  });

  ipcMain.handle('delete-servico', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM servicos WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
  
  // --- ORÇAMENTOS CRUD ---
  ipcMain.handle('get-orcamentos', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM orcamentos", [], (err, rows) => {
        if (err) reject(err);
        // Converte o campo 'items' de volta para JSON
        else resolve(rows.map(row => ({ 
          ...row, 
          items: row.items ? JSON.parse(row.items) : [] 
        })));
      });
    });
  });

  ipcMain.handle('add-orcamento', async (event, budget) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO orcamentos (client, vehicle, date, validUntil, status, total, items, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const itemsJson = JSON.stringify(budget.items || []);
      
      db.run(sql, [budget.client, budget.vehicle, budget.date, budget.validUntil, budget.status, budget.total, itemsJson, budget.notes], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...budget });
      });
    });
  });

  ipcMain.handle('update-orcamento', async (event, budget) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE orcamentos SET client=?, vehicle=?, date=?, validUntil=?, status=?, total=?, items=?, notes=? WHERE id=?`;
      const itemsJson = JSON.stringify(budget.items || []);
      
      db.run(sql, [budget.client, budget.vehicle, budget.date, budget.validUntil, budget.status, budget.total, itemsJson, budget.notes, budget.id], function(err) {
        if (err) reject(err);
        else resolve(budget);
      });
    });
  });

  ipcMain.handle('delete-orcamento', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM orcamentos WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });

  // --- ORDENS DE SERVIÇO CRUD ---
  ipcMain.handle('get-os', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM ordens_servico", [], (err, rows) => {
        if (err) reject(err);
        // Converte o campo 'items' de volta para JSON
        else resolve(rows.map(row => ({ 
          ...row, 
          items: row.items ? JSON.parse(row.items) : [] 
        })));
      });
    });
  });

  ipcMain.handle('add-os', async (event, order) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO ordens_servico (client, vehicle, status, date, items, notes, total) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const itemsJson = JSON.stringify(order.items || []);
      
      db.run(sql, [order.client, order.vehicle, order.status, order.date, itemsJson, order.notes, order.total], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...order });
      });
    });
  });

  ipcMain.handle('update-os', async (event, order) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE ordens_servico SET client=?, vehicle=?, status=?, date=?, items=?, notes=?, total=? WHERE id=?`;
      const itemsJson = JSON.stringify(order.items || []);
      
      db.run(sql, [order.client, order.vehicle, order.status, order.date, itemsJson, order.notes, order.total, order.id], function(err) {
        if (err) reject(err);
        else resolve(order);
      });
    });
  });

  ipcMain.handle('delete-os', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM ordens_servico WHERE id = ?", [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), 
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL(`file://${path.join(__dirname, '../dist/sistema-oficina/index.html')}`);
  // win.webContents.openDevTools(); // Descomente para debug
}

app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});