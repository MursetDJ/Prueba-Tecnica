const db = require('../config/db');
const { niubizTransfer } = require('./niubizService'); 



function calculateAvailable(salary, date) {
    if (!(date instanceof Date) || isNaN(date)) {
        throw new Error('Invalid date provided.');
    }
    if (typeof salary !== 'number' || salary <= 0) {
        throw new Error('Salary must be a positive number.');
    }

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    // Get the last day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    const dailySalary = salary / lastDayOfMonth;

    let daysWorked;
    const currentDay = date.getDate();

    // "solo se contabilizan los días ya se han laborado, por lo tanto para este caso no se cuenta el 15 de Junio, sino un día antes"
    if (currentDay === lastDayOfMonth) {
        daysWorked = lastDayOfMonth;
    } else {
        daysWorked = currentDay - 1;
    }

    if (daysWorked < 0) {
        daysWorked = 0;
    }

    const availableAmount = dailySalary * daysWorked;
    return parseFloat(availableAmount.toFixed(2)); // Round to 2 decimal places
}

async function processAdvance(clientId, requestedAmount) {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Invocar el procedimiento almacenado en MySQL
        const [rows] = await connection.execute(
            'CALL ProcessAdvanceRequest(?, ?)',
            [clientId, requestedAmount]
        );

        // El SP devuelve un SELECT con los resultados
        const spResult = rows[0][0]; // Acceder al primer resultado del primer conjunto de resultados

        if (!spResult || !spResult.advanceId) {
             // Esto se manejará mejor con SIGNAL SQLSTATE en el SP, pero es un fallback
            throw new Error('Falló al procesar la solicitud de adelanto.');
        }

        const { advanceId } = spResult;
        let amountTransferred = parseFloat(spResult.amountTransferred); 
        // 2. Llamar a niubizTransfer para simular la transferencia
        const transactionId = await niubizTransfer(amountTransferred);
        // 3. Actualizar el registro en advances con external_code y status = 2 (desembolsado)
        await connection.execute(
            'UPDATE advances SET external_code = ?, status = 2, updated_at = NOW() WHERE id = ?',
            [transactionId, advanceId]
        );

        await connection.commit();

        console.log(`Advance ID ${advanceId} procesada. Cantidad transferida: S/ ${amountTransferred.toFixed(2)}. Transaction ID: ${transactionId}`);

        return {
            advanceId,
            amountTransferred,
            transactionId,
            status: 'desembolsado'
        };

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error al procesar el adelanto:', error.message, error.sqlMessage ? `SQL Message: ${error.sqlMessage}` : '');
        throw new Error(error.sqlMessage || 'Error al procesar la solicitud de adelanto.');
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    calculateAvailable,
    processAdvance
};