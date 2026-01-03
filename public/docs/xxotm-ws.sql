-- =============================================================================
-- SCHEDULER MONITORING QUERIES
-- =============================================================================

/*
   1. List All Scheduled Jobs for XXOTM
   -----------------------------------
   Displays the job name, current state (SCHEDULED, RUNNING, etc.), 
   last start time, next scheduled run, and failure count.
*/
select owner,
       job_name,
       state,
       last_start_date,
       next_run_date,
       failure_count
  from all_scheduler_jobs
 where owner = 'XXOTM'
 order by job_name;


/*
   2. Check Status of Currently Running Jobs
   ----------------------------------------
   Shows jobs that are actively executing.
*/
select owner,
       job_name,
       state,
       running_instance_count,
       elapsed_time
  from all_scheduler_jobs
 where owner = 'XXOTM'
   and state = 'RUNNING';


/*
   3. View Job Run History (Last 50 Runs)
   -------------------------------------
   Provides a log of recent job executions, including status (SUCCEEDED, FAILED),
   start time, and run duration.
*/
select job_name,
       log_date,
       status,
       error#,
       run_duration,
       additional_info
  from all_scheduler_job_run_details
 where owner = 'XXOTM'
 order by log_date desc
 fetch first 300 rows only;


/*
   4. View Failed Job Runs (With Error Messages)
   --------------------------------------------
   Specifically filters for failed jobs to help diagnose issues. 
   Shows the error number and additional info (often contains the ORA error text).
*/
select job_name,
       log_date,
       status,
       error#,
       additional_info,
       output
  from all_scheduler_job_run_details
 where owner = 'XXOTM'
   and status = 'FAILED'
 order by log_date desc;


/*
   5. Check Package Compilation Errors
   ----------------------------------
   If jobs fail with ORA-04063 (package has errors), use this to find the 
   specific syntax errors in the package. Replace package name as needed.
*/
select name,
       line,
       position,
       text
  from all_errors
 where owner = 'XXOTM'
   and name = 'XX_NAQLEEN_OTM_DATA_SYNC_PKG' -- Replace with your package name
 order by line,
          position;

select en.container_nbr,
       en.cust_nbr,
       en.cust_name,
       en.shipment_name,
       en.inbound_shipment_nbr as inbound_shipment_nbr,
       ex.shipment_name as release_shipment_name,
       ex.inbound_shipment_nbr as outbound_shipment_nbr,
       en.container_stored_time,
       en.position
  from xxotm_container_inventory_t en,
       xxotm_container_inventory_t ex
 where en.outbound_shipment_nbr = ex.inbound_shipment_nbr
 order by container_nbr;


select container_nbr,
       cust_nbr,
       cust_name,
       shipment_name,
       inbound_shipment_nbr,
       outbound_shipment_nbr,
       container_stored_time,
       position
  from xxotm_container_inventory_t
 where container_nbr is not null
   and inbound_shipment_nbr is not null
   and outbound_shipment_nbr is not null
   and container_stored_time is not null
   and position is not null;

select container_nbr,
       cust_nbr,
       cust_name,
       shipment_name,
       inbound_shipment_nbr,
       outbound_shipment_nbr,
       container_stored_time,
       position
  from xxotm_container_inventory_t
 where container_nbr is null
   and shipment_name is not null;


select shipment_nbr,
       listagg(event_type,
               ',') within group(
        order by event_type) as event_types,
       count(*)
  from xxotm_tracking_events_t
 group by shipment_nbr;

select * from xxotm_tracking_events_t order by container_nbr, shipment_nbr, event_date;


select te.event_type, te.event_date from xxotm_tracking_events_t te, xxotm_container_inventory_t ci where te.container_nbr = ci.container_nbr and te.shipment_nbr = ci.inbound_shipment_nbr and ci.outbound_shipment_nbr is null and ci.position is not null and te.container_nbr = 'ABCD1234567' order by te.event_date;


select container_nbr, shipment_nbr, count(event_type), listagg(event_type, ',') within group(order by event_date) as event_types from xxotm_tracking_events_t group by container_nbr, shipment_nbr order by container_nbr;


