import mysql from 'mysql2/promise';

class ConnectionDB {
    constructor() {
        this.connection = null;
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'sky210193', 
            database: 'BentosBeer' 
        });
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
        }
    } // ei, melhor usar LIKE na busca por nome, não? coloca upper também
    // pq senão só vai trazer o garçom com o nome exatamente igual, com case-sensitive

    // beleza. 
    // ei, a apresentação é ead?
    // é sim, eu acho
    // blzz
    async query(sql, params) {
        if (!this.connection) {
            throw new Error('Connection not established');
        }
        return this.connection.execute(sql, params);
    }
}

export default ConnectionDB;