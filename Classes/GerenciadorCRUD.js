class GerenciadorCRUD {
    constructor(connection) {
        this.connection = connection;
        
    }
    // CRUD Garçom
    async createGarcom(nome) {
        try {
            // SQL para inserir um novo garçom na tabela "garcom"
            const sql = 'INSERT INTO garcom (nome) VALUES (?)';
    
            // Executa a query de inserção e espera o resultado
            const [results] = await this.connection.query(sql, [nome]);
    
            console.log('Garçom criado com sucesso! ID:', results.insertId);  // Exibe o ID do garçom criado
        } catch (err) {
            console.error('Erro ao criar garçom:', err);  // Exibe erros, se houver
        } 
    }

    async listarGarcom(){
    
        try {
            // SQL para selecionar todos os garçons na tabela "garcom"
            const sql = 'SELECT * FROM garcom';
    
            // Executa a query de seleção e espera o resultado
            const [results] = await this.connection.query(sql);
    
            // Verifica se há garçons na tabela
            if (results.length > 0) {
                console.log('Lista de Garçons:');
                results.forEach((garcom) => {
                    console.log(`ID: ${garcom.id}, Nome: ${garcom.nome}`);
                });
            } else {
                console.log('Nenhum garçom encontrado.');
            }
        } catch (err) {
            console.error('Erro ao listar garçons:', err);  // Exibe erros, se houver
        }         
    }    
    
    async  listarGarcomPorNome(nome) {
        try {
            // SQL para selecionar garçons na tabela "garcom" que correspondam ao nome fornecido
            const sql = 'SELECT * FROM garcom WHERE nome = ?';
            
            // Executa a query de seleção e espera o resultado
            const [results] = await this.connection.query(sql, [nome]);
    
            // Verifica se há garçons com o nome fornecido
            if (results.length > 0) {
                console.log(`Garçons encontrados com o nome "${nome}":`);
                results.forEach((garcom) => {
                    console.log(`ID: ${garcom.id}, Nome: ${garcom.nome}`);
                });
            } else {
                console.log(`Nenhum garçom encontrado com o nome "${nome}".`);
            }
        } catch (err) {
            console.error('Erro ao listar garçons:', err);  // Exibe erros, se houver
        }
    }

    async  listarGarcomPorId(id) {
    try {
        // SQL para selecionar o garçom na tabela "garcom" pelo ID fornecido
        const sql = 'SELECT * FROM garcom WHERE id = ?';
        
        // Executa a query de seleção e espera o resultado
        const [results] = await this.connection.query(sql, [id]);

        // Verifica se há um garçom com o ID fornecido
        if (results.length > 0) {
            const garcom = results[0]; // Como o ID é único, pega o primeiro (e único) resultado
            console.log(`Garçom encontrado: ID: ${garcom.id}, Nome: ${garcom.nome}`);
        } else {
            console.log(`Nenhum garçom encontrado com o ID "${id}".`);
        }
    } catch (err) {
        console.error('Erro ao listar garçom:', err);  // Exibe erros, se houver
    }

    }

    async   editarGarcom(id, novoNome) {
    try {
        // SQL para atualizar o nome do garçom na tabela "garcom" pelo ID fornecido
        const sql = 'UPDATE garcom SET nome = ? WHERE id = ?';

        // Executa a query de atualização
        const [result] = await this.connection.query(sql, [novoNome, id]);

        // Verifica se a atualização foi bem-sucedida
        if (result.affectedRows > 0) {
            console.log(`Garçom com ID "${id}" foi atualizado para o nome "${novoNome}".`);
        } else {
            console.log(`Nenhum garçom encontrado com o ID "${id}".`);
        }
    } catch (err) {
        console.error('Erro ao editar garçom:', err);  // Exibe erros, se houver
    }

    }
    
    async   excluirGarcom(id){
        try {
            // SQL para excluir o garçom na tabela "garcom" pelo ID fornecido
            const sql = 'DELETE FROM garcom WHERE id = ?';
    
            // Executa a query de exclusão
            const [result] = await this.connection.query(sql, [id]);
    
            // Verifica se a exclusão foi bem-sucedida
            if (result.affectedRows > 0) {
                console.log(`Garçom com ID "${id}" foi excluído com sucesso.`);
            } else {
                console.log(`Nenhum garçom encontrado com o ID "${id}".`);
            }
        } catch (err) {
            console.error('Erro ao excluir garçom:', err);  // Exibe erros, se houver
        }
    }    
    
    // CRUD Mesa 

    // CRUD Produto

    async createProduto(nome, preco, descricao) {
        try {
            // SQL para inserir um novo produto na tabela "produto"
            const sql = 'INSERT INTO pedido (nome, preco, descricao) VALUES (?, ?, ?)';
    
            // Executa a query de inserção e espera o resultado
            const [results] = await db.connection.query(sql, [nome, preco, descricao]);
    
            console.log('Produto criado com sucesso! ID:', results.insertId);  // Exibe o ID do produto criado
        } catch (err) {
            console.error('Erro ao criar produto:', err);  // Exibe erros, se houver
        } 
    }

    async listarProdutos(){
    
        try {
            // SQL para selecionar todos os produtos na tabela "produto"
            const sql = 'SELECT * FROM produto';
    
            // Executa a query de seleção e espera o resultado
            const [results] = await connection.query(sql);
    
            // Verifica se há garçons na tabela
            if (results.length > 0) {
                console.log('Lista de Produtos:');
                results.forEach((produto) => {
                    console
                    console.log(`ID: ${pedido.id}, Nome: ${produto.nome}, Preço: ${produto.preco}, Descrição: ${produto.nome}`);
                });
            } else {
                console.log('Nenhum garçom encontrado.');
            }
        } catch (err) {
            console.error('Erro ao listar garçons:', err);  // Exibe erros, se houver
        }         
    }
    
 }

export default GerenciadorCRUD;