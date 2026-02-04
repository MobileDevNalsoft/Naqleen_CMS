create or replace procedure xxotm_get_available_reserved_p (
   p_cust_nbr   in varchar2,
   p_booking_id in varchar2,
   p_type       in varchar2
) is
   -- API 3: Get Reserved AND Available Container Numbers for a Booking + Type
   -- Returns: { reserved: [...], available: [...] }
   -- Available = containers with booking_id IS NULL for this cust/type
   -- Author: Madhan
   -- Last Updated: 04-FEB-2026
   l_json_clob clob;
   v_first     boolean := true;
begin
   -- Start JSON response
   l_json_clob := '{
    "response_message": "Success",
    "response_code": 200,
    "booking_id": "'
                  || p_booking_id
                  || '",
    "container_type": "'
                  || p_type
                  || '",
    "reserved": [';

   -- Loop 1: Reserved containers (already assigned to this booking)
   v_first := true;
   for rec in (
      select container_nbr
        from xxotm_container_inventory_t
       where cust_nbr = p_cust_nbr
         and booking_id = p_booking_id
         and container_type = p_type
         and container_nbr is not null
         and position is not null
         and container_released_time is null
       order by container_nbr
   ) loop
      if not v_first then
         l_json_clob := l_json_clob || ',';
      end if;
      v_first := false;
      l_json_clob := l_json_clob
                     || '"'
                     || rec.container_nbr
                     || '"';
   end loop;

   l_json_clob := l_json_clob || '],
    "available": [';

   -- Loop 2: Available containers (not assigned to any booking)
   v_first := true;
   for rec in (
      select container_nbr
        from xxotm_container_inventory_t
       where container_type = p_type
         and cust_nbr = p_cust_nbr
         and booking_id is null
         and container_released_time is null
         and outbound_shipment_nbr is null
         and position is not null
         and container_stored_time is not null
         and inbound_shipment_nbr is not null
       order by to_date(container_stored_time,
        'YYYY-MM-DD"T"HH24:MI:SS"Z"') asc
   ) loop
      if not v_first then
         l_json_clob := l_json_clob || ',';
      end if;
      v_first := false;
      l_json_clob := l_json_clob
                     || '"'
                     || rec.container_nbr
                     || '"';
   end loop;

   l_json_clob := l_json_clob || ']}';
   htp.prn(l_json_clob);
exception
   when others then
      htp.prn('{"response_message":"Error: '
              || replace(
         sqlerrm,
         '"',
         '\"'
      ) || '","response_code":500,"reserved":[],"available":[]}');
end;
/