import Garcom from '../Model/Garcom.js'
import Cliente from '../Model/Cliente.js'
import Mesa from '../Model/Mesa.js'
import Pedido from '../Model/Pedido.js'
import Conta from '../Model/Conta.js'

class GerenciadorCRUD {
	constructor(connection) {
		if (GerenciadorCRUD.instance){
			return GerenciadorCRUD.instance;
		}
		this.connection = connection;
		GerenciadorCRUD.instance = this;
		
	}
	  /////////////////////////////////////////
	 /////////CRUD CLIENTE////////////////////
	/////////////////////////////////////////

	async createCliente(nome, mesa) {
		try {
			const sql = 'INSERT INTO cliente (nome, mesa) VALUES (?, ?)';
			const [result] = await this.connection.query(sql, [nome, mesa]);
			let cliente = new Cliente(result.insertId, nome, mesa)
			return cliente;
		} catch (err) {
			console.error('Erro ao criar cliente:', err);
			throw err;
		}
	}
	async  criaObjsClientes() {
		try {
			const [rows] = await this.connection.query('SELECT * FROM cliente');

			// Cria um array de objetos Cliente para cada linha retornada
			const clientes = rows.map(row => new Cliente(row.idCliente, row.nome, row.mesa, row.Mesa_idMesa));
			return clientes;
		} catch (err) {
			console.error('Erro ao buscar os clientes:', err);
		}
	}

	async  ListarClientePorId(id) {
		try {
			// SQL para selecionar o garçom na tabela "garcom" pelo ID fornecido
			const sql = 'SELECT * FROM garcom WHERE idCliente = ?';
			
			// Executa a query de seleção e espera o resultado
			const [results] = await this.connection.query(sql, [id]);
	
			// Verifica se há um garçom com o ID fornecido
			if (results.length > 0) {
				console.log(sql);
			} else {
				console.log(`Nenhum garçom encontrado com o id "${id}".`);
			}
		} catch (err) {
			console.error('Erro ao listar cliente:', err);  // Exibe erros, se houver
		}
	}


	  /////////////////////////////////// 
	 //////////CRUD Garçom//////////////
	///////////////////////////////////
	
	async createGarcom(nome) {
		try {
			// SQL para inserir um novo garçom na tabela "garcom"
			const sql = 'INSERT INTO garcom (nome) VALUES (?)';
	
			// Executa a query de inserção e espera o resultado
			const [results] = await this.connection.query(sql, [nome]);
			console.log('Garçom criado com sucesso! ID:', results.insertId);  // Exibe o ID do garçom criado
			let garcom = new Garcom(results.insertId, nome);
			return garcom
		} catch (err) {
			console.error('Erro ao criar garçom:', err);  // Exibe erros, se houver
		} 
	}

