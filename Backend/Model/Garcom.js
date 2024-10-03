import ConnectionDB from '../Persistence/ConnectionDB.js'
import GerenciadorCRUD from '../Controller/GerenciadorCRUD.js';

class Garcom {
	constructor(id, nome) {
		this.id = id;
		this.nome = nome;
		this.connection = new ConnectionDB();
		this.gerenciadorCRUD = new GerenciadorCRUD(this.connection);
	
	}

	async mostrarInfosCliente(cliente){
		console.log(this.gerenciadorCRUD.ListarClientePorId(cliente))
	}
	
	async cadastrarMesa(numero, status, garcom){
		let mesa = this.gerenciadorCRUD.createMesa(numero,status,garcom)
		return mesa;
	}

	async cadastrarCliente(nome, mesa){
		let cliente =  this.gerenciadorCRUD.createCliente(nome, mesa)
		return cliente;
	}
	
	async anotarPedido(cliente, quantidade, produto) {
		let pedido = await this.gerenciadorCRUD.createPedido("solicitado", cliente, this.id);
		console.log("Pedido criado:", pedido);  // Verifique se o pedido está sendo criado corretamente
		if (!pedido || !pedido.id) {
			console.error("Erro: Pedido inválido ou id de pedido não definido.");
			return;
		}
		this.gerenciadorCRUD.createConta(quantidade, pedido.id, produto, cliente);
	}
	
	async entregarPedido(pedido) {
		console.log("Pedido passado para entregarPedido:", pedido);  // Verifique se o pedido é válido e tem o campo `id`
		if (!pedido) {
			console.error("Erro: Pedido inválido ou sem ID definido.");
			return;
		}else console.log("pedido é um id válido")
		
		await this.gerenciadorCRUD.editarStatusPedido(pedido, "entregue");
		console.log("Status do pedido: entregue");
	}
	
	
	async tirarConta(cliente) {
		this.gerenciadorCRUD.listarProdutoQtd()
	}
	async registrarFormaPagamento(cliente, formaPagamento){
		this.gerenciadorCRUD.editarContaFormaPagamento()
	}

	}
export default Garcom;