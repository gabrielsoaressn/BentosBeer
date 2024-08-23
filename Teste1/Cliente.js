class Cliente {
    constructor(id, nome, mesa, pedidos = [], historicoCompras = [], torcedorFlamengo = false, assisteOnePiece = false, cidade = ''){
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

    calcularDesconto() {
        if (this.torcedorFlamengo || this.assisteOnePiece || this.cidade.toLowerCase() === 'sousa') {
            return 5; // 5% de desconto
        }
        return 0;
    }

    aplicarDesconto(total) {
        const desconto = this.calcularDesconto();
        return total - (total * (desconto / 100));
    }
}
    
    export default Cliente;