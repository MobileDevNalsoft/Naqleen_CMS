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



create table xxotm_vehicle_history_t (
   vehicle_xid           varchar2(10) not null,
   equipment             varchar2(240),
   driver_xid            varchar2(240),
   equipment_type        varchar2(240),
   driver_name           varchar2(240),
   is_active             varchar2(10),
   assigned_to_operation varchar2(240),
   lease_status          varchar2(240),
   event_date            varchar2(240) not null,
   constraint xxotm_vehicle_hist_pk primary key ( vehicle_xid,
                                                  event_date )
);

alter table xxotm_vehicle_history_t add truck_daily_status varchar2(20);


select to_char(
   trunc(sysdate),
   'YYYY-MM-DD"T"HH24:MI:SS'
)
       || 'Z' as iso_date
  from dual;




begin
   dbms_scheduler.create_job(
      job_name        => 'XXOTM_VEHICLE_HISTORY_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.CALL_XX_OTM_VEHICLE_HISTORY_SYNC',
      start_date      => systimestamp,
      repeat_interval => 'FREQ=HOURLY;INTERVAL=6',
      enabled         => true,
      auto_drop       => false,
      comments        => 'Sync Vehicle History Data from OTM every hour'
   );
end;
/

begin
   dbms_scheduler.create_job(
      job_name        => 'XXOTM_DRIVER_HISTORY_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.CALL_XX_OTM_DRIVER_HISTORY_SYNC',
      start_date      => systimestamp,
      repeat_interval => 'FREQ=HOURLY;INTERVAL=6',
      enabled         => true,
      auto_drop       => false,
      comments        => 'Sync Driver History Data from OTM every hour'
   );
end;

/*
-- To Enable the Job:
BEGIN
    DBMS_SCHEDULER.ENABLE('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
END;
/

-- To Disable the Job:
BEGIN
    DBMS_SCHEDULER.DISABLE('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
END;
/

-- To Run the Job Immediately:
BEGIN
    DBMS_SCHEDULER.RUN_JOB('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
END;
/
*/

