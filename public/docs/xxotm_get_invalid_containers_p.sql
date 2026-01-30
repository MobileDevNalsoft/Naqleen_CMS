-- =============================================================================
-- PROCEDURE: XXOTM_GET_INVALID_CONTAINERS_P
-- Description: Retrieves containers with invalid/unknown positions (position = 'NA')
--              Supports scroll-based pagination with limit 50
-- Parameters:
--   p_offset (IN) - Number of rows to skip for pagination (default '0')
-- =============================================================================

create or replace procedure xxotm_get_invalid_containers_p (
   p_offset in varchar2 default '0'
) as
   l_offset      number := 0;
   l_total_count number := 0;
   l_page_size   number := 50;
   l_data_found  boolean := false;
begin
   -- Safe variable initialization inside BEGIN
   begin
      l_offset := to_number ( nvl(
         p_offset,
         '0'
      ) );
   exception
      when others then
         l_offset := 0;
   end;
   
   -- Handle potential NULL from TO_NUMBER
   l_offset := nvl(
      l_offset,
      0
   );
   apex_json.initialize_clob_output;
   apex_json.open_object;
   
   -- Get total count for metadata
   select count(*)
     into l_total_count
     from xxotm_container_inventory_t
    where container_nbr is not null
      and container_stored_time is not null
      and container_released_time is null
      and position = 'NA';
   
   -- Write JSON header
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.write(
      'total_count',
      l_total_count
   );
   apex_json.write(
      'offset',
      l_offset
   );
   apex_json.write(
      'limit',
      l_page_size
   );
   apex_json.open_array('data');

   -- Using ROW_NUMBER() pagination for maximum compatibility and robustness
   for r_container in (
      select *
        from (
         select i.container_nbr,
                i.container_type,
                i.container_stored_time,
                i.cust_name,
                row_number()
                over(
                    order by i.container_stored_time asc
                ) as row_idx
           from xxotm_container_inventory_t i
          where i.container_nbr is not null
            and i.container_stored_time is not null
            and i.container_released_time is null
            and i.position = 'NA'
      )
       where row_idx > l_offset
         and row_idx <= ( l_offset + l_page_size )
   ) loop
      l_data_found := true;
      apex_json.open_object;
      apex_json.write(
         'container_nbr',
         r_container.container_nbr
      );
      apex_json.write(
         'container_type',
         r_container.container_type
      );
      
      -- Let apex_json handle the data type conversion to avoid ORA-06502 in TO_CHAR/TO_DATE
      apex_json.write(
         'stored_time',
         r_container.container_stored_time
      );
      apex_json.write(
         'customer_name',
         r_container.cust_name
      );
      apex_json.close_object;
   end loop;

   apex_json.close_array;
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      -- Clean up and return error with full backtrace
      begin
         apex_json.free_output;
      exception
         when others then
            null;
      end;
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Error: '
         || sqlerrm
         || ' - '
         || dbms_utility.format_error_backtrace
      );
      apex_json.write(
         'total_count',
         0
      );
      apex_json.write(
         'offset',
         0
      );
      apex_json.write(
         'limit',
         50
      );
      apex_json.open_array('data');
      apex_json.close_array;
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xxotm_get_invalid_containers_p;
/