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

// 2. Cria as Tabelas Iniciais (Baseado no seu mock de dados)
function createTables() {
  const sqlClientes = `
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      cars TEXT,        // Salvo como string JSON
      lastVisit TEXT,
      status TEXT,
      statusLabel TEXT
    )
  `;

  // Tabela Veículos, para ser usada na próxima etapa
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

  db.run(sqlProdutos);
  db.run(sqlClientes);
  db.run(sqlVeiculos);
}

// 3. Define as funções que o Angular vai chamar (IPC Handlers)
function setupIpcHandlers() {

  // --- CLIENTES CRUD COMPLETO ---

  ipcMain.handle('get-clientes', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM clientes", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          ...row,
          // Transforma a string de carros de volta para array para o Angular
          cars: row.cars ? JSON.parse(row.cars) : []
        })));
      });
    });
  });

  ipcMain.handle('add-cliente', async (event, cliente) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO clientes (name, phone, email, cars, lastVisit, status, statusLabel) VALUES (?, ?, ?, ?, ?, ?, ?)";
      // Prepara o array de carros para salvar como string (JSON)
      const carsJson = JSON.stringify(cliente.cars || []);

      db.run(sql, [cliente.name, cliente.phone, cliente.email, carsJson, cliente.lastVisit, cliente.status, cliente.statusLabel], function (err) {
        if (err) reject(err);
        else resolve({
          id: this.lastID,
          ...cliente,
          cars: cliente.cars || [] // Retorna o objeto completo para o frontend
        });
      });
    });
  });

  ipcMain.handle('update-cliente', async (event, cliente) => {
    return new Promise((resolve, reject) => {
      const sql = "UPDATE clientes SET name=?, phone=?, email=?, cars=?, lastVisit=?, status=?, statusLabel=? WHERE id=?";
      const carsJson = JSON.stringify(cliente.cars || []);

      db.run(sql, [cliente.name, cliente.phone, cliente.email, carsJson, cliente.lastVisit, cliente.status, cliente.statusLabel, cliente.id], function (err) {
        if (err) reject(err);
        else resolve(cliente); // Retorna o objeto atualizado
      });
    });
  });

  ipcMain.handle('delete-cliente', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM clientes WHERE id = ?", [id], function (err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });

  // --- VEÍCULOS CRUD (para a próxima etapa) ---

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
      db.run(sql, [veiculo.plate, veiculo.model, veiculo.brand, veiculo.year, veiculo.color, veiculo.client, veiculo.status, veiculo.lastService], function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...veiculo });
      });
    });
  });

  ipcMain.handle('update-veiculo', async (event, veiculo) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE veiculos SET plate=?, model=?, brand=?, year=?, color=?, client=?, status=?, lastService=? WHERE id=?`;
      db.run(sql, [veiculo.plate, veiculo.model, veiculo.brand, veiculo.year, veiculo.color, veiculo.client, veiculo.status, veiculo.lastService, veiculo.id], function (err) {
        if (err) reject(err);
        else resolve(veiculo);
      });
    });
  });

  ipcMain.handle('delete-veiculo', async (event, id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM veiculos WHERE id = ?", [id], function (err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
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
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Aponta para a ponte
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Carrega o Angular compilado
  win.loadURL(`file://${path.join(__dirname, '../dist/sistema-oficina/index.html')}`);
  // win.webContents.openDevTools(); 
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