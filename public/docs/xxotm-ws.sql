-- DDL: Table for required shipment fields from Shipments.json
-- Note: Uses unquoted identifiers so references like shipmentXid in PL/SQL resolve to SHIPMENTXID
create table xxotm_shipments_t (
   shipment_xid              varchar2(100) primary key,
   loaded_distance_value     number(12,2),
   loaded_distance_unit      varchar2(10),
   unloaded_distance_value   number(12,2),
   unloaded_distance_unit    varchar2(10),
   source_location           varchar2(1000),
   dest_location             varchar2(1000),
   start_time                timestamp with time zone,
   end_time                  timestamp with time zone,
   parent_leg_gid            varchar2(100),
   serv_prov                 varchar2(1000),
   total_weight_value        number(12,3),
   total_weight_unit         varchar2(10),
   total_volume_value        number(12,3),
   total_volume_unit         varchar2(10),
   total_item_package_count  number(10),
   shipment_type_gid         varchar2(100),
   bulk_plan_gid             varchar2(100),
   num_stops                 number(10),
   first_equipment_group_gid varchar2(100),
   driver_id                 varchar2(1000),
   power_unit                varchar2(1000),
   bu_type                   varchar2(200),
   liner_name                varchar2(200),
   cont_no                   varchar2(200),
   voyage_no                 varchar2(200),
   ob_type                   varchar2(200),
   unloaded_date             timestamp with time zone,
   sole_packaged_item        varchar2(1000),
   container_type            varchar2(200),
   customer_name             varchar2(200),
   update_date               timestamp with time zone,
   insert_date               timestamp with time zone
)
/

-- Indexes for XXOTM_SHIPMENTS_T
create index ix_shipments_update_date on
   xxotm_shipments_t (
      update_date
   );
create index ix_shipments_source_dest on
   xxotm_shipments_t (
      source_location,
      dest_location
   );
create index ix_shipments_serv_prov on
   xxotm_shipments_t (
      serv_prov
   )
/

create table xxotm_locations_t (
   location_xid      varchar2(100) primary key,
   location_name     varchar2(1000),
   city              varchar2(200),
   country_code3_gid varchar2(10),
   time_zone_gid     varchar2(100),
   lat               number(10,6),
   lon               number(10,6),
   description       varchar2(1000),
   domain_name       varchar2(100),
   is_active         number(1)
)
/

-- Indexes for XXOTM_LOCATIONS_T
create index ix_locations_name on
   xxotm_locations_t (
      location_name
   );
create index ix_locations_country on
   xxotm_locations_t (
      country_code3_gid
   )
/

create table xxotm_order_movements_t (
   order_movement_xid    varchar2(100) primary key,
   order_release_xid     varchar2(200),
   perspective           varchar2(10),
   source_location       varchar2(1000),
   dest_location         varchar2(1000),
   early_pickup_date     timestamp with time zone,
   original_leg_gid      varchar2(100),
   original_leg_position number(10),
   total_ship_unit_count number(10),
   total_weight_value    number(12,3),
   total_weight_unit     varchar2(10),
   total_volume_value    number(12,3),
   total_volume_unit     varchar2(10),
   indicator             varchar2(10),
   shipment_xid          varchar2(100),
   update_date           timestamp with time zone,
   insert_date           timestamp with time zone
)
/

-- Indexes for XXOTM_ORDER_MOVEMENTS_T
create index ix_om_update_date on
   xxotm_order_movements_t (
      update_date
   );
create index ix_om_order_release on
   xxotm_order_movements_t (
      order_release_xid
   );
create index ix_om_shipment on
   xxotm_order_movements_t (
      shipment_xid
   );
create index ix_om_source_dest on
   xxotm_order_movements_t (
      source_location,
      dest_location
   )
/

create table xxotm_order_releases_t (
   order_release_xid      varchar2(100) primary key,
   order_release_type_gid varchar2(100),
   source_location        varchar2(1000),
   destination_location   varchar2(1000),
   early_pickup_date      timestamp with time zone,
   late_delivery_date     timestamp with time zone,
   total_net_weight_value number(12,3),
   total_net_weight_unit  varchar2(10),
   total_net_volume_value number(12,3),
   total_net_volume_unit  varchar2(10),
   serv_prov              varchar2(1000),
   equipment_group_gid    varchar2(100),
   bu_type                varchar2(200),
   liner_name             varchar2(200),
   ob_type                varchar2(200),
   update_date            timestamp with time zone,
   insert_date            timestamp with time zone
)
/

-- Indexes for XXOTM_ORDER_RELEASES_T
create index ix_or_update_date on
   xxotm_order_releases_t (
      update_date
   );
create index ix_or_source_dest on
   xxotm_order_releases_t (
      source_location,
      destination_location
   );
create index ix_or_serv_prov on
   xxotm_order_releases_t (
      serv_prov
   );
create index ix_or_equipment_group on
   xxotm_order_releases_t (
      equipment_group_gid
   )
/


create table xxotm_vehicle_master_t (
   vehicle_xid varchar2(100) primary key,
   driver_xid  varchar2(100),
   driver_name varchar2(500),
   type        varchar2(50),
   insert_date timestamp with time zone,
   update_date timestamp with time zone
)
/

-- Indexes for xxotm_vehicle_master_t
create index idx_xxotm_vehicle_master_vxid on
   xxotm_vehicle_master_t (
      vehicle_xid
   );
create index idx_xxotm_vehicle_master_driver on
   xxotm_vehicle_master_t (
      driver_xid
   );
create index idx_xxotm_vehicle_master_name on
   xxotm_vehicle_master_t (
      driver_name
   );

truncate table xxotm_shipments_t;
truncate table xxotm_locations_t;
truncate table xxotm_order_movements_t;
truncate table xxotm_order_releases_t;
truncate table xxotm_vehicle_master_t;


create or replace package "XX_NAQLEEN_OTM_DATA_SYNC_PKG" as
   procedure xx_otm_shipments_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   );
   procedure xx_otm_locations_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   );
   procedure xx_otm_order_movements_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   );
   procedure xx_otm_order_release_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   );

   procedure xx_otm_vehicles_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   );

   procedure call_xx_otm_shipments_sync;
   procedure call_xx_otm_locations_sync;
   procedure call_xx_otm_order_movements_sync;
   procedure call_xx_otm_order_releases_sync;
   procedure call_xx_otm_vehicles_sync;

end xx_naqleen_otm_data_sync_pkg;
/

