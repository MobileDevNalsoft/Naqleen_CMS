create or replace procedure xxotm_get_dashboard_drilldown_p (
   p_body in blob
) is
    -- ===========================================================================
    -- Procedure: XXOTM_GET_DASHBOARD_DRILLDOWN_P
    -- Purpose:   Drill-down API for Trucks/Drivers Utilization
    --            Returns paginated row-level data for dashboard drill-downs
    -- Status Mapping:
    --   Dynamic mapping aligning with XXOTM_DASHBOARD_METRICS_P
    --   Input 'Committed' -> Filter 'TRUCK_COMMITTED'
    --   Output 'TRUCK_COMMITTED' -> 'Committed'
    -- ===========================================================================
    
    -- BLOB to CLOB conversion
   l_clob         clob;
   l_dest_offset  integer := 1;
   l_src_offset   integer := 1;
   l_lang_context integer := dbms_lob.default_lang_ctx;
   l_warning      integer;

    -- Request Payload
   jo_request     json_object_t;

    -- Input Parameters
   v_type         varchar2(20);   -- 'TRUCKS' or 'DRIVERS'
   v_status       varchar2(100);  -- 'ALL' or specific status e.g. 'Committed', 'Available'
   v_date         varchar2(20);   -- Single date (YYYY-MM-DD) or NULL
   v_start_date   varchar2(20);   -- Range start or NULL
   v_end_date     varchar2(20);   -- Range end or NULL
   v_page         number := 1;    -- Page number (1-based)
   v_page_size    number := 50;   -- Rows per page (default 50, max 100)

    -- Resolved Dates
   v_date_start   date;
   v_date_end     date;

    -- Mapped DB Status (for filtering)
   v_db_status    varchar2(100);

    -- Pagination
   v_total_rows   number := 0;
   v_total_pages  number := 0;
   v_offset       number := 0;

    -- Search Text
   v_search_text  varchar2(100);

    -- Response Building
   jo_response    json_object_t := json_object_t();
   jo_data        json_object_t := json_object_t();
   jo_pagination  json_object_t := json_object_t();
   jo_date_range  json_object_t := json_object_t();
   ja_rows        json_array_t := json_array_t();
   jo_row         json_object_t;

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
    -- Matches logic in XXOTM_DASHBOARD_METRICS_P
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
         blob_csid    => nls_charset_id('AL32UTF8'),
         lang_context => l_lang_context,
         warning      => l_warning
      );
   else
      l_clob := '{}';
   end if;

    -- =========================================================================
    -- 2. Parse Request JSON
    -- =========================================================================
   begin
      jo_request := json_object_t.parse(l_clob);
   exception
      when others then
         jo_request := json_object_t();
   end;

    -- Extract parameters
   if jo_request.has('type') then
      v_type := upper(jo_request.get_string('type'));
   else
      v_type := 'TRUCKS';
   end if;

   if jo_request.has('status') then
      -- Keep case for display mapping (e.g. 'Committed' -> 'COMMITTED')
      v_status := jo_request.get_string('status');
   else
      v_status := 'ALL';
   end if;

   if jo_request.has('date') then
      v_date := jo_request.get_string('date');
   end if;

   if jo_request.has('startDate') then
      v_start_date := jo_request.get_string('startDate');
   end if;

   if jo_request.has('endDate') then
      v_end_date := jo_request.get_string('endDate');
   end if;

   if jo_request.has('page') then
      v_page := jo_request.get_number('page');
      if v_page < 1 then
         v_page := 1;
      end if;
   end if;

   if jo_request.has('pageSize') then
      v_page_size := jo_request.get_number('pageSize');
      if v_page_size < 1 then
         v_page_size := 50;
      end if;
      if v_page_size > 100 then
         v_page_size := 100;
      end if;
   end if;

    -- =========================================================================
    -- 3. Resolve Date Range
    -- =========================================================================
   if v_date is not null then
      v_date_start := parse_date(v_date);
      v_date_end := v_date_start;
   else
      v_date_start := parse_date(v_start_date);
      v_date_end := parse_date(v_end_date);
   end if;

   if v_date_start is null then
      v_date_start := trunc(sysdate);
   end if;
   if v_date_end is null then
      v_date_end := trunc(sysdate);
   end if;

    -- Calculate offset
   v_offset := ( v_page - 1 ) * v_page_size;

    -- =========================================================================
    -- 4. Map Display Status to DB Status
    -- =========================================================================
   if v_status is null
   or upper(v_status) = 'ALL' then
      v_db_status := null;
   else
      -- Reverse map: 'Committed' -> 'TRUCK_COMMITTED' or 'DRIVER_COMMITTED'
      -- Logic: Status -> Upper -> Replace space with _ -> Prepend Prefix
      if v_type = 'TRUCKS' then
         v_db_status := 'TRUCK_'
                        || replace(
            upper(v_status),
            ' ',
            '_'
         );
      elsif v_type = 'DRIVERS' then
         v_db_status := 'DRIVER_'
                        || replace(
            upper(v_status),
            ' ',
            '_'
         );
      end if;
   end if;

   if jo_request.has('searchText') then
      v_search_text := trim(jo_request.get_string('searchText'));
   end if;

    -- =========================================================================
    -- 5. Fetch Data Based on Type
    -- =========================================================================
   if v_type = 'TRUCKS' then
        -- Count total rows for pagination
      if v_db_status is null then
            -- ALL statuses
         select count(*)
           into v_total_rows
           from xxotm_vehicle_history_t
          where truck_daily_status is not null
            and to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') between v_date_start and v_date_end
            and ( v_search_text is null
             or length(v_search_text) < 3
             or ( upper(vehicle_xid) like '%'
                                          || upper(v_search_text)
                                          || '%'
         or upper(driver_xid) like '%'
                  || upper(v_search_text)
                  || '%'
         or upper(equipment) like '%'
                                  || upper(v_search_text)
                                  || '%' ) );
      else
            -- Specific status
         select count(*)
           into v_total_rows
           from xxotm_vehicle_history_t
          where truck_daily_status is not null
            and truck_daily_status = v_db_status
            and to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') between v_date_start and v_date_end
            and ( v_search_text is null
             or length(v_search_text) < 3
             or ( upper(vehicle_xid) like '%'
                                          || upper(v_search_text)
                                          || '%'
         or upper(driver_xid) like '%'
                  || upper(v_search_text)
                  || '%'
         or upper(equipment) like '%'
                                  || upper(v_search_text)
                                  || '%' ) );
      end if;

      v_total_pages := ceil(v_total_rows / v_page_size);

        -- Fetch paginated rows with dynamic status formatting
        -- Same query structure for both ALL and specific status to keep logic clean
        -- but distinct if/else for performance optimization of the filter
      if v_db_status is null then
         for rec in (
            select event_date,
                   vehicle_xid,
                   truck_daily_status,
                   driver_xid,
                   equipment
              from xxotm_vehicle_history_t
             where truck_daily_status is not null
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between v_date_start and v_date_end
               and ( v_search_text is null
                or length(v_search_text) < 3
                or ( upper(vehicle_xid) like '%'
                                             || upper(v_search_text)
                                             || '%'
            or upper(driver_xid) like '%'
                     || upper(v_search_text)
                     || '%'
            or upper(equipment) like '%'
                                     || upper(v_search_text)
                                     || '%' ) )
             order by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') desc,
                      vehicle_xid
            offset v_offset rows fetch next v_page_size rows only
         ) loop
            jo_row := json_object_t();
            jo_row.put(
               'eventDate',
               substr(
                  rec.event_date,
                  1,
                  10
               )
            );
            jo_row.put(
               'truckId',
               rec.vehicle_xid
            );
            -- Dynamic Status Formatting
            jo_row.put(
               'status',
               format_status(
                  rec.truck_daily_status,
                  'TRUCK_'
               )
            );
            jo_row.put(
               'driverId',
               rec.driver_xid
            );
            jo_row.put(
               'equipment',
               rec.equipment
            );
            ja_rows.append(jo_row);
         end loop;
      else
         for rec in (
            select event_date,
                   vehicle_xid,
                   truck_daily_status,
                   driver_xid,
                   equipment
              from xxotm_vehicle_history_t
             where truck_daily_status is not null
               and truck_daily_status = v_db_status
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between v_date_start and v_date_end
               and ( v_search_text is null
                or length(v_search_text) < 3
                or ( upper(vehicle_xid) like '%'
                                             || upper(v_search_text)
                                             || '%'
            or upper(driver_xid) like '%'
                     || upper(v_search_text)
                     || '%'
            or upper(equipment) like '%'
                                     || upper(v_search_text)
                                     || '%' ) )
             order by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') desc,
                      vehicle_xid
            offset v_offset rows fetch next v_page_size rows only
         ) loop
            jo_row := json_object_t();
            jo_row.put(
               'eventDate',
               substr(
                  rec.event_date,
                  1,
                  10
               )
            );
            jo_row.put(
               'truckId',
               rec.vehicle_xid
            );
            -- Dynamic Status Formatting
            jo_row.put(
               'status',
               format_status(
                  rec.truck_daily_status,
                  'TRUCK_'
               )
            );
            jo_row.put(
               'driverId',
               rec.driver_xid
            );
            jo_row.put(
               'equipment',
               rec.equipment
            );
            ja_rows.append(jo_row);
         end loop;
      end if;

   elsif v_type = 'DRIVERS' then
        -- Count total rows for pagination
      if v_db_status is null then
            -- ALL statuses
         select count(*)
           into v_total_rows
           from xxotm_driver_history_t
          where driver_daily_status is not null
            and to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') between v_date_start and v_date_end
            and ( v_search_text is null
             or length(v_search_text) < 3
             or ( upper(driver_xid) like '%'
                                         || upper(v_search_text)
                                         || '%'
         or upper(vehicle_xid) like '%'
                  || upper(v_search_text)
                  || '%'
         or upper(equipment) like '%'
                                  || upper(v_search_text)
                                  || '%' ) );
      else
            -- Specific status
         select count(*)
           into v_total_rows
           from xxotm_driver_history_t
          where driver_daily_status is not null
            and driver_daily_status = v_db_status
            and to_date(substr(
            event_date,
            1,
            10
         ),
        'YYYY-MM-DD') between v_date_start and v_date_end
            and ( v_search_text is null
             or length(v_search_text) < 3
             or ( upper(driver_xid) like '%'
                                         || upper(v_search_text)
                                         || '%'
         or upper(vehicle_xid) like '%'
                  || upper(v_search_text)
                  || '%'
         or upper(equipment) like '%'
                                  || upper(v_search_text)
                                  || '%' ) );
      end if;

      v_total_pages := ceil(v_total_rows / v_page_size);

        -- Fetch paginated rows with dynamic status mapping
      if v_db_status is null then
         for rec in (
            select event_date,
                   driver_xid,
                   driver_daily_status,
                   vehicle_xid,
                   equipment
              from xxotm_driver_history_t
             where driver_daily_status is not null
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between v_date_start and v_date_end
               and ( v_search_text is null
                or length(v_search_text) < 3
                or ( upper(driver_xid) like '%'
                                            || upper(v_search_text)
                                            || '%'
            or upper(vehicle_xid) like '%'
                     || upper(v_search_text)
                     || '%'
            or upper(equipment) like '%'
                                     || upper(v_search_text)
                                     || '%' ) )
             order by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') desc,
                      driver_xid
            offset v_offset rows fetch next v_page_size rows only
         ) loop
            jo_row := json_object_t();
            jo_row.put(
               'eventDate',
               substr(
                  rec.event_date,
                  1,
                  10
               )
            );
            jo_row.put(
               'driverId',
               rec.driver_xid
            );
            -- Dynamic Status Formatting
            jo_row.put(
               'status',
               format_status(
                  rec.driver_daily_status,
                  'DRIVER_'
               )
            );
            jo_row.put(
               'truckId',
               rec.vehicle_xid
            );
            jo_row.put(
               'equipment',
               rec.equipment
            );
            ja_rows.append(jo_row);
         end loop;
      else
         for rec in (
            select event_date,
                   driver_xid,
                   driver_daily_status,
                   vehicle_xid,
                   equipment
              from xxotm_driver_history_t
             where driver_daily_status is not null
               and driver_daily_status = v_db_status
               and to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') between v_date_start and v_date_end
               and ( v_search_text is null
                or length(v_search_text) < 3
                or ( upper(driver_xid) like '%'
                                            || upper(v_search_text)
                                            || '%'
            or upper(vehicle_xid) like '%'
                     || upper(v_search_text)
                     || '%'
            or upper(equipment) like '%'
                                     || upper(v_search_text)
                                     || '%' ) )
             order by to_date(substr(
               event_date,
               1,
               10
            ),
        'YYYY-MM-DD') desc,
                      driver_xid
            offset v_offset rows fetch next v_page_size rows only
         ) loop
            jo_row := json_object_t();
            jo_row.put(
               'eventDate',
               substr(
                  rec.event_date,
                  1,
                  10
               )
            );
            jo_row.put(
               'driverId',
               rec.driver_xid
            );
            -- Dynamic Status Formatting
            jo_row.put(
               'status',
               format_status(
                  rec.driver_daily_status,
                  'DRIVER_'
               )
            );
            jo_row.put(
               'truckId',
               rec.vehicle_xid
            );
            jo_row.put(
               'equipment',
               rec.equipment
            );
            ja_rows.append(jo_row);
         end loop;
      end if;
   end if;

    -- =========================================================================
    -- 6. Build Response
    -- =========================================================================
    -- Date Range Object
   jo_date_range.put(
      'start',
      to_char(
         v_date_start,
         'YYYY-MM-DD'
      )
   );
   jo_date_range.put(
      'end',
      to_char(
         v_date_end,
         'YYYY-MM-DD'
      )
   );

    -- Pagination Object
   jo_pagination.put(
      'page',
      v_page
   );
   jo_pagination.put(
      'pageSize',
      v_page_size
   );
   jo_pagination.put(
      'totalRows',
      v_total_rows
   );
   jo_pagination.put(
      'totalPages',
      v_total_pages
   );

    -- Data Object
   jo_data.put(
      'type',
      v_type
   );
   jo_data.put(
      'status',
      v_status
   );
   jo_data.put(
      'dateRange',
      jo_date_range
   );
   jo_data.put(
      'pagination',
      jo_pagination
   );
   jo_data.put(
      'rows',
      ja_rows
   );

    -- Final Response
   jo_response.put(
      'response_code',
      200
   );
   jo_response.put(
      'response_message',
      'Success'
   );
   jo_response.put(
      'data',
      jo_data
   );

    -- =========================================================================
    -- 7. Output Response
    -- =========================================================================
   owa_util.mime_header(
      'application/json',
      false,
      'UTF-8'
   );
   owa_util.status_line(
      200,
      'OK'
   );
   owa_util.http_header_close;
   htp.p(jo_response.to_string);

    -- Cleanup
   if dbms_lob.istemporary(l_clob) = 1 then
      dbms_lob.freetemporary(l_clob);
   end if;

exception
   when others then
      jo_response := json_object_t();
      jo_response.put(
         'response_code',
         500
      );
      jo_response.put(
         'response_message',
         'Error: ' || sqlerrm
      );
      jo_response.put(
         'data',
         json_object_t()
      );
      owa_util.mime_header(
         'application/json',
         false,
         'UTF-8'
      );
      owa_util.status_line(
         500,
         'Internal Server Error'
      );
      owa_util.http_header_close;
      htp.p(jo_response.to_string);
end xxotm_get_dashboard_drilldown_p;
/