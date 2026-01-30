create or replace procedure xx_otm_driver_history_sync is
   l_full_url_drivers    varchar2(2000);
   l_full_url_lines      varchar2(2000);
   l_encoded_cred        varchar2(200);
   l_response_clob       clob;
   l_response_lines      clob;
   jo_drivers            json_object_t;
   l_drivers_array       json_array_t;
   l_driver_item         json_object_t;
   jo_lines              json_object_t;
   l_lines_array         json_array_t;
   l_line_item           json_object_t;
   v_driver_xid          varchar2(100);
   v_driver_gid          varchar2(200);
   v_date_filter         varchar2(50);
    
    -- Mapped Columns
   v_mapped_driver_id    varchar2(200); -- driverGid
   v_driver_name         varchar2(200); -- attribute16
   v_equipment_type      varchar2(200); -- attribute17
   v_vehicle_xid         varchar2(200); -- attribute18
   v_equipment           varchar2(200); -- attribute19
   v_driver_daily_status varchar2(200); -- attribute20
   v_is_active           varchar2(200); -- tag1
   v_assigned_to_op      varchar2(200); -- tag3
   v_lease_status        varchar2(200); -- tag4
   v_event_date_str      varchar2(200); -- attributeDate2

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

    -- 2. First API Call: Get Drivers
    -- URL: .../drivers?showPks&&fields=driverGid,driverXid
   l_full_url_drivers := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/drivers?showPks&&fields=driverGid,driverXid'
   ;
   begin
      l_response_clob := apex_web_service.make_rest_request(
         p_url         => l_full_url_drivers,
         p_http_method => 'GET',
         p_wallet_path => 'file:/u01/app/oracle/product/wallet'
      );

      if apex_web_service.g_status_code = 200 then
         jo_drivers := json_object_t.parse(l_response_clob);
         if
            jo_drivers.has('items')
            and jo_drivers.get('items').is_array
         then
            l_drivers_array := jo_drivers.get_array('items');
                
                -- Loop through Drivers
            for i in 0..l_drivers_array.get_size() - 1 loop
               l_driver_item := treat(l_drivers_array.get(i) as json_object_t);
               v_driver_gid := null;
               v_driver_xid := null;

                    -- Fetch driverGid
               if l_driver_item.has('driverGid') then
                  v_driver_gid := l_driver_item.get_string('driverGid');
               end if;

                    -- Fetch driverXid
               if l_driver_item.has('driverXid') then
                  v_driver_xid := l_driver_item.get_string('driverXid');
               end if;

               if v_driver_gid is not null then
                        
                        -- 3. Second API Call: Get Order Base Lines for specific Driver
                        -- URL Pattern: .../orderBases/<driverGid>/lines?attributeDate2 le <Current Date Time>
                        
                        -- Calculate Date Filter: 2026-01-28T00:00:00Z (Using SYSDATE dynamically as per best practice, or fixed if strictly required, assuming dynamic "now" or specific date)
                  select to_char(
                     trunc(sysdate),
                     'YYYY-MM-DD"T"HH24:MI:SS'
                  )
                         || 'Z'
                    into v_date_filter
                    from dual;

                  l_full_url_lines := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/orderBases/'
                                      || utl_url.escape(
                     v_driver_gid,
                     true
                  )
                                      || '/lines?q=attributeDate2 eq '
                                      || v_date_filter;
                                            
                        -- Reset headers
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
                                        
                                        -- Mappings
                                        -- driverGid -> DRIVER_ID (using v_driver_gid from parent loop)
                              v_mapped_driver_id := v_driver_gid; 
                                        -- Note: Table has DRIVER_XID, User asked to map driverGid -> DRIVER_ID. 
                                        -- Assuming table column DRIVER_XID is the target for the ID, using XID from parent loop might be cleaner, 
                                        -- but REQUEST says "driverGid -> DRIVER_ID". 
                                        -- However, the TABLE DDL provided has `DRIVER_XID` as PK. 
                                        -- I will use `v_driver_xid` for the PK column `DRIVER_XID` to respect the likely intent of the table structure,
                                        -- OR if "DRIVER_ID" meant a specific column, I'd use that.
                                        -- Looking at the CREATE TABLE in user input:
                                        -- CREATE TABLE XXOTM_DRIVER_HISTORY_T (DRIVER_XID VARCHAR2(10) ... )
                                        -- So I will bind `v_driver_xid` to `DRIVER_XID`.

                                        -- attribute16 -> DRIVER_NAME
                              v_driver_name := null;
                              if l_line_item.has('attribute16') then
                                 v_driver_name := l_line_item.get_string('attribute16');
                              end if;

                                        -- attribute17 -> EQUIPMENT_TYPE
                              v_equipment_type := null;
                              if l_line_item.has('attribute17') then
                                 v_equipment_type := l_line_item.get_string('attribute17');
                              end if;

                                        -- attribute18 -> VEHICLE_XID
                              v_vehicle_xid := null;
                              if l_line_item.has('attribute18') then
                                 v_vehicle_xid := l_line_item.get_string('attribute18');
                              end if;

                                        -- attribute19 -> EQUIPMENT
                              v_equipment := null;
                              if l_line_item.has('attribute19') then
                                 v_equipment := l_line_item.get_string('attribute19');
                              end if;

                                        -- attribute20 -> DRIVER_DAILY_STATUS
                              v_driver_daily_status := null;
                              if l_line_item.has('attribute20') then
                                 v_driver_daily_status := l_line_item.get_string('attribute20');
                              end if;

                                        -- tag1 -> IS_ACTIVE
                              v_is_active := null;
                              if l_line_item.has('tag1') then
                                 v_is_active := l_line_item.get_string('tag1');
                              end if;

                                        -- tag3 -> ASSIGNED_TO_OPERATIONS
                              v_assigned_to_op := null;
                              if l_line_item.has('tag3') then
                                 v_assigned_to_op := l_line_item.get_string('tag3');
                              end if;

                                        -- tag4 -> LEASE_STATUS
                              v_lease_status := null;
                              if l_line_item.has('tag4') then
                                 v_lease_status := l_line_item.get_string('tag4');
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

                                        -- Insert Logic
                              if
                                 v_driver_xid is not null
                                 and v_event_date_str is not null
                              then
                                 begin
                                    insert into xxotm_driver_history_t (
                                       driver_xid,
                                       driver_name,
                                       driver_daily_status,
                                       equipment,
                                       equipment_type,
                                       vehicle_xid,
                                       is_active,
                                       assigned_to_operation,
                                       lease_status,
                                       event_date
                                    ) values ( v_driver_xid, -- Mapping DB PK to Driver XID (Not GID, to match varchar length and common practice)
                                               v_driver_name,
                                               v_driver_daily_status,
                                               v_equipment,
                                               v_equipment_type,
                                               v_vehicle_xid,
                                               v_is_active,
                                               v_assigned_to_op,
                                               v_lease_status,
                                               v_event_date_str );
                                 exception
                                    when dup_val_on_index then
                                       null; -- Ignore duplicates
                                    when others then
                                       dbms_output.put_line('Error Inserting into XXOTM_DRIVER_HISTORY_T: ' || sqlerrm);
                                 end;
                              end if;

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
         dbms_output.put_line('Error in Drivers API: Status Code ' || apex_web_service.g_status_code);
      end if;
   exception
      when others then
         dbms_output.put_line('Error in xx_otm_driver_history_sync: ' || sqlerrm);
   end;
end xx_otm_driver_history_sync;
/