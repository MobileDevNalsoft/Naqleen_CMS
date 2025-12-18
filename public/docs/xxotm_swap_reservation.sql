create or replace procedure xx_otm_swap_reservation_containers (
   -- Last Updated Date : 17-Dec-2025
   -- Last Updated By : Madhan
   -- Description : Swapping an already reserved container with a new one. 
   --               Unreserves the first container, then Reserves the second one.
   payload in blob
) is
   -- Convert payload
   p_payload             clob;

   -- Request variables
   l_booking_id          varchar2(100);
   
   -- Loop/Process variables
   l_unreserve_nbr       varchar2(100);
   l_reserve_nbr         varchar2(100);
   l_container_order_nbr varchar2(100);   -- Order linked to container
   
   -- Web service variables
   l_base_url            varchar2(500) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2'
   ;
   l_username            varchar2(100) := 'NAQLEEN.INTEGRATION';
   l_password            varchar2(100) := 'NaqleenInt@123';
   l_wallet_path         varchar2(100) := 'file:/u01/app/oracle/product/wallet';
   l_api_url             varchar2(1000);
   l_api_payload         clob;
   l_api_response        clob;
   l_http_status         number;

   -- Tracking
   l_success_count       number := 0;
   l_fail_count          number := 0;
   l_total_unreserve     number := 0;
   l_total_reserve       number := 0;
   l_failed_containers   varchar2(4000) := null;
   l_api_error_msg       varchar2(500);
