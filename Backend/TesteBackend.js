import ConnectionDB from './Persistence/ConnectionDB.js';
import GerenciadorCRUD from './Controller/GerenciadorCRUD.js';

async function main() {
    const db = new ConnectionDB();
    await db.connect()
    const gerenciador = new GerenciadorCRUD(db)
    //carrega informações de persistência
    let clientes = await gerenciador.criaObjsClientes(); //FUNCIONA
    let garcons = await gerenciador.criaObjsGarcons(); //FUNCIONA
    //bateria de testes
    //clientes.push(garcons[0].cadastrarCliente('Dudu', 1,'Flamengo', 'Dragon Ball Z' ))
    //console.log(garcons)
    //await gerenciador.listarGarcom() //FUNCIONA
    //await gerenciador.listarGarcomPorNome("Carlos") //FUCIONA
    //await gerenciador.listarGarcomPorId(2)  //FUNCIONA
    //await gerenciador.editarGarcom(4, "Arnaldo")
    //await gerenciador.excluirGarcom(i)
    //garcons[0].anotarPedido(clientes[2].id,1,2);
    //garcons[0].entregarPedido(14);
    //await gerenciador.createMesa(1,'ocupada', 1); //FUNCIONA
    //await gerenciador.createPedido("solicitado", clientes[0].id, garcons[0].id); //FUNCIONA
    garcons[0].tirarConta(clientes[2]);
    
    db.close;
}
main();