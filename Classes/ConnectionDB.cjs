const mysql = require('mysql2');
  const connection = mysql.createConnection( {
          host: 'localhost',
          user: 'root',
          password: 'SouCareca123', 
          database: 'BentosBeer' 
      });
    
    connection.connect(function(err){
        console.log("Conexão estabelecida com sucesso")
    });

    /*connection.close(){
        if (this.connection) {
            await this.connection.end();
        }
    }
    
    connection.query(sql, params) {
        if (!this.connection) {
            throw new Error('Connection not established');
        }
        return this.connection.execute(sql, params);
    }


//export default ConnectionDB;*/