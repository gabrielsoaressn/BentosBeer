class Cliente {
    constructor(id, nome, mesa, pedidos = [], torcedorFlamengo = false, assisteOnePiece = false, cidade = '') {
        this.id = id;
        this.nome = nome;
        this.mesa = mesa;
        this.pedidos = pedidos;
        this.torcedorFlamengo = torcedorFlamengo;
        this.assisteOnePiece = assisteOnePiece;
        this.cidade = cidade;
    }

    adicionarPedido(pedido) {
        this.pedidos.push(pedido);
    }

    removerPedido(pedidoId) {
        this.pedidos = this.pedidos.filter(pedido => pedido.id !== pedidoId);
    }

    aplicarDesconto(total) {
        let desconto = (this.torcedorFlamengo || this.assisteOnePiece || this.cidade.toLowerCase() === 'sousa') ? 5 : 0; // 5% de desconto
        return total - (total * (desconto / 100));
    }
}

export default Cliente;