begin
   dbms_scheduler.run_job('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
end;
/

begin
   dbms_scheduler.run_job('XXOTM_DRIVER_HISTORY_SYNC_JOB');
end;
/

begin
   dbms_scheduler.disable('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
end;
/

begin
   dbms_scheduler.enable('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
end;
/


begin
   dbms_scheduler.drop_job(job_name => 'XXOTM_DRIVER_HISTORY_SYNC_JOB');
exception
   when others then
      null;
end;

create table xxotm_driver_history_t (
   driver_xid            varchar2(10) not null,
   driver_name           varchar2(50),
   driver_daily_status   varchar2(100),
   equipment             varchar2(100),
   equipment_type        varchar2(100),
   vehicle_xid           varchar2(10),
   is_active             varchar2(10),
   assigned_to_operation varchar2(240),
   lease_status          varchar2(100),
   event_date            varchar2(100) not null,
   constraint xxotm_driver_hist_pk primary key ( driver_xid,
                                                 event_date )
);


truncate table xxotm_vehicle_history_t;
truncate table xxotm_driver_history_t;


/*
   6. List All Jobs in Current User Schema
   ---------------------------------------
   Simple query to see all jobs available to the current user.
*/
SELECT j.job_name,
       j.state,
       j.enabled,
       j.last_start_date,
       j.next_run_date,
       j.failure_count,
       s.repeat_interval
  FROM user_scheduler_jobs j
  LEFT JOIN user_scheduler_schedules s
    ON j.schedule_name = s.schedule_name
 ORDER BY j.job_name;



begin
   dbms_scheduler.disable('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
   dbms_scheduler.disable('XXOTM_DRIVER_HISTORY_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_LOCATIONS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_SHIPMENTS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_TRACKING_EVENTS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_VEHICLES_SYNC_JOB');
   dbms_scheduler.disable('XX_OTM_CONTAINER_INVENTORY_SYNC_JOB');
end;
/

begin
   dbms_scheduler.enable('XXOTM_VEHICLE_HISTORY_SYNC_JOB');
   dbms_scheduler.enable('XXOTM_DRIVER_HISTORY_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_LOCATIONS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_SHIPMENTS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_TRACKING_EVENTS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_VEHICLES_SYNC_JOB');
   dbms_scheduler.enable('XX_OTM_CONTAINER_INVENTORY_SYNC_JOB');
end;
/


/*
   7. Force Stop and Disable a Running Job
   ---------------------------------------
   If a job is currently running and you need to kill it immediately.
*/
declare
   type t_job_list is
      table of varchar2(100);
   l_jobs t_job_list := t_job_list(
      'XXOTM_VEHICLE_HISTORY_SYNC_JOB',
      'XXOTM_DRIVER_HISTORY_SYNC_JOB',
      'XX_NAQLEEN_LOCATIONS_SYNC_JOB',
      'XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB',
      'XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB',
      'XX_NAQLEEN_SHIPMENTS_SYNC_JOB',
      'XX_NAQLEEN_TRACKING_EVENTS_SYNC_JOB',
      'XX_NAQLEEN_VEHICLES_SYNC_JOB',
      'XX_OTM_CONTAINER_INVENTORY_SYNC_JOB'
   );
begin
   for i in 1..l_jobs.count loop
      -- 1. Try to STOP the job (Forcefully)
      begin
         dbms_output.put_line('Stopping job: ' || l_jobs(i));
         dbms_scheduler.stop_job(
            job_name => l_jobs(i),
            force    => true
         );
      exception
         when others then
            dbms_output.put_line('Job '
                                 || l_jobs(i)
                                 || ' not running or could not be stopped: ' || sqlerrm);
      end;
      
      -- 2. Disable the job
      begin
         dbms_output.put_line('Disabling job: ' || l_jobs(i));
         dbms_scheduler.disable(l_jobs(i));
      exception
         when others then
            dbms_output.put_line('Could not disable job '
                                 || l_jobs(i)
                                 || ': ' || sqlerrm);
      end;
   end loop;
end;
/

begin
   dbms_scheduler.stop_job(
      job_name => 'XX_NAQLEEN_TRACKING_EVENTS_SYNC_JOB',
      force    => true
   );
   -- dbms_scheduler.disable('XX_NAQLEEN_TRACKING_EVENTS_SYNC_JOB');
end;
/



begin
   ords.define_template(
      p_module_name => 'otm_web',
      p_pattern     => 'getInvalidContainers'
   );
   ords.define_handler(
      p_module_name   => 'otm_web',
      p_pattern       => 'getInvalidContainers',
      p_method        => 'GET',
      p_source_type   => ords.source_type_plsql,
      p_source        => 'BEGIN XXOTM_GET_INVALID_CONTAINERS_P(p_offset => NVL(:offset, 0)); END;',
      p_mimes_allowed => 'application/json'
   );

   commit;
end;

select event_date, vehicle_xid, driver_xid, truck_daily_status, equipment from xxotm_vehicle_history_t where truck_daily_status is not null and event_date = '2026-01-29T00:00:00Z';


select container_nbr, position from xxotm_container_inventory_t where container_nbr is not null and container_stored_time is not null and container_released_time is null;

SELECT DISTINCT TERMINAL FROM XXOTM_POSITION_MASTER_T; 
select listagg(distinct lot_no, ',') within group (order by lot_no) from xxotm_position_master_t where terminal = 'TRM' and block = 'B' ORDER BY lot_no;

delete from XX_ROLE_CONFIG where role = 'ADMIN' AND screen_name <> 'Active Shipments';

select rc.role, rc.screen_name, rc.screen_path, rc.is_active
                    from xx_role_config rc
                    join xx_user_role_assignment ura on rc.role = ura.role_code
                    where ura.user_id = 5
                    and rc.is_active = 'Y' and ura.is_active = 'Y'
            order by role, screen_name;