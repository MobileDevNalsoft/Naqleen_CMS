-- Procedure Definition
create or replace procedure xx_otm_get_cust_and_bookings is
   l_json_clob clob;
begin
    -- Initialize JSON object
   l_json_clob := '{
    "response_message": "Success",
    "response_code": 200,
    "data": [';

    -- Cursor loop to construct JSON manually to ensure correct format across DB versions
   declare
      v_first_cust boolean := true;
      v_first_book boolean;
      cursor c_cust is
      select distinct customer_name
        from xxotm_container_inventory_t_test
       where status = 'R'
         and customer_name is not null
       order by customer_name;

      cursor c_books (
         p_cust varchar2
      ) is
      select distinct booking_id
        from xxotm_container_inventory_t_test
       where status = 'R'
         and customer_name = p_cust
         and booking_id is not null;
   begin
      for cust in c_cust loop
         if not v_first_cust then
            l_json_clob := l_json_clob || ',';
         end if;
         v_first_cust := false;
         l_json_clob := l_json_clob
                        || '{ "customer_name": "'
                        || cust.customer_name
                        || '", "bookings": [';
         v_first_book := true;
         for book in c_books(cust.customer_name) loop
            if not v_first_book then
               l_json_clob := l_json_clob || ',';
            end if;
            v_first_book := false;
            l_json_clob := l_json_clob
                           || '"'
                           || book.booking_id
                           || '"';
         end loop;

         l_json_clob := l_json_clob || ']}';
      end loop;
   end;

   l_json_clob := l_json_clob || ']}';

    -- Output JSON
   htp.prn(l_json_clob);
exception
   when others then
      htp.prn('{
            "response_message": "Error: '
              || sqlerrm
              || '",
            "response_code": 500,
            "data": []
        }');
end;
/

-- ORDS Endpoint Definition
begin
   ords.define_module(
      p_module_name    => 'otm_web',
      p_base_path      => 'otm-web/',
      p_items_per_page => 0,
      p_status         => 'PUBLISHED',
      p_comments       => 'OTM Web Module'
   );

   ords.define_template(
      p_module_name => 'otm_web',
      p_pattern     => 'getCustomersAndBookings'
   );
   ords.define_handler(
      p_module_name    => 'otm_web',
      p_pattern        => 'getCustomersAndBookings',
      p_method         => 'GET',
      p_source_type    => ords.source_type_plsql,
      p_source         => 'BEGIN XX_OTM_GET_CUST_AND_BOOKINGS; END;',
      p_items_per_page => 0
   );

   commit;
end;
/