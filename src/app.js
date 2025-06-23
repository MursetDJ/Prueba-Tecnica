const { calculateAvailable, processAdvance } = require('./services/advanceService');
const { loginUser, hashPassword } = require('./services/authService'); 
const db = require('./config/db'); 
async function runExample() {
    console.log('--- Iniciando Ejemplo de Uso ---');

    let connection;
    try {
        connection = await db.getConnection();
        await connection.execute('DELETE FROM advances WHERE client_id = 1');
        await connection.execute('UPDATE clients SET status = 0 WHERE id = 3'); // Asegura que Pedro esté habilitado para pruebas
        console.log('Limpiadas solicitudes de adelanto previas para el cliente 1 y habilitado cliente 3.');
    } catch (cleanUpError) {
        console.error('Error during cleanup:', cleanUpError.message);
    } finally {
        if (connection) {
            connection.release();
        }
    }
    // Ejemplo de processAdvance (cliente Juan Perez, ID: 1)
    const salary = 2000;
    const date = new Date('2026-06-15T12:00:00Z'); // 15 de junio de 2026
    const availableAmount = calculateAvailable(salary, date);
    console.log(`\nFecha: ${date.toDateString()}`);
    console.log(`Sueldo Mensual: S/ ${salary.toFixed(2)}`);
    console.log(`Monto disponible para adelanto (calculado en JS): S/ ${availableAmount.toFixed(2)}`);

    // --- Ejemplo de Acceso de Usuario ---
    console.log('\n--- Probando Acceso de Usuario ---');

    // Login exitoso
    try {
        const user = await loginUser('juanperez', 'password123'); // Usa la contraseña que hasheaste
        if (user) {
            console.log('Login exitoso para:', user.username);
            
            // Aquí podrías usar user.id para las solicitudes de adelanto
        } else {
            console.log('Login fallido: Credenciales incorrectas para juanperez');
        }
    } catch (error) {
        console.error('Error durante el login de juanperez:', error.message);
    }

    // Login fallido (contraseña incorrecta)
    try {
        const user = await loginUser('juanperez', 'contrasena_incorrecta');
        if (user) {
            console.log('Login exitoso (esto no debería ocurrir):', user.username);
        } else {
            console.log('Login fallido: Credenciales incorrectas para juanperez con pass incorrecta');
        }
    } catch (error) {
        console.error('Error durante el login (contraseña incorrecta):', error.message);
    }

    // Login fallido (usuario deshabilitado)
    try {
        const user = await loginUser('pedrolopez', 'password123');
        if (user) {
            console.log('Login exitoso (esto no debería ocurrir):', user.username);
        } else {
            console.log('Login fallido: Credenciales incorrectas para pedrolopez (deshabilitado)');
        }
    } catch (error) {
        console.error('Error esperado para usuario deshabilitado (pedrolopez):', error.message);
    }

    // --- Fin del Ejemplo de Acceso de Usuario ---


    // Ejemplo de processAdvance (cliente Juan Perez, ID: 1)
    try {
        const user = await loginUser('juanperez', 'password123'); // Usa la contraseña que hasheaste
        if (user) {
            console.log('Login exitoso para:', user.username);
            console.log('\n--- Procesando Solicitud de Adelanto para Cliente ID 1 ---');
            const requestedAmount = 900.00; // Monto a solicitar
            const result = await processAdvance(user.id, requestedAmount);
        console.log('Solicitud de adelanto procesada exitosamente:', result);
            // Aquí podrías usar user.id para las solicitudes de adelanto
        } else {
            console.log('Login fallido: Credenciales incorrectas para juanperez');
        }
        
    } catch (error) {
        console.error('Error al procesar la solicitud de adelanto:', error.message);
    }

    console.log('\n--- Fin del Ejemplo de Uso ---');
    // Es importante terminar el proceso si no es un servidor HTTP
    process.exit(0);
}

runExample();