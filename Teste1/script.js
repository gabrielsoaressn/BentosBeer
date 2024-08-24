import Cliente from './Cliente.js';
import Produto from './Produto.js';
import Garcom from './Garcom.js';
import Mesa from './Mesa.js';

// variaveis globais para armazenar dados
let clientes = [];
let produtos = [];
let garcons = [];
let mesas = [];

// funcao para mostrar a secao selecionada
function mostrarSeção(seçãoId) {
    const seções = document.querySelectorAll('.section');
    seções.forEach(seção => seção.style.display = 'none');
    document.getElementById(seçãoId).style.display = 'block';
}

// menu de navegação
document.getElementById('menuClientes').addEventListener('click', () => mostrarSeção('clientesSection'));
document.getElementById('menuProdutos').addEventListener('click', () => mostrarSeção('produtosSection'));
document.getElementById('menuGarcons').addEventListener('click', () => mostrarSeção('garconsSection'));
document.getElementById('menuMesas').addEventListener('click', () => mostrarSeção('mesasSection'));

// função para atualizar a lista de clientes no HTML
function atualizarListaClientes() {
    const lista = document.getElementById('clientesLista');
    lista.innerHTML = '';
    clientes.forEach(cliente => {
        const li = document.createElement('li');
        li.textContent = `Nome: ${cliente.nome}, Mesa: ${cliente.mesa}`;
        lista.appendChild(li);
    });
}

// funcao para atualizar a lista de produtos no HTML
function atualizarListaProdutos() {
    const lista = document.getElementById('produtosLista');
    lista.innerHTML = '';
    produtos.forEach(produto => {
        const li = document.createElement('li');
        li.textContent = `Nome: ${produto.nome}, Preço: R$${produto.preco.toFixed(2)}`;
        lista.appendChild(li);
    });
}

// Funcao para atualizar a lista de garçons no HTML
function atualizarListaGarcons() {
    const lista = document.getElementById('garconsLista');
    lista.innerHTML = '';
    garcons.forEach(garcom => {
        const li = document.createElement('li');
        li.textContent = `Nome: ${garcom.nome}`;
        lista.appendChild(li);
    });
}

// Função para atualizar a lista de mesas no HTML
function atualizarListaMesas() {
    const lista = document.getElementById('mesasLista');
    lista.innerHTML = '';
    mesas.forEach(mesa => {
        const li = document.createElement('li');
        li.textContent = `Número: ${mesa.numero}, Status: ${mesa.status}`;
        lista.appendChild(li);
    });
}

// evento ao botao de adicionar cliente
document.getElementById('adicionarCliente').addEventListener('click', () => {
    const nome = document.getElementById('clienteNome').value;
    const mesa = document.getElementById('clienteMesa').value;
    if (nome && mesa) {
        const cliente = new Cliente(clientes.length + 1, nome, mesa);
        clientes.push(cliente);
        atualizarListaClientes();
        document.getElementById('clienteNome').value = '';
        document.getElementById('clienteMesa').value = '';
    }
});

// evento ao botao de adicionar produto
document.getElementById('adicionarProduto').addEventListener('click', () => {
    const nome = document.getElementById('produtoNome').value;
    const preco = parseFloat(document.getElementById('produtoPreco').value);
    if (nome && !isNaN(preco)) {
        const produto = new Produto(produtos.length + 1, nome, preco);
        produtos.push(produto);
        atualizarListaProdutos();
        document.getElementById('produtoNome').value = '';
        document.getElementById('produtoPreco').value = '';
    }
});

// eevento do botao de adicionar garçom
document.getElementById('adicionarGarcom').addEventListener('click', () => {
    const nome = document.getElementById('garcomNome').value;
    if (nome) {
        const garcom = new Garcom(garcons.length + 1, nome);
        garcons.push(garcom);
        atualizarListaGarcons();
        document.getElementById('garcomNome').value = '';
    }
});

// evento ao botao de adicionar mesa
document.getElementById('adicionarMesa').addEventListener('click', () => {
    const numero = parseInt(document.getElementById('mesaNumero').value);
    if (!isNaN(numero)) {
        const mesa = new Mesa(mesas.length + 1, numero);
        mesas.push(mesa);
        atualizarListaMesas();
        document.getElementById('mesaNumero').value = '';
    }
});
