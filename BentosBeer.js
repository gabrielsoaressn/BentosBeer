import ConnectionDB from './Classes/ConnectionDB.js';

async function main() {
    const db = new ConnectionDB();

    try {
        // Estabelece a conexão com o banco de dados
        await db.connect();

        // Inserindo o garçom "Carlos" na tabela Garcom
        const insertSql = 'INSERT INTO Garcom (nome) VALUES (?)';
        const insertValues = ['Carlos'];

        const [insertResult] = await db.query(insertSql, insertValues);

        if (insertResult.affectedRows > 0) {
            console.log('Garçom Carlos inserido com sucesso!');
        } else {
            console.log('Falha ao inserir o garçom.');
        }

        // Consultando a tabela para ver todos os garçons
        const selectSql = 'SELECT * FROM Garcom';
        const [rows] = await db.query(selectSql);

        console.log('Garçons:', rows);

    } catch (err) {
        console.error('Erro na execução:', err);
    } finally {
        await db.close();
    }
}

main();
