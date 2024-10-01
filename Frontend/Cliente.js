class Cliente {
    constructor(id, nome, mesa, pedido = []) {
        this.id = id;
        this.nome = nome;
        this.mesa =  mesa;
        this.pedido = pedido
    }
}

export default Cliente;