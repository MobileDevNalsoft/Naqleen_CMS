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



