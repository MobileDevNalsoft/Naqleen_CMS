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


SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
         'customer_name' VALUE cust_name,
         'containers' VALUE containers
         RETURNING CLOB
      )
      RETURNING CLOB
   )
   FROM (
      SELECT 
         i.cust_name,
         JSON_ARRAYAGG(
            JSON_OBJECT(
               'container_nbr' VALUE i.container_nbr,
               'type' VALUE i.container_type,
               'status' VALUE CASE WHEN i.booking_id IS NOT NULL AND i.area <> 'CFS' THEN 'R' ELSE 'N' END,
               'position' VALUE CASE WHEN i.area IS NULL THEN i.position ELSE i.area END
            )
            RETURNING CLOB
         ) AS containers
      FROM (
         select cust_name, container_nbr, container_type, booking_id, position, shipment_name, null area, inbound_shipment_nbr, container_stored_time, container_released_time, outbound_shipment_nbr from xxotm_container_inventory_t where container_nbr not in (select container_nbr from xxotm_cfs_containers_t)
         union all
         select ci.cust_name, cf.container_nbr, ci.container_type, ci.booking_id, ci.position, ci.shipment_name, 'CFS' area, cf.shipment_nbr, cf.creation_date, cf.release_date, null outbound_shipment_nbr from xxotm_cfs_containers_t cf, xxotm_container_inventory_t ci where cf.shipment_nbr = ci.inbound_shipment_nbr
      ) i
      WHERE i.container_nbr IS NOT NULL
        AND ((i.position IS NOT NULL AND i.position <> 'NA' AND i.container_stored_time IS NOT NULL) OR i.area = 'CFS')
        AND i.inbound_shipment_nbr IS NOT NULL
        AND i.container_released_time IS NULL
        AND i.outbound_shipment_nbr IS NULL
        AND i.cust_name IS NOT NULL
      GROUP BY i.cust_name
   );




select cust_name, container_nbr, container_type, booking_id, position, shipment_name, null area, inbound_shipment_nbr, container_stored_time, container_released_time, outbound_shipment_nbr from xxotm_container_inventory_t where container_nbr not in (select container_nbr from xxotm_cfs_containers_t where container_nbr is not null)
         union all
         select ci.cust_name, cf.container_nbr, ci.container_type, ci.booking_id, ci.position, ci.shipment_name, 'CFS' area, cf.shipment_nbr, cf.creation_date, cf.release_date, null outbound_shipment_nbr from xxotm_cfs_containers_t cf, xxotm_container_inventory_t ci where cf.shipment_nbr = ci.inbound_shipment_nbr;






