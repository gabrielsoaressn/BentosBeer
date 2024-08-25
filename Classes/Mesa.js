class Mesa {
    constructor(id, numero, status, garcom) {
        this.id = id;
        this.numero = numero;
        this.status = status; // Ex: 'Livre', 'Ocupada', 'Reservada'
        this.garcom = garcom;
    }
}
export default Mesa;