class GerenciadorCRUD {
    constructor(connection) {
        this.connection = connection;
    }

    /////////////////////////////////
    // CRUD Cliente
    /////////////////////////////////

    async createCliente(nome, mesa) {
        try {
            const sql = 'INSERT INTO cliente (nome, mesa) VALUES (?, ?)';
            const [result] = await this.connection.query(sql, [nome, mesa]);
            return result.insertId;
        } catch (err) {
            console.error('Erro ao criar cliente:', err);
            throw err;
        }
    }

    async listarClientes() {
        try {
            const sql = 'SELECT * FROM cliente';
            const [results] = await this.connection.query(sql);
            return results;
        } catch (err) {
            console.error('Erro ao listar clientes:', err);
            throw err;
        }
    }

    async listarClientePorId(id) {
        try {
            const sql = 'SELECT * FROM cliente WHERE id = ?';
            const [results] = await this.connection.query(sql, [id]);
            if (results.length > 0) {
                return results[0];
            } else {
                return null;
            }
        } catch (err) {
            console.error('Erro ao buscar cliente por ID:', err);
            throw err;
        }
    }

    async editarCliente(id, nome, mesa) {
        try {
            const sql = 'UPDATE cliente SET nome = ?, mesa = ? WHERE id = ?';
            const [result] = await this.connection.query(sql, [nome, mesa, id]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Erro ao atualizar cliente:', err);
            throw err;
        }
    }

    async excluirCliente(id) {
        try {
            const sql = 'DELETE FROM cliente WHERE id = ?';
            const [result] = await this.connection.query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            throw error;
        }
    }

    async verificarMesaOcupada(mesa) {
        try {
            const sql = 'SELECT * FROM cliente WHERE mesa = ?';
            const [results] = await this.connection.query(sql, [mesa]);
            return results.length > 0;
        } catch (err) {
            console.error('Erro ao verificar mesa ocupada:', err);
            throw err;
        }
    }

    /////////////////////////////////
    // CRUD Garçom
    /////////////////////////////////

    async createGarcom(nome) {
        try {
            const sql = 'INSERT INTO garcom (nome) VALUES (?)';
            const [results] = await this.connection.query(sql, [nome]);
            console.log('Garçom criado com sucesso! ID:', results.insertId);
        } catch (err) {
            console.error('Erro ao criar garçom:', err);
        }
    }

    async listarGarcom() {
        try {
            const sql = 'SELECT * FROM garcom';
            const [results] = await this.connection.query(sql);
            return results;
        } catch (err) {
            console.error('Erro ao listar garçons:', err);
            throw err;
        }
    }

    async listarGarcomPorNome(nome) {
        try {
            const sql = 'SELECT * FROM garcom WHERE nome = ?';
            const [results] = await this.connection.query(sql, [nome]);
            if (results.length > 0) {
                console.log(`Garçons encontrados com o nome "${nome}":`);
                results.forEach((garcom) => {
                    console.log(`ID: ${garcom.id}, Nome: ${garcom.nome}`);
                });
            } else {
                console.log(`Nenhum garçom encontrado com o nome "${nome}".`);
            }
        } catch (err) {
            console.error('Erro ao listar garçons:', err);
        }
    }

    async listarGarcomPorId(id) {
        try {
            const sql = 'SELECT * FROM garcom WHERE id = ?';
            const [results] = await this.connection.query(sql, [id]);
            if (results.length > 0) {
                const garcom = results[0];
                console.log(`Garçom encontrado: ID: ${garcom.id}, Nome: ${garcom.nome}`);
            } else {
                console.log(`Nenhum garçom encontrado com o ID "${id}".`);
            }
        } catch (err) {
            console.error('Erro ao listar garçom:', err);
        }
    }

    async editarGarcom(id, novoNome) {
        try {
            const sql = 'UPDATE garcom SET nome = ? WHERE id = ?';
            const [result] = await this.connection.query(sql, [novoNome, id]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Erro ao editar garçom:', err);
        }
    }

    async excluirGarcom(id) {
        try {
            const sql = 'DELETE FROM garcom WHERE id = ?';
            const [result] = await this.connection.query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erro ao excluir garçom:', error);
            throw error;
        }
    }

    /////////////////////////////////
    // CRUD Produto
    /////////////////////////////////

    async createProduto(nome, preco) {
        try {
            const sql = 'INSERT INTO produto (nome, preco) VALUES (?, ?)';
            const [result] = await this.connection.query(sql, [nome, preco]);
            return result.insertId;
        } catch (err) {
            console.error('Erro ao criar produto:', err);
            throw err;
        }
    }

    async listarProdutos() {
        try {
            const sql = 'SELECT * FROM produto';
            const [results] = await this.connection.query(sql);
            return results;
        } catch (err) {
            console.error('Erro ao listar produtos:', err);
            throw err;
        }
    }

    async listarProdutoPorId(id) {
        try {
            const sql = 'SELECT * FROM produto WHERE id = ?';
            const [results] = await this.connection.query(sql, [id]);
            if (results.length > 0) {
                return results[0];
            } else {
                return null;
            }
        } catch (err) {
            console.error('Erro ao buscar produto por ID:', err);
            throw err;
        }
    }

    async editarProduto(id, nome, preco) {
        try {
            const sql = 'UPDATE produto SET nome = ?, preco = ? WHERE id = ?';
            const [result] = await this.connection.query(sql, [nome, preco, id]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Erro ao atualizar produto:', err);
            throw err;
        }
    }

    async excluirProduto(id) {
        try {
            const sql = 'DELETE FROM produto WHERE id = ?';
            const [result] = await this.connection.query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            throw error;
        }
    }
}

export default GerenciadorCRUD;
