class GerenciadorCRUD {
    constructor(connection) {
        this.connection = connection;
    }

    createProduto(produto, callback) {
        Produto.create(this.connection, produto, callback);
    }

    readProduto(id, callback) {
        Produto.read(this.connection, id, callback);
    }

    updateProduto(produto, callback) {
        Produto.update(this.connection, produto, callback);
    }

    deleteProduto(id, callback) {
        Produto.delete(this.connection, id, callback);
    }
}

module.exports = GerenciadorCRUD