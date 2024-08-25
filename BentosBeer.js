import ConnectionDB from './Classes/ConnectionDB.js';
import GerenciadorCRUD from './Classes/GerenciadorCRUD.js';

async function main() {
    const db = new ConnectionDB();
    await db.connect()
    const gerenciador = new GerenciadorCRUD(db)
    
    //bateria de testes
    //await gerenciador.createGarcom("Carlos")
    await gerenciador.listarGarcom()
    await gerenciador.listarGarcomPorNome("Carlos")
    await gerenciador.listarGarcomPorId(2)
    //await gerenciador.editarGarcom(4, "Arnaldo")
    //await gerenciador.excluirGarcom(1)

}
main();
