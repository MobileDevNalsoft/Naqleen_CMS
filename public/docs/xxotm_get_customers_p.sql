create or replace procedure xxotm_get_customers_p is
   -- API 1: Get Customers with Booking Count
   -- Author: Madhan
   -- Last Updated: 03-FEB-2026
   l_json_clob clob;
   v_first     boolean := true;
begin
   l_json_clob := '{
    "response_message": "Success",
    "response_code": 200,
    "data": [';
   for rec in (
      select cust_name,
             cust_nbr,
             count(distinct booking_id) as booking_count
        from xxotm_container_inventory_t
       where cust_name is not null
         and container_nbr is null
         and upper(order_type) like '%LRO%'
         and container_released_time is null
       group by cust_name,
                cust_nbr
       order by cust_name
   ) loop
      if not v_first then
         l_json_clob := l_json_clob || ',';
      end if;
      v_first := false;
      l_json_clob := l_json_clob
                     || '{"cust_name":"'
                     || rec.cust_name
                     || '","cust_nbr":"'
                     || rec.cust_nbr
                     || '","booking_count":'
                     || rec.booking_count
                     || '}';
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
      ) || '","response_code":500,"data":[]}');
end;