class Conta {
    constructor(id, cliente, pedidos = [], mesa, garcom) {
        this.id = id;
        this.cliente = cliente;
        this.pedidos = pedidos;
        this.mesa = mesa;
        this.garcom = garcom;
        this.total = 0;
        this.status = 'Aberta';
    }

    adicionarPedido(pedido) {
        this.pedidos.push(pedido);
        this.calcularTotal(); // recalcula o total após adicionar um novo pedido
    }

    calcularTotal() {
        // Soma os totais de cada pedido
        let totalSemDesconto = this.pedidos.reduce((acc, pedido) => acc + pedido.calcularTotal(), 0);
        // Aplica o desconto do cliente
        this.total = this.cliente.aplicarDesconto(totalSemDesconto);
        return this.total;
    }

    fecharConta() {
        this.status = 'Fechada';
    }

    obterDetalhesConta() {
        return {
            cliente: this.cliente.nome,
            mesa: this.mesa.numero,
            garcom: this.garcom.nome,
            total: this.total,
            status: this.status
        };
    }
}

export default Conta;
