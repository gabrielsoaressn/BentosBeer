const GerenciadorCRUD = require('../Controller/GerenciadorCRUD');
const ConnectionDB = require('../ConnectionDB');

async function Inicializa () {
	db = new ConnectionDB();
	gerenciador = new GerenciadorCRUD(db);
	gerenciador.CriaObjs
}