-- Complete tracking events for a container (inbound + outbound)
SELECT 
te.container_nbr,
te.shipment_nbr,
te.event_type, 
te.event_date,
ci.shipment_name,
ci.booking_id,
'INBOUND' as shipment_phase
  FROM xxotm_tracking_events_t te, xxotm_container_inventory_t ci 
 WHERE te.container_nbr = ci.container_nbr 
   AND te.shipment_nbr = ci.inbound_shipment_nbr
   AND ci.outbound_shipment_nbr IS NOT NULL
   AND ci.position IS NOT NULL
UNION ALL
SELECT 
te.container_nbr,
te.shipment_nbr,
te.event_type, 
te.event_date,
ci.shipment_name,
ci.booking_id,
'OUTBOUND' as shipment_phase
  FROM xxotm_tracking_events_t te, xxotm_container_inventory_t ci 
 WHERE te.container_nbr = ci.container_nbr 
   AND te.shipment_nbr = ci.outbound_shipment_nbr
   AND ci.outbound_shipment_nbr IS NOT NULL
   AND ci.position IS NOT NULL
ORDER BY container_nbr, shipment_nbr, event_date;


select * from xxotm_container_inventory_t order by container_nbr;


SELECT CASE WHEN te.event_type = 'VEHICLE ENTERED' THEN te.event_type || ' - ' || (select power_unit||truck_3pl from xxotm_shipments_t where shipment_xid = te.shipment_nbr) ELSE te.event_type END CASE, te.event_date 
        FROM xxotm_tracking_events_t te, xxotm_container_inventory_t ci 
        WHERE te.container_nbr = ci.container_nbr 
          AND te.shipment_nbr = ci.inbound_shipment_nbr 
          AND ci.outbound_shipment_nbr IS NULL 
          AND ci.position IS NOT NULL 
          AND te.container_nbr = 'MMMM9856540'
          AND te.event_type <> 'CONTAINER RESTACKED'
union all
select type || ' - ' || current_temp || '°C' event_type, timestamp event_date from XXOTM_PLUGINOUT_T WHERE container_nbr = 'GANE9856523'
union all
select 'CONTAINER RESTACKED | ' || current_position || '  >  ' || restack_position event_type, updated_date event_date from XXOTM_RESTACK_LOLO_T WHERE container_nbr = 'GANE9856523' order by event_date;


select distinct cont_no from xxotm_shipments_t s, xxotm_container_inventory_t ci where s.shipment_xid = ci.inbound_shipment_nbr and power_unit is not null or truck_3pl is not null;




SELECT event_type, event_date FROM (
            -- 1. Standard API Tracking Events (Excluding duplicates)
            SELECT (CASE WHEN te.event_type = 'VEHICLE ENTERED' THEN te.event_type || ' - ' || (select power_unit||truck_3pl from xxotm_shipments_t where shipment_xid = te.shipment_nbr) ELSE te.event_type END) as event_type, te.event_date 
            FROM xxotm_tracking_events_t te, xxotm_container_inventory_t ci 
            WHERE te.container_nbr = ci.container_nbr 
            AND te.shipment_nbr = ci.inbound_shipment_nbr 
            AND ci.outbound_shipment_nbr IS NULL 
            AND ci.position IS NOT NULL 
            AND te.container_nbr = 'MMMM9856540'
            AND te.event_type <> 'CONTAINER RESTACKED'

            UNION ALL

            -- 2. Plug In/Out History
            SELECT type || ' - ' || current_temp || '°C' AS event_type, 
                   timestamp AS event_date 
            FROM XXOTM_PLUGINOUT_T 
            WHERE CONTAINER_NBR = 'MMMM9856540'

            UNION ALL

            -- 3. Restack History - Using pipe delimiter for frontend parsing
            SELECT 'CONTAINER RESTACKED | ' || current_position || '  >  ' || restack_position AS event_type, 
                   updated_date AS event_date 
            FROM XXOTM_RESTACK_LOLO_T 
            WHERE CONTAINER_NBR = 'MMMM9856540'
        )
        ORDER BY event_date;







