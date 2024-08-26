class Relatorios {
    constructor(connection) {
        this.connection = connection;
    }

    async gerarRelatorio() {
        try {
            console.log('Iniciando geração de relatório');
    
            // Consulta para contar clientes, produtos e garçons
            const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM Cliente) AS totalClientes,
                    (SELECT COUNT(*) FROM Produto) AS totalProdutos,
                    (SELECT COUNT(*) FROM Garcom) AS totalGarcons
            `;
            const [results] = await this.connection.query(sql);
            
            // Consulta para obter os preços dos produtos
            const [produtos] = await this.connection.query('SELECT preco FROM Produto');
    
            // Reduz para calcular o valor total, garantindo que o preço seja tratado como número
            const valorTotalProdutos = produtos.reduce((total, produto) => total + Number(produto.preco), 0);
    
            // Adicione o valor total dos produtos ao resultado
            const relatorio = {
                ...results[0],
                valorTotalProdutos
            };
    
            console.log('Relatório gerado com sucesso:', relatorio);
            return relatorio;
        } catch (err) {
            console.error('Erro ao gerar relatório:', err);
            throw err;
        }
    }
    
}

export default Relatorios;
