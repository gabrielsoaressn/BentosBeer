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
        // total sem desconto
        return this.produtos.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
    }
}

export default Pedido;
