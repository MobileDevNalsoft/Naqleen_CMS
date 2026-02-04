create or replace procedure xxotm_get_bookings_p (
   p_cust_nbr    in varchar2,
   p_search_text in varchar2 default null,
   p_page        in number default 1,
   p_limit       in number default 20
) is
   -- API 2: Get Bookings with Types (Paginated + Searchable)
   -- Author: Madhan
   -- Last Updated: 03-FEB-2026
   l_json_clob   clob;
   l_types_json  clob;
   v_first_book  boolean := true;
   v_first_type  boolean;
   v_offset      number := ( p_page - 1 ) * p_limit;
   v_total_count number := 0;
   v_search      varchar2(200) := '%'
                             || upper(nvl(
      p_search_text,
      ''
   ))
                             || '%';

   -- Get distinct bookings with pagination
   cursor c_bookings is
   select distinct booking_id
     from xxotm_container_inventory_t
    where cust_nbr = p_cust_nbr
      and container_nbr is null
      and upper(order_type) like '%LRO%'
      and container_released_time is null
      and ( p_search_text is null
       or upper(booking_id) like v_search )
    order by booking_id
   offset v_offset rows fetch next p_limit rows only;

   -- Get types for a booking
   cursor c_types (
      p_book varchar2
   ) is
   select container_type,
          sum(
             case
                when container_nbr is null then
                   1
                else
                   0
             end
          ) as total,
          sum(
             case
                when container_nbr is not null
                   and position is not null then
                   1
                else
                   0
             end
          ) as reserved
     from xxotm_container_inventory_t
    where cust_nbr = p_cust_nbr
      and booking_id = p_book
      and container_type is not null
      and container_released_time is null
    group by container_type
   having sum(
      case
         when container_nbr is null then
            1
         else
            0
      end
   ) > 0
    order by container_type;

begin
   -- Get total count for pagination
   select count(distinct booking_id)
     into v_total_count
     from xxotm_container_inventory_t
    where cust_nbr = p_cust_nbr
      and container_nbr is null
      and upper(order_type) like '%LRO%'
      and container_released_time is null
      and ( p_search_text is null
       or upper(booking_id) like v_search );

   l_json_clob := '{
    "response_message": "Success",
    "response_code": 200,
    "total_count": '
                  || v_total_count
                  || ',
    "page": '
                  || p_page
                  || ',
    "limit": '
                  || p_limit
                  || ',
    "data": [';

   for book in c_bookings loop
      if not v_first_book then
         l_json_clob := l_json_clob || ',';
      end if;
      v_first_book := false;

      -- Build types array
      l_types_json := '[';
      v_first_type := true;
      for t in c_types(book.booking_id) loop
         if not v_first_type then
            l_types_json := l_types_json || ',';
         end if;
         v_first_type := false;
         l_types_json := l_types_json
                         || '{"type":"'
                         || t.container_type
                         || '","total":'
                         || t.total
                         || ',"reserved":'
                         || t.reserved
                         || ',"to_plan":'
                         || ( t.total - t.reserved )
                         || '}';
      end loop;

      l_types_json := l_types_json || ']';
      l_json_clob := l_json_clob
                     || '{"booking_id":"'
                     || book.booking_id
                     || '","types":'
                     || l_types_json
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
      ) || '","response_code":500,"data":[],"total_count":0,"page":1,"limit":20}');
end;