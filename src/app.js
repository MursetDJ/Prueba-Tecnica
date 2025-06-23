const { calculateAvailable, processAdvance } = require('./services/advanceService');

async function runExample() {
    console.log('--- Iniciando Ejemplo de Uso ---');

    // Ejemplo de calculateAvailable
    const salary = 2000;
    const date = new Date('2026-06-15T12:00:00Z'); // 15 de junio de 2026
    const availableAmount = calculateAvailable(salary, date);
    console.log(`\nFecha: ${date.toDateString()}`);
    console.log(`Sueldo Mensual: S/ ${salary.toFixed(2)}`);
    console.log(`Monto disponible para adelanto (calculado en JS): S/ ${availableAmount.toFixed(2)}`);

    // Ejemplo de processAdvance (cliente Juan Perez, ID: 1)
    try {
        console.log('\n--- Procesando Solicitud de Adelanto para Cliente ID 1 ---');
        // Asegúrate de que el cliente 1 no tenga adelantos pendientes/desembolsados en DB antes de esta prueba manual
        // DELETE FROM advances WHERE client_id = 1;
        const requestedAmount = 900.00; // Monto a solicitar

        const result = await processAdvance(1, requestedAmount);
        console.log('Solicitud de adelanto procesada exitosamente:', result);
    } catch (error) {
        console.error('Error al procesar la solicitud de adelanto:', error.message);
    }

    // Ejemplo de processAdvance (cliente Pedro Lopez, ID: 3 - deshabilitado)
    try {
        console.log('\n--- Intentando Procesar Solicitud para Cliente ID 3 (Deshabilitado) ---');
        const result = await processAdvance(3, 500.00);
        console.log('Solicitud procesada (esto no debería ocurrir):', result);
    } catch (error) {
        console.error('Error esperado al procesar para cliente deshabilitado:', error.message);
    }

    // Ejemplo de processAdvance (cliente Juan Perez, ID: 1 - con solicitud pendiente (si no se limpió la DB))
    try {
        console.log('\n--- Intentando Procesar Solicitud para Cliente ID 1 (con solicitud pendiente/desembolsada) ---');
        const result = await processAdvance(1, 500.00);
        console.log('Solicitud procesada (esto no debería ocurrir):', result);
    } catch (error) {
        console.error('Error esperado al procesar para cliente con solicitud previa:', error.message);
    }

    // Ejemplo de processAdvance (monto solicitado excede disponible)
    try {
        console.log('\n--- Intentando Procesar Solicitud para Cliente ID 2 (monto excede disponible) ---');
        const result = await processAdvance(2, 5000.00); // Maria Gomez (sueldo 3500)
        console.log('Solicitud procesada (esto no debería ocurrir):', result);
    } catch (error) {
        console.error('Error esperado al procesar por monto excedido:', error.message);
    }

    console.log('\n--- Fin del Ejemplo de Uso ---');
    // Es importante terminar el proceso si no es un servidor HTTP
    process.exit(0);
}

runExample();