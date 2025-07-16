const bcrypt = require('bcryptjs');

const password = 'admin'; // <-- Coloque aqui a senha que você quer usar

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erro ao gerar hash:', err);
  } else {
    console.log('Palavra-passe:', password);
    console.log('Hash gerado:', hash);
  }
});