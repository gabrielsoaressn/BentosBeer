class Conta {
    constructor(id, idMesa, idGarcom, total, status) {
        this.id = id;
        this.idMesa = idMesa;
        this.idGarcom = idGarcom;
        this.total = total;
        this.status = status; // Ex: 'Aberta', 'Fechada'
    }
}

export default Conta;