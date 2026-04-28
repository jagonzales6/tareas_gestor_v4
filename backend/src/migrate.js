/**
 * migrate.js — Inicializa la base de datos SQLite
 *
 * Uso:
 *   node src/migrate.js
 *
 * Crea el archivo SQLite en la ruta configurada en DATABASE_URL (.env)
 * y carga los datos iniciales si la base está vacía.
 * Ejecutar antes del primer npm start, o como paso de despliegue.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initSchema } = require('./database');

async function run() {
  try {
    await initSchema();
    console.log('\n✅ Base de datos SQLite lista.');
    console.log('   Inicia el servidor con: npm start\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err.message);
    process.exit(1);
  }
}

run();
