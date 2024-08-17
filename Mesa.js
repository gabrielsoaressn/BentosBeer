class Mesa {
    constructor(id, numero, status, clientes = []) {
        this.id = id;
        this.numero = numero;
        this.status = status; // Ex: 'Livre', 'Ocupada', 'Reservada' o que achas?
        this.clientes = clientes; // Array de objetos do tipo Cliente
    }
}