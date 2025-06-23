const { calculateAvailable, processAdvance } = require('../src/services/advanceService');
const { niubizTransfer } = require('../src/services/niubizService');
const db = require('../src/config/db');

jest.mock('../src/services/niubizService', () => ({
    // If niubizService.js uses 'module.exports = { niubizTransfer }':
    niubizTransfer: jest.fn((amount) => {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('Invalid amount: mock expects a number');
        }
        return Promise.resolve(`MOCK_NIUBIZ_ID_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
     })
}));

describe('Advance Service', () => {
    let connection;

    // Antes de todos los tests, obtener una conexión a la DB
    beforeAll(async () => {
        connection = await db.getConnection();
    });

    // Antes de cada test, limpiar y preparar la DB para un estado conocido
    beforeEach(async () => {
        await connection.execute('DELETE FROM advances'); // Limpiar solicitudes
        // Restablecer el estado de los clientes si es necesario para ciertos tests
        await connection.execute('UPDATE clients SET status = 1 WHERE id IN (1, 2)');
        // Asegurarse de que el cliente 1 no tenga solicitudes pendientes para los tests iniciales
        await connection.execute('INSERT INTO advances (client_id, commission, amount_transferred, igv, status) VALUES (1, 0.00, 0.00, 0.00, 1)'); // Inserta una pendiente para el test específico
        await connection.execute('DELETE FROM advances WHERE client_id = 1 AND status = 1'); // Eliminarla si no es para el test de "ya tiene"
    });

    // Después de todos los tests, cerrar la conexión a la DB
    afterAll(async () => {
        if (connection) {
            connection.release();
        }
        await db.end(); // Cerrar el pool de conexiones
    });

    // Test 1: Cálculo correcto de sueldo diario y monto disponible
    test('should correctly calculate available amount for an advance', () => {
        // Caso de uso: sueldo 2000, 15 de junio de 2026
        const salary = 2000;
        const date = new Date('2026-06-15T12:00:00Z'); // Usar UTC para evitar problemas de zona horaria

        const expectedAvailableAmount = 14 * (2000 / 30); // 14 días * (2000 / 30) = 933.333...
        // Redondeamos a 2 decimales como en la función
        const result = calculateAvailable(salary, date);
        expect(result).toBeCloseTo(933.33, 2); // Usa toBeCloseTo para números flotantes
    });

    // Test 2: Comportamiento del SP cuando el cliente está deshabilitado
    test('should reject advance if client is disabled (status = 0)', async () => {
        const disabledClientId = 3; // Cliente Pedro Lopez
        const requestedAmount = 500.00;

        // Asegurarse de que el cliente 3 esté deshabilitado para este test
        await connection.execute('UPDATE clients SET status = 0 WHERE id = ?', [disabledClientId]);

        await expect(processAdvance(disabledClientId, requestedAmount))
            .rejects
            .toThrow('El cliente está deshabilitado y no puede solicitar anticipos.');
    });

    // Test 3: Situación de cliente con solicitud pendiente o desembolsada (debe rechazarse)
    test('should reject advance if client has a pending or disbursed advance', async () => {
        const clientIdWithPending = 1; // Juan Perez
        const requestedAmount = 500.00;

        // Insertar una solicitud pendiente para el cliente 1 antes de la prueba
        await connection.execute('INSERT INTO advances (client_id, commission, amount_transferred, igv, status) VALUES (?, 0.00, 0.00, 0.00, 1)', [clientIdWithPending]);

        await expect(processAdvance(clientIdWithPending, requestedAmount))
            .rejects
            .toThrow('El cliente ya tiene una solicitud de anticipo pendiente o desembolsada.');
    });

    // Test 4: Llamada y resultado de niubizTransfer
    test('should call niubizTransfer with correct amount and return a transaction ID', async () => {
        const clientId = 2; // Maria Gomez
        const requestedAmount = 1000.00;

        // Necesitamos limpiar la DB para Maria si ya tiene un adelanto
        await connection.execute('DELETE FROM advances WHERE client_id = ?', [clientId]);

        // Simula la fecha para que el monto sea válido
        jest.setSystemTime(new Date('2026-06-25T12:00:00Z')); // 24 días trabajados (25-1)

        // Asumiendo que el SP calculará correctamente el monto a transferir (1000 - 5% - 18%IGV)
        const expectedAmountTransferred = 1000 - (1000 * 0.05) - ((1000 * 0.05) * 0.18); // 1000 - 50 - 9 = 941
        
        // Ejecutar el proceso de adelanto
        const result = await processAdvance(clientId, requestedAmount);

        // Verificar que niubizTransfer fue llamado con el monto correcto
        expect(niubizTransfer).toHaveBeenCalledWith(expectedAmountTransferred); // 941.00 es el monto a transferir con 1000 solicitado
        // Verificar que el resultado contiene un transactionId simulado
        expect(result).toHaveProperty('transactionId');
        expect(result.transactionId).toMatch(/^MOCK_NIUBIZ_ID_/);
        expect(result.amountTransferred).toBeCloseTo(expectedAmountTransferred, 2);

        jest.useRealTimers();
    },20000);

    // Test 5: Actualización final del external_code y status = 2
    test('should update advance record with external_code and status = 2 after successful transfer', async () => {
        const clientId = 1; // Juan Perez
        const requestedAmount = 800.00;

        // Asegurarse de que Juan Perez no tenga adelantos pendientes/desembolsados
        await connection.execute('DELETE FROM advances WHERE client_id = ?', [clientId]);

        // Simula la fecha para que el monto sea válido
     
        jest.setSystemTime(new Date('2026-06-20T12:00:00Z')); // 19 días trabajados (20-1)

        const result = await processAdvance(clientId, requestedAmount);

        // Verificar que el ID de adelanto fue retornado
        expect(result).toHaveProperty('advanceId');
        const advanceId = result.advanceId;

        // Consultar directamente la base de datos para verificar la actualización
        const [rows] = await connection.execute('SELECT external_code, status FROM advances WHERE id = ?', [advanceId]);
        const updatedAdvance = rows[0];

        expect(updatedAdvance).toBeDefined();
        expect(updatedAdvance.external_code).toBe(result.transactionId);
        expect(updatedAdvance.status).toBe(2); // 2 = desembolsado

        jest.useRealTimers();
    });

    // Test adicional: Monto solicitado excede el disponible
    test('should reject advance if requested amount exceeds available amount', async () => {
        const clientId = 2;
        const requestedAmount = 5000.00; // Un monto muy alto

        // Asegurarse de que Maria no tenga adelantos pendientes/desembolsados
        await connection.execute('DELETE FROM advances WHERE client_id = ?', [clientId]);

        
        jest.setSystemTime(new Date('2026-06-10T12:00:00Z')); // 9 días trabajados

        await expect(processAdvance(clientId, requestedAmount))
            .rejects
            .toThrow(/excede/);

        jest.useRealTimers();
    });
});