import { createConnection } from 'mysql2';

// Criação da conexão com o banco de dados
const connection = createConnection({
    host: 'localhost',       // Endereço do servidor MySQL
    user: 'root',     // Nome de usuário do MySQL
    password: 'SouCareca123',   // Senha do MySQL
    database: 'BentosBeer' // Nome do banco de dados
});

// Conectar ao banco de dados
connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log('Conectado ao banco de dados com sucesso!');
    
    // Verifique se a conexão foi estabelecida antes de usar `connection.query`
    console.log('Objeto de conexão:', connection);
    
    // Teste uma simples consulta
    const sql = `INSERT INTO Garcom (nome) VALUES (?)`;
    connection.query(sql, ['Carlos Silva'], (err, results) => {
        if (err) {
            console.error('Erro ao executar a consulta:', err.stack);
        } else {
            console.log('Garçom inserido com sucesso:', results.insertId);
        }
    });

    // Fechar a conexão após a operação
    connection.end();
});

module.exports = connection;