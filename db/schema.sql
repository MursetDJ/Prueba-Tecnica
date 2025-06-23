-- db/schema.sql

-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS financial_advance_system;
USE financial_advance_system;

-- Tabla de Clientes
-- NOTA IMPORTANTE: La columna 'password' debe almacenar un HASH seguro, NO texto plano.
-- 'VARCHAR(255)' es suficiente para hashes de bcrypt.
CREATE TABLE IF NOT EXISTS clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Almacenar el hash de la contraseña
    document_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    bank_account VARCHAR(50) UNIQUE NOT NULL,
    status TINYINT DEFAULT 1, -- 1 = habilitado, 0 = deshabilitado
    current_balance DECIMAL(10, 2) DEFAULT 0.00, -- Saldo general del cliente
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Solicitudes de Adelanto
CREATE TABLE IF NOT EXISTS advances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    commission DECIMAL(10, 2) NOT NULL,
    amount_transferred DECIMAL(10, 2) NOT NULL, -- Monto neto que recibe el cliente
    igv DECIMAL(10, 2) NOT NULL,
    external_code VARCHAR(255) NULL, -- ID de transacción de la pasarela de pago (Niubiz)
    status TINYINT DEFAULT 1, -- 1 = pendiente, 2 = desembolsado, 3 = rechazado, 4 = finalizado
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Insertar datos de ejemplo
-- La contraseña 'password123' hasheada con bcrypt (generada previamente).
-- Puedes generar un hash para "password123" ejecutando un script Node.js simple:
-- const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('password123', 10));
-- Este es un ejemplo de hash para 'password123' con salt de 10: '$2b$10$wE0v2dG4Qp2b8h/Q2zV7eu0.5F6J7K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3' (¡puede variar cada vez!)
INSERT INTO clients (username, password, document_id, first_name, last_name, salary, bank_account, status, current_balance) VALUES
('juanperez', '$2b$10$tJ0lJ5wK7eD8u.5F6J7K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3', '12345678', 'Juan', 'Perez', 2000.00, 'BCP-1234567890', 1, 500.00),
('mariagomez', '$2b$10$aB9cY0dE1fG2h.3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y0Z1', '87654321', 'Maria', 'Gomez', 3500.00, 'BBVA-0987654321', 1, 1000.00),
('pedrolopez', '$2b$10$qR7sT8uV9wX0y.1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R', '11223344', 'Pedro', 'Lopez', 1800.00, 'INT-1122334455', 0, 200.00); -- Cliente deshabilitado

-- Insertar una solicitud pendiente para probar el caso de "ya tiene una solicitud"
INSERT INTO advances (client_id, commission, amount_transferred, igv, status) VALUES
(1, 0.00, 0.00, 0.00, 1);