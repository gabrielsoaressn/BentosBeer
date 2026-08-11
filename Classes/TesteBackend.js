// Importa a classe ConnectionDB que gerencia a conexão com o banco de dados
import ConnectionDB from './ConnectionDB.cjs';

// Importa a classe GerenciadorCRUD que implementa as operações CRUD
import GerenciadorCRUD from './GerenciadorCRUD.js';

// Importa a classe Pedido para manipular os pedidos
import Pedido from './Pedido.js';

// Função principal (main)
async function main() {
    try {
        // Instancia a classe GerenciadorCRUD, passando a conexão (supondo que ela já foi configurada)
        const gerenciador = new GerenciadorCRUD(connection);

        // Teste: Criar um novo garçom
        await gerenciador.createGarcom('Carlos');

        // Teste: Listar todos os garçons
 //       await gerenciador.listarGarcom();

        // Teste: Criar um novo pedido
   //     await gerenciador.createPedido(1, 2, 3, 4, 'Aberto'); // cliente_id, garcom_id, produto_id, quantidade, status

        // Teste: Listar todos os pedidos
     //   await gerenciador.listarPedidos();

        // Teste: Listar pedidos por ClienteID
       // await gerenciador.listarPedidosPorCliente(1); // Substitua pelo ID do cliente desejado

    } catch (err) {
        console.error('Erro na execução:', err);
    } finally {
        console.log("Finalizando execução");
        connection.disconnect(); // Certifique-se de fechar a conexão quando terminar
    }
}

// Chama a função principal
main();
