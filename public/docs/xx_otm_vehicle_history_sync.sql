create or replace procedure xx_otm_vehicle_history_sync is
   l_full_url_units        varchar2(2000);
   l_full_url_lines        varchar2(2000);
   l_encoded_cred          varchar2(200);
   l_response_clob         clob;
   l_response_lines        clob;
   jo_units                json_object_t;
   l_units_array           json_array_t;
   l_unit_item             json_object_t;
   jo_lines                json_object_t;
   l_lines_array           json_array_t;
   l_line_item             json_object_t;
   v_power_unit_xid        varchar2(100);
   v_power_unit_gid        varchar2(200);
   v_date_filter           varchar2(50);
    
    -- Mapped Columns
   v_vehicle_xid           varchar2(200);
   v_equipment             varchar2(200);
   v_driver_xid            varchar2(200);
   v_equipment_type        varchar2(200);
   v_driver_name           varchar2(200);
   v_is_active             varchar2(200);
   v_assigned_to_operation varchar2(200);
   v_event_date_str        varchar2(200);
   v_lease_status          varchar2(200);
   v_truck_daily_status    varchar2(200);
   v_exists                number;
begin
    -- 1. Authentication Header Setup
   l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw('NAQLEEN.INTEGRATION:NaqleenInt@123'
   )));
   apex_web_service.g_request_headers(1).name := 'Content-Type';
   apex_web_service.g_request_headers(1).value := 'application/json';
   apex_web_service.g_request_headers(2).name := 'Authorization';
   apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
   apex_web_service.g_request_headers(3).name := 'Accept';
   apex_web_service.g_request_headers(3).value := 'application/json';

    -- 2. First API Call: Get Power Units
    -- Updated to fetch both GID and XID
   l_full_url_units := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/powerUnits?showPks&fields=powerUnitXid'
   ;
   begin
      l_response_clob := apex_web_service.make_rest_request(
         p_url         => l_full_url_units,
         p_http_method => 'GET',
         p_wallet_path => 'file:/u01/app/oracle/product/wallet'
      );

      if apex_web_service.g_status_code = 200 then
         jo_units := json_object_t.parse(l_response_clob);
         if
            jo_units.has('items')
            and jo_units.get('items').is_array
         then
            l_units_array := jo_units.get_array('items');
                
                -- Loop through Power Units
            for i in 0..l_units_array.get_size() - 1 loop
               l_unit_item := treat(l_units_array.get(i) as json_object_t);
               v_power_unit_gid := null;
               v_power_unit_xid := null;

                    -- Fetch powerUnitGid for API URL
               if l_unit_item.has('powerUnitGid') then
                  v_power_unit_gid := l_unit_item.get_string('powerUnitGid');
               end if;

                    -- Fetch powerUnitXid for DB Insert
               if l_unit_item.has('powerUnitXid') then
                  v_power_unit_xid := l_unit_item.get_string('powerUnitXid');
               end if;

               if
                  v_power_unit_gid is not null
                  and v_power_unit_xid is not null
               then
                        
                        -- Prepare Date Filter: SELECT TO_CHAR(TRUNC(SYSDATE), 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z'
                  select to_char(
                     trunc(sysdate),
                     'YYYY-MM-DD"T"HH24:MI:SS'
                  )
                         || 'Z'
                    into v_date_filter
                    from dual;
                        
                        -- 3. Second API Call: Get Order Base Lines
                        -- URL Pattern: .../orderBases/<GID>/lines?attributeDate2 le <DATE>&tag2=TRUCK
                        -- Use v_power_unit_gid directly
                  l_full_url_lines := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/orderBases/'
                                      || utl_url.escape(
                     v_power_unit_gid,
                     true
                  )
                                      || '/lines?q=attributeDate2 eq '
                                      || v_date_filter
                                      || '&tag2=TRUCK';
                                            
                        -- Reset headers for safety (though likely persisted)
                  apex_web_service.g_request_headers(1).name := 'Content-Type';
                  apex_web_service.g_request_headers(1).value := 'application/json';
                  apex_web_service.g_request_headers(2).name := 'Authorization';
                  apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
                  apex_web_service.g_request_headers(3).name := 'Accept';
                  apex_web_service.g_request_headers(3).value := 'application/json';
                  begin
                     l_response_lines := apex_web_service.make_rest_request(
                        p_url         => l_full_url_lines,
                        p_http_method => 'GET',
                        p_wallet_path => 'file:/u01/app/oracle/product/wallet'
                     );

                     if apex_web_service.g_status_code = 200 then
                        jo_lines := json_object_t.parse(l_response_lines);
                        if
                           jo_lines.has('items')
                           and jo_lines.get('items').is_array
                        then
                           l_lines_array := jo_lines.get_array('items');
                           for j in 0..l_lines_array.get_size() - 1 loop
                              l_line_item := treat(l_lines_array.get(j) as json_object_t);
                                        
                                        -- Extract Values
                                        -- VEHICLE_XID from v_power_unit_xid (as requested)
                              v_vehicle_xid := v_power_unit_xid;

                                        -- attribute18 -> EQUIPMENT
                              v_equipment := null;
                              if l_line_item.has('attribute18') then
                                 v_equipment := l_line_item.get_string('attribute18');
                              end if;

                                        -- attribute19 -> DRIVER_XID
                              v_driver_xid := null;
                              if l_line_item.has('attribute19') then
                                 v_driver_xid := l_line_item.get_string('attribute19');
                              end if;

                                        -- attribute17 -> EQUIPMENT_TYPE
                              v_equipment_type := null;
                              if l_line_item.has('attribute17') then
                                 v_equipment_type := l_line_item.get_string('attribute17');
                              end if;

                                        -- attribute16 -> DRIVER_NAME
                              v_driver_name := null;
                              if l_line_item.has('attribute16') then
                                 v_driver_name := l_line_item.get_string('attribute16');
                              end if;

                                        -- tag1 -> IS_ACTIVE
                              v_is_active := null;
                              if l_line_item.has('tag1') then
                                 v_is_active := l_line_item.get_string('tag1');
                              end if;

                                        -- tag3 -> ASSIGNED_TO_OPERATION
                              v_assigned_to_operation := null;
                              if l_line_item.has('tag3') then
                                 v_assigned_to_operation := l_line_item.get_string('tag3');
                              end if;

                                        -- attributeDate2 -> EVENT_DATE
                              v_event_date_str := null;
                              if l_line_item.has('attributeDate2') then
                                 declare
                                    l_date_obj json_object_t;
                                 begin
                                    l_date_obj := treat(l_line_item.get('attributeDate2') as json_object_t);
                                    if l_date_obj.has('value') then
                                       v_event_date_str := l_date_obj.get_string('value');
                                    end if;
                                 exception
                                    when others then
                                       v_event_date_str := null;
                                 end;
                              end if;
                                        
                                        -- tag4 -> LEASE_STATUS
                              v_lease_status := null;
                              if l_line_item.has('tag4') then
                                 v_lease_status := l_line_item.get_string('tag4');
                              end if;
                                        
                                        -- attribute20 -> TRUCK_DAILY_STATUS
                              v_truck_daily_status := null;
                              if l_line_item.has('attribute20') then
                                 v_truck_daily_status := l_line_item.get_string('attribute20');
                              end if;

                                        -- Insert Logic
                              begin
                                 insert into xxotm_vehicle_history_t (
                                    vehicle_xid,
                                    equipment,
                                    driver_xid,
                                    equipment_type,
                                    driver_name,
                                    is_active,
                                    assigned_to_operation,
                                    event_date,
                                    lease_status,
                                    truck_daily_status
                                 ) values ( v_vehicle_xid,
                                            v_equipment,
                                            v_driver_xid,
                                            v_equipment_type,
                                            v_driver_name,
                                            v_is_active,
                                            v_assigned_to_operation,
                                            v_event_date_str,
                                            v_lease_status,
                                            v_truck_daily_status );
                              exception
                                 when dup_val_on_index then
                                    null;
                                 when others then
                                    dbms_output.put_line('Error Inserting into XXOTM_VEHICLE_HISTORY_T: ' || sqlerrm);
                              end;

                           end loop;
                        end if;
                     end if;
                  exception
                     when others then
                        dbms_output.put_line('Error in Inner Loop (Lines): ' || sqlerrm);
                  end;

               end if;
            end loop;
            commit;
         end if;
      else
         dbms_output.put_line('Error in PowerUnits API: Status Code ' || apex_web_service.g_status_code);
      end if;
   exception
      when others then
         dbms_output.put_line('Error in xx_otm_vehicle_history_sync: ' || sqlerrm);
   end;
end xx_otm_vehicle_history_sync;
/

