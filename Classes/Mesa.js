class Mesa {
    constructor(id, numero, status, garcom) {
        this.id = id;
        this.numero = numero;
        this.status = status; // Ex: 'Livre', 'Ocupada', 'Reservada' o que achas?
        this.garcom = garcom;
    }
}
module.exports = Mesa