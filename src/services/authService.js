const bcrypt = require('bcrypt');
const db = require('../config/db'); // Necesario para consultar la DB

const saltRounds = 10; // Nivel de dificultad para el hashing de bcrypt


async function hashPassword(password) {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to hash password.');
    }
}

async function comparePassword(password, hashedPassword) {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        console.error('Error comparing password:', error);
        throw new Error('Failed to compare password.');
    }
}

async function loginUser(username, password) {
    let connection;
    try {
        connection = await db.getConnection();
        const [rows] = await connection.execute(
            'SELECT id, username, password, status FROM clients WHERE username = ?',
            [username]
        );
        if (rows.length === 0) {
            return null; // Usuario no encontrado
        }
        const client = rows[0];
        // Verificar el estado del cliente
        if (client.status === 0) {
            throw new Error('User account is disabled.');
        }
        // Comparar la contraseña proporcionada con el hash almacenado
        const passwordMatch = await comparePassword(password, client.password);
        if (passwordMatch) {
            // Eliminar el hash de la contraseña por seguridad antes de devolver el objeto cliente
            delete client.password;
            return client; // Login exitoso
        } else {
            return null; // Contraseña incorrecta
        }
    } catch (error) {
        console.error('Error during user login:', error.message);
        throw new Error(error.message || 'Login failed due to a server error.');
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    hashPassword,
    comparePassword,
    loginUser
};