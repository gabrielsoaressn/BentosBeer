-- Criação do banco de dados
CREATE DATABASE BentosBeer;

-- Selecionar o banco de dados para uso
USE BentosBeer;

-- Criação das tabelas
CREATE TABLE Mesa (
  idMesa INT PRIMARY KEY,
  numero VARCHAR(45),
  status VARCHAR(255)
);

CREATE TABLE Garcom (
  idGarcom INT PRIMARY KEY,
  nome TEXT
);

CREATE TABLE Cliente (
  idCliente INT PRIMARY KEY,
  nome VARCHAR(45),
  status VARCHAR(255)
);

CREATE TABLE Pedido (
  idPedido INT PRIMARY KEY,
  Cliente_idCliente INT,
  Garcom_idGarcom INT,
  Mesa_idMesa INT,
  CONSTRAINT fk_Pedido_Cliente1 FOREIGN KEY (Cliente_idCliente) REFERENCES Cliente(idCliente),
  CONSTRAINT fk_Pedido_Garcom1 FOREIGN KEY (Garcom_idGarcom) REFERENCES Garcom(idGarcom),
  CONSTRAINT fk_Pedido_Mesa1 FOREIGN KEY (Mesa_idMesa) REFERENCES Mesa(idMesa)
);

CREATE TABLE Produto (
  idProduto INT PRIMARY KEY,
  nome VARCHAR(45),
  preco DECIMAL(10, 2)
);

CREATE TABLE Quantidade (
  Pedido_idPedido INT,
  Produto_idProduto INT,
  quantidade INT,
  PRIMARY KEY (Pedido_idPedido, Produto_idProduto),
  CONSTRAINT fk_Quantidade_Pedido1 FOREIGN KEY (Pedido_idPedido) REFERENCES Pedido(idPedido),
  CONSTRAINT fk_Quantidade_Produto1 FOREIGN KEY (Produto_idProduto) REFERENCES Produto(idProduto)
);
