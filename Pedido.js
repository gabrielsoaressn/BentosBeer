class Pedido {
    constructor(cliente, garcom, produtos, qtd , status = 'Aberto') {
        this.cliente = cliente; 
        this.garcom = garcom;
        this.produtos = produtos;
        this.status = status;
        this.qtd = qtd
    }

}
export default Pedido;
