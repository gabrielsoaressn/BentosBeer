class Pedido {
    constructor(id, cliente, produtos = []) {
        this.id = id;
        this.cliente = cliente;
        this.produtos = produtos;
    }

    adicionarProduto(produto, quantidade) {
        this.produtos.push({ produto, quantidade });
    }

    removerProduto(produtoId) {
        this.produtos = this.produtos.filter(item => item.produto.id !== produtoId);
    }

    calcularTotal() {
        // pedido sem desconto
        let total = this.produtos.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
        // chama o aplicar desconto do cliente
        total = this.cliente.aplicarDesconto(total);
        return total;
    }
}

export default Pedido;
