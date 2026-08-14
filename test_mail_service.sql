-- Test block for XXMA.xx_initiate_meals_mail procedure
SET SERVEROUTPUT ON;

DECLARE
    -- Variables to hold test data
    l_test_email1 VARCHAR2(240) := 'test1@example.com';
    l_test_email2 VARCHAR2(240) := 'test2@example.com';
BEGIN
    -- Output start message
    DBMS_OUTPUT.PUT_LINE('Starting mail service test...');
    
    -- Check if XXMAD_EMP_DATA table exists and has required data
    -- If not, we'll insert test records (in a real scenario, you might want to use existing data)
    BEGIN
        -- Insert test records if they don't exist
        MERGE INTO XXMAD_EMP_DATA t
        USING (SELECT '00642' AS EMPLOYEE_NUMBER, l_test_email1 AS EMAIL_ID FROM DUAL UNION ALL
               SELECT '00633' AS EMPLOYEE_NUMBER, l_test_email2 AS EMAIL_ID FROM DUAL) s
        ON (t.EMPLOYEE_NUMBER = s.EMPLOYEE_NUMBER)
        WHEN NOT MATCHED THEN
            INSERT (EMPLOYEE_NUMBER, EMAIL_ID)
            VALUES (s.EMPLOYEE_NUMBER, s.EMAIL_ID);
            
        DBMS_OUTPUT.PUT_LINE('Test records inserted/verified in XXMAD_EMP_DATA');
    EXCEPTION
        WHEN OTHERS THEN
            -- If table doesn't exist or other error, we'll note it but continue
            DBMS_OUTPUT.PUT_LINE('Note: Could not verify/insert test data: ' || SQLERRM);
            DBMS_OUTPUT.PUT_LINE('Please ensure XXMAD_EMP_DATA table exists with correct structure');
    END;
    
    -- Call the procedure to test mail service
    BEGIN
        XXMA.xx_initiate_meals_mail;
        DBMS_OUTPUT.PUT_LINE('Mail procedure executed successfully.');
        DBMS_OUTPUT.PUT_LINE('Check if emails were sent to: ' || l_test_email1 || ' and ' || l_test_email2);
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('Error executing mail procedure: ' || SQLERRM);
            RAISE; -- Re-raise the exception to see full details
    END;
    
    -- Cleanup: Remove test records if we inserted them
    -- Comment this out if you want to keep the test data
    BEGIN
        DELETE FROM XXMAD_EMP_DATA 
        WHERE EMPLOYEE_NUMBER IN ('00642', '00633')
        AND EMAIL_ID IN (l_test_email1, l_test_email2);
        
        DBMS_OUTPUT.PUT_LINE('Test records cleaned up from XXMAD_EMP_DATA');
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('Note: Could not clean up test data: ' || SQLERRM);
    END;
    
    DBMS_OUTPUT.PUT_LINE('Mail service test completed.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Test failed with error: ' || SQLERRM);
        RAISE;
END;
/