	async  criaObjsGarcons() {
			try {
				const [rows] = await this.connection.query('SELECT * FROM Garcom');

				// Cria um array de objetos Garcom para cada linha retornada
				const garcons = rows.map(row => new Garcom(row.idGarcom, row.nome));
				return garcons;
			} catch (err) {
				console.error('Erro ao buscar os garçons:', err);
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
					console.log(`ID: ${garcom.idGarcom}, Nome: ${garcom.nome}`);
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
					console.log(`ID: ${garcom.idGarcom}, Nome: ${garcom.nome}`);
				});
			} else {
				console.log(`Nenhum garçom encontrado com o nome "${nome}".`);
			}
		} catch (err) {
			console.error('Erro ao listar garçons:', err);  // Exibe erros, se houver
		}
	}

	async listarGarcomPorId(id) {
	try {
		// SQL para selecionar o garçom na tabela "garcom" pelo ID fornecido
		const sql = 'SELECT * FROM garcom WHERE idGarcom = ?';
		
		// Executa a query de seleção e espera o resultado
		const [results] = await this.connection.query(sql, [id]);

		// Verifica se há um garçom com o ID fornecido
		if (results.length > 0) {
			const garcom = results[0]; // Como o ID é único, pega o primeiro (e único) resultado
			console.log(`Garçom encontrado: ID: ${garcom.idGarcom}, Nome: ${garcom.nome}`);
		} else {
			console.log(`Nenhum garçom encontrado com o ID "${idGarcom}".`);
		}
	} catch (err) {
		console.error('Erro ao listar garçom:', err);  // Exibe erros, se houver
	}

	}

	async   editarGarcom(id, novoNome) {
		try {
			// SQL para atualizar o nome do garçom na tabela "garcom" pelo ID fornecido
			const sql = 'UPDATE garcom SET nome = ? WHERE idGarcom = ?';

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
			const sql = 'DELETE FROM garcom WHERE idGarcom = ?';
	
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
	   ///////////////////////
	  ///// CRUD Mesa ///////
     ///////////////////////
	async createMesa(numero, status, garcom) {
		try {
			// SQL para inserir um nova mesa na tabela "Mesa"
			const sql = 'INSERT INTO Mesa (numero, status, Garcom_idGarcom) VALUES (?, ?, ?)';

			// Executa a query de inserção e espera o resultado
			const [results] = await this.connection.query(sql, [numero, status, garcom]);

			console.log('Mesa criada com sucesso! ID:', results.insertId);  // Exibe o ID do produto criado
			let mesa = new Mesa(results.insertId, numero, status, garcom)
			return mesa;
		} catch (err) {
			console.error('Erro ao criar mesa:', err);  // Exibe erros, se houver
		} 
	}

	async criaObjMesa(id ,numero, status, garcom){
		return mesa = new Mesa()
	}

	  //////////////////
	 ///CRUD Produto///
	//////////////////

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
	//FALTA IMPLEMENTAR
	async listarProdutoQtd(){
		
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

	  /////////////////////
	 ////CRUD PEDIDO /////
	///////////////////// 
	
	async createPedido(status, cliente, garcom){
		try {
			   // SQL para inserir um novo produto na tabela "Pedido"
				const sql = 'INSERT INTO pedido (status, Cliente_idCliente, Garcom_idGarcom) VALUES (?, ?, ?)';
		
				// Executa a query de inserção e espera o resultado
				const [results] = await this.connection.query(sql, [status, cliente, garcom]);
				let pedido =  new Pedido(results.insertId, cliente, status, garcom)  
				return pedido
		
				
			} catch (err) {
				console.error('Erro ao criar pedido:', err);  // Exibe erros, se houver
			} 
		}

	async editarStatusPedido(id, novoStatus) {
		try {
			console.log("Parâmetros passados para editarStatusPedido:", { id, novoStatus });  // Verifique os valores
			let idPedido = parseInt(id, 10); //única maneira encontrada de fazer id virar um int.
			const sql = 'UPDATE Pedido SET status = ? WHERE idPedido = ?';
			const [result] = await this.connection.query(sql, [novoStatus, idPedido]);
	
			if (result.affectedRows > 0) {
				console.log(`Pedido com ID "${id}" foi alterado para "${novoStatus}".`);
			} else {
				console.log(`Nenhum pedido encontrado com o ID "${id}".`);
			}
		} catch (err) {
			console.error('Erro ao editar pedido:', err);
		}
	}
		


	
	  ///////////////
	 ///CRUD CONTA//
	///////////////

	async createConta(quantidade, pedido, produto, cliente){
		try{
			const sql = 'INSERT INTO conta (Quantidade, Pedido_idPedido, Produto_idProduto, Cliente_idCliente) VALUES (?, ?, ?, ?)';
			const [results] = await this.connection.query(sql, [quantidade, pedido, produto, cliente])
			let conta 
			conta = new Conta(results.insertId, quantidade, pedido, produto, conta)
			return conta;

		} catch(err){
			console.error('Erro ao criar conta: ', err)
		}
	}
	
	async editarContaFormaPagamento(conta){

	}

	
}
 

export default GerenciadorCRUD;