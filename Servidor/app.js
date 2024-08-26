///////////////////////////////////
// Funções de Filtragem
///////////////////////////////////

// Função para filtrar clientes por nome
function filtrarClientes(nomeFiltro) {
    const lista = document.getElementById('clientesLista');
    const clientes = Array.from(lista.querySelectorAll('li'));

    clientes.forEach(cliente => {
        const nomeCliente = cliente.textContent.toLowerCase();
        cliente.style.display = nomeCliente.includes(nomeFiltro.toLowerCase()) ? '' : 'none';
    });
}

// Função para filtrar produtos por nome
function filtrarProdutos(nomeFiltro) {
    const lista = document.getElementById('produtosLista');
    const produtos = Array.from(lista.querySelectorAll('li'));

    produtos.forEach(produto => {
        const nomeProduto = produto.textContent.toLowerCase();
        produto.style.display = nomeProduto.includes(nomeFiltro.toLowerCase()) ? '' : 'none';
    });
}

///////////////////////////////////
// Eventos de Pesquisa Dinâmica
///////////////////////////////////

// Evento para campo de pesquisa de clientes por nome
document.getElementById('pesquisaCliente').addEventListener('input', (event) => {
    filtrarClientes(event.target.value);
});

// Evento para campo de pesquisa de produtos por nome
document.getElementById('pesquisaProduto').addEventListener('input', (event) => {
    filtrarProdutos(event.target.value);
});

///////////////////////////////////
// Funções de Exibição de Seções
///////////////////////////////////

// Função para mostrar a seção selecionada
function mostrarSeção(seçãoId) {
    const seções = document.querySelectorAll('.section');
    seções.forEach(seção => seção.style.display = 'none');
    document.getElementById(seçãoId).style.display = 'block';
}

///////////////////////////////////
// Funções CRUD para Clientes
///////////////////////////////////

