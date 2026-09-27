// Copia los archivos de la web (carpeta padre) a www/ para empaquetarlos en la app.
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');
const DEST = path.join(__dirname, 'www');
const ITEMS = ['index.html', 'css', 'js', 'img', 'cursos', 'TRIQUI9_PIEDRAS'];

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
for (const item of ITEMS) {
    fs.cpSync(path.join(SRC, item), path.join(DEST, item), { recursive: true });
}
console.log('Web copiada a', DEST);
