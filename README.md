# Bento's Beer

### Como Executar?
Certifique-se de que já tenha instalado o Node.js em sua máquina
```sh
# No diretório BentosBeer:
~$ npm install mysql2
~$ node server.js
```

### Ambiente de desenvolvimento:
 - Visual Studio Code

### UML
#### Diagrama de Casos de Uso:
![DiagramaCasos](Diagramas/Casos_de_uso.png)
#### Diagrama de Classes:
![DiagramaClasses](Diagramas/Diagrama-de-classes.png)
#### Diagrama Modelo Conceitual
![DiagramaMC](Diagramas/Diagrama-Modelo-Coneitual.png)
#### Diagrama Estrutural
![DiagramaEstrutural](Diagramas/Diagrama-Estrutural.png)



* Caros Rafael e Rivando. peço que dêm uma olhada no diagrama canvas para entender as alterações que eu estou fazendo no código e também no banco de dados
* Obviamente o código só vai funcionar se vocês fizerem as alterações no seu banco de dados. Sugiro criar outro database com as alterações que eu coloquei no arquivo config_bd.mysql
* Tudo que eu fiz foi apenas na pasta Classes, pra não atrapalhar alguma coisa que vocês eventualmente estejam fazendo
* Resumindo criação de pastas para organização
  * Tentei pensar como camadas -> Persistência é responsável pela conexão com o banco de dados e por executar rotinas de inicialização e finalização, controller faz as funções que controlam o sistema, classes/classes é o modelo do nosso software e falta um view que é a parte de front-end
  * Melhorei alguns Create. Agora quando cria-se um Garçom(por exemplo) além de colocar uma linha no BD cria-se também um objeto.
  * Link para o canva: https://www.canva.com/design/DAGOChj3XoA/Ia3NcCoRix8qqJqAgc5jOQ/edit?utm_content=DAGOChj3XoA&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
### Contexto:

* Bento's Bar é um sistema de gerenciamento de um bar. Nele é possível realizar todas as atividades mais importantes que um CRUD precisa.
![Diagramas de BD](https://github.com/user-attachments/assets/7e91a9da-95f7-4001-90e8-2d3490644553)
