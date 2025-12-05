// electron/src/database.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'oficina.db');

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
      } else {
        console.log('Conectado ao banco de dados SQLite em:', dbPath);
        this.initTables();
      }
    });
  }

  private initTables() {
    // Exemplo: Criando a tabela de Clientes se não existir
    const sql = `
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        email TEXT,
        placa_carro TEXT
      )
    `;

    this.db.run(sql, (err) => {
      if (err) {
        console.error('Erro ao criar tabela:', err.message);
      } else {
        console.log('Tabela clientes pronta.');
      }
    });
  }

  // Métodos CRUD genéricos ou específicos

  public getClientes(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM clientes', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  public addCliente(cliente: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO clientes (nome, telefone, email, placa_carro) VALUES (?, ?, ?, ?)`;
      // Usamos function() normal aqui para ter acesso ao 'this.lastID'
      this.db.run(sql, [cliente.nome, cliente.telefone, cliente.email, cliente.placa], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }
}