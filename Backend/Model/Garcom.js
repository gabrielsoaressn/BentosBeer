import ConnectionDB from '../Persistence/ConnectionDB.js'
import GerenciadorCRUD from '../Controller/GerenciadorCRUD.js';

class Garcom {
	constructor(id, nome) {
		this.id = id;
		this.nome = nome;
		this.connection = new ConnectionDB();
		this.gerenciadorCRUD = new GerenciadorCRUD(this.connection);
	
	}
	
	async cadastrarMesa(numero, status, garcom){
		let mesa = this.gerenciadorCRUD.createMesa(numero,status,garcom)
		return mesa;
	}

	async cadastrarCliente(nome, mesa){
		let cliente =  this.gerenciadorCRUD.createCliente(nome, mesa)
		return cliente;
	}
	
	async anotarPedido(cliente, pedido){

		
	}
	async tirarConta(cliente) {
		try {
			const sql = `SELECT p.*
			FROM Cliente c
			JOIN Pedido pd ON c.idCliente = pd.Cliente_idCliente
			JOIN Conta co ON pd.idPedido = co.Pedido_idPedido
			JOIN Produto p ON co.Produto_idProduto = p.idProduto
			WHERE c.idCliente = 1`;
			const params = [cliente]; // Adicione os parâmetros necessários
			console.log(sql)
			let garcons = sql
			//const garcons = rows.map(row => new Garcom(row.IdGarcom, row.Nome, connection));
			return garcons;

		} catch (error) {
			console.error('Erro ao tirar a conta:', error);
			throw error; // Repassa o erro
		}
	}

	}
export default Garcom;