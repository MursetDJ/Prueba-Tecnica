# Sistema de Adelanto de Sueldo Automatizado

Este proyecto implementa un sistema automatizado para el cálculo y desembolso de adelantos de sueldo a clientes de una empresa financiera. Incluye funcionalidades de acceso de usuario, cálculo de monto disponible, registro de solicitudes y simulación de transferencias bancarias. Está desarrollado utilizando Node.js (JavaScript) para la lógica de negocio y MySQL para la persistencia de datos.

## Requerimientos

* Node.js (v14 o superior)
* MySQL (v8.0 o superior)

## Configuración e Inicialización

Sigue los pasos a continuación para configurar y ejecutar el proyecto.

### 1. Configurar la Base de Datos MySQL

Asegúrate de tener un servidor MySQL en ejecución.

a.  **Generar Hashes de Contraseña para Datos de Prueba:**
    Las contraseñas no se almacenan en texto plano en la base de datos. Para los usuarios de prueba (`juanperez`, `mariagomez`, `pedrolopez`) en `db/schema.sql`, necesitas generar los hashes de sus contraseñas (ej. "password123") usando `bcrypt`.

    Crea un archivo temporal `generate_hash.js` en la raíz de tu proyecto:
    ```javascript
    // generate_hash.js
    const bcrypt = require('bcrypt');
    const password = 'password123'; // La contraseña base para tus usuarios de prueba
    const saltRounds = 10; // Un buen número de rondas para seguridad

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error al generar el hash:', err);
            return;
        }
        console.log('Contraseña original:', password);
        console.log('Hash generado:', hash);
    });
    ```
    Ejecuta: `npm install bcrypt` (si no lo has hecho ya) y luego `node generate_hash.js`.
    Copia el "Hash generado" y reemplázalo en el `INSERT` statement de `db/schema.sql` para los campos `password` de tus usuarios de prueba (ej. `juanperez`, `mariagomez`, `pedrolopez`).

b.  **Crear la base de datos y tablas:**
    Abre tu cliente MySQL (MySQL Workbench, línea de comandos, etc.) y ejecuta el script `db/schema.sql`. Asegúrate de que los hashes de contraseña estén actualizados en el script antes de ejecutarlo.

    ```bash
    mysql -u your_mysql_user -p < db/schema.sql
    ```
    Reemplaza `your_mysql_user` con tu usuario de MySQL. Te pedirá la contraseña.

c.  **Crear el procedimiento almacenado:**
    De manera similar, ejecuta el script del procedimiento almacenado:

    ```bash
    mysql -u your_mysql_user -p financial_advance_system < db/stored_procedure.sql
    ```
    Asegúrate de estar apuntando a la base de datos `financial_advance_system`.

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales de base de datos:

DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=financial_advance_system

**¡Importante!** Reemplaza `your_mysql_user` y `your_mysql_password` con tus credenciales de MySQL.

### 3. Instalar Dependencias de Node.js

Desde la raíz del proyecto, instala las dependencias:

npm install

### 4. Ejecutar el Servidor Node.js (Ejemplo de uso)

El archivo src/app.js contiene un ejemplo básico de cómo usar las funciones calculateAvailable, processAdvance y loginUser
Para ejecutar el ejemplo, desde la raíz del proyecto:
```bash
npm run start
```
### 5. Ejecutar los Tests Unitarios
Para ejecutar las pruebas que verifican la lógica y el comportamiento del sistema:

```bash
npm test
```

Esto ejecutará los tests definidos en tests/advance.test.js usando Jest.


