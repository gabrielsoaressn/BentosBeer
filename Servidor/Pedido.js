class Pedido {
    constructor(id, cliente, produtos, qtd , status = 'Aberto') {
        this.id = id;
        this.cliente = cliente; // Objeto do tipo Cliente
        this.produtos = produtos; // Array de objetos do tipo Produto
        this.status = status; //solicitado, entregue
        this.qtd = qtd
    }
}
export default Pedido;