// Função para listar clientes
async function listarClientes() {
    try {
        const response = await fetch('http://localhost:3000/cliente');
        if (response.ok) {
            const clientes = await response.json();
            const lista = document.getElementById('clientesLista');
            lista.innerHTML = '';
            clientes.forEach(cliente => {
                const li = document.createElement('li');
                li.textContent = `ID: ${cliente.id}, Nome: ${cliente.nome}, Mesa: ${cliente.mesa}`;
                
                // Criando o grupo de botões
                const buttonGroup = document.createElement('div');
                buttonGroup.className = 'button-group';

                // Botão de Editar
                const editButton = document.createElement('button');
                editButton.textContent = 'Editar';
                editButton.onclick = () => editarCliente(cliente.id, cliente.nome, cliente.mesa);
                buttonGroup.appendChild(editButton);

                // Botão de Remover
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Remover';
                deleteButton.onclick = () => removerCliente(cliente.id);
                buttonGroup.appendChild(deleteButton);

                // Adicionando o grupo de botões ao item da lista
                li.appendChild(buttonGroup);
                lista.appendChild(li);
            });
        } else {
            console.error('Erro ao listar clientes:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
}

// Função para adicionar um cliente
document.getElementById('adicionarCliente').addEventListener('click', async () => {
    const nome = document.getElementById('clienteNome').value;
    const mesa = document.getElementById('clienteMesa').value;
    
    if (nome && mesa) {
        try {
            const response = await fetch('http://localhost:3000/cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, mesa })
            });
            if (response.ok) {
                listarClientes(); // Atualiza a lista de clientes após adicionar
                document.getElementById('clienteNome').value = ''; // Limpa o campo de nome
                document.getElementById('clienteMesa').value = ''; // Limpa o campo de mesa
            } else {
                const errorData = await response.json();
                alert(`Erro ao criar cliente: ${errorData.error}`); // Exibe a mensagem de erro do servidor
            }
        } catch (error) {
            console.error('Erro ao enviar requisição:', error);
        }
    } else {
        alert('Nome e mesa são necessários.'); // Exibe um alerta caso nome ou mesa estejam vazios
    }
});

// Função para editar um cliente
async function editarCliente(id, nomeAtual, mesaAtual) {
    const novoNome = prompt("Digite o novo nome do cliente:", nomeAtual);
    const novaMesa = prompt("Digite a nova mesa do cliente:", mesaAtual);
    
    if (novoNome && novaMesa) {
        try {
            const response = await fetch(`http://localhost:3000/cliente/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: novoNome, mesa: novaMesa })
            });
            if (response.ok) {
                listarClientes(); // Atualiza a lista de clientes após a edição
            } else {
                console.error('Erro ao editar cliente:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao enviar requisição de edição:', error);
        }
    }
}

// Função para remover um cliente
async function removerCliente(id) {
    try {
        const response = await fetch(`http://localhost:3000/cliente/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            listarClientes(); // Atualiza a lista após remover
        } else {
            console.error('Erro ao remover cliente:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao remover cliente:', error);
    }
}

///////////////////////////////////
// Funções CRUD para Produtos
///////////////////////////////////

// Função para listar produtos
async function listarProdutos() {
    try {
        const response = await fetch('http://localhost:3000/produto');
        if (response.ok) {
            const produtos = await response.json();
            const lista = document.getElementById('produtosLista');
            lista.innerHTML = '';
            produtos.forEach(produto => {
                const li = document.createElement('li');
                li.textContent = `ID: ${produto.id}, Nome: ${produto.nome}, Preço: R$${produto.preco}`;
                
                // Criando o grupo de botões
                const buttonGroup = document.createElement('div');
                buttonGroup.className = 'button-group';

                // Botão de Editar
                const editButton = document.createElement('button');
                editButton.textContent = 'Editar';
                editButton.onclick = () => editarProduto(produto.id, produto.nome, produto.preco);
                buttonGroup.appendChild(editButton);

                // Botão de Remover
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Remover';
                deleteButton.onclick = () => removerProduto(produto.id);
                buttonGroup.appendChild(deleteButton);

                // Adicionando o grupo de botões ao item da lista
                li.appendChild(buttonGroup);
                lista.appendChild(li);
            });
        } else {
            console.error('Erro ao listar produtos:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
    }
}

// Função para adicionar um produto
document.getElementById('adicionarProduto').addEventListener('click', async () => {
    const nome = document.getElementById('produtoNome').value;
    const preco = parseFloat(document.getElementById('produtoPreco').value);
    
    if (nome && !isNaN(preco)) {
        try {
            const response = await fetch('http://localhost:3000/produto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, preco })
            });
            if (response.ok) {
                listarProdutos(); // Atualiza a lista de produtos após adicionar
                document.getElementById('produtoNome').value = ''; // Limpa o campo de nome
                document.getElementById('produtoPreco').value = ''; // Limpa o campo de preço
            } else {
                console.error('Erro ao criar produto:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao enviar requisição:', error);
        }
    } else {
        console.error('Nome e preço são necessários.');
    }
});

// Função para editar um produto
async function editarProduto(id, nomeAtual, precoAtual) {
    const novoNome = prompt("Digite o novo nome do produto:", nomeAtual);
    const novoPreco = parseFloat(prompt("Digite o novo preço do produto:", precoAtual));
    
    if (novoNome && !isNaN(novoPreco)) {
        try {
            const response = await fetch(`http://localhost:3000/produto/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: novoNome, preco: novoPreco })
            });
            if (response.ok) {
                listarProdutos(); // Atualiza a lista de produtos após a edição
            } else {
                console.error('Erro ao editar produto:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao enviar requisição de edição:', error);
        }
    }
}

// Função para remover um produto
async function removerProduto(id) {
    try {
        const response = await fetch(`http://localhost:3000/produto/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            listarProdutos(); // Atualiza a lista após remover
        } else {
            console.error('Erro ao remover produto:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao remover produto:', error);
    }
}

///////////////////////////////////
// Funções CRUD para Garçons
///////////////////////////////////

// Função para listar garçons
async function listarGarcons() {
    try {
        const response = await fetch('http://localhost:3000/garcom');
        if (response.ok) {
            const garcons = await response.json();
            const lista = document.getElementById('garconsLista');
            lista.innerHTML = ''; // Limpa a lista existente

            garcons.forEach(garcom => {
                const li = document.createElement('li');
                li.textContent = `ID: ${garcom.id}, Nome: ${garcom.nome}`;

                // Grupo de botões para editar e remover
                const buttonGroup = document.createElement('div');
                buttonGroup.className = 'button-group';

                // Botão de Editar
                const editButton = document.createElement('button');
                editButton.textContent = 'Editar';
                editButton.onclick = () => editarGarcom(garcom.id, garcom.nome);
                buttonGroup.appendChild(editButton);

                // Botão de Remover
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Remover';
                deleteButton.onclick = () => removerGarcom(garcom.id);
                buttonGroup.appendChild(deleteButton);

                li.appendChild(buttonGroup);
                lista.appendChild(li);
            });
        } else {
            console.error('Erro ao listar garçons:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao buscar garçons:', error);
    }
}

// Função para filtrar garçons por nome
function filtrarGarcons(nomeFiltro) {
    const lista = document.getElementById('garconsLista');
    const garcons = Array.from(lista.querySelectorAll('li'));

    garcons.forEach(garcom => {
        const nomeGarcom = garcom.textContent.toLowerCase();
        if (nomeGarcom.includes(nomeFiltro.toLowerCase())) {
            garcom.style.display = '';
        } else {
            garcom.style.display = 'none';
        }
    });
}

// Função para editar um garçom
async function editarGarcom(id, nomeAtual) {
    const novoNome = prompt("Digite o novo nome do garçom:", nomeAtual);
    if (novoNome) {
        try {
            const response = await fetch(`http://localhost:3000/garcom/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: novoNome })
            });
            if (response.ok) {
                listarGarcons(); // Atualiza a lista de garçons após editar
            } else {
                console.error('Erro ao editar garçom:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao enviar requisição:', error);
        }
    }
}

// Evento para campo de pesquisa de garçons por nome
document.getElementById('pesquisaGarcom').addEventListener('input', (event) => {
    const filtroNome = event.target.value;
    filtrarGarcons(filtroNome);
});

// Função para adicionar um garçom
document.getElementById('adicionarGarcom').addEventListener('click', async () => {
    const nome = document.getElementById('garcomNome').value;

    if (nome) {
        try {
            const response = await fetch('http://localhost:3000/garcom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome })
            });
            if (response.ok) {
                listarGarcons(); // Atualiza a lista de garçons após adicionar
                document.getElementById('garcomNome').value = ''; // Limpa o campo de nome
            } else {
                console.error('Erro ao criar garçom:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao enviar requisição:', error);
        }
    } else {
        console.error('Nome é necessário.');
    }
});

// Função para editar um garçom
async function editarGarcom(id) {
    const novoNome = prompt("Digite o novo nome do garçom:");
    if (novoNome) {
        try {
            const response = await fetch(`http://localhost:3000/garcom/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: novoNome })
            });
            if (response.ok) {
                listarGarcons(); // Atualiza a lista de garçons após editar
            } else {
                console.error('Erro ao editar garçom:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao enviar requisição:', error);
        }
    }
}

// Função para remover um garçom
async function removerGarcom(id) {
    try {
        const response = await fetch(`http://localhost:3000/garcom/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            listarGarcons(); // Chame esta função para atualizar a lista após a remoção
        } else {
            console.error('Erro ao remover garçom:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao remover garçom:', error);
    }
}

///////////////////////////////////
// Funções de Busca Dinâmica por ID
///////////////////////////////////

// Função para buscar cliente por ID dinamicamente
document.getElementById('clienteIdInput').addEventListener('input', async (event) => {
    const id = event.target.value;
    if (id) {
        try {
            const response = await fetch(`http://localhost:3000/cliente/${id}`);
            if (response.ok) {
                const cliente = await response.json();
                const lista = document.getElementById('clientesLista');
                lista.innerHTML = ''; // Limpa a lista atual
                const li = document.createElement('li');
                li.textContent = `ID: ${cliente.id}, Nome: ${cliente.nome}, Mesa: ${cliente.mesa}`;
                
                // Criando o botão de remover
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Remover';
                deleteButton.onclick = () => removerCliente(cliente.id);
                
                // Adiciona o botão ao item da lista
                li.appendChild(deleteButton);
                lista.appendChild(li);
            } else {
                console.error('Cliente não encontrado:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
        }
    } else {
        listarClientes(); // Se o campo de ID estiver vazio, lista todos os clientes
    }
});

// Função para buscar produto por ID dinamicamente
document.getElementById('produtoIdInput').addEventListener('input', async (event) => {
    const id = event.target.value;
    if (id) {
        try {
            const response = await fetch(`http://localhost:3000/produto/${id}`);
            if (response.ok) {
                const produto = await response.json();
                const lista = document.getElementById('produtosLista');
                lista.innerHTML = ''; // Limpa a lista atual
                const li = document.createElement('li');
                li.textContent = `ID: ${produto.id}, Nome: ${produto.nome}, Preço: R$${produto.preco}`;
                
                // Criando o botão de remover
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Remover';
                deleteButton.onclick = () => removerProduto(produto.id);
                
                // Adiciona o botão ao item da lista
                li.appendChild(deleteButton);
                lista.appendChild(li);
            } else {
                console.error('Produto não encontrado:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
        }
    } else {
        listarProdutos(); // Se o campo de ID estiver vazio, lista todos os produtos
    }
});

///////////////////////////////////
// Inicialização
///////////////////////////////////

// Inicializa as listas ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    mostrarSeção('clientesSection'); // Mostra a seção de clientes por padrão
    listarClientes(); // Chama a função para listar clientes ao carregar
    listarProdutos(); // Chama a função para listar produtos ao carregar
});

document.addEventListener('DOMContentLoaded', () => {
    listarGarcons(); // Chama a função para listar garçons ao carregar
});

// Menu de navegação
document.getElementById('menuClientes').addEventListener('click', () => {
    mostrarSeção('clientesSection');
    listarClientes();
});

document.getElementById('menuProdutos').addEventListener('click', () => {
    mostrarSeção('produtosSection');
    listarProdutos();
});

document.getElementById('menuGarcons').addEventListener('click', () => {
    mostrarSeção('garconsSection');
    listarGarcons();
});
