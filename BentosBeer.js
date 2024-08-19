// Função principal (main)
async function main() {
    try {

        console.log("olá, mundo")
    } catch (err) {
        console.error('Erro na execução:', err);
    } finally {
        console.log("to saindo")
    }
}

// Chama a função principal
main();