begin
   -- Convert BLOB to CLOB
   p_payload := to_clob(payload);

   -- Parse the JSON payload
   apex_json.parse(p_payload);

   -- Extract booking_id
   l_booking_id := apex_json.get_varchar2(p_path => 'booking_id');

   -- Validate booking_id
   if l_booking_id is null then
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'booking_id is required'
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      return;
   end if;

   -- Get array counts
   l_total_unreserve := apex_json.get_count(p_path => 'unreserve_containers');
   l_total_reserve := apex_json.get_count(p_path => 'reserve_containers');

   -- Validate arrays
   if l_total_unreserve is null
   or l_total_unreserve = 0 then
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'unreserve_containers array is empty or missing'
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      return;
   end if;

   if l_total_reserve is null
   or l_total_reserve = 0 then
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'reserve_containers array is empty or missing'
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      return;
   end if;

   if l_total_unreserve <> l_total_reserve then
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'Mismatch in container counts. Must swap equal number of containers.'
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      return;
   end if;

   -- Loop through each pair (index i)
   for i in 1..l_total_unreserve loop
      begin
         -- Get container numbers from both arrays at index i
         l_unreserve_nbr := apex_json.get_varchar2(
            p_path => 'unreserve_containers[%d]',
            p0     => i
         );
         l_reserve_nbr := apex_json.get_varchar2(
            p_path => 'reserve_containers[%d]',
            p0     => i
         );
         if l_unreserve_nbr is null
         or l_reserve_nbr is null then
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := 'Pair['
                                      || i
                                      || '] has null container';
            else
               l_failed_containers := l_failed_containers
                                      || ', Pair['
                                      || i
                                      || '] has null';
            end if;
            continue;
         end if;

         -- ==================================================
         -- PART A: UNRESERVE (DELETE)
         -- ==================================================
         
         -- 1. Fetch inbound_order_nbr for the UNRESERVE container
         l_container_order_nbr := null;
         begin
            select inbound_order_nbr
              into l_container_order_nbr
              from xxotm_container_inventory_t
             where container_nbr = l_unreserve_nbr
               and booking_id = l_booking_id
               and rownum = 1;
         exception
            when no_data_found then
               l_container_order_nbr := null;
         end;

         if l_container_order_nbr is null then
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := 'Swap['
                                      || i
                                      || ']: '
                                      || l_unreserve_nbr
                                      || ' (no matching order)';
            else
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_unreserve_nbr
                                      || ' (no matching order)';
            end if;
            continue; -- Convert to next pair/iteration
         end if;

         -- 2. DELETE refnums
         l_api_url := l_base_url
                      || '/orderReleases/NAQLEEN.'
                      || l_container_order_nbr
                      || '/refnums/NAQLEEN.BOOKING_NOx'
                      || l_booking_id;
         apex_web_service.g_request_headers.delete;
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         l_api_response := apex_web_service.make_rest_request(
            p_url         => l_api_url,
            p_http_method => 'DELETE',
            p_username    => l_username,
            p_password    => l_password,
            p_wallet_path => l_wallet_path
         );
         l_http_status := apex_web_service.g_status_code;
         if l_http_status not in ( 200,
                                   204 ) then
            -- DELETE FAILED
            l_fail_count := l_fail_count + 1;
            l_api_error_msg := substr(
               nvl(
                  l_api_response,
                  'No response'
               ),
               1,
               200
            );
            if l_failed_containers is null then
               l_failed_containers := l_unreserve_nbr
                                      || ' (Delete Failed '
                                      || l_http_status
                                      || ')';
            else
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_unreserve_nbr
                                      || ' (Delete Failed)';
            end if;
            continue; -- Do not proceed to Reserve if Unreserve failed
         end if;

         -- DELETE SUCCESS: Update Inventory for Unreserve
         update xxotm_container_inventory_t
            set
            booking_id = null
          where container_nbr = l_unreserve_nbr;

         -- ==================================================
         -- PART B: RESERVE (POST)
         -- ==================================================

         -- 1. Fetch inbound_order_nbr for the NEW RESERVE container
         l_container_order_nbr := null; -- Reset
         begin
            select inbound_order_nbr
              into l_container_order_nbr
              from xxotm_container_inventory_t
             where container_nbr = l_reserve_nbr
               and booking_id is null
               and rownum = 1;
         exception
            when no_data_found then
               l_container_order_nbr := null;
         end;

         if l_container_order_nbr is null then
            -- Unreserve worked, but Reserve failed pre-check. 
            -- We count this as a partial fail for this pair, but the Unreserve is committed.
            -- Logic choice: Count as fail? Or success-with-warning? 
            -- User wants swap. If swap fails, it's a fail.
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := l_reserve_nbr || ' (New container not available)';
            else
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_reserve_nbr
                                      || ' (New container not available)';
            end if;
            continue;
         end if;

         -- 2. POST refnums
         l_api_url := l_base_url
                      || '/orderReleases/NAQLEEN.'
                      || l_container_order_nbr
                      || '/refnums';
         l_api_payload := '{'
                          || '"orderReleaseRefnumQualGid": "NAQLEEN.BOOKING_NO",'
                          || '"orderReleaseRefnumValue": "'
                          || l_booking_id
                          || '",'
                          || '"domainName": "NAQLEEN"'
                          || '}';

         apex_web_service.g_request_headers.delete;
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         l_api_response := apex_web_service.make_rest_request(
            p_url         => l_api_url,
            p_http_method => 'POST',
            p_username    => l_username,
            p_password    => l_password,
            p_wallet_path => l_wallet_path,
            p_body        => l_api_payload
         );
         l_http_status := apex_web_service.g_status_code;
         if l_http_status in ( 200,
                               201,
                               204 ) then
            -- SWAP COMPLETE SUCCESS
            l_success_count := l_success_count + 1;
            -- Update Inventory for Reserve
            update xxotm_container_inventory_t
               set
               booking_id = l_booking_id
             where container_nbr = l_reserve_nbr;
         else
            -- RESERVE FAILED (Unreserve was successful)
            l_fail_count := l_fail_count + 1;
            l_api_error_msg := substr(
               nvl(
                  l_api_response,
                  'No response'
               ),
               1,
               200
            );
            if l_failed_containers is null then
               l_failed_containers := l_unreserve_nbr
                                      || '->'
                                      || l_reserve_nbr
                                      || ' (Reserve Failed '
                                      || l_http_status
                                      || ')';
            else
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_unreserve_nbr
                                      || '->'
                                      || l_reserve_nbr
                                      || ' (Reserve Failed)';
            end if;
         end if;

      exception
         when others then
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := 'Swap['
                                      || i
                                      || '] Exception: '
                                      || substr(
                  sqlerrm,
                  1,
                  100
               );
            else
               l_failed_containers := l_failed_containers
                                      || ', Swap['
                                      || i
                                      || '] Exception';
            end if;
      end;
   end loop;

   -- Build response
   apex_json.initialize_clob_output;
   apex_json.open_object;
   if l_fail_count = 0 then
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Successfully swapped '
         || l_success_count
         || ' containers'
      );
   elsif l_success_count = 0 then
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Failed to swap containers'
      );
   else
      apex_json.write(
         'response_code',
         207
      );
      apex_json.write(
         'response_message',
         'Partial: '
         || l_success_count
         || ' swapped, '
         || l_fail_count
         || ' failed'
      );
   end if;

   apex_json.write(
      'success_count',
      l_success_count
   );
   apex_json.write(
      'fail_count',
      l_fail_count
   );
   apex_json.write(
      'booking_id',
      l_booking_id
   );
   if l_failed_containers is not null then
      apex_json.write(
         'debug_errors',
         l_failed_containers
      );
   end if;
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
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
         'Unexpected error: ' || sqlerrm
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
end xx_otm_swap_reservation_containers;
/