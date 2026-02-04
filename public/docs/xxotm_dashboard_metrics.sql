create or replace procedure xxotm_get_dashboard_metrics_p (
   p_body in blob
) is
    -- ===========================================================================
    -- Procedure: XXOTM_GET_DASHBOARD_METRICS_P
    -- Purpose:   Dashboard metrics API with independent date controls
    --            Trends use viewMode only (DAILY/WEEKLY/MONTHLY) with fixed ranges
    -- ===========================================================================
    
    -- BLOB to CLOB conversion
   l_clob              clob;
   l_dest_offset       integer := 1;
   l_src_offset        integer := 1;
   l_lang_context      integer := dbms_lob.default_lang_ctx;
   l_warning           integer;

    -- Request Payload
   jo_request          json_object_t;
   jo_trucks           json_object_t;
   jo_drivers          json_object_t;
   jo_efficiency       json_object_t;
   jo_trucks_trend     json_object_t;
   jo_drivers_trend    json_object_t;

    -- Include Flags
   v_inc_trucks        boolean := false;
   v_inc_drivers       boolean := false;
   v_inc_efficiency    boolean := false;
   v_inc_trucks_trend  boolean := false;
   v_inc_drivers_trend boolean := false;

    -- Trucks/Drivers/Efficiency Date Ranges
   v_trucks_start      date;
   v_trucks_end        date;
   v_drivers_start     date;
   v_drivers_end       date;
   v_eff_start         date;
   v_eff_end           date;

    -- Trucks Trend: Mode only (fixed ranges)
   v_tt_mode           varchar2(20) := 'DAILY';
   v_tt_start          date;
   v_tt_end            date;

    -- Drivers Trend: Mode only (fixed ranges)
   v_dt_mode           varchar2(20) := 'DAILY';
   v_dt_start          date;
   v_dt_end            date;

    -- Truck Summary Counts
   v_truck_total       number := 0;

    -- Driver Summary Counts
   v_driver_total      number := 0;

    -- Efficiency Counts
   v_eff_truck_total   number := 0;
   v_eff_truck_active  number := 0;
   v_eff_driver_total  number := 0;
   v_eff_driver_active number := 0;
   v_truck_util_pct    number := 0;
   v_driver_util_pct   number := 0;
   v_overall_eff_pct   number := 0;

    -- Metadata: Min Dates
   v_vehicle_min_date  varchar2(10);
   v_driver_min_date   varchar2(10);

   -- Trend helper
   v_current_label     varchar2(100);

    -- Helper: Parse date string
   function parse_date (
      p_date_str in varchar2
   ) return date is
   begin
      if p_date_str is null then
         return null;
      end if;
      return to_date ( substr(
         p_date_str,
         1,
         10
      ),'YYYY-MM-DD' );
   exception
      when others then
         return null;
   end parse_date;

    -- Helper: Format status (trim prefix, capitalize first letter)
   function format_status (
      p_status in varchar2,
      p_prefix in varchar2
   ) return varchar2 is
      l_trimmed varchar2(100);
   begin
      -- Remove prefix if present
      if p_status like p_prefix || '%' then
         l_trimmed := substr(
            p_status,
            length(p_prefix) + 1
         );
      else
         l_trimmed := p_status;
      end if;
      -- Capitalize first letter, lowercase the rest, replace underscores with spaces
      return initcap(replace(
         lower(l_trimmed),
         '_',
         ' '
      ));
   end format_status;

    -- Helper: Resolve date range from date/startDate/endDate
   procedure resolve_dates (
      p_obj       in json_object_t,
      p_start_out out date,
      p_end_out   out date
   ) is
   begin
      if p_obj.has('date') then
         p_start_out := parse_date(p_obj.get_string('date'));
         p_end_out := p_start_out;
      else
         if p_obj.has('startDate') then
            p_start_out := parse_date(p_obj.get_string('startDate'));
         end if;
         if p_obj.has('endDate') then
            p_end_out := parse_date(p_obj.get_string('endDate'));
         end if;
      end if;
      if p_start_out is null then
         p_start_out := trunc(sysdate);
      end if;
      if p_end_out is null then
         p_end_out := trunc(sysdate);
      end if;
   end resolve_dates;

    -- Helper: Calculate date range from viewMode
    -- DAILY = last 7 days, WEEKLY = last 7 weeks, MONTHLY = last 12 months
   procedure resolve_trend_range (
      p_mode      in varchar2,
      p_start_out out date,
      p_end_out   out date
   ) is
   begin
      p_end_out := trunc(sysdate);
      case upper(p_mode)
         when 'DAILY' then
            p_start_out := p_end_out - 6;  -- Last 7 days including today
         when 'WEEKLY' then
            p_start_out := p_end_out - 48; -- Last 7 weeks (49 days)
         when 'MONTHLY' then
            p_start_out := add_months(
               p_end_out,
               -11
            ); -- Last 12 months
         else
            p_start_out := p_end_out - 6; -- Default to daily
      end case;
   end resolve_trend_range;

