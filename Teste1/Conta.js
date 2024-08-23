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
        this.calcularTotal(); // recalcula o total apos adicionar um novo pedido
    }

    calcularTotal() {
        // soma cada pedido e calcula o total
        let total = this.pedidos.reduce((acc, pedido) => acc + pedido.calcularTotal(), 0);
        // aplica o desconto chamando a classe cliente onde está o método de aplicar o desconto
        this.total = this.cliente.aplicarDesconto(total);
        return this.total;
    }

    fecharConta() {
        // fecha a conta, atualizando o status
        this.status = 'Fechada';
    }

    obterDetalhesConta() {
        // resumo da conta
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
