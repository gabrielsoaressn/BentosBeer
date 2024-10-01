import mysql from 'mysql2/promise';

class ConnectionDB {
    constructor() {
        this.connection = null;
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'SouCareca123', 
            database: 'BentosBeer' 
        });
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
        }
    }
    
    async query(sql, params) {
        if (!this.connection) {
            throw new Error('Connection not established');
        }
        return this.connection.execute(sql, params);
    }
}

export default ConnectionDB;