begin
    -- =========================================================================
    -- 1. Convert BLOB to CLOB
    -- =========================================================================
   if p_body is not null then
      dbms_lob.createtemporary(
         l_clob,
         true
      );
      dbms_lob.converttoclob(
         dest_lob     => l_clob,
         src_blob     => p_body,
         amount       => dbms_lob.lobmaxsize,
         dest_offset  => l_dest_offset,
         src_offset   => l_src_offset,
         blob_csid    => dbms_lob.default_csid,
         lang_context => l_lang_context,
         warning      => l_warning
      );
   else
      l_clob := empty_clob();
   end if;

    -- =========================================================================
    -- 2. Parse Request Payload
    -- =========================================================================
   begin
      jo_request := json_object_t.parse(l_clob);

        -- Parse Trucks Section
      if jo_request.has('trucks') then
         jo_trucks := jo_request.get_object('trucks');
         if jo_trucks.has('include') then
            v_inc_trucks := jo_trucks.get_boolean('include');
         end if;
         if v_inc_trucks then
            resolve_dates(
               jo_trucks,
               v_trucks_start,
               v_trucks_end
            );
         end if;
      end if;

        -- Parse Drivers Section
      if jo_request.has('drivers') then
         jo_drivers := jo_request.get_object('drivers');
         if jo_drivers.has('include') then
            v_inc_drivers := jo_drivers.get_boolean('include');
         end if;
         if v_inc_drivers then
            resolve_dates(
               jo_drivers,
               v_drivers_start,
               v_drivers_end
            );
         end if;
      end if;

        -- Parse Efficiency Section
      if jo_request.has('efficiency') then
         jo_efficiency := jo_request.get_object('efficiency');
         if jo_efficiency.has('include') then
            v_inc_efficiency := jo_efficiency.get_boolean('include');
         end if;
         if v_inc_efficiency then
            resolve_dates(
               jo_efficiency,
               v_eff_start,
               v_eff_end
            );
         end if;
      end if;

        -- Parse Trucks Trend Section (uses viewMode only)
      if jo_request.has('trucksTrend') then
         jo_trucks_trend := jo_request.get_object('trucksTrend');
         if jo_trucks_trend.has('include') then
            v_inc_trucks_trend := jo_trucks_trend.get_boolean('include');
         end if;
         if v_inc_trucks_trend then
            if jo_trucks_trend.has('viewMode') then
               v_tt_mode := upper(jo_trucks_trend.get_string('viewMode'));
            end if;
            resolve_trend_range(
               v_tt_mode,
               v_tt_start,
               v_tt_end
            );
         end if;
      end if;

        -- Parse Drivers Trend Section (uses viewMode only)
      if jo_request.has('driversTrend') then
         jo_drivers_trend := jo_request.get_object('driversTrend');
         if jo_drivers_trend.has('include') then
            v_inc_drivers_trend := jo_drivers_trend.get_boolean('include');
         end if;
         if v_inc_drivers_trend then
            if jo_drivers_trend.has('viewMode') then
               v_dt_mode := upper(jo_drivers_trend.get_string('viewMode'));
            end if;
            resolve_trend_range(
               v_dt_mode,
               v_dt_start,
               v_dt_end
            );
         end if;
      end if;

   exception
      when others then
         apex_json.initialize_clob_output;
         apex_json.open_object;
         apex_json.write(
            'response_code',
            400
         );
         apex_json.write(
            'response_message',
            'Invalid JSON payload: ' || sqlerrm
         );
         apex_json.close_object;
         htp.prn(apex_json.get_clob_output);
         apex_json.free_output;
         return;
   end;

    -- =========================================================================
    -- 3. Initialize APEX_JSON Output
    -- =========================================================================
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_object('data');

    -- =========================================================================
    -- 4. Trucks Summary (Daily Average for Date Ranges)
    -- =========================================================================
   if v_inc_trucks then
      -- Get distinct truck count
      select count(distinct vehicle_xid)
        into v_truck_total
        from xxotm_vehicle_history_t
       where truck_daily_status is not null
         and to_date(substr(
         event_date,
         1,
         10
      ),
        'YYYY-MM-DD') between v_trucks_start and v_trucks_end;

      apex_json.open_object('trucks');
      apex_json.write(
         'total',
         nvl(
            v_truck_total,
            0
         )
      );
      apex_json.open_array('statuses');

      -- Loop through statuses and get average daily counts
      for rec in (
         with daily_counts as (
            select truck_daily_status,
                   count(*) as status_count
              from xxotm_vehicle_history_t
             where truck_daily_status is not null
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between v_trucks_start and v_trucks_end
             group by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD'),
                      truck_daily_status
         )
         select truck_daily_status,
                round(avg(status_count)) as avg_count
           from daily_counts
          group by truck_daily_status
          order by truck_daily_status
      ) loop
         apex_json.open_object;
         apex_json.write(
            'status',
            format_status(
               rec.truck_daily_status,
               'TRUCK_'
            )
         );
         apex_json.write(
            'count',
            nvl(
               rec.avg_count,
               0
            )
         );
         apex_json.close_object;
      end loop;

      apex_json.close_array; -- statuses
      apex_json.open_object('dateRange');
      apex_json.write(
         'start',
         to_char(
            v_trucks_start,
            'YYYY-MM-DD'
         )
      );
      apex_json.write(
         'end',
         to_char(
            v_trucks_end,
            'YYYY-MM-DD'
         )
      );
      apex_json.close_object;
      apex_json.close_object;
   end if;

    -- =========================================================================
    -- 5. Drivers Summary (Daily Average for Date Ranges)
    -- =========================================================================
   if v_inc_drivers then
      -- Get distinct driver count
      select count(distinct driver_xid)
        into v_driver_total
        from xxotm_driver_history_t
       where driver_daily_status is not null
         and to_date(substr(
         event_date,
         1,
         10
      ),
        'YYYY-MM-DD') between v_drivers_start and v_drivers_end;

      apex_json.open_object('drivers');
      apex_json.write(
         'total',
         nvl(
            v_driver_total,
            0
         )
      );
      apex_json.open_array('statuses');

      -- Loop through statuses and get average daily counts
      for rec in (
         with daily_counts as (
            select driver_daily_status,
                   count(*) as status_count
              from xxotm_driver_history_t
             where driver_daily_status is not null
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between v_drivers_start and v_drivers_end
             group by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD'),
                      driver_daily_status
         )
         select driver_daily_status,
                round(avg(status_count)) as avg_count
           from daily_counts
          group by driver_daily_status
          order by driver_daily_status
      ) loop
         apex_json.open_object;
         apex_json.write(
            'status',
            format_status(
               rec.driver_daily_status,
               'DRIVER_'
            )
         );
         apex_json.write(
            'count',
            nvl(
               rec.avg_count,
               0
            )
         );
         apex_json.close_object;
      end loop;

      apex_json.close_array; -- statuses
      apex_json.open_object('dateRange');
      apex_json.write(
         'start',
         to_char(
            v_drivers_start,
            'YYYY-MM-DD'
         )
      );
      apex_json.write(
         'end',
         to_char(
            v_drivers_end,
            'YYYY-MM-DD'
         )
      );
      apex_json.close_object;
      apex_json.close_object;
   end if;

    -- =========================================================================
    -- 6. Efficiency (Daily Average for Date Ranges)
    -- =========================================================================
   if v_inc_efficiency then
      -- Step 1: Get distinct truck count
      select count(distinct vehicle_xid)
        into v_eff_truck_total
        from xxotm_vehicle_history_t
       where truck_daily_status is not null
         and to_date(substr(
         event_date,
         1,
         10
      ),
        'YYYY-MM-DD') between v_eff_start and v_eff_end;

      -- Step 2: Get average committed trucks per day
      select round(nvl(
         avg(committed),
         0
      ))
        into v_eff_truck_active
        from (
         select to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') as event_day,
                sum(
                   case
                      when truck_daily_status = 'TRUCK_COMMITTED' then
                         1
                      else
                         0
                   end
                ) as committed
           from xxotm_vehicle_history_t
          where truck_daily_status is not null
            and to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') between v_eff_start and v_eff_end
          group by to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD')
      );

      -- Step 3: Get distinct driver count
      select count(distinct driver_xid)
        into v_eff_driver_total
        from xxotm_driver_history_t
       where driver_daily_status is not null
         and to_date(substr(
         event_date,
         1,
         10
      ),
        'YYYY-MM-DD') between v_eff_start and v_eff_end;

      -- Step 4: Get average committed drivers per day
      select round(nvl(
         avg(committed),
         0
      ))
        into v_eff_driver_active
        from (
         select to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') as event_day,
                sum(
                   case
                      when driver_daily_status = 'DRIVER_COMMITTED' then
                         1
                      else
                         0
                   end
                ) as committed
           from xxotm_driver_history_t
          where driver_daily_status is not null
            and to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') between v_eff_start and v_eff_end
          group by to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD')
      );

      -- Calculate utilization percentages
      if nvl(
         v_eff_truck_total,
         0
      ) > 0 then
         v_truck_util_pct := round(
            (nvl(
               v_eff_truck_active,
               0
            ) / v_eff_truck_total) * 100,
            2
         );
      end if;
      if nvl(
         v_eff_driver_total,
         0
      ) > 0 then
         v_driver_util_pct := round(
            (nvl(
               v_eff_driver_active,
               0
            ) / v_eff_driver_total) * 100,
            2
         );
      end if;
      if
         nvl(
            v_eff_truck_total,
            0
         ) > 0
         and nvl(
            v_eff_driver_total,
            0
         ) > 0
      then
         v_overall_eff_pct := round(
            (v_truck_util_pct + v_driver_util_pct) / 2,
            2
         );
      elsif nvl(
         v_eff_truck_total,
         0
      ) > 0 then
         v_overall_eff_pct := v_truck_util_pct;
      elsif nvl(
         v_eff_driver_total,
         0
      ) > 0 then
         v_overall_eff_pct := v_driver_util_pct;
      end if;

      apex_json.open_object('efficiency');
      apex_json.write(
         'truckUtilization',
         v_truck_util_pct
      );
      apex_json.write(
         'driverUtilization',
         v_driver_util_pct
      );
      apex_json.write(
         'overall',
         v_overall_eff_pct
      );
      apex_json.open_object('dateRange');
      apex_json.write(
         'start',
         to_char(
            v_eff_start,
            'YYYY-MM-DD'
         )
      );
      apex_json.write(
         'end',
         to_char(
            v_eff_end,
            'YYYY-MM-DD'
         )
      );
      apex_json.close_object;
      apex_json.close_object;
   end if;

    -- =========================================================================
    -- 7. Trucks Trend (with unique counts + averages for WEEKLY/MONTHLY)
    -- =========================================================================
   if v_inc_trucks_trend then
      apex_json.open_object('trucksTrend');
      apex_json.write(
         'viewMode',
         v_tt_mode
      );
      apex_json.open_array('data');
      if v_tt_mode = 'DAILY' then
         -- DAILY MODE: Keep original simple logic
         v_current_label := '___INIT___';
         for rec in (
            with trend_data as (
               select to_date(substr(
                  event_date,
                  1,
                  10
               ),
        'YYYY-MM-DD') as event_day,
                      truck_daily_status
                 from xxotm_vehicle_history_t
                where truck_daily_status is not null
                  and to_date(substr(
                  event_date,
                  1,
                  10
               ),
        'YYYY-MM-DD') between v_tt_start and v_tt_end
            )
            select to_char(
               event_day,
               'Mon DD'
            ) as label,
                   event_day as sort_date,
                   null as total,
                   truck_daily_status,
                   count(*) as status_count
              from trend_data
             group by to_char(
               event_day,
               'Mon DD'
            ),
                      event_day,
                      truck_daily_status
             order by sort_date,
                      label,
                      truck_daily_status
         ) loop
            if rec.label <> v_current_label then
               if v_current_label <> '___INIT___' then
                  apex_json.close_array; -- statuses
                  apex_json.close_object;
               end if;
               v_current_label := rec.label;
               apex_json.open_object;
               apex_json.write(
                  'label',
                  rec.label
               );
               apex_json.open_array('statuses');
            end if;

            apex_json.open_object;
            apex_json.write(
               'status',
               format_status(
                  rec.truck_daily_status,
                  'TRUCK_'
               )
            );
            apex_json.write(
               'count',
               rec.status_count
            );
            apex_json.close_object;
         end loop;

         if v_current_label <> '___INIT___' then
            apex_json.close_array; -- statuses
            apex_json.close_object;
         end if;
      else
         -- WEEKLY/MONTHLY MODE: Use unique counts + averages
         v_current_label := '___INIT___';
         for rec in (
            with raw_data as (
               select vehicle_xid,
                      to_date(substr(
                         event_date,
                         1,
                         10
                      ),
                              'YYYY-MM-DD') as event_day,
                      truck_daily_status,
                      case v_tt_mode
                         when 'WEEKLY'  then
                            to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                    'YYYY-MM-DD'),
                               'Mon'
                            )
                            || ' W'
                            || to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                     'YYYY-MM-DD'),
                               'W'
                            )
                         when 'MONTHLY' then
                            to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                    'YYYY-MM-DD'),
                               'Mon'
                            )
                      end as period_label,
                      case v_tt_mode
                         when 'WEEKLY'  then
                            trunc(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                  'YYYY-MM-DD'),
                               'MM'
                            ) + ( to_number(to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                     'YYYY-MM-DD'),
                               'W'
                            )) - 1 ) * 7
                         when 'MONTHLY' then
                            trunc(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                  'YYYY-MM-DD'),
                               'MM'
                            )
                      end as period_sort
                 from xxotm_vehicle_history_t
                where truck_daily_status is not null
                  and to_date(substr(
                  event_date,
                  1,
                  10
               ),
        'YYYY-MM-DD') between v_tt_start and v_tt_end
            ),
            -- Daily counts per status per day within each period
            daily_status_counts as (
               select period_label,
                      period_sort,
                      event_day,
                      truck_daily_status,
                      count(*) as daily_count
                 from raw_data
                group by period_label,
                         period_sort,
                         event_day,
                         truck_daily_status
            ),
            -- Unique trucks per period
            period_totals as (
               select period_label,
                      period_sort,
                      count(distinct vehicle_xid) as total_trucks
                 from raw_data
                group by period_label,
                         period_sort
            ),
            -- Average daily count per status per period
            period_averages as (
               select period_label,
                      period_sort,
                      truck_daily_status,
                      round(avg(daily_count)) as avg_count
                 from daily_status_counts
                group by period_label,
                         period_sort,
                         truck_daily_status
            )
            select pt.period_label as label,
                   pt.period_sort as sort_date,
                   pt.total_trucks as total,
                   pa.truck_daily_status,
                   pa.avg_count as status_count
              from period_totals pt
              join period_averages pa
            on pt.period_label = pa.period_label
               and pt.period_sort = pa.period_sort
             order by pt.period_sort,
                      pa.truck_daily_status
         ) loop
            if rec.label <> v_current_label then
               if v_current_label <> '___INIT___' then
                  apex_json.close_array; -- statuses
                  apex_json.close_object;
               end if;
               v_current_label := rec.label;
               apex_json.open_object;
               apex_json.write(
                  'label',
                  rec.label
               );
               apex_json.write(
                  'total',
                  rec.total
               );
               apex_json.open_array('statuses');
            end if;

            apex_json.open_object;
            apex_json.write(
               'status',
               format_status(
                  rec.truck_daily_status,
                  'TRUCK_'
               )
            );
            apex_json.write(
               'count',
               rec.status_count
            );
            apex_json.close_object;
         end loop;

         if v_current_label <> '___INIT___' then
            apex_json.close_array; -- statuses
            apex_json.close_object;
         end if;
      end if;

      apex_json.close_array; -- data
      apex_json.close_object; -- trucksTrend
   end if;

    -- =========================================================================
    -- 8. Drivers Trend (with unique counts + averages for WEEKLY/MONTHLY)
    -- =========================================================================
   if v_inc_drivers_trend then
      apex_json.open_object('driversTrend');
      apex_json.write(
         'viewMode',
         v_dt_mode
      );
      apex_json.open_array('data');
      if v_dt_mode = 'DAILY' then
         -- DAILY MODE: Keep original simple logic
         v_current_label := '___INIT___';
         for rec in (
            with trend_data as (
               select to_date(substr(
                  event_date,
                  1,
                  10
               ),
        'YYYY-MM-DD') as event_day,
                      driver_daily_status
                 from xxotm_driver_history_t
                where driver_daily_status is not null
                  and to_date(substr(
                  event_date,
                  1,
                  10
               ),
        'YYYY-MM-DD') between v_dt_start and v_dt_end
            )
            select to_char(
               event_day,
               'Mon DD'
            ) as label,
                   event_day as sort_date,
                   null as total,
                   driver_daily_status,
                   count(*) as status_count
              from trend_data
             group by to_char(
               event_day,
               'Mon DD'
            ),
                      event_day,
                      driver_daily_status
             order by sort_date,
                      label,
                      driver_daily_status
         ) loop
            if rec.label <> v_current_label then
               if v_current_label <> '___INIT___' then
                  apex_json.close_array; -- statuses
                  apex_json.close_object;
               end if;
               v_current_label := rec.label;
               apex_json.open_object;
               apex_json.write(
                  'label',
                  rec.label
               );
               apex_json.open_array('statuses');
            end if;

            apex_json.open_object;
            apex_json.write(
               'status',
               format_status(
                  rec.driver_daily_status,
                  'DRIVER_'
               )
            );
            apex_json.write(
               'count',
               rec.status_count
            );
            apex_json.close_object;
         end loop;

         if v_current_label <> '___INIT___' then
            apex_json.close_array; -- statuses
            apex_json.close_object;
         end if;
      else
         -- WEEKLY/MONTHLY MODE: Use unique counts + averages
         v_current_label := '___INIT___';
         for rec in (
            with raw_data as (
               select driver_xid,
                      to_date(substr(
                         event_date,
                         1,
                         10
                      ),
                              'YYYY-MM-DD') as event_day,
                      driver_daily_status,
                      case v_dt_mode
                         when 'WEEKLY'  then
                            to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                    'YYYY-MM-DD'),
                               'Mon'
                            )
                            || ' W'
                            || to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                     'YYYY-MM-DD'),
                               'W'
                            )
                         when 'MONTHLY' then
                            to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                    'YYYY-MM-DD'),
                               'Mon'
                            )
                      end as period_label,
                      case v_dt_mode
                         when 'WEEKLY'  then
                            trunc(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                  'YYYY-MM-DD'),
                               'MM'
                            ) + ( to_number(to_char(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                     'YYYY-MM-DD'),
                               'W'
                            )) - 1 ) * 7
                         when 'MONTHLY' then
                            trunc(
                               to_date(substr(
                                  event_date,
                                  1,
                                  10
                               ),
                                  'YYYY-MM-DD'),
                               'MM'
                            )
                      end as period_sort
                 from xxotm_driver_history_t
                where driver_daily_status is not null
                  and to_date(substr(
                  event_date,
                  1,
                  10
               ),
        'YYYY-MM-DD') between v_dt_start and v_dt_end
            ),
            -- Daily counts per status per day within each period
            daily_status_counts as (
               select period_label,
                      period_sort,
                      event_day,
                      driver_daily_status,
                      count(*) as daily_count
                 from raw_data
                group by period_label,
                         period_sort,
                         event_day,
                         driver_daily_status
            ),
            -- Unique drivers per period
            period_totals as (
               select period_label,
                      period_sort,
                      count(distinct driver_xid) as total_drivers
                 from raw_data
                group by period_label,
                         period_sort
            ),
            -- Average daily count per status per period
            period_averages as (
               select period_label,
                      period_sort,
                      driver_daily_status,
                      round(avg(daily_count)) as avg_count
                 from daily_status_counts
                group by period_label,
                         period_sort,
                         driver_daily_status
            )
            select pt.period_label as label,
                   pt.period_sort as sort_date,
                   pt.total_drivers as total,
                   pa.driver_daily_status,
                   pa.avg_count as status_count
              from period_totals pt
              join period_averages pa
            on pt.period_label = pa.period_label
               and pt.period_sort = pa.period_sort
             order by pt.period_sort,
                      pa.driver_daily_status
         ) loop
            if rec.label <> v_current_label then
               if v_current_label <> '___INIT___' then
                  apex_json.close_array; -- statuses
                  apex_json.close_object;
               end if;
               v_current_label := rec.label;
               apex_json.open_object;
               apex_json.write(
                  'label',
                  rec.label
               );
               apex_json.write(
                  'total',
                  rec.total
               );
               apex_json.open_array('statuses');
            end if;

            apex_json.open_object;
            apex_json.write(
               'status',
               format_status(
                  rec.driver_daily_status,
                  'DRIVER_'
               )
            );
            apex_json.write(
               'count',
               rec.status_count
            );
            apex_json.close_object;
         end loop;

         if v_current_label <> '___INIT___' then
            apex_json.close_array; -- statuses
            apex_json.close_object;
         end if;
      end if;

      apex_json.close_array; -- data
      apex_json.close_object; -- driversTrend
   end if;

    -- =========================================================================
    -- 9. Metadata (Min Dates for Date Picker Restrictions)
    -- =========================================================================
   apex_json.open_object('metadata');
   -- Vehicle min date
   begin
      select to_char(
         min(to_date(substr(
            event_date,
            1,
            10
         ),
             'YYYY-MM-DD')),
         'YYYY-MM-DD'
      )
        into v_vehicle_min_date
        from xxotm_vehicle_history_t
       where truck_daily_status is not null;
   exception
      when no_data_found then
         v_vehicle_min_date := null;
   end;
   apex_json.write(
      'vehicleMinDate',
      v_vehicle_min_date
   );

   -- Driver min date
   begin
      select to_char(
         min(to_date(substr(
            event_date,
            1,
            10
         ),
             'YYYY-MM-DD')),
         'YYYY-MM-DD'
      )
        into v_driver_min_date
        from xxotm_driver_history_t
       where driver_daily_status is not null;
   exception
      when no_data_found then
         v_driver_min_date := null;
   end;
   apex_json.write(
      'driverMinDate',
      v_driver_min_date
   );
   apex_json.close_object;

    -- =========================================================================
    -- 10. Close JSON
    -- =========================================================================
   apex_json.close_object; -- data
   apex_json.close_object; -- root
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
   if l_clob is not null then
      dbms_lob.freetemporary(l_clob);
   end if;
exception
   when others then
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Internal error: ' || sqlerrm
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xxotm_get_dashboard_metrics_p;
/