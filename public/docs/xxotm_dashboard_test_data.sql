-- ============================================================================
-- XXOTM Dashboard Test Data
-- Purpose: Insert sample data for testing dashboard metrics and trends
-- Tables: XXOTM_VEHICLE_HISTORY_T, XXOTM_DRIVER_HISTORY_T
-- Covers: Daily (7 days), Weekly (7 weeks), Monthly (12 months)
-- ============================================================================

-- Clear existing test data (optional - uncomment if needed)
-- DELETE FROM XXOTM_VEHICLE_HISTORY_T;
-- DELETE FROM XXOTM_DRIVER_HISTORY_T;
-- COMMIT;

-- ============================================================================
-- VEHICLE HISTORY DATA
-- Statuses: TRUCK_COMMITTED (Active), TRUCK_AVAILABLE (Idle), TRUCK_OOS (Inactive)
-- ============================================================================

-- Generate data for last 12 months (covers daily, weekly, and monthly views)
declare
   v_date     date;
   v_truck_id number;
   v_status   varchar2(50);
   v_statuses sys.odcivarchar2list := sys.odcivarchar2list(
      'TRUCK_COMMITTED',
      'TRUCK_AVAILABLE',
      'TRUCK_OOS'
   );
begin
    -- Loop through last 365 days (covers 12 months)
   for day_offset in 0..364 loop
      v_date := trunc(sysdate) - day_offset;
        
        -- Generate 50 truck records per day with varied statuses
      for truck_num in 1..50 loop
         v_truck_id := 1000 + truck_num;
            
            -- Distribute statuses: 60% Active, 25% Idle, 15% Inactive
         if truck_num <= 30 then
            v_status := 'TRUCK_COMMITTED';  -- Active
         elsif truck_num <= 42 then
            v_status := 'TRUCK_AVAILABLE';  -- Idle
         else
            v_status := 'TRUCK_OOS';        -- Inactive
         end if;

         insert into xxotm_vehicle_history_t (
            vehicle_id,
            vehicle_nbr,
            event_date,
            truck_daily_status,
            created_date
         ) values ( v_truck_id,
                    'TRK-'
                    || lpad(
                       truck_num,
                       3,
                       '0'
                    ),
                    to_char(
                       v_date,
                       'YYYY-MM-DD'
                    )
                    || 'T00:00:00Z',
                    v_status,
                    sysdate );
      end loop;
   end loop;

   commit;
   dbms_output.put_line('Inserted vehicle history data for 365 days');
end;
/

-- ============================================================================
-- DRIVER HISTORY DATA
-- Statuses: DRIVER_COMMITTED (On Duty), DRIVER_AVAILABLE (Idle)
-- ============================================================================

declare
   v_date      date;
   v_driver_id number;
   v_status    varchar2(50);
begin
    -- Loop through last 365 days (covers 12 months)
   for day_offset in 0..364 loop
      v_date := trunc(sysdate) - day_offset;
        
        -- Generate 30 driver records per day with varied statuses
      for driver_num in 1..30 loop
         v_driver_id := 2000 + driver_num;
            
            -- Distribute statuses: 70% On Duty, 30% Idle
         if driver_num <= 21 then
            v_status := 'DRIVER_COMMITTED';  -- On Duty
         else
            v_status := 'DRIVER_AVAILABLE';  -- Idle
         end if;

         insert into xxotm_driver_history_t (
            driver_id,
            driver_nbr,
            event_date,
            driver_daily_status,
            created_date
         ) values ( v_driver_id,
                    'DRV-'
                    || lpad(
                       driver_num,
                       3,
                       '0'
                    ),
                    to_char(
                       v_date,
                       'YYYY-MM-DD'
                    )
                    || 'T00:00:00Z',
                    v_status,
                    sysdate );
      end loop;
   end loop;

   commit;
   dbms_output.put_line('Inserted driver history data for 365 days');
end;
/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check vehicle data distribution
select to_char(
   to_date(substr(
      event_date,
      1,
      10
   ),
        'YYYY-MM-DD'),
   'YYYY-MM'
) as month,
       truck_daily_status,
       count(*) as cnt
  from xxotm_vehicle_history_t
 group by to_char(
   to_date(substr(
      event_date,
      1,
      10
   ),
        'YYYY-MM-DD'),
   'YYYY-MM'
),
          truck_daily_status
 order by month desc,
          truck_daily_status;

-- Check driver data distribution
select to_char(
   to_date(substr(
      event_date,
      1,
      10
   ),
        'YYYY-MM-DD'),
   'YYYY-MM'
) as month,
       driver_daily_status,
       count(*) as cnt
  from xxotm_driver_history_t
 group by to_char(
   to_date(substr(
      event_date,
      1,
      10
   ),
        'YYYY-MM-DD'),
   'YYYY-MM'
),
          driver_daily_status
 order by month desc,
          driver_daily_status;

-- Summary counts for today
select 'Vehicles' as type,
       truck_daily_status as status,
       count(*) as cnt
  from xxotm_vehicle_history_t
 where substr(
   event_date,
   1,
   10
) = to_char(
   trunc(sysdate),
   'YYYY-MM-DD'
)
 group by truck_daily_status
union all
select 'Drivers' as type,
       driver_daily_status as status,
       count(*) as cnt
  from xxotm_driver_history_t
 where substr(
   event_date,
   1,
   10
) = to_char(
   trunc(sysdate),
   'YYYY-MM-DD'
)
 group by driver_daily_status;