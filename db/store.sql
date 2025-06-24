DELIMITER $$
CREATE DEFINER=``@`localhost` PROCEDURE `ProcessAdvanceRequest`(IN `p_client_id` INT, IN `p_requested_amount` DECIMAL(10,2))
BEGIN
    DECLARE v_client_exists BOOLEAN DEFAULT FALSE;
    DECLARE v_client_status TINYINT;
    DECLARE v_monthly_salary DECIMAL(10, 2);
    DECLARE v_available_calculated_amount DECIMAL(10, 2);
    DECLARE v_current_date DATE;
    DECLARE v_last_day_of_month INT;
    DECLARE v_daily_salary DECIMAL(10, 2);
    DECLARE v_days_worked INT;
    DECLARE v_current_day INT;
    DECLARE v_pending_or_disbursed_advance_exists BOOLEAN DEFAULT FALSE;

    -- Constants for commission and IGV (adjust as per business rules)
    DECLARE v_commission_rate DECIMAL(5, 4) DEFAULT 0.05; -- 5%
    DECLARE v_igv_rate DECIMAL(5, 4) DEFAULT 0.18;       -- 18%

    DECLARE v_commission DECIMAL(10, 2);
    DECLARE v_igv DECIMAL(10, 2);
    DECLARE v_amount_to_transfer DECIMAL(10, 2);
    DECLARE v_new_advance_id INT;

    -- Variable para mensajes de error
    DECLARE v_error_message VARCHAR(255);

    -- Set the current date for calculations (using server's date for consistency)
    SET v_current_date = CURDATE();
    SET v_current_day = DAY(v_current_date);
    SET v_last_day_of_month = DAY(LAST_DAY(v_current_date));

    -- 1. Verify client existence and status
    SELECT EXISTS(SELECT 1 FROM clients WHERE id = p_client_id), status, salary
    INTO v_client_exists, v_client_status, v_monthly_salary
    FROM clients
    WHERE id = p_client_id;

    IF NOT v_client_exists THEN
        SET v_error_message = 'Cliente no encontrado.';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_message;
    END IF;

    IF v_client_status = 0 THEN -- status = 0 (deshabilitado)
        SET v_error_message = 'El cliente está deshabilitado y no puede solicitar anticipos.';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_message;
    END IF;

    -- 2. Check for existing pending or disbursed advances
    SELECT EXISTS(SELECT 1 FROM advances WHERE client_id = p_client_id AND status IN (1, 2))
    INTO v_pending_or_disbursed_advance_exists;

    IF v_pending_or_disbursed_advance_exists THEN
        SET v_error_message = 'El cliente ya tiene una solicitud de anticipo pendiente o desembolsada.';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_message;
    END IF;

    -- 3. Calculate available amount (same logic as JS)
    SET v_daily_salary = v_monthly_salary / v_last_day_of_month;

    IF v_current_day = v_last_day_of_month THEN
        SET v_days_worked = v_last_day_of_month; -- ¡Aquí se corrige!
    ELSE
        SET v_days_worked = v_current_day - 1; -- ¡Aquí se corrige!
    END IF;

    IF v_days_worked < 0 THEN
        SET v_days_worked = 0; -- ¡Aquí se corrige!
    END IF;

    SET v_available_calculated_amount = v_daily_salary * v_days_worked;
    SET v_available_calculated_amount = ROUND(v_available_calculated_amount, 2); -- Round to 2 decimal places

    -- 4. Validate requested_amount
    IF p_requested_amount <= 0 THEN
        SET v_error_message = 'El monto solicitado debe ser positivo.';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_message;
    END IF;

    IF p_requested_amount > v_available_calculated_amount THEN
        SET v_error_message = CONCAT('El monto solicitado (', p_requested_amount, ') excede el anticipo disponible (', v_available_calculated_amount, ').');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_message;
    END IF;

    -- 5. Calculate commission and IGV
    SET v_commission = p_requested_amount * v_commission_rate;
    SET v_igv = v_commission * v_igv_rate;
    SET v_amount_to_transfer = p_requested_amount - v_commission - v_igv;

    -- Ensure amount to transfer is positive after deductions
    IF v_amount_to_transfer <= 0 THEN
        SET v_error_message = 'El monto calculado a transferir es cero o negativo después de deducciones. Ajuste las tasas o solicite un monto mayor..';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_message;
    END IF;

    -- 6. Insert new record into advances with status = 1 (pending) AND
    --    Update the client's balance in a single transaction
    START TRANSACTION;


    INSERT INTO advances (client_id, commission, amount_transferred, igv, status, requested_at)
    VALUES (p_client_id, v_commission, v_amount_to_transfer, v_igv, 1, NOW());

    SET v_new_advance_id = LAST_INSERT_ID();

    COMMIT;

    -- Return the new advance_id and calculated details
    SELECT v_new_advance_id AS advanceId,
           v_commission AS commission,
           v_igv AS igv,
           v_amount_to_transfer AS amountTransferred,
           v_available_calculated_amount AS maxAvailableAmount;

END$$
DELIMITER ;