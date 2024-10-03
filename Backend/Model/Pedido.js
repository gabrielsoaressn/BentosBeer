class Pedido {
    constructor(id, cliente, status = 'Aberto', garcom) {
        this.id = id;
        this.status = status; //solicitado, entregue
        this.cliente = cliente;
        this.garcom = garcom;
    }
}
export default Pedido;
