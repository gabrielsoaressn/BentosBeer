CREATE DATABASE IF NOT EXISTS BentosBeer;
USE BentosBeer;

CREATE TABLE IF NOT EXISTS Garcom (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Produto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    descricao TEXT
);

CREATE TABLE IF NOT EXISTS Cliente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    mesa INT NOT NULL
);

CREATE TABLE IF NOT EXISTS Pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idCliente INT,
    idGarcom INT,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('Aberto', 'Solicitado', 'Entregue') DEFAULT 'Aberto',
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idCliente) REFERENCES Cliente(id),
    FOREIGN KEY (idGarcom) REFERENCES Garcom(id)
);

CREATE TABLE IF NOT EXISTS Pedido_Produto (
    idPedido INT,
    idProduto INT,
    quantidade INT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL, -- PreÃ§o do produto no momento do pedido
    PRIMARY KEY (idPedido, idProduto),
    FOREIGN KEY (idPedido) REFERENCES Pedido(id),
    FOREIGN KEY (idProduto) REFERENCES Produto(id)
);

ALTER TABLE Garcom ADD COLUMN pedidos_atendidos INT DEFAULT 0;


CREATE TABLE IF NOT EXISTS Conta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idMesa INT,
    idGarcom INT,
    total DECIMAL(10, 2),
    status ENUM('Aberta', 'Fechada') NOT NULL,
    FOREIGN KEY (idMesa) REFERENCES Mesa(id),
    FOREIGN KEY (idGarcom) REFERENCES Garcom(id)
);

alter table pedido drop column qtd;
ALTER TABLE pedido DROP FOREIGN KEY pedido_ibfk_2;
alter table pedido drop column produto_id;
CREATE TABLE Conta (
	pedido_id INT,
         produto_id INT,
         Quantidade INT,
         PRIMARY KEY (pedido_id, produto_id),
         FOREIGN KEY (pedido_id) REFERENCES Pedido(id),  
         FOREIGN KEY (produto_id) REFERENCES Produto(id));