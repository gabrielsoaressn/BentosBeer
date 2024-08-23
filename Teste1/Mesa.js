class Mesa {
    constructor(id, numero, status = 'Livre') {
        this.id = id; // ID único da mesa
        this.numero = numero; // Número da mesa
        this.status = status; // Status da mesa ('Livre' ou 'Ocupada')
    }

    atualizarStatus(novoStatus) {
        // Atualiza o status da mesa
        this.status = novoStatus;
    }
}

export default Mesa;