create or replace editionable package body "XX_NAQLEEN_OTM_DATA_SYNC_PKG" as

   procedure xx_otm_shipments_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   ) is
      l_full_url               varchar2(700);
      l_credentials            varchar2(200);
      l_encoded_cred           varchar2(400);
      l_response_clob          clob;
      jo                       json_object_t;
      l_links                  json_array_t;
      l_results                json_array_t;
      l_item                   json_object_t;
      l_next_page_url          varchar2(4000);
      l_params                 varchar2(4000);
      v_shipmentxid            varchar2(100);
      v_attribute_1            varchar2(200);
      v_loadeddistancevalue    number;
      v_loadeddistanceunit     varchar2(10);
      v_unloadeddistancevalue  number;
      v_unloadeddistanceunit   varchar2(10);
      v_sourcelocation         varchar2(1000);
      v_destlocation           varchar2(1000);
      v_starttime              timestamp with time zone;
      v_endtime                timestamp with time zone;
      v_parentleggid           varchar2(100);
      v_servprov               varchar2(1000);
      v_perspective            varchar2(10);
      v_totalweightvalue       number;
      v_totalweightunit        varchar2(10);
      v_totalvolumevalue       number;
      v_totalvolumeunit        varchar2(10);
      v_totalitempackagecount  number;
      v_shipmenttypegid        varchar2(100);
      v_bulkplangid            varchar2(100);
      v_numstops               number;
      v_firstequipmentgroupgid varchar2(100);
      v_driverid               varchar2(1000);
      v_powerunit              varchar2(1000);
      v_bu_type                varchar2(200);
      v_liner_name             varchar2(200);
      v_cont_no                varchar2(200);
      v_voyage_no              varchar2(200);
      v_ob_type                varchar2(200);
      v_unloaded_date          timestamp with time zone;
      v_solepackageditem       varchar2(1000);
      v_updatedate             timestamp with time zone;
      v_insertdate             timestamp with time zone;
      v_container_type         varchar2(200);
      v_customer_name          varchar2(200);
      l_refnum_url             varchar2(4000);
      l_refnum_resp            clob;
      l_refnum_jo              json_object_t;
      l_refnum_items           json_array_t;
      l_refnum_item            json_object_t;
      v_qual_gid               varchar2(200);
      l_merge_sql              varchar2(32767);

      function after_dot (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '.',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end after_dot;

      function last_after_slash (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '/',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end last_after_slash;

      function normalize_tstz (
         p_str varchar2
      ) return timestamp with time zone is
         v_str varchar2(1000);
      begin
         if p_str is null then
            return null;
         end if;
         -- Normalize trailing Z to explicit +00:00 to unify patterns
         if instr(
            p_str,
            'Z'
         ) > 0 then
            v_str := replace(
               p_str,
               'Z',
               '+00:00'
            );
         else
            v_str := replace(
               p_str,
               '+03:00',
               '+00:00'
            );
         end if;
         -- Try with fractional seconds first
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSFFTZH:TZM' );
         exception
            when others then
               null;
         end;
         -- Fallback: no fractional seconds
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM' );
         exception
            when others then
               return null;
         end;
      end normalize_tstz;

      function get_href (
         p_obj json_object_t,
         p_key varchar2
      ) return varchar2 is
         v  json_element_t;
         o  json_object_t;
         a  json_array_t;
         h  varchar2(4000);
         li json_object_t;
      begin
         if p_obj is null
         or not p_obj.has(p_key) then
            return null;
         end if;
         v := p_obj.get(p_key);
         if v is null then
            return null;
         end if;
         if v.is_object then
            o := treat(v as json_object_t);
            if o.has('href') then
               return o.get_string('href');
            elsif o.has('links') then
               a := treat(o.get('links') as json_array_t);
               for i in 0..a.get_size() - 1 loop
                  li := treat(a.get(i) as json_object_t);
                  if
                     li.has('rel')
                     and ( li.get_string('rel') = 'canonical' )
                  then
                     if li.has('href') then
                        return li.get_string('href');
                     end if;
                  end if;
               end loop;
               if a.get_size() > 0 then
                  li := treat(a.get(0) as json_object_t);
                  if li.has('href') then
                     return li.get_string('href');
                  end if;
               end if;
            end if;
         end if;
         return null;
      exception
         when others then
            return null;
      end get_href;

      function from_href (
         p_href varchar2,
         p_mode varchar2
      ) return varchar2 is
         seg varchar2(4000);
         res varchar2(4000);
      begin
         if p_href is null then
            return null;
         end if;
         if p_mode = 'AFTER_SLASH' then
            seg := last_after_slash(p_href);
            res := seg;
         else
            seg := last_after_slash(p_href);
            res := after_dot(seg);
         end if;
         return utl_url.unescape(res);
      end from_href;

   begin
      l_params := utl_url.escape(l_query_params);
      l_full_url := l_base_url
                    || '?'
                    || l_params;
      l_next_page_url := l_full_url;
      while
         l_next_page_url is not null
         and lower(l_next_page_url) <> 'null'
      loop
         l_credentials := l_username
                          || ':'
                          || l_password;
         l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         apex_web_service.g_request_headers(2).name := 'Authorization';
         apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
         apex_web_service.g_request_headers(3).name := 'Accept';
         apex_web_service.g_request_headers(3).value := 'application/json';
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );

         dbms_output.put_line('HTTP status (Shipments): ' || apex_web_service.g_status_code);
         if apex_web_service.g_status_code < 200
         or apex_web_service.g_status_code > 299 then
            if l_response_clob is not null then
               dbms_output.put_line('Response (Shipments): '
                                    || dbms_lob.substr(
                  l_response_clob,
                  4000,
                  1
               ));
            end if;
         end if;

         jo := json_object_t.parse(l_response_clob);
         if
            jo.has('hasMore')
            and jo.get_boolean('hasMore')
         then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            for i in 0..l_links.get_size() - 1 loop
               declare
                  li json_object_t;
               begin
                  li := treat(l_links.get(i) as json_object_t);
                  if li.get_string('rel') = 'next' then
                     l_next_page_url := li.get_string('href');
                     exit;
                  end if;
               end;
            end loop;
         else
            l_next_page_url := null;
         end if;

         if jo.get('items').is_array then
            l_results := json_array_t.parse(jo.get('items').to_clob());
         else
            return;
         end if;

         for idx in 0..l_results.get_size() - 1 loop
            l_item := treat(l_results.get(idx) as json_object_t);
            v_shipmentxid := l_item.get_string('shipmentXid');
            if l_item.has('loadedDistance') then
               declare
                  o json_object_t := treat(l_item.get('loadedDistance') as json_object_t);
               begin
                  if o.has('value') then
                     v_loadeddistancevalue := o.get_number('value');
                  else
                     v_loadeddistancevalue := null;
                  end if;
                  if o.has('unit') then
                     v_loadeddistanceunit := o.get_string('unit');
                  else
                     v_loadeddistanceunit := null;
                  end if;
               end;
            else
               v_loadeddistancevalue := null;
               v_loadeddistanceunit := null;
            end if;

            if l_item.has('unloadedDistance') then
               declare
                  o json_object_t := treat(l_item.get('unloadedDistance') as json_object_t);
               begin
                  if o.has('value') then
                     v_unloadeddistancevalue := o.get_number('value');
                  else
                     v_unloadeddistancevalue := null;
                  end if;
                  if o.has('unit') then
                     v_unloadeddistanceunit := o.get_string('unit');
                  else
                     v_unloadeddistanceunit := null;
                  end if;
               end;
            else
               v_unloadeddistancevalue := null;
               v_unloadeddistanceunit := null;
            end if;

            v_sourcelocation := from_href(
               get_href(
                  l_item,
                  'sourceLocation'
               ),
               'AFTER_DOT'
            );
            v_destlocation := from_href(
               get_href(
                  l_item,
                  'destLocation'
               ),
               'AFTER_DOT'
            );
            if l_item.has('startTime') then
               declare
                  o json_object_t := treat(l_item.get('startTime') as json_object_t);
               begin
                  if o.has('value') then
                     v_starttime := normalize_tstz(o.get_string('value'));
                  else
                     v_starttime := null;
                  end if;
               end;
            else
               v_starttime := null;
            end if;

            if l_item.has('endTime') then
               declare
                  o json_object_t := treat(l_item.get('endTime') as json_object_t);
               begin
                  if o.has('value') then
                     v_endtime := normalize_tstz(o.get_string('value'));
                  else
                     v_endtime := null;
                  end if;
               end;
            else
               v_endtime := null;
            end if;

            if l_item.has('parentLegGid') then
               v_parentleggid := after_dot(l_item.get_string('parentLegGid'));
            else
               v_parentleggid := null;
            end if;
            v_servprov := from_href(
               get_href(
                  l_item,
                  'servprov'
               ),
               'AFTER_DOT'
            );
            if l_item.has('totalWeight') then
               declare
                  o json_object_t := treat(l_item.get('totalWeight') as json_object_t);
               begin
                  if o.has('value') then
                     v_totalweightvalue := o.get_number('value');
                  else
                     v_totalweightvalue := null;
                  end if;
                  if o.has('unit') then
                     v_totalweightunit := o.get_string('unit');
                  else
                     v_totalweightunit := null;
                  end if;
               end;
            else
               v_totalweightvalue := null;
               v_totalweightunit := null;
            end if;

            if l_item.has('totalVolume') then
               declare
                  o json_object_t := treat(l_item.get('totalVolume') as json_object_t);
               begin
                  if o.has('value') then
                     v_totalvolumevalue := o.get_number('value');
                  else
                     v_totalvolumevalue := null;
                  end if;
                  if o.has('unit') then
                     v_totalvolumeunit := o.get_string('unit');
                  else
                     v_totalvolumeunit := null;
                  end if;
               end;
            else
               v_totalvolumevalue := null;
               v_totalvolumeunit := null;
            end if;

            if l_item.has('totalItemPackageCount') then
               v_totalitempackagecount := l_item.get_number('totalItemPackageCount');
            else
               v_totalitempackagecount := null;
            end if;
            if l_item.has('shipmentTypeGid') then
               v_shipmenttypegid := l_item.get_string('shipmentTypeGid');
            else
               v_shipmenttypegid := null;
            end if;
            if l_item.has('bulkPlanGid') then
               v_bulkplangid := after_dot(l_item.get_string('bulkPlanGid'));
            else
               v_bulkplangid := null;
            end if;
            if l_item.has('numStops') then
               v_numstops := l_item.get_number('numStops');
            else
               v_numstops := null;
            end if;
            if l_item.has('firstEquipmentGroupGid') then
               v_firstequipmentgroupgid := after_dot(l_item.get_string('firstEquipmentGroupGid'));
            else
               v_firstequipmentgroupgid := null;
            end if;
            v_driverid := from_href(
               get_href(
                  l_item,
                  'driver'
               ),
               'AFTER_DOT'
            );
            v_powerunit := from_href(
               get_href(
                  l_item,
                  'powerUnit'
               ),
               'AFTER_DOT'
            );
            if l_item.has('attribute1') then
               v_bu_type := l_item.get_string('attribute1');
            else
               v_bu_type := null;
            end if;
            if l_item.has('attribute2') then
               v_liner_name := after_dot(l_item.get_string('attribute2'));
            else
               v_liner_name := null;
            end if;
            if l_item.has('attribute3') then
               v_cont_no := l_item.get_string('attribute3');
            else
               v_cont_no := null;
            end if;
            if l_item.has('attribute4') then
               v_voyage_no := l_item.get_string('attribute4');
            else
               v_voyage_no := null;
            end if;
            if l_item.has('attribute9') then
               v_ob_type := l_item.get_string('attribute9');
            else
               v_ob_type := null;
            end if;

            if l_item.has('attributeDate2') then
               declare
                  o json_object_t := treat(l_item.get('attributeDate2') as json_object_t);
               begin
                  if o.has('value') then
                     v_unloaded_date := normalize_tstz(o.get_string('value'));
                  else
                     v_unloaded_date := null;
                  end if;
               end;
            else
               v_unloaded_date := null;
            end if;

            v_solepackageditem := after_dot(from_href(
               get_href(
                  l_item,
                  'solePackagedItem'
               ),
               'AFTER_SLASH'
            ));
            if l_item.has('updateDate') then
               declare
                  o json_object_t := treat(l_item.get('updateDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_updatedate := normalize_tstz(o.get_string('value'));
                  else
                     v_updatedate := null;
                  end if;
               end;
            else
               v_updatedate := null;
            end if;

            if l_item.has('insertDate') then
               declare
                  o json_object_t := treat(l_item.get('insertDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_insertdate := normalize_tstz(o.get_string('value'));
                  else
                     v_insertdate := null;
                  end if;
               end;
            else
               v_insertdate := null;
            end if;

            -- Fetch Container Type and Customer Name
            v_container_type := null;
            v_customer_name := null;
            if v_shipmentxid is not null then
               l_refnum_url := l_base_url
                               || '/NAQLEEN.'
                               || v_shipmentxid
                               || '/refnums?q='
                               || utl_url.escape('shipmentRefnumQualGid eq "NAQLEEN.CONTAINER_TYPE" or shipmentRefnumQualGid eq "NAQLEEN.CUS_NAME"'
                               );

               apex_web_service.g_request_headers(1).name := 'Content-Type';
               apex_web_service.g_request_headers(1).value := 'application/json';
               apex_web_service.g_request_headers(2).name := 'Authorization';
               apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
               begin
                  l_refnum_resp := apex_web_service.make_rest_request(
                     p_url         => l_refnum_url,
                     p_http_method => 'GET',
                     p_wallet_path => 'file:/u01/app/oracle/product/wallet'
                  );

                  if apex_web_service.g_status_code = 200 then
                     l_refnum_jo := json_object_t.parse(l_refnum_resp);
                     if
                        l_refnum_jo.has('items')
                        and l_refnum_jo.get('items').is_array
                     then
                        l_refnum_items := l_refnum_jo.get_array('items');
                        for r_idx in 0..l_refnum_items.get_size() - 1 loop
                           l_refnum_item := treat(l_refnum_items.get(r_idx) as json_object_t);
                           v_qual_gid := l_refnum_item.get_string('shipmentRefnumQualGid');
                           if v_qual_gid = 'NAQLEEN.CONTAINER_TYPE' then
                              v_container_type := l_refnum_item.get_string('shipmentRefnumValue');
                           elsif v_qual_gid = 'NAQLEEN.CUS_NAME' then
                              v_customer_name := l_refnum_item.get_string('shipmentRefnumValue');
                           end if;
                        end loop;
                     end if;
                  end if;
               exception
                  when others then
                     dbms_output.put_line('Error fetching refnums for '
                                          || v_shipmentxid
                                          || ': '
                                          || sqlerrm);
               end;
            end if;

            l_merge_sql := 'MERGE INTO '
                           || l_table_name
                           || ' t '
                           || 'USING (SELECT :shipmentxid SHIPMENT_XID, :ldv LOADED_DISTANCE_VALUE, :ldu LOADED_DISTANCE_UNIT, :uldv UNLOADED_DISTANCE_VALUE, :uldu UNLOADED_DISTANCE_UNIT, '
                           || '       :srcl SOURCE_LOCATION, :dstl DEST_LOCATION, :st START_TIME, :et END_TIME, :plg PARENT_LEG_GID, :sp SERV_PROV, '
                           || '       :twv TOTAL_WEIGHT_VALUE, :twu TOTAL_WEIGHT_UNIT, :tvv TOTAL_VOLUME_VALUE, :tvu TOTAL_VOLUME_UNIT, :tipc TOTAL_ITEM_PACKAGE_COUNT, '
                           || '       :stg SHIPMENT_TYPE_GID, :bpg BULK_PLAN_GID, :ns NUM_STOPS, :fegg FIRST_EQUIPMENT_GROUP_GID, :drv DRIVER_ID, :pwr POWER_UNIT, '
                           || '       :a1 BU_TYPE, :a2 LINER_NAME, :a3 CONT_NO, :a4 VOYAGE_NO, :a9 OB_TYPE, :ad2 UNLOADED_DATE, :spi SOLE_PACKAGED_ITEM, '
                           || '       :ct CONTAINER_TYPE, :cn CUSTOMER_NAME, '
                           || '       :upd_dt UPDATE_DATE, :ins_dt INSERT_DATE FROM dual) s '
                           || 'ON (t.SHIPMENT_XID = s.SHIPMENT_XID) '
                           || 'WHEN MATCHED THEN UPDATE SET '
                           || '  LOADED_DISTANCE_VALUE = s.LOADED_DISTANCE_VALUE, LOADED_DISTANCE_UNIT = s.LOADED_DISTANCE_UNIT, '
                           || '  UNLOADED_DISTANCE_VALUE = s.UNLOADED_DISTANCE_VALUE, UNLOADED_DISTANCE_UNIT = s.UNLOADED_DISTANCE_UNIT, '
                           || '  SOURCE_LOCATION = s.SOURCE_LOCATION, DEST_LOCATION = s.DEST_LOCATION, START_TIME = s.START_TIME, END_TIME = s.END_TIME, '
                           || '  PARENT_LEG_GID = s.PARENT_LEG_GID, SERV_PROV = s.SERV_PROV, '
                           || '  TOTAL_WEIGHT_VALUE = s.TOTAL_WEIGHT_VALUE, TOTAL_WEIGHT_UNIT = s.TOTAL_WEIGHT_UNIT, TOTAL_VOLUME_VALUE = s.TOTAL_VOLUME_VALUE, TOTAL_VOLUME_UNIT = s.TOTAL_VOLUME_UNIT, '
                           || '  TOTAL_ITEM_PACKAGE_COUNT = s.TOTAL_ITEM_PACKAGE_COUNT, SHIPMENT_TYPE_GID = s.SHIPMENT_TYPE_GID, BULK_PLAN_GID = s.BULK_PLAN_GID, NUM_STOPS = s.NUM_STOPS, '
                           || '  FIRST_EQUIPMENT_GROUP_GID = s.FIRST_EQUIPMENT_GROUP_GID, DRIVER_ID = s.DRIVER_ID, POWER_UNIT = s.POWER_UNIT, '
                           || '  BU_TYPE = s.BU_TYPE, LINER_NAME = s.LINER_NAME, CONT_NO = s.CONT_NO, VOYAGE_NO = s.VOYAGE_NO, OB_TYPE = s.OB_TYPE, '
                           || '  UNLOADED_DATE = s.UNLOADED_DATE, SOLE_PACKAGED_ITEM = s.SOLE_PACKAGED_ITEM, '
                           || '  CONTAINER_TYPE = s.CONTAINER_TYPE, CUSTOMER_NAME = s.CUSTOMER_NAME, '
                           || '  UPDATE_DATE = s.UPDATE_DATE, INSERT_DATE = s.INSERT_DATE '
                           || '  WHERE (t.UPDATE_DATE IS NULL OR s.UPDATE_DATE > t.UPDATE_DATE) '
                           || 'WHEN NOT MATCHED THEN INSERT (
                      SHIPMENT_XID, LOADED_DISTANCE_VALUE, LOADED_DISTANCE_UNIT, UNLOADED_DISTANCE_VALUE, UNLOADED_DISTANCE_UNIT, 
                      SOURCE_LOCATION, DEST_LOCATION, START_TIME, END_TIME, PARENT_LEG_GID, SERV_PROV, 
                      TOTAL_WEIGHT_VALUE, TOTAL_WEIGHT_UNIT, TOTAL_VOLUME_VALUE, TOTAL_VOLUME_UNIT, TOTAL_ITEM_PACKAGE_COUNT, 
                      SHIPMENT_TYPE_GID, BULK_PLAN_GID, NUM_STOPS, FIRST_EQUIPMENT_GROUP_GID, DRIVER_ID, POWER_UNIT, 
                      BU_TYPE, LINER_NAME, CONT_NO, VOYAGE_NO, OB_TYPE, UNLOADED_DATE, SOLE_PACKAGED_ITEM, 
                      CONTAINER_TYPE, CUSTOMER_NAME, 
                      UPDATE_DATE, INSERT_DATE)
               VALUES (
                      s.SHIPMENT_XID, s.LOADED_DISTANCE_VALUE, s.LOADED_DISTANCE_UNIT, s.UNLOADED_DISTANCE_VALUE, s.UNLOADED_DISTANCE_UNIT, 
                      s.SOURCE_LOCATION, s.DEST_LOCATION, s.START_TIME, s.END_TIME, s.PARENT_LEG_GID, s.SERV_PROV, 
                      s.TOTAL_WEIGHT_VALUE, s.TOTAL_WEIGHT_UNIT, s.TOTAL_VOLUME_VALUE, s.TOTAL_VOLUME_UNIT, s.TOTAL_ITEM_PACKAGE_COUNT, 
                      s.SHIPMENT_TYPE_GID, s.BULK_PLAN_GID, s.NUM_STOPS, s.FIRST_EQUIPMENT_GROUP_GID, s.DRIVER_ID, s.POWER_UNIT, 
                      s.BU_TYPE, s.LINER_NAME, s.CONT_NO, s.VOYAGE_NO, s.OB_TYPE, s.UNLOADED_DATE, s.SOLE_PACKAGED_ITEM, 
                      s.CONTAINER_TYPE, s.CUSTOMER_NAME, 
                      s.UPDATE_DATE, s.INSERT_DATE)';

            execute immediate l_merge_sql
               using v_shipmentxid,v_loadeddistancevalue,v_loadeddistanceunit,v_unloadeddistancevalue,v_unloadeddistanceunit,
               v_sourcelocation,v_destlocation,v_starttime,v_endtime,v_parentleggid,v_servprov,v_totalweightvalue,v_totalweightunit
               ,v_totalvolumevalue,v_totalvolumeunit,v_totalitempackagecount,v_shipmenttypegid,v_bulkplangid,v_numstops,v_firstequipmentgroupgid
               ,v_driverid,v_powerunit,v_bu_type,v_liner_name,v_cont_no,v_voyage_no,v_ob_type,v_unloaded_date,v_solepackageditem
               ,v_container_type,v_customer_name,v_updatedate,v_insertdate;

            commit;
         end loop;
      end loop;
   exception
      when others then
         dbms_output.put_line('Error occurred XX_OTM_SHIPMENT_SYNC: '
                              || sqlerrm
                              || ' | '
                              || utl_http.get_detailed_sqlerrm);
   end xx_otm_shipments_sync;

   procedure xx_otm_locations_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   ) is
      l_full_url        varchar2(700);
      l_credentials     varchar2(200);
      l_encoded_cred    varchar2(400);
      l_response_clob   clob;
      jo                json_object_t;
      l_links           json_array_t;
      l_results         json_array_t;
      l_item            json_object_t;
      l_next_page_url   varchar2(4000);
      l_params          varchar2(4000);
      v_locationxid     varchar2(100);
      v_locationname    varchar2(1000);
      v_city            varchar2(200);
      v_countrycode3gid varchar2(10);
      v_timezonegid     varchar2(100);
      v_lat             number;
      v_lon             number;
      v_description     varchar2(1000);
      v_domainname      varchar2(100);
      v_isactive        number;
      l_merge_sql       varchar2(32767);
   begin
      l_params := utl_url.escape(l_query_params);
      l_full_url := l_base_url
                    || '?'
                    || l_params;
      l_next_page_url := l_full_url;
      while
         l_next_page_url is not null
         and lower(l_next_page_url) <> 'null'
      loop
         l_credentials := l_username
                          || ':'
                          || l_password;
         l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         apex_web_service.g_request_headers(2).name := 'Authorization';
         apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );

         jo := json_object_t.parse(l_response_clob);
         if
            jo.has('hasMore')
            and jo.get_boolean('hasMore')
         then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            for i in 0..l_links.get_size() - 1 loop
               declare
                  li json_object_t;
               begin
                  li := treat(l_links.get(i) as json_object_t);
                  if li.get_string('rel') = 'next' then
                     l_next_page_url := li.get_string('href');
                     exit;
                  end if;
               end;
            end loop;
         else
            l_next_page_url := null;
         end if;

         if jo.get('items').is_array then
            l_results := json_array_t.parse(jo.get('items').to_clob());
         else
            return;
         end if;

         for idx in 0..l_results.get_size() - 1 loop
            l_item := treat(l_results.get(idx) as json_object_t);
            v_locationxid := l_item.get_string('locationXid');
            if l_item.has('locationName') then
               v_locationname := l_item.get_string('locationName');
            else
               v_locationname := null;
            end if;
            if l_item.has('city') then
               v_city := l_item.get_string('city');
            else
               v_city := null;
            end if;
            if l_item.has('countryCode3Gid') then
               v_countrycode3gid := l_item.get_string('countryCode3Gid');
            else
               v_countrycode3gid := null;
            end if;
            if l_item.has('timeZoneGid') then
               v_timezonegid := l_item.get_string('timeZoneGid');
            else
               v_timezonegid := null;
            end if;
            if l_item.has('lat') then
               v_lat := l_item.get_number('lat');
            else
               v_lat := null;
            end if;
            if l_item.has('lon') then
               v_lon := l_item.get_number('lon');
            else
               v_lon := null;
            end if;
            if l_item.has('description') then
               v_description := l_item.get_string('description');
            else
               v_description := null;
            end if;
            if l_item.has('domainName') then
               v_domainname := l_item.get_string('domainName');
            else
               v_domainname := null;
            end if;
            if l_item.has('isActive') then
               if l_item.get_boolean('isActive') then
                  v_isactive := 1;
               else
                  v_isactive := 0;
               end if;
            else
               v_isactive := null;
            end if;

            l_merge_sql := 'MERGE INTO '
                           || l_table_name
                           || ' t '
                           || 'USING (SELECT :locxid LOCATION_XID, :locname LOCATION_NAME, :city CITY, :cc3 COUNTRY_CODE3_GID, :tz TIME_ZONE_GID, :lat LAT, :lon LON, :descr DESCRIPTION, :dom DOMAIN_NAME, :act IS_ACTIVE FROM dual) s '
                           || 'ON (t.LOCATION_XID = s.LOCATION_XID) '
                           || 'WHEN MATCHED THEN UPDATE SET '
                           || '  LOCATION_NAME=s.LOCATION_NAME, CITY=s.CITY, COUNTRY_CODE3_GID=s.COUNTRY_CODE3_GID, TIME_ZONE_GID=s.TIME_ZONE_GID, LAT=s.LAT, LON=s.LON, DESCRIPTION=s.DESCRIPTION, DOMAIN_NAME=s.DOMAIN_NAME, IS_ACTIVE=s.IS_ACTIVE '
                           || 'WHEN NOT MATCHED THEN INSERT (
                      LOCATION_XID, LOCATION_NAME, CITY, COUNTRY_CODE3_GID, TIME_ZONE_GID, LAT, LON, DESCRIPTION, DOMAIN_NAME, IS_ACTIVE)
               VALUES (
                      s.LOCATION_XID, s.LOCATION_NAME, s.CITY, s.COUNTRY_CODE3_GID, s.TIME_ZONE_GID, s.LAT, s.LON, s.DESCRIPTION, s.DOMAIN_NAME, s.IS_ACTIVE)'
                           ;

            execute immediate l_merge_sql
               using v_locationxid,v_locationname,v_city,v_countrycode3gid,v_timezonegid,v_lat,v_lon,v_description,v_domainname
               ,v_isactive;

            commit;
         end loop;
      end loop;
   exception
      when others then
         dbms_output.put_line('Error occurred XX_OTM_LOCATION_SYNC: '
                              || sqlerrm
                              || ' | '
                              || utl_http.get_detailed_sqlerrm);
   end xx_otm_locations_sync;

   procedure xx_otm_order_movements_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   ) is
      l_full_url            varchar2(700);
      l_credentials         varchar2(200);
      l_encoded_cred        varchar2(400);
      l_response_clob       clob;
      jo                    json_object_t;
      l_links               json_array_t;
      l_results             json_array_t;
      l_item                json_object_t;
      l_next_page_url       varchar2(4000);
      l_params              varchar2(4000);
      v_ordermovementxid    varchar2(100);
      v_orderreleasexid     varchar2(200);
      v_perspective         varchar2(10);
      v_sourcelocation      varchar2(1000);
      v_destlocation        varchar2(1000);
      v_earlypickupdate     timestamp with time zone;
      v_originalleggid      varchar2(100);
      v_originallegposition number;
      v_totalshipunitcount  number;
      v_totalweightvalue    number;
      v_totalweightunit     varchar2(10);
      v_totalvolumevalue    number;
      v_totalvolumeunit     varchar2(10);
      v_indicator           varchar2(10);
      v_shipmentxid         varchar2(100);
      v_updatedate          timestamp with time zone;
      v_insertdate          timestamp with time zone;
      v_attribute_1         varchar2(200);
      l_merge_sql           varchar2(32767);

      function after_dot (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '.',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end after_dot;

      function last_after_slash (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '/',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end last_after_slash;

      function normalize_tstz (
         p_str varchar2
      ) return timestamp with time zone is
         v_str varchar2(1000);
      begin
         if p_str is null then
            return null;
         end if;
         -- Normalize trailing Z to explicit +00:00 to unify patterns
         if instr(
            p_str,
            'Z'
         ) > 0 then
            v_str := replace(
               p_str,
               'Z',
               '+00:00'
            );
         else
            v_str := replace(
               p_str,
               '+03:00',
               '+00:00'
            );
         end if;
         -- Try with fractional seconds first
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSFFTZH:TZM' );
         exception
            when others then
               null;
         end;
         -- Fallback: no fractional seconds
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM' );
         exception
            when others then
               return null;
         end;
      end normalize_tstz;

      function get_href (
         p_obj json_object_t,
         p_key varchar2
      ) return varchar2 is
         v  json_element_t;
         o  json_object_t;
         a  json_array_t;
         li json_object_t;
      begin
         if p_obj is null
         or not p_obj.has(p_key) then
            return null;
         end if;
         v := p_obj.get(p_key);
         if v is null then
            return null;
         end if;
         if v.is_object then
            o := treat(v as json_object_t);
            if o.has('href') then
               return o.get_string('href');
            elsif o.has('links') then
               a := treat(o.get('links') as json_array_t);
               for i in 0..a.get_size() - 1 loop
                  li := treat(a.get(i) as json_object_t);
                  if
                     li.has('rel')
                     and ( li.get_string('rel') = 'canonical' )
                  then
                     if li.has('href') then
                        return li.get_string('href');
                     end if;
                  end if;
               end loop;
               if a.get_size() > 0 then
                  li := treat(a.get(0) as json_object_t);
                  if li.has('href') then
                     return li.get_string('href');
                  end if;
               end if;
            end if;
         end if;
         return null;
      exception
         when others then
            return null;
      end get_href;

      function from_href (
         p_href varchar2,
         p_mode varchar2
      ) return varchar2 is
         seg varchar2(4000);
         res varchar2(4000);
      begin
         if p_href is null then
            return null;
         end if;
         if p_mode = 'AFTER_SLASH' then
            seg := last_after_slash(p_href);
            res := seg;
         else
            seg := last_after_slash(p_href);
            res := after_dot(seg);
         end if;
         return utl_url.unescape(res);
      end from_href;
   begin
      l_params := utl_url.escape(l_query_params);
      l_full_url := l_base_url
                    || '?'
                    || l_params;
      l_next_page_url := l_full_url;
      while
         l_next_page_url is not null
         and lower(l_next_page_url) <> 'null'
      loop
         l_credentials := l_username
                          || ':'
                          || l_password;
         l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         apex_web_service.g_request_headers(2).name := 'Authorization';
         apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );

         jo := json_object_t.parse(l_response_clob);
         if
            jo.has('hasMore')
            and jo.get_boolean('hasMore')
         then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            for i in 0..l_links.get_size() - 1 loop
               declare
                  li json_object_t;
               begin
                  li := treat(l_links.get(i) as json_object_t);
                  if li.get_string('rel') = 'next' then
                     l_next_page_url := li.get_string('href');
                     exit;
                  end if;
               end;
            end loop;
         else
            l_next_page_url := null;
         end if;

         if jo.get('items').is_array then
            l_results := json_array_t.parse(jo.get('items').to_clob());
         else
            return;
         end if;

         for idx in 0..l_results.get_size() - 1 loop
            l_item := treat(l_results.get(idx) as json_object_t);
            v_ordermovementxid := l_item.get_string('orderMovementXid');
            v_orderreleasexid := from_href(
               get_href(
                  l_item,
                  'orderRelease'
               ),
               'AFTER_DOT'
            );
            v_sourcelocation := from_href(
               get_href(
                  l_item,
                  'sourceLocation'
               ),
               'AFTER_DOT'
            );
            v_destlocation := from_href(
               get_href(
                  l_item,
                  'destLocation'
               ),
               'AFTER_DOT'
            );
            if l_item.has('earlyPickupDate') then
               declare
                  o json_object_t := treat(l_item.get('earlyPickupDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_earlypickupdate := normalize_tstz(o.get_string('value'));
                  else
                     v_earlypickupdate := null;
                  end if;

               end;
            else
               v_earlypickupdate := null;
            end if;
            if l_item.has('originalLegGid') then
               v_originalleggid := after_dot(l_item.get_string('originalLegGid'));
            else
               v_originalleggid := null;
            end if;
            if l_item.has('originalLegPosition') then
               v_originallegposition := l_item.get_number('originalLegPosition');
            else
               v_originallegposition := null;
            end if;
            if l_item.has('totalShipUnitCount') then
               v_totalshipunitcount := l_item.get_number('totalShipUnitCount');
            else
               v_totalshipunitcount := null;
            end if;
            if l_item.has('totalWeight') then
               declare
                  o json_object_t := treat(l_item.get('totalWeight') as json_object_t);
               begin
                  if o.has('value') then
                     v_totalweightvalue := o.get_number('value');
                  else
                     v_totalweightvalue := null;
                  end if;

                  if o.has('unit') then
                     v_totalweightunit := o.get_string('unit');
                  else
                     v_totalweightunit := null;
                  end if;

               end;
            else
               v_totalweightvalue := null;
               v_totalweightunit := null;
            end if;
            if l_item.has('totalVolume') then
               declare
                  o json_object_t := treat(l_item.get('totalVolume') as json_object_t);
               begin
                  if o.has('value') then
                     v_totalvolumevalue := o.get_number('value');
                  else
                     v_totalvolumevalue := null;
                  end if;

                  if o.has('unit') then
                     v_totalvolumeunit := o.get_string('unit');
                  else
                     v_totalvolumeunit := null;
                  end if;

               end;
            else
               v_totalvolumevalue := null;
               v_totalvolumeunit := null;
            end if;
            if l_item.has('indicator') then
               v_indicator := l_item.get_string('indicator');
            else
               v_indicator := null;
            end if;
            v_shipmentxid := from_href(
               get_href(
                  l_item,
                  'shipment'
               ),
               'AFTER_DOT'
            );
            if l_item.has('updateDate') then
               declare
                  o json_object_t := treat(l_item.get('updateDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_updatedate := normalize_tstz(o.get_string('value'));
                  else
                     v_updatedate := null;
                  end if;

               end;
            else
               v_updatedate := null;
            end if;
            if l_item.has('insertDate') then
               declare
                  o json_object_t := treat(l_item.get('insertDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_insertdate := normalize_tstz(o.get_string('value'));
                  else
                     v_insertdate := null;
                  end if;

               end;
            else
               v_insertdate := null;
            end if;

            l_merge_sql := 'UPDATE '
                           || l_table_name
                           || ' t SET '
                           || '  ORDER_RELEASE_XID = :orx, PERSPECTIVE = :pers, SOURCE_LOCATION = :src, DEST_LOCATION = :dst, EARLY_PICKUP_DATE = :epd, '
                           || '  ORIGINAL_LEG_GID = :olg, ORIGINAL_LEG_POSITION = :olp, TOTAL_SHIP_UNIT_COUNT = :tsuc, TOTAL_WEIGHT_VALUE = :twv, '
                           || '  TOTAL_WEIGHT_UNIT = :twu, TOTAL_VOLUME_VALUE = :tvv, TOTAL_VOLUME_UNIT = :tvu, INDICATOR = :ind, SHIPMENT_XID = :shx, '
                           || '  UPDATE_DATE = :ud, INSERT_DATE = :id '
                           || 'WHERE ORDER_MOVEMENT_XID = :omx '
                           || '  AND (UPDATE_DATE IS NULL OR :ud > UPDATE_DATE)';

            execute immediate l_merge_sql
               using v_orderreleasexid,v_perspective,v_sourcelocation,v_destlocation,v_earlypickupdate,v_originalleggid,v_originallegposition
               ,v_totalshipunitcount,v_totalweightvalue,v_totalweightunit,v_totalvolumevalue,v_totalvolumeunit,v_indicator,v_shipmentxid
               ,v_updatedate,v_insertdate,v_ordermovementxid,v_updatedate;

            if sql%rowcount = 0 then
               l_merge_sql := 'INSERT INTO '
                              || l_table_name
                              || ' (
                        ORDER_MOVEMENT_XID, ORDER_RELEASE_XID, PERSPECTIVE, SOURCE_LOCATION, DEST_LOCATION, EARLY_PICKUP_DATE, ORIGINAL_LEG_GID, ORIGINAL_LEG_POSITION, TOTAL_SHIP_UNIT_COUNT, TOTAL_WEIGHT_VALUE, TOTAL_WEIGHT_UNIT, TOTAL_VOLUME_VALUE, TOTAL_VOLUME_UNIT, INDICATOR, SHIPMENT_XID, UPDATE_DATE, INSERT_DATE)
                  VALUES (
                        :omx, :orx, :pers, :src, :dst, :epd, :olg, :olp, :tsuc, :twv, :twu, :tvv, :tvu, :ind, :shx, :ud, :id)'
                              ;
               execute immediate l_merge_sql
                  using v_ordermovementxid,v_orderreleasexid,v_perspective,v_sourcelocation,v_destlocation,v_earlypickupdate,
                  v_originalleggid,v_originallegposition,v_totalshipunitcount,v_totalweightvalue,v_totalweightunit,v_totalvolumevalue
                  ,v_totalvolumeunit,v_indicator,v_shipmentxid,v_updatedate,v_insertdate;
            end if;

            commit;
         end loop;
      end loop;
   exception
      when others then
         dbms_output.put_line('Error occurred XX_OTM_ORDER_MOVEMENTS_SYNC: '
                              || sqlerrm
                              || ' | '
                              || utl_http.get_detailed_sqlerrm);
   end xx_otm_order_movements_sync;

   procedure xx_otm_order_release_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   ) is
      l_full_url            varchar2(700);
      l_credentials         varchar2(200);
      l_encoded_cred        varchar2(400);
      l_response_clob       clob;
      jo                    json_object_t;
      l_links               json_array_t;
      l_results             json_array_t;
      l_item                json_object_t;
      l_next_page_url       varchar2(4000);
      l_params              varchar2(4000);
      v_orderreleasexid     varchar2(100);
      v_orderreleasetypegid varchar2(100);
      v_sourcelocation      varchar2(1000);
      v_destinationlocation varchar2(1000);
      v_earlypickupdate     timestamp with time zone;
      v_latedeliverydate    timestamp with time zone;
      v_totalnetweightvalue number;
      v_totalnetweightunit  varchar2(10);
      v_totalnetvolumevalue number;
      v_totalnetvolumeunit  varchar2(10);
      v_servprov            varchar2(1000);
      v_equipmentgroupgid   varchar2(100);
      v_bu_type             varchar2(200);
      v_liner_name          varchar2(200);
      v_ob_type             varchar2(200);
      v_updatedate          timestamp with time zone;
      v_insertdate          timestamp with time zone;
      v_attribute_1         varchar2(200);
      l_merge_sql           varchar2(32767);

      function after_dot (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '.',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end after_dot;

      function last_after_slash (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '/',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end last_after_slash;

      function normalize_tstz (
         p_str varchar2
      ) return timestamp with time zone is
         v_str varchar2(1000);
      begin
         if p_str is null then
            return null;
         end if;
         -- Normalize trailing Z to explicit +00:00 to unify patterns
         if instr(
            p_str,
            'Z'
         ) > 0 then
            v_str := replace(
               p_str,
               'Z',
               '+00:00'
            );
         else
            v_str := replace(
               p_str,
               '+03:00',
               '+00:00'
            );
         end if;
         -- Try with fractional seconds first
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSFFTZH:TZM' );
         exception
            when others then
               null;
         end;
         -- Fallback: no fractional seconds
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM' );
         exception
            when others then
               return null;
         end;
      end normalize_tstz;

      function get_href (
         p_obj json_object_t,
         p_key varchar2
      ) return varchar2 is
         v  json_element_t;
         o  json_object_t;
         a  json_array_t;
         li json_object_t;
      begin
         if p_obj is null
         or not p_obj.has(p_key) then
            return null;
         end if;
         v := p_obj.get(p_key);
         if v is null then
            return null;
         end if;
         if v.is_object then
            o := treat(v as json_object_t);
            if o.has('href') then
               return o.get_string('href');
            elsif o.has('links') then
               a := treat(o.get('links') as json_array_t);
               for i in 0..a.get_size() - 1 loop
                  li := treat(a.get(i) as json_object_t);
                  if
                     li.has('rel')
                     and ( li.get_string('rel') = 'canonical' )
                  then
                     if li.has('href') then
                        return li.get_string('href');
                     end if;
                  end if;
               end loop;
               if a.get_size() > 0 then
                  li := treat(a.get(0) as json_object_t);
                  if li.has('href') then
                     return li.get_string('href');
                  end if;
               end if;
            end if;
         end if;
         return null;
      exception
         when others then
            return null;
      end get_href;

      function from_href (
         p_href varchar2,
         p_mode varchar2
      ) return varchar2 is
         seg varchar2(4000);
         res varchar2(4000);
      begin
         if p_href is null then
            return null;
         end if;
         if p_mode = 'AFTER_SLASH' then
            seg := last_after_slash(p_href);
            res := seg;
         else
            seg := last_after_slash(p_href);
            res := after_dot(seg);
         end if;
         return utl_url.unescape(res);
      end from_href;


   begin
      l_params := utl_url.escape(l_query_params);
      l_full_url := l_base_url
                    || '?'
                    || l_params;
      l_next_page_url := l_full_url;
      while
         l_next_page_url is not null
         and lower(l_next_page_url) <> 'null'
      loop
         l_credentials := l_username
                          || ':'
                          || l_password;
         l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         apex_web_service.g_request_headers(2).name := 'Authorization';
         apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );

         jo := json_object_t.parse(l_response_clob);
         if
            jo.has('hasMore')
            and jo.get_boolean('hasMore')
         then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            for i in 0..l_links.get_size() - 1 loop
               declare
                  li json_object_t;
               begin
                  li := treat(l_links.get(i) as json_object_t);
                  if li.get_string('rel') = 'next' then
                     l_next_page_url := li.get_string('href');
                     exit;
                  end if;
               end;
            end loop;
         else
            l_next_page_url := null;
         end if;

         if jo.get('items').is_array then
            l_results := json_array_t.parse(jo.get('items').to_clob());
         else
            return;
         end if;

         for idx in 0..l_results.get_size() - 1 loop
            l_item := treat(l_results.get(idx) as json_object_t);
            v_orderreleasexid := l_item.get_string('orderReleaseXid');
            if l_item.has('orderReleaseTypeGid') then
               v_orderreleasetypegid := l_item.get_string('orderReleaseTypeGid');
            else
               v_orderreleasetypegid := null;
            end if;
            v_sourcelocation := from_href(
               get_href(
                  l_item,
                  'sourceLocation'
               ),
               'AFTER_DOT'
            );
            v_destinationlocation := from_href(
               get_href(
                  l_item,
                  'destinationLocation'
               ),
               'AFTER_DOT'
            );
            if l_item.has('earlyPickupDate') then
               declare
                  o json_object_t := treat(l_item.get('earlyPickupDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_earlypickupdate := normalize_tstz(o.get_string('value'));
                  else
                     v_earlypickupdate := null;
                  end if;

               end;
            else
               v_earlypickupdate := null;
            end if;
            if l_item.has('lateDeliveryDate') then
               declare
                  o json_object_t := treat(l_item.get('lateDeliveryDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_latedeliverydate := normalize_tstz(o.get_string('value'));
                  else
                     v_latedeliverydate := null;
                  end if;

               end;
            else
               v_latedeliverydate := null;
            end if;
            if l_item.has('totalNetWeight') then
               declare
                  o json_object_t := treat(l_item.get('totalNetWeight') as json_object_t);
               begin
                  if o.has('value') then
                     v_totalnetweightvalue := o.get_number('value');
                  else
                     v_totalnetweightvalue := null;
                  end if;

                  if o.has('unit') then
                     v_totalnetweightunit := o.get_string('unit');
                  else
                     v_totalnetweightunit := null;
                  end if;

               end;
            else
               v_totalnetweightvalue := null;
               v_totalnetweightunit := null;
            end if;
            if l_item.has('totalNetVolume') then
               declare
                  o json_object_t := treat(l_item.get('totalNetVolume') as json_object_t);
               begin
                  if o.has('value') then
                     v_totalnetvolumevalue := o.get_number('value');
                  else
                     v_totalnetvolumevalue := null;
                  end if;

                  if o.has('unit') then
                     v_totalnetvolumeunit := o.get_string('unit');
                  else
                     v_totalnetvolumeunit := null;
                  end if;

               end;
            else
               v_totalnetvolumevalue := null;
               v_totalnetvolumeunit := null;
            end if;
            v_servprov := from_href(
               get_href(
                  l_item,
                  'servprov'
               ),
               'AFTER_DOT'
            );
            v_equipmentgroupgid := from_href(
               get_href(
                  l_item,
                  'equipmentGroup'
               ),
               'AFTER_DOT'
            );
            if l_item.has('attribute1') then
               v_bu_type := l_item.get_string('attribute1');
            else
               v_bu_type := null;
            end if;
            if l_item.has('attribute2') then
               v_liner_name := after_dot(l_item.get_string('attribute2'));
            else
               v_liner_name := null;
            end if;
            if l_item.has('attribute9') then
               v_ob_type := l_item.get_string('attribute9');
            else
               v_ob_type := null;
            end if;

            if l_item.has('updateDate') then
               declare
                  o json_object_t := treat(l_item.get('updateDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_updatedate := normalize_tstz(o.get_string('value'));
                  else
                     v_updatedate := null;
                  end if;

               end;
            else
               v_updatedate := null;
            end if;
            if l_item.has('insertDate') then
               declare
                  o json_object_t := treat(l_item.get('insertDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_insertdate := normalize_tstz(o.get_string('value'));
                  else
                     v_insertdate := null;
                  end if;

               end;
            else
               v_insertdate := null;
            end if;

            l_merge_sql := 'MERGE INTO '
                           || l_table_name
                           || ' t '
                           || 'USING (SELECT :orx ORDER_RELEASE_XID, :ort ORDER_RELEASE_TYPE_GID, :source_loc SOURCE_LOCATION, :dest_loc DESTINATION_LOCATION, :epd EARLY_PICKUP_DATE, :ldd LATE_DELIVERY_DATE, :tnwv TOTAL_NET_WEIGHT_VALUE, :tnwu TOTAL_NET_WEIGHT_UNIT, :tnvv TOTAL_NET_VOLUME_VALUE, :tnvu TOTAL_NET_VOLUME_UNIT, :sp SERV_PROV, :egg EQUIPMENT_GROUP_GID, :a1 BU_TYPE, :a2 LINER_NAME, :a9 OB_TYPE, :upd_dt UPDATE_DATE, :ins_dt INSERT_DATE FROM dual) s '
                           || 'ON (t.ORDER_RELEASE_XID = s.ORDER_RELEASE_XID) '
                           || 'WHEN MATCHED THEN UPDATE SET '
                           || '  ORDER_RELEASE_TYPE_GID=s.ORDER_RELEASE_TYPE_GID, SOURCE_LOCATION=s.SOURCE_LOCATION, DESTINATION_LOCATION=s.DESTINATION_LOCATION, EARLY_PICKUP_DATE=s.EARLY_PICKUP_DATE, LATE_DELIVERY_DATE=s.LATE_DELIVERY_DATE, TOTAL_NET_WEIGHT_VALUE=s.TOTAL_NET_WEIGHT_VALUE, TOTAL_NET_WEIGHT_UNIT=s.TOTAL_NET_WEIGHT_UNIT, TOTAL_NET_VOLUME_VALUE=s.TOTAL_NET_VOLUME_VALUE, TOTAL_NET_VOLUME_UNIT=s.TOTAL_NET_VOLUME_UNIT, SERV_PROV=s.SERV_PROV, EQUIPMENT_GROUP_GID=s.EQUIPMENT_GROUP_GID, BU_TYPE=s.BU_TYPE, LINER_NAME=s.LINER_NAME, OB_TYPE=s.OB_TYPE, UPDATE_DATE=s.UPDATE_DATE, INSERT_DATE=s.INSERT_DATE '
                           || '  WHERE (t.UPDATE_DATE IS NULL OR s.UPDATE_DATE > t.UPDATE_DATE) '
                           || 'WHEN NOT MATCHED THEN INSERT (
                      ORDER_RELEASE_XID, ORDER_RELEASE_TYPE_GID, SOURCE_LOCATION, DESTINATION_LOCATION, EARLY_PICKUP_DATE, LATE_DELIVERY_DATE, TOTAL_NET_WEIGHT_VALUE, TOTAL_NET_WEIGHT_UNIT, TOTAL_NET_VOLUME_VALUE, TOTAL_NET_VOLUME_UNIT, SERV_PROV, EQUIPMENT_GROUP_GID, BU_TYPE, LINER_NAME, OB_TYPE, UPDATE_DATE, INSERT_DATE)
               VALUES (
                      s.ORDER_RELEASE_XID, s.ORDER_RELEASE_TYPE_GID, s.SOURCE_LOCATION, s.DESTINATION_LOCATION, s.EARLY_PICKUP_DATE, s.LATE_DELIVERY_DATE, s.TOTAL_NET_WEIGHT_VALUE, s.TOTAL_NET_WEIGHT_UNIT, s.TOTAL_NET_VOLUME_VALUE, s.TOTAL_NET_VOLUME_UNIT, s.SERV_PROV, s.EQUIPMENT_GROUP_GID, s.BU_TYPE, s.LINER_NAME, s.OB_TYPE, s.UPDATE_DATE, s.INSERT_DATE)'
                           ;

            execute immediate l_merge_sql
               using v_orderreleasexid,v_orderreleasetypegid,v_sourcelocation,v_destinationlocation,v_earlypickupdate,v_latedeliverydate
               ,v_totalnetweightvalue,v_totalnetweightunit,v_totalnetvolumevalue,v_totalnetvolumeunit,v_servprov,v_equipmentgroupgid
               ,v_bu_type,v_liner_name,v_ob_type,v_updatedate,v_insertdate;

            commit;
         end loop;
      end loop;
   exception
      when others then
         dbms_output.put_line('Error occurred XX_OTM_ORDER_RELEASE_SYNC: '
                              || sqlerrm
                              || ' | '
                              || utl_http.get_detailed_sqlerrm);
   end xx_otm_order_release_sync;

   procedure xx_otm_vehicles_sync (
      l_base_url     in varchar2,
      l_table_name   in varchar2,
      l_username     in varchar2,
      l_password     in varchar2,
      l_query_params in varchar2
   ) is
      l_full_url      varchar2(700);
      l_credentials   varchar2(200);
      l_encoded_cred  varchar2(400);
      l_response_clob clob;
      jo              json_object_t;
      l_links         json_array_t;
      l_results       json_array_t;
      l_item          json_object_t;
      l_next_page_url varchar2(4000);
      l_params        varchar2(4000);
      v_vehicle_xid   varchar2(100);
      v_driver_xid    varchar2(100);
      v_driver_name   varchar2(500);
      v_first_name    varchar2(200);
      v_last_name     varchar2(200);
      v_type          varchar2(50) := 'OWN';
      v_insert_date   timestamp with time zone;
      v_update_date   timestamp with time zone;
      l_merge_sql     varchar2(32767);

      function after_dot (
         p_str varchar2
      ) return varchar2 is
         p number;
      begin
         if p_str is null then
            return null;
         end if;
         p := instr(
            p_str,
            '.',
            -1,
            1
         );
         if p > 0 then
            return substr(
               p_str,
               p + 1
            );
         else
            return p_str;
         end if;
      end after_dot;

      function normalize_tstz (
         p_str varchar2
      ) return timestamp with time zone is
         v_str varchar2(1000);
      begin
         if p_str is null then
            return null;
         end if;
         if instr(
            p_str,
            'Z'
         ) > 0 then
            v_str := replace(
               p_str,
               'Z',
               '+00:00'
            );
         else
            v_str := replace(
               p_str,
               '+03:00',
               '+00:00'
            );
         end if;
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSFFTZH:TZM' );
         exception
            when others then
               null;
         end;
         begin
            return to_timestamp_tz ( v_str,'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM' );
         exception
            when others then
               return null;
         end;
      end normalize_tstz;

   begin
      l_params := utl_url.escape(l_query_params);
      l_full_url := l_base_url
                    || '?'
                    || l_params;
      l_next_page_url := l_full_url;
      while
         l_next_page_url is not null
         and lower(l_next_page_url) <> 'null'
      loop
         l_credentials := l_username
                          || ':'
                          || l_password;
         l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         apex_web_service.g_request_headers(2).name := 'Authorization';
         apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
         apex_web_service.g_request_headers(3).name := 'Accept';
         apex_web_service.g_request_headers(3).value := 'application/json';
         apex_web_service.g_request_headers(4).name := 'x-glog-transaction-id';
         apex_web_service.g_request_headers(4).value := sys_guid();
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );

         if apex_web_service.g_status_code < 200
         or apex_web_service.g_status_code > 299 then
            if l_response_clob is not null then
               dbms_output.put_line('Response (Vehicles): '
                                    || dbms_lob.substr(
                  l_response_clob,
                  4000,
                  1
               ));
            end if;
         end if;

         jo := json_object_t.parse(l_response_clob);
         if
            jo.has('hasMore')
            and jo.get_boolean('hasMore')
         then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            for i in 0..l_links.get_size() - 1 loop
               declare
                  li json_object_t;
               begin
                  li := treat(l_links.get(i) as json_object_t);
                  if li.get_string('rel') = 'next' then
                     l_next_page_url := li.get_string('href');
                     exit;
                  end if;
               end;
            end loop;
         else
            l_next_page_url := null;
         end if;

         if jo.get('items').is_array then
            l_results := json_array_t.parse(jo.get('items').to_clob());
         else
            return;
         end if;

         for idx in 0..l_results.get_size() - 1 loop
            l_item := treat(l_results.get(idx) as json_object_t);
            if l_item.has('attribute1') then
               v_vehicle_xid := after_dot(l_item.get_string('attribute1'));
            else
               v_vehicle_xid := null;
            end if;

            v_driver_xid := l_item.get_string('driverXid');
            if l_item.has('firstName') then
               v_first_name := l_item.get_string('firstName');
            else
               v_first_name := null;
            end if;

            if l_item.has('lastName') then
               v_last_name := l_item.get_string('lastName');
            else
               v_last_name := null;
            end if;

            v_driver_name := v_last_name
                             || ', '
                             || v_first_name;
            if l_item.has('updateDate') then
               declare
                  o json_object_t := treat(l_item.get('updateDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_update_date := normalize_tstz(o.get_string('value'));
                  else
                     v_update_date := null;
                  end if;
               end;
            else
               v_update_date := null;
            end if;

            if l_item.has('insertDate') then
               declare
                  o json_object_t := treat(l_item.get('insertDate') as json_object_t);
               begin
                  if o.has('value') then
                     v_insert_date := normalize_tstz(o.get_string('value'));
                  else
                     v_insert_date := null;
                  end if;
               end;
            else
               v_insert_date := null;
            end if;

            if v_vehicle_xid is not null then
               l_merge_sql := 'MERGE INTO '
                              || l_table_name
                              || ' t '
                              || 'USING (SELECT :vxid VEHICLE_XID, :dxid DRIVER_XID, :dname DRIVER_NAME, :typ TYPE, :ins_dt INSERT_DATE, :upd_dt UPDATE_DATE FROM dual) s '
                              || 'ON (t.VEHICLE_XID = s.VEHICLE_XID) '
                              || 'WHEN MATCHED THEN UPDATE SET '
                              || '  DRIVER_XID = s.DRIVER_XID, DRIVER_NAME = s.DRIVER_NAME, TYPE = s.TYPE, UPDATE_DATE = s.UPDATE_DATE, INSERT_DATE = s.INSERT_DATE '
                              || 'WHEN NOT MATCHED THEN INSERT (VEHICLE_XID, DRIVER_XID, DRIVER_NAME, TYPE, INSERT_DATE, UPDATE_DATE) '
                              || 'VALUES (s.VEHICLE_XID, s.DRIVER_XID, s.DRIVER_NAME, s.TYPE, s.INSERT_DATE, s.UPDATE_DATE)';

               execute immediate l_merge_sql
                  using v_vehicle_xid,v_driver_xid,v_driver_name,v_type,v_insert_date,v_update_date;
               commit;
            end if;
         end loop;
      end loop;
   exception
      when others then
         dbms_output.put_line('Error occurred XX_OTM_VEHICLES_SYNC: '
                              || sqlerrm
                              || ' | '
                              || utl_http.get_detailed_sqlerrm);
   end xx_otm_vehicles_sync;

   procedure call_xx_otm_shipments_sync is
   begin
      xx_naqleen_otm_data_sync_pkg.xx_otm_shipments_sync(
         'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/shipments/',
         'XXOTM_SHIPMENTS_T',
         'NAQLEEN.INTEGRATION',
         'NaqleenInt@123',
         'q=attribute1 eq "TERMINAL" and perspective eq "B"'
      );
   end call_xx_otm_shipments_sync;

   procedure call_xx_otm_locations_sync is
   begin
      xx_naqleen_otm_data_sync_pkg.xx_otm_locations_sync(
         'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/locations/',
         'XXOTM_LOCATIONS_T',
         'NAQLEEN.INTEGRATION',
         'NaqleenInt@123',
         null
      );
   end call_xx_otm_locations_sync;

   procedure call_xx_otm_order_movements_sync is
   begin
      xx_naqleen_otm_data_sync_pkg.xx_otm_order_movements_sync(
         'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/orderMovements/'
         ,
         'XXOTM_ORDER_MOVEMENTS_T',
         'NAQLEEN.INTEGRATION',
         'NaqleenInt@123',
         'q=attribute1 eq "TERMINAL" and perspective eq "B"'
      );
   end call_xx_otm_order_movements_sync;

   procedure call_xx_otm_order_releases_sync is
   begin
      xx_naqleen_otm_data_sync_pkg.xx_otm_order_release_sync(
         'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/orderReleases/'
         ,
         'XXOTM_ORDER_RELEASES_T',
         'NAQLEEN.INTEGRATION',
         'NaqleenInt@123',
         'q=attribute1 eq "TERMINAL"'
      );
   end call_xx_otm_order_releases_sync;

   procedure call_xx_otm_vehicles_sync is
   begin
      xx_naqleen_otm_data_sync_pkg.xx_otm_vehicles_sync(
         'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/drivers',
         'XXOTM_VEHICLE_MASTER_T',
         'NAQLEEN.INTEGRATION',
         'NaqleenInt@123',
         'q=isActive eq true'
      );
   end call_xx_otm_vehicles_sync;

end xx_naqleen_otm_data_sync_pkg;
/

-- Shipments sync every 1 minutes
begin
   dbms_scheduler.create_job(
      job_name        => 'XX_NAQLEEN_SHIPMENTS_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.call_xx_otm_shipments_sync',
      start_date      => systimestamp,
      repeat_interval => 'FREQ=MINUTELY;INTERVAL=1',
      auto_drop       => false,
      comments        => 'Naqleen OTM: Shipments sync'
   );
end;
/

-- Locations sync every 10 minutes (locations change less frequently)
begin
   dbms_scheduler.create_job(
      job_name        => 'XX_NAQLEEN_LOCATIONS_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.call_xx_otm_locations_sync',
      start_date      => systimestamp,
      repeat_interval => 'FREQ=MINUTELY;INTERVAL=10',
      auto_drop       => false,
      comments        => 'Naqleen OTM: Locations sync'
   );
end;
/

-- Order movements sync every 2 minutes, offset by 30s to stagger with shipments
begin
   dbms_scheduler.create_job(
      job_name        => 'XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.call_xx_otm_order_movements_sync',
      start_date      => systimestamp + interval '30' second,
      repeat_interval => 'FREQ=MINUTELY;INTERVAL=2',
      auto_drop       => false,
      comments        => 'Naqleen OTM: Order Movements sync'
   );
end;
/

-- Order releases sync every 5 minutes
begin
   dbms_scheduler.create_job(
      job_name        => 'XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.call_xx_otm_order_releases_sync',
      start_date      => systimestamp,
      repeat_interval => 'FREQ=MINUTELY;INTERVAL=5',
      auto_drop       => false,
      comments        => 'Naqleen OTM: Order Releases sync'
   );
end;
/

-- Vehicles sync every 10 minutes
begin
   dbms_scheduler.create_job(
      job_name        => 'XX_NAQLEEN_VEHICLES_SYNC_JOB',
      job_type        => 'STORED_PROCEDURE',
      job_action      => 'XX_NAQLEEN_OTM_DATA_SYNC_PKG.call_xx_otm_vehicles_sync',
      start_date      => systimestamp,
      repeat_interval => 'FREQ=MINUTELY;INTERVAL=10',
      auto_drop       => false,
      comments        => 'Naqleen OTM: Vehicles sync'
   );
end;
/

-- Enable
begin
   dbms_scheduler.enable('XX_NAQLEEN_SHIPMENTS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_LOCATIONS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB');
   dbms_scheduler.enable('XX_NAQLEEN_VEHICLES_SYNC_JOB');
end;
/

-- Disable
begin
   dbms_scheduler.disable('XX_NAQLEEN_SHIPMENTS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_LOCATIONS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB');
   dbms_scheduler.disable('XX_NAQLEEN_VEHICLES_SYNC_JOB');
end;
/

-- Run immediately (one-off)
begin
   dbms_scheduler.run_job('XX_NAQLEEN_SHIPMENTS_SYNC_JOB');
   dbms_scheduler.run_job('XX_NAQLEEN_LOCATIONS_SYNC_JOB');
   dbms_scheduler.run_job('XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB');
   dbms_scheduler.run_job('XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB');
   dbms_scheduler.run_job('XX_NAQLEEN_VEHICLES_SYNC_JOB');
end;
/

begin
   dbms_scheduler.drop_job(
      'XX_NAQLEEN_SHIPMENTS_SYNC_JOB',
      force => true
   );
   dbms_scheduler.drop_job(
      'XX_NAQLEEN_LOCATIONS_SYNC_JOB',
      force => true
   );
   dbms_scheduler.drop_job(
      'XX_NAQLEEN_ORDER_MOVEMENTS_SYNC_JOB',
      force => true
   );
   dbms_scheduler.drop_job(
      'XX_NAQLEEN_ORDER_RELEASES_SYNC_JOB',
      force => true
   );
   dbms_scheduler.drop_job(
      'XX_NAQLEEN_VEHICLES_SYNC_JOB',
      force => true
   );
end;
/

begin
   for rec in (
      select object_name
        from all_objects
       where owner = 'XXOTM'
         and object_type = 'PROCEDURE'
       order by object_name
   ) loop
      begin
         dbms_output.put_line('-- PROCEDURE: ' || rec.object_name);
         dbms_output.put_line(replace(
            replace(
               dbms_metadata.get_ddl(
                  'PROCEDURE',
                  rec.object_name,
                  'XXOTM'
               ),
               '"',
               ''
            ),
            'XXOTM.',
            ''
         )
                              || ';
/'
                              || chr(10));
      exception
         when others then
            dbms_output.put_line('-- Error getting DDL for procedure '
                                 || rec.object_name
                                 || ': '
                                 || sqlerrm);
      end;
   end loop;
end;
