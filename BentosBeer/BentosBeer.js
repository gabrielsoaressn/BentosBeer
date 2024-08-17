const gerenciador = new GerenciadorCRUD(connection);

// Criar um novo produto
const novoProduto = new Produto(null, 'Cerveja Artesanal', 12.50, 'Uma deliciosa cerveja artesanal.');
gerenciador.createProduto(novoProduto, (err, result) => {
    if (err) throw err;
    console.log('Produto criado com sucesso!');
});
