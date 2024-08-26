import express from 'express';
import cors from 'cors';
import path from 'path';
import ConnectionDB from './ConnectionDB.js';
import GerenciadorCRUD from './GerenciadorCRUD.js';

const app = express();
const port = 3000;

// Middleware para habilitar CORS e parsear JSON
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta atual (assumindo que o index.html está na raiz do projeto)
app.use(express.static(path.resolve('.')));

(async () => {
    try {
        const db = new ConnectionDB();
        await db.connect();
        const crudManager = new GerenciadorCRUD(db);

        ///////////////////////////////////
        // Rotas de API para Produtos
        ///////////////////////////////////

        app.post('/produto', async (req, res) => {
            try {
                const { nome, preco } = req.body;
                const newProdutoId = await crudManager.createProduto(nome, preco);
                res.status(201).json({ id: newProdutoId });
            } catch (error) {
                console.error('Erro ao criar produto:', error);
                res.status(500).json({ error: 'Erro ao criar produto' });
            }
        });

        app.get('/produto', async (req, res) => {
            try {
                const produtos = await crudManager.listarProdutos();
                res.json(produtos);
            } catch (error) {
                console.error('Erro ao listar produtos:', error);
                res.status(500).json({ error: 'Erro ao listar produtos' });
            }
        });

        app.get('/produto/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const produto = await crudManager.listarProdutoPorId(id);
                if (produto) {
                    res.json(produto);
                } else {
                    res.status(404).json({ error: 'Produto não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao buscar produto:', error);
                res.status(500).json({ error: 'Erro ao buscar produto' });
            }
        });

        app.put('/produto/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { nome, preco } = req.body;
                const updated = await crudManager.editarProduto(parseInt(id), nome, preco);
                if (updated) {
                    res.json({ message: 'Produto atualizado com sucesso' });
                } else {
                    res.status(404).json({ error: 'Produto não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                res.status(500).json({ error: 'Erro ao atualizar produto' });
            }
        });

        app.delete('/produto/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await crudManager.excluirProduto(id);
                if (result) {
                    res.json({ message: 'Produto removido com sucesso' });
                } else {
                    res.status(404).json({ error: 'Produto não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao remover produto:', error);
                res.status(500).json({ error: 'Erro ao remover produto' });
            }
        });

        ///////////////////////////////////
        // Rotas de API para Clientes
        ///////////////////////////////////

        app.post('/cliente', async (req, res) => {
            try {
                const { nome, mesa } = req.body;

                // Verifica se a mesa já está ocupada usando o método do CRUD
                const mesaOcupada = await crudManager.verificarMesaOcupada(mesa);

                if (mesaOcupada) {
                    return res.status(400).json({ error: 'Mesa já está ocupada por outro cliente.' });
                }

                // Se a mesa não estiver ocupada, cria o novo cliente
                const newClienteId = await crudManager.createCliente(nome, mesa);
                res.status(201).json({ id: newClienteId });

            } catch (error) {
                console.error('Erro ao criar cliente:', error);
                res.status(500).json({ error: 'Erro ao criar cliente' });
            }
        });

        app.get('/cliente', async (req, res) => {
            try {
                const clientes = await crudManager.listarClientes();
                res.json(clientes);
            } catch (error) {
                console.error('Erro ao listar clientes:', error);
                res.status(500).json({ error: 'Erro ao listar clientes' });
            }
        });

        app.get('/cliente/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const cliente = await crudManager.listarClientePorId(id);
                if (cliente) {
                    res.json(cliente);
                } else {
                    res.status(404).json({ error: 'Cliente não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao buscar cliente:', error);
                res.status(500).json({ error: 'Erro ao buscar cliente' });
            }
        });

        app.put('/cliente/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { nome, mesa } = req.body;
                const updated = await crudManager.editarCliente(parseInt(id), nome, mesa);
                if (updated) {
                    res.json({ message: 'Cliente atualizado com sucesso' });
                } else {
                    res.status(404).json({ error: 'Cliente não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao atualizar cliente:', error);
                res.status(500).json({ error: 'Erro ao atualizar cliente' });
            }
        });

        app.delete('/cliente/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await crudManager.excluirCliente(id);
                if (result) {
                    res.json({ message: 'Cliente removido com sucesso' });
                } else {
                    res.status(404).json({ error: 'Cliente não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao remover cliente:', error);
                res.status(500).json({ error: 'Erro ao remover cliente' });
            }
        });

        ///////////////////////////////////
        // Rotas de API para Garçons
        ///////////////////////////////////

        app.post('/garcom', async (req, res) => {
            try {
                const { nome } = req.body;
                const newGarcomId = await crudManager.createGarcom(nome);
                res.status(201).json({ id: newGarcomId });
            } catch (error) {
                console.error('Erro ao criar garçom:', error);
                res.status(500).json({ error: 'Erro ao criar garçom' });
            }
        });

        app.get('/garcom', async (req, res) => {
            try {
                const garcons = await crudManager.listarGarcom();
                res.json(garcons);
            } catch (error) {
                console.error('Erro ao listar garçons:', error);
                res.status(500).json({ error: 'Erro ao listar garçons' });
            }
        });

        app.put('/garcom/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { nome } = req.body;
                const updated = await crudManager.editarGarcom(parseInt(id), nome);
                if (updated) {
                    res.json({ message: 'Garçom atualizado com sucesso' });
                } else {
                    res.status(404).json({ error: 'Garçom não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao atualizar garçom:', error);
                res.status(500).json({ error: 'Erro ao atualizar garçom' });
            }
        });

        app.delete('/garcom/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const deleted = await crudManager.excluirGarcom(parseInt(id));
                if (deleted) {
                    res.json({ message: 'Garçom excluído com sucesso' });
                } else {
                    res.status(404).json({ error: 'Garçom não encontrado' });
                }
            } catch (error) {
                console.error('Erro ao excluir garçom:', error);
                res.status(500).json({ error: 'Erro ao excluir garçom' });
            }
        });

        // Iniciar o servidor
        app.listen(port, () => {
            console.log(`Servidor rodando em http://localhost:${port}`);
        });

    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        process.exit(1); // Encerra o processo se não conseguir conectar ao banco de dados
    }
})();
