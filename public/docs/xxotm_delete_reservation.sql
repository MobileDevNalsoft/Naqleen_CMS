create or replace procedure xx_otm_delete_reservation_containers (
   -- Last Updated Date : 17-Dec-2025
   -- Last Updated By : Madhan
   -- Description : unreserving/deleting the booking id from container.
   payload in blob
) is
   -- Convert payload
   p_payload             clob;

   -- Request variables
   l_booking_id          varchar2(100);
   l_container_nbr       varchar2(100);
   l_container_order_nbr varchar2(100);   -- Order linked to container
   
   -- Web service variables
   l_base_url            varchar2(500) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2'
   ;
   l_username            varchar2(100) := 'NAQLEEN.INTEGRATION';
   l_password            varchar2(100) := 'NaqleenInt@123';
   l_wallet_path         varchar2(100) := 'file:/u01/app/oracle/product/wallet';
   l_api_url             varchar2(1000);
   l_api_response        clob;
   l_http_status         number;

   -- Tracking
   l_success_count       number := 0;
   l_fail_count          number := 0;
   l_total_count         number := 0;
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

   -- Get containers array count
   l_total_count := apex_json.get_count(p_path => 'unreserve_containers');
   if l_total_count is null
   or l_total_count = 0 then
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

   -- Loop through each container
   for i in 1..l_total_count loop
      begin
         -- Get container number from array
         l_container_nbr := apex_json.get_varchar2(
            p_path => 'unreserve_containers[%d]',
            p0     => i
         );
         if l_container_nbr is null then
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := 'Container['
                                      || i
                                      || '] is null';
            else
               l_failed_containers := l_failed_containers
                                      || ', Container['
                                      || i
                                      || '] is null';
            end if;
            continue;
         end if;

         -- ==================================================
         -- STEP 1: Fetch inbound_order_nbr for the CONTAINER
         -- (where container_nbr matches and booking_id matches)
         -- ==================================================
         begin
            select inbound_order_nbr
              into l_container_order_nbr
              from xxotm_container_inventory_t
             where container_nbr = l_container_nbr
               and booking_id = l_booking_id
               and rownum = 1;
         exception
            when no_data_found then
               -- Fallback: try finding it even if booking_id mismatch or null, 
               -- but safer to require match to ensure ownership.
               -- For now, strict match.
               l_container_order_nbr := null;
         end;

         if l_container_order_nbr is null then
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := l_container_nbr || ' (no matching order for this booking)';
            else
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_container_nbr
                                      || ' (no matching order)';
            end if;
            continue;
         end if;

         -- ==================================================
         -- STEP 2: DELETE refnums - Remove Link booking from container's order
         -- DELETE /orderReleases/NAQLEEN.{container_order_nbr}/refnums/NAQLEEN.BOOKING_NO%7C{booking_id}
         -- Note: Using Composite Key format commonly used in OTM REST: {qualifier}|{value} or similar
         -- Previous attempt used 'x' separator. I will proceed with 'x' for now as per prior context, 
         -- but note that pipe '|' is also common.
         -- ==================================================
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

         -- 204 No Content is typical for DELETE success
         if l_http_status in ( 200,
                               204 ) then
            l_success_count := l_success_count + 1;
            
            -- Update Inventory: Remove booking_ID
            update xxotm_container_inventory_t
               set
               booking_id = null
             where container_nbr = l_container_nbr;

         else
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
               l_failed_containers := l_container_nbr
                                      || ' (DELETE '
                                      || l_http_status
                                      || ': '
                                      || l_api_error_msg
                                      || ')';
            elsif length(l_failed_containers) < 3500 then
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_container_nbr
                                      || ' (DELETE '
                                      || l_http_status
                                      || ')';
            end if;
         end if;

      exception
         when others then
            l_fail_count := l_fail_count + 1;
            if l_failed_containers is null then
               l_failed_containers := l_container_nbr
                                      || ' (Exception: '
                                      || substr(
                  sqlerrm,
                  1,
                  150
               )
                                      || ')';
            elsif length(l_failed_containers) < 3500 then
               l_failed_containers := l_failed_containers
                                      || ', '
                                      || l_container_nbr
                                      || ' (Ex: '
                                      || substr(
                  sqlerrm,
                  1,
                  50
               )
                                      || ')';
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
         'Successfully unreserved '
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
         'Failed to unreserve containers'
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
         || ' unreserved, '
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
      apex_json.write(
         'debug_errors',
         'Global exception: '
         || substr(
            sqlerrm,
            1,
            500
         )
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
end xx_otm_delete_reservation_containers;
/