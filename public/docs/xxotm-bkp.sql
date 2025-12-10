-- PROCEDURES BACKUP

-- PROCEDURE: GETDESTUFFINGCONTAINERSAPEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE GETDESTUFFINGCONTAINERSAPEX AS

    TYPE record_type IS RECORD (

        container_nbr         VARCHAR2(50),

        inbound_shipment_nbr  VARCHAR2(50)

    );

    l_record              record_type;

    l_event_data_array    json_array_t;

    l_response            json_object_t;

    j                     apex_json.t_values;    



    l_track_response      CLOB;

    l_has_gate_in         BOOLEAN;

    l_track_json          json_object_t;

    l_items_array         json_array_t;

    l_item_obj            json_object_t;

    l_status_code         VARCHAR2(100);



    -- Base API URL

    l_api_base_url        VARCHAR2(500) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/';

    l_api_url             VARCHAR2(1000);



    -- API Credentials

    l_username            VARCHAR2(100) := 'NAQLEEN.INTEGRATION';

    l_password            VARCHAR2(100) := 'NaqleenInt@123';



    -- NOTE: Replace xxotm_shipments_t with your actual shipment table

    CURSOR c_data_cursor IS

    SELECT DISTINCT

        ci.container_nbr,

        ci.inbound_shipment_nbr

    FROM 

        xxotm_container_inventory_t ci,

        xxotm_shipments_t s              -- PLACEHOLDER: Replace with actual table

    WHERE 

        ci.inbound_shipment_nbr = s.SHIPMENT_XID(+)

        AND s.shipment_name(+) IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS')

        AND ci.inbound_shipment_nbr IS NOT NULL

    ORDER BY ci.container_nbr;



BEGIN

    l_response := json_object_t();

    l_event_data_array := json_array_t();



    OPEN c_data_cursor;

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%notfound;



        l_has_gate_in := FALSE;



        -- Build API URL with shipment number

        l_api_url := l_api_base_url || CONCAT('NAQLEEN.',l_record.inbound_shipment_nbr) || '/trackingEvents';

                        DBMS_OUTPUT.PUT_LINE(l_api_url);



        -- Call Oracle GTM tracking events API using APEX Web Service

        BEGIN

        BEGIN

            l_track_response := apex_web_service.make_rest_request(

                p_url => l_api_url,

                p_http_method => 'GET',               

                p_username => l_username,

                p_password => l_password,

                p_wallet_path => 'file:/u01/app/oracle/product/wallet'

            );

            exception when others then

            dbms_output.put_line(sqlerrm);

            end;



               -- DBMS_OUTPUT.PUT_LINE(l_track_response);

                --DBMS_OUTPUT.PUT_LINE(apex_web_service.g_status_code);





            -- Parse response and check for GATE IN status

            IF l_track_response IS NOT NULL THEN

                BEGIN

                    l_track_json := json_object_t(l_track_response);



                    -- Check if response has items array

                    IF l_track_json.has('items') THEN

                        l_items_array := json_array_t(l_track_json.get('items'));



                        -- Loop through items to find GATE IN status

                        FOR i IN 0 .. l_items_array.get_size - 1 LOOP

                            l_item_obj := json_object_t(l_items_array.get(i));



                            -- Check statusCodeGid field

                            IF l_item_obj.has('statusCodeGid') THEN

                                l_status_code := l_item_obj.get_string('statusCodeGid');



                                -- Check if status is GATE IN

                                IF UPPER(l_status_code) LIKE '%GATE IN%' 

                                   OR UPPER(l_status_code) = 'NAQLEEN.GATE IN' THEN

                                    l_has_gate_in := TRUE;

                                    EXIT;

                                END IF;

                            END IF;

                        END LOOP;

                    END IF;



                EXCEPTION

                    WHEN OTHERS THEN

                        -- If parsing fails, skip this container

                        l_has_gate_in := FALSE;

                END;

            END IF;



        EXCEPTION

            WHEN OTHERS THEN

                -- If any error, skip this container

                l_has_gate_in := FALSE;

        END;



        -- Only add container if it has GATE IN event

        IF l_has_gate_in THEN

            l_event_data_array.append(l_record.container_nbr);

        END IF;



    END LOOP;

    CLOSE c_data_cursor;



    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_event_data_array);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));

    -- Converting json string to table of values

    apex_json.parse(j,

                    l_response.get('data').to_string());

    apex_json.write('data', j);

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

    DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END getdestuffingcontainersapex;

-- PROCEDURE: POST_OTM_DOCUMENTS



  CREATE OR REPLACE EDITIONABLE PROCEDURE POST_OTM_DOCUMENTS (

   p_documentxid      in varchar2,

   p_documentfilename in varchar2,

   p_ownerobjectgid   in varchar2,

   p_clobcontent      in clob,

   p_documentmimetype in varchar2,

   p_documentdefgid   in varchar2,

   x_response_clob    out clob

) as  

   l_json_payload clob;

begin

    -- 1. Build JSON Payload

   apex_json.initialize_clob_output;

   apex_json.open_object;



    -- Top-level fields

   apex_json.write(  

      'documentXid',

      p_documentxid

   );

   apex_json.write(

      'documentDefGid',

      p_documentdefgid

   );

   apex_json.write(

      'documentType',

      'BLOB'

   );

   apex_json.write(

      'documentMimeType',

   'image/png'                     

 --REPLACE(p_documentmimetype,'\/','/')   

   );  

   apex_json.write(

      'documentFilename',

      p_documentfilename

   );

   apex_json.write(

      'ownerDataQueryTypeGid',

      'SHIPMENT'

   );

   apex_json.write(

      'ownerObjectGid',

      p_ownerobjectgid

   );

   apex_json.write(

      'domainName',

      'NAQLEEN'

   );

   apex_json.write(  

      'usedAs',

      'I'

   );

   apex_json.write(

      'documentCmsId',

      'NAQLEEN.' || p_documentxid

   );



    -- Contents Object

   apex_json.open_object('contents');

   apex_json.open_array('items');



    -- Item Object

   apex_json.open_object;

   apex_json.write(

      'domainName',

      'NAQLEEN'

   );

   apex_json.write(

      'clobContent',

      p_clobcontent

   );

   apex_json.close_object; -- Close Item



   apex_json.close_array; -- Close Items Array

   apex_json.close_object; -- Close Contents Object



   apex_json.close_object; -- Close Main Object



   l_json_payload := apex_json.get_clob_output;

   apex_json.free_output;



    -- 2. Call OTM REST API

   apex_web_service.g_request_headers.delete;

   apex_web_service.g_request_headers(1).name := 'Content-Type';

   apex_web_service.g_request_headers(1).value := 'application/json';

   begin

      x_response_clob := apex_web_service.make_rest_request(

         p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/documents/'

         ,

         p_http_method => 'POST',

         p_username    => 'NAQLEEN.INTEGRATION',     

         p_password    => 'NaqleenInt@123',

         p_wallet_path => 'file:/u01/app/oracle/product/wallet',  

         p_body        => l_json_payload

      );

      

      

       insert into xx_ws_payloads_t values ( 'XX_OTM_POST_DOCUMENTS_APEX',

                                            null,

                                            l_json_payload,

                                            x_response_clob,

                                            sysdate,

                                            xx_payload_seq.nextval );



      

      

      

      

      

      

   exception

      when others then

         x_response_clob := 'Error calling OTM API: ' || sqlerrm;

            -- Optionally log the error

   end;



exception

   when others then

      apex_json.free_output;

      x_response_clob := 'Error in POST_OTM_DOCUMENTS: ' || sqlerrm;

end post_otm_documents;

-- PROCEDURE: POST_OTM_DOCUMENTS_TEST



  CREATE OR REPLACE EDITIONABLE PROCEDURE POST_OTM_DOCUMENTS_TEST (

    p_documentxid          IN VARCHAR2,

    p_documentfilename     IN VARCHAR2,

    p_ownerobjectgid       IN VARCHAR2,

    p_clobcontent          IN CLOB,

    p_documentmimetype     IN VARCHAR2,

    p_documentdefgid       IN VARCHAR2,

    x_response_clob        OUT CLOB

) AS

    l_json_payload CLOB;

    l_clob_content CLOB;

BEGIN

    DBMS_LOB.createtemporary(l_json_payload, TRUE);

    DBMS_LOB.createtemporary(l_clob_content, TRUE);



    -- Ensure clob content is added safely

    l_clob_content := REPLACE(DBMS_LOB.SUBSTR(p_clobcontent, DBMS_LOB.getlength(p_clobcontent)), '' , '\');



    ----------------------------------------------------------------------

    -- Build JSON manually (NO APEX_JSON)

    ----------------------------------------------------------------------

    l_json_payload := '{

  documentXid: ' || p_documentxid || ',

  documentDefGid: ' || p_documentdefgid || ',

  documentType: BLOB,

  documentMimeType: image/png,

  documentFilename: ' || p_documentfilename || ',

  ownerDataQueryTypeGid: SHIPMENT,

  ownerObjectGid: ' || p_ownerobjectgid || ',

  domainName: NAQLEEN,

  usedAs: I,

  documentCmsId: NAQLEEN.' || p_documentxid || ',

  contents: {

    items: [

      {

        domainName: NAQLEEN,

        clobContent: ' || l_clob_content || '

      }

    ]

  }

}';



    ----------------------------------------------------------------------

    -- Call OTM REST API

    ----------------------------------------------------------------------

    apex_web_service.g_request_headers.delete;

    apex_web_service.g_request_headers(1).name := 'Content-Type';

    apex_web_service.g_request_headers(1).value := 'application/json';



    BEGIN

        x_response_clob := apex_web_service.make_rest_request(

                               p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/documents/',

                               p_http_method => 'POST',

                               p_username    => 'NAQLEEN.INTEGRATION',

                               p_password    => 'NaqleenInt@123',

                               p_wallet_path => 'file:/u01/app/oracle/product/wallet',

                               p_body        => l_json_payload

                           );



        INSERT INTO xx_ws_payloads_t 



        VALUES (

            'XX_OTM_POST_DOCUMENTS_APEX',

            NULL,

            l_json_payload,

            x_response_clob,

            SYSDATE,

            xx_payload_seq.NEXTVAL

        );



    EXCEPTION

        WHEN OTHERS THEN

            x_response_clob := 'Error calling OTM API: ' || SQLERRM;

    END;



    DBMS_LOB.freetemporary(l_json_payload);

    DBMS_LOB.freetemporary(l_clob_content);



EXCEPTION

    WHEN OTHERS THEN

        DBMS_LOB.freetemporary(l_json_payload);

        DBMS_LOB.freetemporary(l_clob_content);

        x_response_clob := 'Error in POST_OTM_DOCUMENTS: ' || SQLERRM;

END post_otm_documents_test;


-- PROCEDURE: POST_OTM_TRACKING_EVENTS



  CREATE OR REPLACE EDITIONABLE PROCEDURE POST_OTM_TRACKING_EVENTS (

   p_integration_name varchar2 default null,

   p_statuscodegid    varchar2 default null,

   p_shipmentxid      varchar2 default null,

   p_attribute1       varchar2 default null,

   p_attribute2       varchar2 default null,

   p_attribute3       varchar2 default null,

   p_attribute4       varchar2 default null,

   p_attribute5       varchar2 default null,

   p_attribute6       varchar2 default null,

   p_attribute7       varchar2 default null,

   p_attribute8       varchar2 default null,

   p_attribute9       varchar2 default null,

   p_attribute10      varchar2 default null,

   x_response         out clob

) is



   l_clob           clob;

   l_input_request  clob := null;

   l_error_msg      varchar2(240);

   p_input_body     clob;

   l_transaction_id varchar2(240);

   l_parm_names     apex_application_global.vc_arr2;

   l_parm_values    apex_application_global.vc_arr2;

begin

   apex_web_service.g_request_headers(1).name := 'Content-Type';

   apex_web_service.g_request_headers(1).value := 'application/json';

--#######################################

--REST API Calling

--#######################################





   l_input_request := '{

    statusCodeGid: NAQLEEN.'

                      || trim(both ' ' from ltrim(

      p_statuscodegid,

      'NAQLEEN.'

   ))

                      || ',

    timeZoneGid: Asia/Riyadh,

    eventdate: {

        value: '

                      || to_char(

      sysdate,

      'YYYY-MM-DDTHH24:MI:SS'

   )

                      || '+03:00

    },

    eventReceivedDate: {

        value: '

                      || to_char(

      sysdate,

      'YYYY-MM-DDTHH24:MI:SS'

   )

                      || '+03:00

    },

    responsiblePartyGid: CARRIER,

    shipmentGid: NAQLEEN.'

                      || trim(both ' ' from ltrim(

      p_shipmentxid,

      'NAQLEEN.'

   ))

                      || ',

    domainName: NAQLEEN';



   case

      when p_integration_name = 'XX_OTM_POST_VEHICLE_EXIT_APEX' then

         l_input_request := l_input_request

                            || ',attribute5: '

                            || p_attribute5

                            || '

}';

      when p_integration_name = 'XX_OTM_POST_POSITION_CONTAINER' then

         l_input_request := l_input_request

                            || ',attribute1: '

                            || p_attribute1

                            || '



}';

      when

         p_integration_name = 'XX_OTM_POST_STUFFING_CONTAINER'

         and p_statuscodegid = 'NAQLEEN.STUFFED'

      then

         l_input_request := l_input_request

                            || ',attribute2: '

                            || p_attribute2

                            || '

}';

      when

         p_integration_name = 'XX_OTM_POST_STUFFING_CONTAINER'

         and p_statuscodegid = 'NAQLEEN.CONTAINER STORED'

      then

         l_input_request := l_input_request

                            || ',attribute1: '

                            || p_attribute1

                            || '

}';

      when

         p_integration_name = upper('XX_OTM_POST_DESTUFFING_CONTAINER')

         and p_statuscodegid = 'NAQLEEN.DESTUFFED'

      then

         l_input_request := l_input_request

                            || ',attribute2: '

                            || p_attribute2

                            || '

}';

      when

         p_integration_name = upper('XX_OTM_POST_DESTUFFING_CONTAINER')

         and p_statuscodegid = 'NAQLEEN.CONTAINER STORED'

      then

         l_input_request := l_input_request

                            || ',attribute1: '

                            || p_attribute1

                            || '

}';

      when

         p_integration_name = upper('XX_OTM_POST_POSITION_CONTAINER')

         and p_statuscodegid = 'NAQLEEN.CONTAINER STORED'

      then

         l_input_request := l_input_request

                            || ',attribute1: '

                            || p_attribute1

                            || '

}';

      else

         l_input_request := l_input_request || '}';

   end case;



   begin

      l_clob := apex_web_service.make_rest_request(

         p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/trackingEvents'

         ,

         p_http_method => 'POST',

         p_username    => 'NAQLEEN.INTEGRATION',

         p_password    => 'NaqleenInt@123',

         p_body        => l_input_request,

         p_wallet_path => 'file:/u01/app/oracle/product/wallet'

      );

      x_response := l_clob;

   exception

      when others then

         l_error_msg := 'Error occured while calling Naqleen service ' || sqlerrm;

         dbms_output.put_line('ERROR  ' || l_error_msg);

         x_response := l_error_msg;

   end;

--dbms_output.put_line(l_clob);

--dbms_output.put_line(l_input_request);

   begin

      insert into xx_ws_payloads_t values ( p_statuscodegid,

                                            null,

                                            l_input_request,

                                            l_clob,

                                            sysdate,

                                            xx_payload_seq.nextval );



   end;



end post_otm_tracking_events;



-- PROCEDURE: XX_OTMGET_AVAILABLE_ROLES



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTMGET_AVAILABLE_ROLES AS

BEGIN

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('response_message', 'OK');

        APEX_JSON.OPEN_ARRAY('roles');

    FOR R IN (

        SELECT

            DISTINCT ROLE

        FROM

            XX_ROLE_CONFIG

        ORDER BY

            ROLE

            ) LOOP

                APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('role', R.ROLE);

        APEX_JSON.WRITE('name', INITCAP(REPLACE(R.ROLE, '_', ' ')));

                APEX_JSON.CLOSE_OBJECT;

            END LOOP;



            APEX_JSON.CLOSE_ARRAY;

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN OTHERS THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                    || SQLERRM);

            APEX_JSON.OPEN_ARRAY('roles');

            APEX_JSON.CLOSE_ARRAY;

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END XX_OTM_GET_AVAILABLE_ROLES;



-- PROCEDURE: XX_OTM_BUILD_DOC_JSON



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_BUILD_DOC_JSON (

   p_documentxid      in varchar2,

   p_documentfilename in varchar2,

   p_ownerobjectgid   in varchar2,

   p_clobcontent      in clob,

   p_documentmimetype in varchar2,

   x_json_output      out clob

) as

begin

   apex_json.initialize_clob_output;

   apex_json.open_object;



    -- Top-level fields

   apex_json.write(

      'documentXid',

      p_documentxid

   );

   apex_json.write(

      'documentDefGid',

      'NAQLEEN.POD'

   );

   apex_json.write(

      'documentType',

      'BLOB'

   );

   apex_json.write(

      'documentMimeType',

      p_documentmimetype

   );

   apex_json.write(

      'documentFilename',

      p_documentfilename

   );

   apex_json.write(

      'ownerDataQueryTypeGid',

      'SHIPMENT'

   );

   apex_json.write(

      'ownerObjectGid',

      p_ownerobjectgid

   );

   apex_json.write(

      'domainName',

      'NAQLEEN'

   );

   apex_json.write(

      'usedAs',

      'I'

   );

   apex_json.write(

      'documentCmsId',

      'NAQLEEN.' || p_documentxid

   );



    -- Contents Object

   apex_json.open_object('contents');

   apex_json.open_array('items');



    -- Item Object

   apex_json.open_object;

   apex_json.write(

      'domainName',

      'NAQLEEN'

   );

   apex_json.write(

      'clobContent',

      p_clobcontent

   );

   apex_json.close_object; 



   apex_json.close_array;

   apex_json.close_object; 



   apex_json.close_object; 



   x_json_output := apex_json.get_clob_output;

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      raise;

end xx_otm_build_doc_json;



-- PROCEDURE: XX_OTM_GATE_IN_TRUCKS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GATE_IN_TRUCKS (

   search_text in varchar2 default null

) as

   l_count number;

   cursor c_trucks is

   select truck_nbr

     from xxotm_vehicle_master_t

    where entry_time is not null

      and exit_time is null

      and status = 'gate_in'

      and ( search_text is null

       or upper(truck_nbr) like '%'

                                || upper(search_text)

                                || '%' );

begin

    -- Check if data exists

   select count(*)

     into l_count

     from xxotm_vehicle_master_t

    where entry_time is not null

      and exit_time is null

      and status = 'gate_in'

      and ( search_text is null

       or upper(truck_nbr) like '%'

                                || upper(search_text)

                                || '%' );



   apex_json.initialize_clob_output;

   apex_json.open_object;

   if l_count = 0 then

      apex_json.write(

         'response_message',

         'No Data Found'

      );

      apex_json.write(

         'response_code',

         404

      );

      apex_json.open_array('data');

      apex_json.close_array;

   else

      apex_json.write(

         'response_message',

         'Success'

      );

      apex_json.write(

         'response_code',

         200

      );

      apex_json.open_array('data');

      for i in c_trucks loop

         apex_json.write(i.truck_nbr);

      end loop;

      apex_json.close_array;

   end if;



   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_gate_in_trucks;




-- PROCEDURE: XX_OTM_GATE_IN_TRUCK_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GATE_IN_TRUCK_DETAILS (

   p_truck_nbr in varchar2

) as

   l_shipment_name    varchar2(100);

   l_shipment_nbr     varchar2(50);

   l_container_nbr    varchar2(50);

   l_truck_nbr        varchar2(50);

   l_driver_name      varchar2(100);

   l_driver_iqama_nbr varchar2(50);

   l_otm_order_nbr    varchar2(50);

   l_data_found       boolean := true;

begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );

   apex_json.open_object('data');

   begin

      select st.shipment_name,

             st.shipment_xid,

             st.cont_no,

             (

                select xvmt.truck_nbr

                  from xxotm_vehicle_master_t xvmt

                 where xvmt.truck_nbr = p_truck_nbr

                   and rownum = 1

             ),

             (

                select xvmt.driver_name

                  from xxotm_vehicle_master_t xvmt

                 where xvmt.truck_nbr = p_truck_nbr

                   and rownum = 1

             ),

             (

                select xvmt.driver_iqama

                  from xxotm_vehicle_master_t xvmt

                 where xvmt.truck_nbr = p_truck_nbr

                   and rownum = 1

             ),

             om.ORDER_MOVEMENT_XID

        into

         l_shipment_name,

         l_shipment_nbr,

         l_container_nbr,

         l_truck_nbr,

         l_driver_name,

         l_driver_iqama_nbr,

         l_otm_order_nbr

        from xxotm_shipments_t st

        left join xxotm_order_movements_t om

      on st.shipment_xid = om.shipment_xid

       where ( st.power_unit = p_truck_nbr

          or st.truck_3pl = p_truck_nbr )

         and rownum = 1;

   exception

      when no_data_found then

         l_data_found := false;

         l_truck_nbr := p_truck_nbr; -- Return input truck number if not found

         l_shipment_name := null;

         l_shipment_nbr := null;

         l_container_nbr := null;

         l_driver_name := null;

         l_driver_iqama_nbr := null;

         l_otm_order_nbr := null;

   end;



   if l_data_found then

      apex_json.write(

         'shipment_name',

         l_shipment_name

      );

      apex_json.write(

         'shipment_nbr',

         l_shipment_nbr

      );

      apex_json.write(

         'container_nbr',

         l_container_nbr

      );

      apex_json.write(

         'truck_nbr',

         l_truck_nbr

      );

      apex_json.write(

         'driver_name',

         l_driver_name

      );

      apex_json.write(

         'driver_iqama_nbr',

         l_driver_iqama_nbr

      );

      apex_json.write(

         'otm_order_nbr',

         l_otm_order_nbr

      );

   else

        -- Truck not found in shipments, return truck number and customer list

      apex_json.write(

         'truck_nbr',

         l_truck_nbr

      );

      apex_json.open_array('customer_list');

      for c in (

         select distinct customer_name

           from xxotm_shipments_t

          where customer_name is not null

      ) loop

         apex_json.write(c.customer_name);

      end loop;

      apex_json.close_array;

   end if;



   apex_json.close_object; -- Close data object

   apex_json.close_object; -- Close main object



   htp.prn(apex_json.get_clob_output);

exception

   when others then

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_gate_in_truck_details;




-- PROCEDURE: XX_OTM_GATE_OUT_TRUCKS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GATE_OUT_TRUCKS (

   search_text in varchar2 default null

) as

   l_url           varchar2(4000);

   l_response_clob clob;

   l_status_found  boolean;

   l_items_count   number;



    -- Collection to hold valid trucks

   type t_truck_list is

      table of varchar2(100);

   l_valid_trucks  t_truck_list := t_truck_list();

   cursor c_trucks is

   select v.truck_nbr,

          s.shipment_xid

     from xxotm_vehicle_master_t v

     join xxotm_shipments_t s

   on ( s.power_unit = v.truck_nbr

       or s.truck_3pl = v.truck_nbr )

    where v.status = 'GATE IN'

      and v.exit_time is null;



begin

    -- Initialize output

   apex_json.initialize_clob_output;



    -- Iterate through trucks

   for r in c_trucks loop

      l_status_found := false;



        -- Construct API URL to get tracking events for the shipment

        -- Using direct filter on statusCodeGid

      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

               || r.shipment_xid

               || '/trackingEvents?q=statusCodeGid co GATE IN';



        -- Set Headers

      apex_web_service.g_request_headers.delete;

      apex_web_service.g_request_headers(1).name := 'Content-Type';

      apex_web_service.g_request_headers(1).value := 'application/json';

      begin

            -- Make REST Request

         l_response_clob := apex_web_service.make_rest_request(

            p_url         => l_url,

            p_http_method => 'GET',

            p_username    => 'NAQLEEN.INTEGRATION',

            p_password    => 'NaqleenInt@123',

            p_wallet_path => 'file:/u01/app/oracle/product/wallet'

         );



            -- Parse JSON Response

         apex_json.parse(l_response_clob);

         l_items_count := apex_json.get_number(p_path => 'count');



            -- Check if count is >= 1

         if l_items_count >= 1 then

            l_status_found := true;

         end if;

      exception

         when others then

                -- Ignore API errors and continue to next truck

            null;

      end;



      if l_status_found then

         l_valid_trucks.extend;

         l_valid_trucks(l_valid_trucks.last) := r.truck_nbr;

      end if;



   end loop;



    -- Generate JSON Output

   apex_json.open_object;

   if l_valid_trucks.count > 0 then

      apex_json.write(

         'response_message',

         'Success'

      );

      apex_json.write(

         'response_code',

         200

      );

      apex_json.open_array('data');

      for i in 1..l_valid_trucks.count loop

         apex_json.write(l_valid_trucks(i));

      end loop;

      apex_json.close_array;

   else

      apex_json.write(

         'response_message',

         'No Data Found'

      );

      apex_json.write(

         'response_code',

         404

      );

      apex_json.open_array('data');

      apex_json.close_array;

   end if;



   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_gate_out_trucks;




-- PROCEDURE: XX_OTM_GATE_OUT_TRUCK_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GATE_OUT_TRUCK_DETAILS (

   p_truck_nbr in varchar2

) as

   l_url              varchar2(4000);

   l_response_clob    clob;

   l_items_count      number;

   l_found            boolean := false;

   l_shipment_type    varchar2(100);

   l_shipment_nbr     varchar2(100);

   l_container_nbr    varchar2(100);

   l_container_type   varchar2(100);

   l_driver_name      varchar2(100);

   l_driver_iqama_nbr varchar2(100);

   cursor c_shipments is

   select shipment_xid,

          cont_no,

          container_type

     from xxotm_shipments_t

    where power_unit = p_truck_nbr

       or truck_3pl = p_truck_nbr;



begin

   apex_json.initialize_clob_output;

   apex_json.open_object;



    -- 1. Get Driver Details

   begin

      select driver_name,

             driver_iqama

        into

         l_driver_name,

         l_driver_iqama_nbr

        from xxotm_vehicle_master_t

       where truck_nbr = p_truck_nbr

         and rownum = 1;

   exception

      when no_data_found then

         l_driver_name := null;

         l_driver_iqama_nbr := null;

   end;



    -- 2. Find Active Shipment (GATE IN)

   for r in c_shipments loop

      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

               || r.shipment_xid

               || '/trackingEvents?q=statusCodeGid co GATE IN';

      apex_web_service.g_request_headers.delete;

      apex_web_service.g_request_headers(1).name := 'Content-Type';

      apex_web_service.g_request_headers(1).value := 'application/json';

      begin

         l_response_clob := apex_web_service.make_rest_request(

            p_url         => l_url,

            p_http_method => 'GET',

            p_username    => 'NAQLEEN.INTEGRATION',

            p_password    => 'NaqleenInt@123',

            p_wallet_path => 'file:/u01/app/oracle/product/wallet'

         );



         apex_json.parse(l_response_clob);

         l_items_count := apex_json.get_number(p_path => 'count');

         if l_items_count >= 1 then

            l_shipment_nbr := r.shipment_xid;

            l_container_nbr := r.cont_no;

            l_container_type := r.container_type;

            l_found := true;

            exit; -- Found the active shipment

         end if;

      exception

         when others then

            null;

      end;

   end loop;



    -- 3. Construct Response

   if l_found then

      apex_json.write(

         'response_message',

         'Success'

      );

      apex_json.write(

         'response_code',

         200

      );

      apex_json.open_object('data');

      apex_json.write(

         'shipment_type',

         l_shipment_type

      );

      apex_json.write(

         'shipment_nbr',

         l_shipment_nbr

      );

      apex_json.write(

         'container_nbr',

         l_container_nbr

      );

      apex_json.write(

         'container_type',

         l_container_type

      );

      apex_json.write(

         'truck_nbr',

         p_truck_nbr

      );

      apex_json.write(

         'driver_name',

         l_driver_name

      );

      apex_json.write(

         'driver_iqama_nbr',

         l_driver_iqama_nbr

      );

      apex_json.close_object;

   else

      apex_json.write(

         'response_message',

         'No Data Found'

      );

      apex_json.write(

         'response_code',

         404

      );

      apex_json.open_object('data');

      apex_json.close_object;

   end if;



   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_object('data');

      apex_json.close_object;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_gate_out_truck_details;




-- PROCEDURE: XX_OTM_GET_ACTIVE_SHIPMENTS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_ACTIVE_SHIPMENTS as

   v_trip_count number := 0;

begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_code',

      200

   );

   apex_json.write(

      'response_message',

      'Active shipments retrieved successfully'

   );



    -- Shipments array

   apex_json.open_array('shipments');

   for rec in (

      select t.shipment_id,

             t.start_loc_latlong,

             t.start_loc_name,

             t.end_loc_latlong,

             t.end_loc_name,

             t.driver_id,

             d.driver_name,

             t.status,

             to_char(

                t.created_date,

                'YYYY-MM-DDTHH24:MI:SS'

             ) as created_date,

             to_char(

                t.est_start_time,

                'YYYY-MM-DDTHH24:MI:SS'

             ) as est_start_time,

             to_char(

                t.est_delivery_time,

                'YYYY-MM-DDTHH24:MI:SS'

             ) as est_delivery_time,

             to_char(

                t.act_start_time,

                'YYYY-MM-DDTHH24:MI:SS'

             ) as act_start_time

        from xx_shipments_data t

       inner join xx_driver_info d

      on t.driver_id = d.driver_id

       where t.status = 'ACTIVE'

       order by t.shipment_id

   ) loop

      v_trip_count := v_trip_count + 1;

      apex_json.open_object;

      apex_json.write(

         'shipment_id',

         'SHIP-'

         || lpad(

            rec.shipment_id,

            3,

            '0'

         )

      );

      apex_json.write(

         'start_loc_latlong',

         rec.start_loc_latlong

      );

      apex_json.write(

         'start_loc_name',

         rec.start_loc_name

      );

      apex_json.write(

         'end_loc_latlong',

         rec.end_loc_latlong

      );

      apex_json.write(

         'end_loc_name',

         rec.end_loc_name

      );

      apex_json.write(

         'driver_id',

         rec.driver_id

      );

      apex_json.write(

         'driver_name',

         rec.driver_name

      );

      apex_json.write(

         'created_date',

         rec.created_date

      );

      apex_json.write(

         'est_start_time',

         rec.est_start_time

      );

      apex_json.write(

         'est_delivery_time',

         rec.est_delivery_time

      );

      apex_json.write(

         'act_start_time',

         rec.act_start_time

      );



        -- Add stops array for this shipment

      apex_json.open_array('stops');

      for stop_rec in (

         select s.stop_id,

                s.stop_name,

                s.lat_long,

                s.sequence,

                s.status,

                s.notes

           from xx_shipment_stops s

          where s.shipment_id = rec.shipment_id

          order by s.sequence

      ) loop

         apex_json.open_object;

         apex_json.write(

            'stop_id',

            stop_rec.stop_id

         );

         apex_json.write(

            'stop_name',

            stop_rec.stop_name

         );

         apex_json.write(

            'lat_long',

            stop_rec.lat_long

         );

         apex_json.write(

            'sequence',

            stop_rec.sequence

         );

         apex_json.write(

            'status',

            lower(stop_rec.status)

         );

         apex_json.write(

            'notes',

            stop_rec.notes

         );

         apex_json.close_object;

      end loop;



      apex_json.close_array;

      apex_json.close_object;

   end loop;



   apex_json.close_array;

   apex_json.write(

      'total_shipments',

      v_trip_count

   );

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

end xx_otm_get_active_shipments;




-- PROCEDURE: XX_OTM_GET_AVAILABLEOPERATORS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLEOPERATORS (

    p_search_text IN VARCHAR2

) AS

BEGIN

    apex_json.initialize_clob_output;

    apex_json.open_object;



    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'Success');



    apex_json.open_array('data');



    FOR rec IN (

        SELECT operator AS operator_number,

               shipment_nbr,

               updated_by AS stuffed_by,

               updated_date

        FROM xxotm_task_assignment_t ta

        WHERE p_search_text IS NULL

            OR UPPER(ta.operator) LIKE '%' || UPPER(p_search_text) || '%'

        ORDER BY updated_date DESC

    ) LOOP

        apex_json.open_object;

        apex_json.write('operator_number', rec.operator_number);

        apex_json.write('shipment_nbr', rec.shipment_nbr);

        apex_json.write('stuffed_by', rec.stuffed_by);

        apex_json.write('updated_time', rec.updated_date);

        apex_json.close_object;

    END LOOP;



    apex_json.close_array; -- data

    apex_json.close_object; -- root



    htp.prn(apex_json.get_clob_output);



EXCEPTION WHEN OTHERS THEN

    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code', 500);

    apex_json.write('response_message', SQLERRM);

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

END xx_otm_get_AvailableOperators;




-- PROCEDURE: XX_OTM_GET_AVAILABLEPOSITIONS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLEPOSITIONS (

    p_container_nbr IN VARCHAR2

) AS

BEGIN

    apex_json.initialize_clob_output;

    apex_json.open_object;



    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'Success');



    apex_json.open_array('data');



    FOR rec IN (

        SELECT DISTINCT

               position

        FROM  xxotm_container_inventory_t ci

        WHERE position IS NOT NULL

          AND (p_container_nbr IS NULL

               OR UPPER(ci.container_nbr) LIKE '%' || UPPER(p_container_nbr) || '%')

        ORDER BY position

    )

    LOOP

        apex_json.write(rec.position);

    END LOOP;



    apex_json.close_array;

    apex_json.close_object;



    htp.prn(apex_json.get_clob_output);

        DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);





EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', SQLERRM);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

            DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



END xx_otm_get_AvailablePositions;




-- PROCEDURE: XX_OTM_GET_AVAILABLE_OPERATORS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_OPERATORS (

    searchText IN VARCHAR2 DEFAULT NULL

) AS

    l_count NUMBER := 0;



    CURSOR c_operators IS

        SELECT ta.operator AS operator_number,

               ta.shipment_nbr,

               (SELECT stuffed_by 

                  FROM xxotm_customer_inventory_t 

                 WHERE shipment_nbr = ta.shipment_nbr

                 FETCH FIRST 1 ROW ONLY) AS stuffed_by,

               ta.timestamp AS updated_time

          FROM xxotm_task_assignment_t ta

         WHERE ta.operator LIKE '%' || searchText || '%';

BEGIN



    SELECT COUNT(*) INTO l_count

      FROM xxotm_task_assignment_t ta

     WHERE ta.operator LIKE '%' || searchText || '%';



    IF l_count = 0 THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'No data found');

        apex_json.write('response_code', 404);

--        apex_json.open_array('data');

--        apex_json.close_array;

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        dbms_output.put_line(apex_json.get_clob_output);

        RETURN;

    END IF;



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_message', 'Success');

    apex_json.write('response_code', 200);

    apex_json.open_array('data');



    FOR r_operator IN c_operators LOOP

        apex_json.open_object;

        apex_json.write('operator_number', r_operator.operator_number);

        apex_json.write('shipment_nbr', r_operator.shipment_nbr);

        apex_json.write('stuffed_by', r_operator.stuffed_by);

        apex_json.write('updated_time', r_operator.updated_time);

        apex_json.close_object;

    END LOOP;



    apex_json.close_array;

    apex_json.close_object;



    htp.prn(apex_json.get_clob_output);

    dbms_output.put_line(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.write('response_code', 500);

--        apex_json.open_array('data');

--        apex_json.close_array;

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        dbms_output.put_line(apex_json.get_clob_output);

END xx_otm_get_available_operators;




-- PROCEDURE: XX_OTM_GET_AVAILABLE_POSITION_LOV



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_POSITION_LOV (

   p_flag           in varchar2,

   p_terminal       in varchar2 default null,

   p_block          in varchar2 default null,

   p_row            in varchar2 default null,

   p_lot            in number default null,

   p_container_type in varchar2 default null

) as

begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );

   apex_json.open_array('data');

   case p_flag

        -- 1️⃣ Terminal selected → Load Blocks with matching container type

      when 'T' then

         for rec in (

            select distinct block

              from xxotm_position_master_t

             where terminal = p_terminal

               and is_occupied = 'N'

               and container_type = p_container_type

             order by block

         ) loop

            apex_json.open_object;

            apex_json.write(

               'display_value',

               rec.block

            );

            apex_json.write(

               'return_value',

               rec.block

            );

            apex_json.close_object;

         end loop;



        -- 2️⃣ Block selected → Load Rows with matching container type

      when 'B' then

         for rec in (

            select distinct row

              from xxotm_position_master_t

             where terminal = p_terminal

               and block = p_block

               and is_occupied = 'N'

               and container_type = p_container_type

             order by row

         ) loop

            apex_json.open_object;

            apex_json.write(

               'display_value',

               rec.row

            );

            apex_json.write(

               'return_value',

               rec.row

            );

            apex_json.close_object;

         end loop;



        -- 3️⃣ Row selected → Load Lots with matching container type

      when 'R' then

         for rec in (

            select distinct lot_no

              from xxotm_position_master_t

             where terminal = p_terminal

               and block = p_block

               and row = p_row

               and is_occupied = 'N'

               and container_type = p_container_type

             order by lot_no

         ) loop

            apex_json.open_object;

            apex_json.write(

               'display_value',

               rec.lot_no

            );

            apex_json.write(

               'return_value',

               rec.lot_no

            );

            apex_json.close_object;

         end loop;



        -- 4️⃣ Lot selected → Load Levels with matching container type

      when 'L' then

         for rec in (

            select distinct level_no

              from xxotm_position_master_t

             where terminal = p_terminal

               and block = p_block

               and row = p_row

               and lot_no = p_lot

               and is_occupied = 'N'

               and container_type = p_container_type

             order by level_no

         ) loop

            apex_json.open_object;

            apex_json.write(

               'display_value',

               rec.level_no

            );

            apex_json.write(

               'return_value',

               rec.level_no

            );

            apex_json.close_object;

         end loop;

      else

         apex_json.close_array;

         apex_json.write(

            'response_message',

            'Invalid flag passed'

         );

         apex_json.write(

            'response_code',

            400

         );

         apex_json.close_object;

         htp.prn(apex_json.get_clob_output);

         apex_json.free_output;

         return;

   end case;



   apex_json.close_array;

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_get_available_position_lov;




-- PROCEDURE: XX_OTM_GET_AVAILABLE_ROLES



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_ROLES as

begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_code',

      200

   );

   apex_json.write(

      'response_message',

      'OK'

   );

   apex_json.open_array('roles');

   for r in (

      select distinct role

        from xx_role_config

       order by role

   ) loop

      apex_json.open_object;

      apex_json.write(

         'role',

         r.role

      );

      apex_json.write(

         'name',

         initcap(replace(

            r.role,

            '_',

            ' '

         ))

      );

      apex_json.close_object;

   end loop;



   apex_json.close_array;

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

      apex_json.open_array('roles');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_get_available_roles;




-- PROCEDURE: XX_OTM_GET_AVAILABLE_SCREENS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_SCREENS AS

    V_SCREEN_COUNT NUMBER := 0;

BEGIN

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('response_message', 'Available screens retrieved successfully');



        -- Screens array

        APEX_JSON.OPEN_ARRAY('screens');

        FOR REC IN (

            SELECT DISTINCT

                SCREEN_NAME,

                SCREEN_PATH,

                IS_ACTIVE

            FROM

                XX_ROLE_CONFIG

            ORDER BY

                SCREEN_NAME

                ) LOOP

            V_SCREEN_COUNT := V_SCREEN_COUNT + 1;

            APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('screen_name', REC.SCREEN_NAME);

            APEX_JSON.WRITE('screen_path', REC.SCREEN_PATH);

            APEX_JSON.WRITE('is_active',

                CASE

                    WHEN REC.IS_ACTIVE = 'Y' THEN

                        TRUE

                    ELSE

                        FALSE

                END);

            APEX_JSON.CLOSE_OBJECT;

        END LOOP;



        APEX_JSON.CLOSE_ARRAY;

        APEX_JSON.WRITE('total_screens', V_SCREEN_COUNT);

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN OTHERS THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                    || SQLERRM);

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END XX_OTM_GET_AVAILABLE_SCREENS;




-- PROCEDURE: XX_OTM_GET_AVAILABLE_TRUCKS_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_TRUCKS_APEX AS

    TYPE record_type IS RECORD (

        truck_nbr    VARCHAR2(100),

        driver_name  VARCHAR2(100),

        driver_iqama VARCHAR2(100),

        type         VARCHAR2(100),

        entry_time   VARCHAR2(100)

    );



    l_record record_type;



    CURSOR c_data_cursor IS

    SELECT DISTINCT

        truck_nbr,

        driver_name,

        driver_iqama,

        type,

         entry_time

    FROM xxotm_vehicle_master_t

    WHERE entry_time IS NOT NULL

      AND exit_time IS NULL;



BEGIN



    owa_util.mime_header('application/json', TRUE);

    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'Success');

    apex_json.open_array('data');



    OPEN c_data_cursor;

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%NOTFOUND;



        apex_json.open_object;

        apex_json.write('truck_number', l_record.truck_nbr);

        apex_json.write('driver_name', l_record.driver_name);

        apex_json.write('iqama_number', l_record.driver_iqama);

        apex_json.write('type', l_record.type);

        apex_json.write('entry_time', l_record.entry_time);

        apex_json.close_object;

    END LOOP;

    CLOSE c_data_cursor;



    apex_json.close_array;

    apex_json.close_object;



    -- Use apex_util.prn for CLOB support

    htp.prn(apex_json.get_clob_output);



     DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

    apex_json.free_output;



EXCEPTION

    WHEN OTHERS THEN

        apex_json.free_output;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || SQLERRM);

        apex_json.close_object;

        apex_util.prn(apex_json.get_clob_output);

        apex_json.free_output;

END XX_OTM_GET_AVAILABLE_TRUCKS_APEX;




-- PROCEDURE: XX_OTM_GET_CFS_HISTORY_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CFS_HISTORY_CONTAINERS (

    p_search_text IN VARCHAR2 DEFAULT NULL,

    p_page_number IN NUMBER DEFAULT 1,

    p_page_size IN NUMBER DEFAULT 20

) AS

    l_total_count NUMBER := 0;

    l_offset NUMBER;

    l_json_output CLOB;

    l_first_record BOOLEAN := TRUE;

    l_page_num NUMBER;

    l_page_sz NUMBER;

    l_record_count NUMBER := 0;

    l_search_text VARCHAR2(200);

BEGIN

    -- Set default values

    l_page_num := NVL(p_page_number, 1);

    l_page_sz := NVL(p_page_size, 20);

    l_search_text := UPPER(TRIM(p_search_text));

    

    DBMS_OUTPUT.PUT_LINE('DEBUG: p_search_text = [' || p_search_text || ']');

    DBMS_OUTPUT.PUT_LINE('DEBUG: l_search_text = [' || l_search_text || ']');

    DBMS_OUTPUT.PUT_LINE('DEBUG: l_search_text IS NOT NULL = ' || CASE WHEN l_search_text IS NOT NULL THEN 'TRUE' ELSE 'FALSE' END);

    

    -- Calculate offset for pagination

    l_offset := (l_page_num - 1) * l_page_sz;

    

    -- Get total count for pagination (with search filter if provided)

    IF l_search_text IS NOT NULL THEN

        DBMS_OUTPUT.PUT_LINE('DEBUG: Executing search query with text: [' || l_search_text || ']');

        SELECT COUNT(*)

        INTO l_total_count

        FROM xxotm_customer_inventory_t ci,

             xxotm_shipments_t sh

        WHERE ci.shipment_nbr = sh.SHIPMENT_XID

        AND sh.shipment_name IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS')

        AND UPPER(ci.container_nbr) LIKE '%' || l_search_text || '%';

        DBMS_OUTPUT.PUT_LINE('DEBUG: Search count = ' || l_total_count);

    ELSE

        DBMS_OUTPUT.PUT_LINE('DEBUG: Executing query without search filter');

        SELECT COUNT(*)

        INTO l_total_count

        FROM xxotm_customer_inventory_t ci,

             xxotm_shipments_t sh

        WHERE ci.shipment_nbr = sh.SHIPMENT_XID

        AND sh.shipment_name IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS');

        DBMS_OUTPUT.PUT_LINE('DEBUG: No-search count = ' || l_total_count);

    END IF;

    

    -- Check if no data found

    IF l_total_count = 0 THEN

        l_json_output := '{response_message:No data found,response_code:404,total_records:0,page_number:' || 

                         l_page_num || ',page_size:' || l_page_sz || ',total_pages:0,search_text:' || p_search_text || ',data:[]}';

        HTP.PRN(l_json_output);

        DBMS_OUTPUT.PUT_LINE(l_json_output);

        RETURN;

    END IF;

    

    -- Build JSON manually with proper parameter values

    l_json_output := '{response_message:Success,response_code:200,total_records:' || 

                     l_total_count || ',page_number:' || l_page_num || 

                     ',page_size:' || l_page_sz || ',total_pages:' || 

                     CEIL(l_total_count / l_page_sz) || ',search_text:' || p_search_text || ',data:[';

    

    -- Fetch and add data (with search filter if provided)

    IF l_search_text IS NOT NULL THEN

        FOR rec IN (

            SELECT 

                ci.container_nbr,

                ci.cust_name AS customer,

                sh.shipment_name AS type,

                ci.creation_date

            FROM xxotm_customer_inventory_t ci,

                 xxotm_shipments_t sh

            WHERE ci.shipment_nbr = sh.SHIPMENT_XID

            AND sh.shipment_name IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS')

            AND UPPER(ci.container_nbr) LIKE '%' || l_search_text || '%'

            ORDER BY ci.creation_date DESC NULLS LAST

            OFFSET l_offset ROWS FETCH NEXT l_page_sz ROWS ONLY

        ) LOOP

            IF NOT l_first_record THEN

                l_json_output := l_json_output || ',';

            END IF;

            

            l_json_output := l_json_output || '{container_nbr:' || rec.container_nbr ||

                             ',customer:' || rec.customer || ',type:' || rec.type ||

                             ',creation_date:' || rec.creation_date || '}';

            

            l_first_record := FALSE;

            l_record_count := l_record_count + 1;

        END LOOP;

    ELSE

        FOR rec IN (

            SELECT 

                ci.container_nbr,

                ci.cust_name AS customer,

                sh.shipment_name AS type,

                ci.creation_date

            FROM xxotm_customer_inventory_t ci,

                 xxotm_shipments_t sh

            WHERE ci.shipment_nbr = sh.SHIPMENT_XID

            AND sh.shipment_name IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS')

            ORDER BY ci.creation_date DESC NULLS LAST

            OFFSET l_offset ROWS FETCH NEXT l_page_sz ROWS ONLY

        ) LOOP

            IF NOT l_first_record THEN

                l_json_output := l_json_output || ',';

            END IF;

            

            l_json_output := l_json_output || '{container_nbr:' || rec.container_nbr ||

                             ',customer:' || rec.customer || ',type:' || rec.type ||

                             ',creation_date:' || rec.creation_date || '}';

            

            l_first_record := FALSE;

            l_record_count := l_record_count + 1;

        END LOOP;

    END IF;

    

    -- Check if current page has no records

    IF l_record_count = 0 THEN

        l_json_output := '{response_message:No records found for this page,response_code:404,total_records:' || 

                         l_total_count || ',page_number:' || l_page_num || 

                         ',page_size:' || l_page_sz || ',total_pages:' || 

                         CEIL(l_total_count / l_page_sz) || ',search_text:' || p_search_text || ',data:[]}';

    ELSE

        l_json_output := l_json_output || ']}';

    END IF;

    

    -- Output the JSON

    HTP.PRN(l_json_output);

    DBMS_OUTPUT.PUT_LINE(l_json_output);

    

EXCEPTION

    WHEN NO_DATA_FOUND THEN

        HTP.PRN('{response_message:No data found,response_code:404,total_records:0,page_number:1,page_size:20,total_pages:0,search_text:' || p_search_text || ',data:[]}');

        DBMS_OUTPUT.PUT_LINE('{response_message:No data found,response_code:404,total_records:0,page_number:1,page_size:20,total_pages:0,search_text:' || p_search_text || ',data:[]}');

    WHEN OTHERS THEN

        HTP.PRN('{response_message:Error: ' || SQLERRM || ',response_code:500,total_records:0,page_number:1,page_size:20,total_pages:0,search_text:' || p_search_text || ',data:[]}');

        DBMS_OUTPUT.PUT_LINE('{response_message:Error: ' || SQLERRM || ',response_code:500,total_records:0,page_number:1,page_size:20,total_pages:0,search_text:' || p_search_text || ',data:[]}');

END XX_OTM_GET_CFS_HISTORY_CONTAINERS;




-- PROCEDURE: XX_OTM_GET_CFS_HISTORY_CONTAINERS_DEBUG



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CFS_HISTORY_CONTAINERS_DEBUG AS

    l_count NUMBER := 0;

BEGIN

    -- Initialize JSON output

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_message', 'Success');

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('total_records', 5);

        

        -- Open data array

        APEX_JSON.OPEN_ARRAY('data');

        

        -- Test with hardcoded data

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('container_nbr', 'MSKA1234684');

            APEX_JSON.WRITE('customer', 'Global Trade Co');

            APEX_JSON.WRITE('type', 'STORE_AS_IT_IS');

            APEX_JSON.WRITE('creation_date', '2025-12-04T15:02:55.957135Z');

        APEX_JSON.CLOSE_OBJECT;

        

        -- Close data array

        APEX_JSON.CLOSE_ARRAY;

    APEX_JSON.CLOSE_OBJECT;

    

    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

    DBMS_OUTPUT.PUT_LINE(APEX_JSON.GET_CLOB_OUTPUT);

END XX_OTM_GET_CFS_HISTORY_CONTAINERS_DEBUG;




-- PROCEDURE: XX_OTM_GET_CFS_HISTORY_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CFS_HISTORY_DETAILS (

    p_container_nbr IN VARCHAR2

) AS

    l_container_found NUMBER := 0;

    l_json_output CLOB;

    l_first_item BOOLEAN := TRUE;

    l_first_record BOOLEAN := TRUE;

BEGIN

    -- Check if container exists

    SELECT COUNT(*)

    INTO l_container_found

    FROM xxotm_customer_inventory_t

    WHERE container_nbr = p_container_nbr;

    

    -- If container not found, return 404

    IF l_container_found = 0 THEN

        l_json_output := '{response_message:Container not found,response_code:404,data:[]}';

        HTP.PRN(l_json_output);

        DBMS_OUTPUT.PUT_LINE(l_json_output);

        RETURN;

    END IF;

    

    -- Build JSON response with container details and items

    l_json_output := '{response_message:Success,response_code:200,data:[';

    

    -- Fetch unique container details with items

    FOR rec IN (

        SELECT DISTINCT

            cust_name AS customer,

            container_nbr,

            shipment_nbr,

            stuffed_by

        FROM xxotm_customer_inventory_t

        WHERE container_nbr = p_container_nbr

    ) LOOP

        IF NOT l_first_record THEN

            l_json_output := l_json_output || ',';

        END IF;

        

        l_json_output := l_json_output || '{customer:' || rec.customer ||

                         ',container_nbr:' || rec.container_nbr ||

                         ',shipment_nbr:' || rec.shipment_nbr ||

                         ',stuffed_by:' || NVL(rec.stuffed_by, '') || ',items:[';

        

        l_first_item := TRUE;

        

        -- Fetch items for this container

        FOR item_rec IN (

            SELECT 

                cargo_description AS item_description,

                qty AS quantity,

                qty_uom AS quantity_uom

            FROM xxotm_customer_inventory_t

            WHERE container_nbr = p_container_nbr

        ) LOOP

            IF NOT l_first_item THEN

                l_json_output := l_json_output || ',';

            END IF;

            

            l_json_output := l_json_output || '{item_description:' || NVL(item_rec.item_description, '') ||

                             ',quantity:' || NVL(item_rec.quantity, 0) ||

                             ',quantity_uom:' || NVL(item_rec.quantity_uom, '') || '}';

            

            l_first_item := FALSE;

        END LOOP;

        

        l_json_output := l_json_output || ']}';

        l_first_record := FALSE;

    END LOOP;

    

    l_json_output := l_json_output || ']}';

    

    -- Output the JSON

    HTP.PRN(l_json_output);

    DBMS_OUTPUT.PUT_LINE(l_json_output);

    

EXCEPTION

    WHEN OTHERS THEN

        HTP.PRN('{response_message:Error: ' || SQLERRM || ',response_code:500,data:[]}');

        DBMS_OUTPUT.PUT_LINE('{response_message:Error: ' || SQLERRM || ',response_code:500,data:[]}');

END XX_OTM_GET_CFS_HISTORY_DETAILS;




-- PROCEDURE: XX_OTM_GET_CUSTOMERINVENTORY



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUSTOMERINVENTORY (

    p_customer IN VARCHAR2

) AS

    TYPE record_type IS RECORD (

        cust_nbr          VARCHAR2(50),

        cust_name         VARCHAR2(100),

        container_nbr     VARCHAR2(50),

        shipment_nbr      VARCHAR2(50),

        cargo_description VARCHAR2(50),

        qty               VARCHAR2(50),

        qty_uom           VARCHAR2(10)

    );

    l_record                record_type;

    l_response              json_object_t;

    l_data_array            json_array_t;

    l_customer_obj          json_object_t;

    l_containers_array      json_array_t;

    l_container_obj         json_object_t;

    l_items_array           json_array_t;

    l_item_obj              json_object_t;

    j                       apex_json.t_values;



    l_prev_customer         VARCHAR2(100) := NULL;

    l_prev_container        VARCHAR2(50) := NULL;



    CURSOR c_data_cursor (

        p_customer VARCHAR2

    ) IS

    SELECT 

        cust_nbr,

        cust_name,

        container_nbr,

        shipment_nbr,

        cargo_description,

        qty,

        qty_uom

    FROM 

        xxotm_customer_inventory_t

    WHERE 

        (p_customer IS NULL 

         OR UPPER(cust_nbr) LIKE '%' || UPPER(p_customer) || '%'

         OR UPPER(cust_name) LIKE '%' || UPPER(p_customer) || '%')

    ORDER BY 

        cust_name, 

        container_nbr, 

        shipment_nbr;



BEGIN

    l_response := json_object_t();

    l_data_array := json_array_t();



    OPEN c_data_cursor(p_customer);

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%notfound;



        -- Check if new customer

        IF l_prev_customer IS NULL OR l_prev_customer != l_record.cust_name THEN

            -- Save previous customer object if exists

            IF l_prev_customer IS NOT NULL THEN

                l_customer_obj.put('containers', l_containers_array);

                l_data_array.append(l_customer_obj);

            END IF;



            -- Initialize new customer object

            l_customer_obj := json_object_t();

            l_customer_obj.put('customer', l_record.cust_name);

            l_containers_array := json_array_t();

            l_prev_customer := l_record.cust_name;

            l_prev_container := NULL;

        END IF;



        -- Check if new container

        IF l_prev_container IS NULL OR l_prev_container != l_record.container_nbr THEN

            -- Save previous container object if exists

            IF l_prev_container IS NOT NULL THEN

                l_container_obj.put('items', l_items_array);

                l_containers_array.append(l_container_obj);

            END IF;



            -- Initialize new container object

            l_container_obj := json_object_t();

            l_container_obj.put('container_nbr', l_record.container_nbr);

            l_container_obj.put('shipment_nbr', l_record.shipment_nbr);

            l_container_obj.put('stuffed_by', '');  -- Not available in table

            l_items_array := json_array_t();

            l_prev_container := l_record.container_nbr;

        END IF;



        -- Add item

        l_item_obj := json_object_t();

        l_item_obj.put('item_description', l_record.cargo_description);

        l_item_obj.put('quantity', l_record.qty);

        l_item_obj.put('quantity_uom', l_record.qty_uom);

        l_items_array.append(l_item_obj);



    END LOOP;

    CLOSE c_data_cursor;



    -- Save last container and customer

    IF l_prev_container IS NOT NULL THEN

        l_container_obj.put('items', l_items_array);

        l_containers_array.append(l_container_obj);

    END IF;



    IF l_prev_customer IS NOT NULL THEN

        l_customer_obj.put('containers', l_containers_array);

        l_data_array.append(l_customer_obj);

    END IF;



    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_data_array);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));

    -- Converting json string to table of values

    apex_json.parse(j,

                    l_response.get('data').to_string());

    apex_json.write('data', j);

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

    DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

            DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



END xx_otm_get_CustomerInventory;




-- PROCEDURE: XX_OTM_GET_CUSTOMERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUSTOMERS (

    p_customer IN VARCHAR2

) AS

    TYPE record_type IS RECORD (

        cust_name VARCHAR2(100)

    );

    l_record           record_type;

    l_event_data_array json_array_t;

    l_response         json_object_t;

    j                  apex_json.t_values;

    l_count            NUMBER := 0;  



    CURSOR c_data_cursor (p_customer VARCHAR2) IS

        SELECT DISTINCT cust_name

        FROM xxotm_customer_inventory_t

        WHERE (p_customer IS NULL 

               OR UPPER(cust_nbr) LIKE '%' || UPPER(p_customer) || '%'

               OR UPPER(cust_name) LIKE '%' || UPPER(p_customer) || '%')

        ORDER BY cust_name;



BEGIN

    l_response := json_object_t();

    l_event_data_array := json_array_t();



    OPEN c_data_cursor(p_customer);

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%NOTFOUND;



        l_event_data_array.append(l_record.cust_name);

        l_count := l_count + 1;

    END LOOP;

    CLOSE c_data_cursor;



    IF l_count = 0 THEN

        -- Return 404 if no customer found

        l_response.put('response_code', 404);

        l_response.put('response_message', 'Enter a valid customer');



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 404);

        apex_json.write('response_message', 'Enter a valid customer');

        apex_json.close_object;   

        htp.prn(apex_json.get_clob_output);

        RETURN;

    END IF;



    -- Success response

    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_event_data_array);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'Success');



    apex_json.parse(j, l_response.get('data').to_string());

    apex_json.write('data', j);

    apex_json.close_object;



    htp.prn(apex_json.get_clob_output);

    DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_get_Customers;




-- PROCEDURE: XX_OTM_GET_CUSTOMER_SHIPMENTS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUSTOMER_SHIPMENTS (

   p_customer_name in varchar2

) as

   l_url           varchar2(4000);

   l_response_clob clob;

   l_status_value  varchar2(100);

   l_count         number;

   l_shipment_xid  varchar2(50);



    -- Cursor to fetch shipments for the customer

   cursor c_shipments is

   select shipment_xid,

          shipment_name,

          cont_no

     from xxotm_shipments_t

    where customer_name = p_customer_name;



begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );

   apex_json.open_array('shipments');

   for r_ship in c_shipments loop

        -- Construct API URL

      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'

               || r_ship.shipment_xid

               || '/statuses?q=statusTypeGid eq NAQLEEN.TRIP_STATUS';



        -- Make REST Request

        -- IMPORTANT: Replace 'USERNAME' and 'PASSWORD' with actual credentials

      apex_web_service.g_request_headers.delete;

      apex_web_service.g_request_headers(1).name := 'Content-Type';

      apex_web_service.g_request_headers(1).value := 'application/json';

      begin

         l_response_clob := apex_web_service.make_rest_request(

            p_url         => l_url,

            p_http_method => 'GET',

            p_username    => 'USERNAME', -- Placeholder

            p_password    => 'PASSWORD'  -- Placeholder

         );



            -- Parse JSON Response

         apex_json.parse(l_response_clob);



            -- Check if items exist and get the first status value

         l_count := apex_json.get_count(p_path => 'items');

         if l_count > 0 then

            l_status_value := apex_json.get_varchar2(

               p_path => 'items[%d].statusValueGid',

               p0     => 1

            );



                -- Filter based on status

            if l_status_value in ( 'NAQLEEN.TRIP_NOT_STARTED',

                                   'NAQLEEN.TRIP_STARTED' ) then

               apex_json.open_object;

               apex_json.write(

                  'shipment_xid',

                  r_ship.shipment_xid

               );

               apex_json.write(

                  'shipment_name',

                  r_ship.shipment_name

               );

               apex_json.write(

                  'container_nbr',

                  r_ship.cont_no

               );

               apex_json.write(

                  'trip_status',

                  l_status_value

               );

               apex_json.close_object;

            end if;

         end if;



      exception

         when others then

                -- Log error or continue to next shipment

                -- For now, we just continue

            null;

      end;



   end loop;



   apex_json.close_array;

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

exception

   when others then

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('shipments');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_get_customer_shipments;




-- PROCEDURE: XX_OTM_GET_DESTUFFING_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_DESTUFFING_CONTAINERS (

    p_search_text varchar2

)

AS

    TYPE record_type IS RECORD (

        container_nbr         VARCHAR2(50),

        inbound_shipment_nbr  VARCHAR2(50)

    );

    l_record              record_type;

    l_event_data_array    json_array_t;

    l_response            json_object_t;

    j                     apex_json.t_values;



    l_track_response      CLOB;

    l_has_gate_in         BOOLEAN;

    l_track_json          json_object_t;

    l_items_array         json_array_t;

    l_item_obj            json_object_t;

    l_status_code         VARCHAR2(100);



    -- Base API URL

    l_api_base_url        VARCHAR2(500) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/';

    l_api_url             VARCHAR2(1000);



    -- API Credentials

    l_username            VARCHAR2(100) := 'NAQLEEN.INTEGRATION';

    l_password            VARCHAR2(100) := 'NaqleenInt@123';



    -- NOTE: Replace xxotm_shipments_t with your actual shipment table

   CURSOR c_data_cursor IS

    SELECT DISTINCT

        s.CONT_NO AS container_nbr,

        s.SHIPMENT_XID AS inbound_shipment_nbr

    FROM 

        xxotm_shipments_t s 

    WHERE 

        s.SHIPMENT_NAME IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS','CRO')

        AND s.CONT_NO IS NOT NULL 

        AND s.CONT_NO like '%' || p_search_text || '%'

    ORDER BY s.CONT_NO;



BEGIN

    l_response := json_object_t();

    l_event_data_array := json_array_t();



    OPEN c_data_cursor;

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%notfound;



        l_has_gate_in := FALSE;



        -- Build API URL with shipment number

        l_api_url := l_api_base_url || CONCAT('NAQLEEN.',l_record.inbound_shipment_nbr) || '/trackingEvents';

                        DBMS_OUTPUT.PUT_LINE(l_api_url);



        -- Call Oracle GTM tracking events API using APEX Web Service

        BEGIN

        BEGIN

            l_track_response := apex_web_service.make_rest_request(

                p_url => l_api_url,

                p_http_method => 'GET',               

                p_username => l_username,

                p_password => l_password,

                p_wallet_path => 'file:/u01/app/oracle/product/wallet'

            );

            exception when others then

            dbms_output.put_line(sqlerrm);

            end;



               -- DBMS_OUTPUT.PUT_LINE(l_track_response);

                --DBMS_OUTPUT.PUT_LINE(apex_web_service.g_status_code);





            -- Parse response and check for GATE IN status

            IF l_track_response IS NOT NULL THEN

                BEGIN

                    l_track_json := json_object_t(l_track_response);



                    -- Check if response has items array

                    IF l_track_json.has('items') THEN

                        l_items_array := json_array_t(l_track_json.get('items'));



                        -- Loop through items to find GATE IN status

                        FOR i IN 0 .. l_items_array.get_size - 1 LOOP

                            l_item_obj := json_object_t(l_items_array.get(i));



                            -- Check statusCodeGid field

                            IF l_item_obj.has('statusCodeGid') THEN

                                l_status_code := l_item_obj.get_string('statusCodeGid');



                                -- Check if status is GATE IN

                                IF UPPER(l_status_code) LIKE '%GATE IN%' 

                                   OR UPPER(l_status_code) = 'NAQLEEN.GATE IN' THEN

                                    l_has_gate_in := TRUE;

                                    EXIT;

                                END IF;

                            END IF;

                        END LOOP;

                    END IF;



                EXCEPTION

                    WHEN OTHERS THEN

                        -- If parsing fails, skip this container

                        l_has_gate_in := FALSE;

                END;

            END IF;



        EXCEPTION

            WHEN OTHERS THEN

                -- If any error, skip this container

                l_has_gate_in := FALSE;

        END;



        -- Only add container if it has GATE IN event

        IF l_has_gate_in THEN

            l_event_data_array.append(l_record.container_nbr);

        END IF;



    END LOOP;

    CLOSE c_data_cursor;



    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_event_data_array);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));

    -- Converting json string to table of values

    apex_json.parse(j,

                    l_response.get('data').to_string());

    apex_json.write('data', j);

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

    DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END XX_OTM_get_destuffing_containers;




-- PROCEDURE: XX_OTM_GET_DESTUFFING_CONTAINER_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_DESTUFFING_CONTAINER_DETAILS (

    p_container_no VARCHAR2

)

AS  

    TYPE record_type IS RECORD (

        container_nbr     VARCHAR2(50),

        cust_name         VARCHAR2(100),

        item_code         VARCHAR2(20),

        cargo_description VARCHAR2(50),

        qty               NUMBER,

        qty_uom           VARCHAR2(10)

    );

    l_record           record_type;

    l_response         json_object_t;

    l_data_obj         json_object_t;

    l_items_array      json_array_t;

    l_item_obj         json_object_t;

    l_found            BOOLEAN := FALSE;

    j                  apex_json.t_values;



    CURSOR c_data_cursor IS

        SELECT 

            container_nbr,

            cust_name,

            item_code,

            cargo_description,

            qty,

            qty_uom

        FROM 

            xxotm_customer_inventory_t

        WHERE 

            container_nbr = p_container_no

        ORDER BY 

            container_nbr, item_code;



BEGIN

    l_response := json_object_t();

    l_data_obj := json_object_t();

    l_items_array := json_array_t();



    OPEN c_data_cursor;

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%NOTFOUND;



        IF NOT l_found THEN

            l_found := TRUE;

            l_data_obj.put('container_number', l_record.container_nbr);

            l_data_obj.put('customer', l_record.cust_name);

        END IF;



        l_item_obj := json_object_t();

        l_item_obj.put('item_code', l_record.item_code);

        l_item_obj.put('description', l_record.cargo_description);

        l_item_obj.put('actual_quantity', l_record.qty);

        l_item_obj.put('quantity_uom', l_record.qty_uom);



        l_items_array.append(l_item_obj);

    END LOOP;



    CLOSE c_data_cursor;



    apex_json.initialize_clob_output;

    apex_json.open_object;



    IF l_found THEN

        l_data_obj.put('items', l_items_array);



        apex_json.write('response_code', 200);

        apex_json.write('response_message', 'Success');

        apex_json.parse(j, l_data_obj.to_string());

        apex_json.write('data', j);

    ELSE

        apex_json.write('response_code', 404);

        apex_json.write('response_message', 'No Data Found');

    END IF;



    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

    dbms_output.put_line(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        apex_json.free_output;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || SQLERRM);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_get_destuffing_container_details;




-- PROCEDURE: XX_OTM_GET_DRIVER_LOCATION



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_DRIVER_LOCATION (

    P_DRIVER_ID IN NUMBER

) AS

    V_CURRENT_LOC VARCHAR2(200);

BEGIN

    -- Get current location from driver info

    BEGIN

        SELECT

            CURRENT_LOC INTO V_CURRENT_LOC

        FROM

            XX_DRIVER_INFO

        WHERE

            DRIVER_ID = P_DRIVER_ID;

    EXCEPTION

        WHEN NO_DATA_FOUND THEN

            APEX_JSON.INITIALIZE_CLOB_OUTPUT;

            APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 404);

            APEX_JSON.WRITE('response_message', 'Driver location not found for driver ID: '

                                                || P_DRIVER_ID);

            APEX_JSON.CLOSE_OBJECT;

            HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

            RETURN;

    END;



    -- Return success response with location

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

    APEX_JSON.WRITE('response_code', 200);

    APEX_JSON.WRITE('response_message', 'Driver location retrieved successfully');

    APEX_JSON.WRITE('driver_id', P_DRIVER_ID);



    -- Location information

    APEX_JSON.WRITE('current_location', V_CURRENT_LOC);

    APEX_JSON.CLOSE_OBJECT;

    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN OTHERS THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                            || SQLERRM);

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END XX_OTM_GET_DRIVER_LOCATION;




-- PROCEDURE: XX_OTM_GET_INSPECTION_TRUCKS_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_INSPECTION_TRUCKS_APEX AS

    TYPE record_type IS RECORD (

        truck_nbr    VARCHAR2(100),

        driver_name  VARCHAR2(100),

        driver_iqama VARCHAR2(100),

        type         VARCHAR2(100),

        entry_time   VARCHAR2(100)

    );



    l_record record_type;



    CURSOR c_data_cursor IS

    SELECT DISTINCT

        truck_nbr,

        driver_name,

        driver_iqama,

        type,

         entry_time

    FROM xxotm_vehicle_master_t

    WHERE exit_time IS NULL

      AND status='marked_for_inspection';



BEGIN

    apex_json.initialize_clob_output;

    apex_json.open_object;



    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'Success');

    apex_json.open_array('data');



    OPEN c_data_cursor;

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%NOTFOUND;



        apex_json.open_object;

        apex_json.write('truck_number', l_record.truck_nbr);

        apex_json.write('driver_name', l_record.driver_name);

        apex_json.write('iqama_number', l_record.driver_iqama);

        apex_json.write('type', l_record.type);

        apex_json.write('entry_time', l_record.entry_time);

        apex_json.close_object;

    END LOOP;

    CLOSE c_data_cursor;



    apex_json.close_array;

    apex_json.close_object;



    -- Use apex_util.prn for CLOB support

    htp.prn(apex_json.get_clob_output);



     DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

    apex_json.free_output;



EXCEPTION

    WHEN OTHERS THEN

        apex_json.free_output;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || SQLERRM);

        apex_json.close_object;

        apex_util.prn(apex_json.get_clob_output);

        apex_json.free_output;

END XX_OTM_GET_INSPECTION_TRUCKS_APEX;




-- PROCEDURE: XX_OTM_GET_PLUG_IN_OUT_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_PLUG_IN_OUT_CONTAINERS (

    searchText IN VARCHAR2 DEFAULT NULL

) AS

    CURSOR c_containers IS

        SELECT container_nbr

          FROM xxotm_container_inventory_t

         WHERE position IS NOT NULL

           AND container_nbr LIKE '%' || searchText || '%';



    l_count NUMBER := 0;

BEGIN

    -- First count matching rows

    SELECT COUNT(*) INTO l_count

      FROM xxotm_container_inventory_t

     WHERE position IS NOT NULL

       AND container_nbr LIKE '%' || searchText || '%';



    apex_json.initialize_clob_output;

    apex_json.open_object;



    IF l_count = 0 THEN

        -- No data found

        apex_json.write('response_message', 'No data found');

        apex_json.write('response_code', 404);

--        apex_json.open_array('data');

--        apex_json.close_array;

        apex_json.close_object;



        htp.prn(apex_json.get_clob_output);

        DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

        RETURN;

    END IF;



    -- If data exists → Success response

    apex_json.write('response_message', 'Success');

    apex_json.write('response_code', 200);

    apex_json.open_array('data');



    FOR r_container IN c_containers LOOP

        apex_json.write(r_container.container_nbr);

    END LOOP;



    apex_json.close_array;

    apex_json.close_object;



    htp.prn(apex_json.get_clob_output);

DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.write('response_code', 500);

--        apex_json.open_array('data');

--        apex_json.close_array;

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

END xx_otm_get_plug_in_out_containers;




-- PROCEDURE: XX_OTM_GET_PLUG_IN_OUT_CONTAINER_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_PLUG_IN_OUT_CONTAINER_DETAILS (

    p_contianer_nbr IN VARCHAR2

) AS

    l_container_found NUMBER := 0;



    CURSOR c_history IS

        SELECT type,

               set_point_temp,

               current_temp,

               remarks,

               timestamp

          FROM xxotm_pluginout_t

         WHERE container_nbr = p_contianer_nbr;

BEGIN



    BEGIN

        SELECT COUNT(*)

          INTO l_container_found

          FROM xxotm_pluginout_t

         WHERE container_nbr = p_contianer_nbr;

    EXCEPTION

        WHEN OTHERS THEN

            l_container_found := 0;

    END;



    -- If container not found → return 404

    IF l_container_found = 0 THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'No data found');

        apex_json.write('response_code', 404);

--        apex_json.open_object('data');

--        apex_json.close_object;  -- empty data {}

        apex_json.close_object;



        htp.prn(apex_json.get_clob_output);

         DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

        RETURN;

    END IF;





    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_message', 'Success');

    apex_json.write('response_code', 200);



    apex_json.open_object('data');

    apex_json.write('container_nbr', p_contianer_nbr);

    apex_json.open_array('history');



    FOR r_history IN c_history LOOP

        apex_json.open_object;

        apex_json.write('type', r_history.type);

        apex_json.write('setPointTemp', r_history.set_point_temp);

        apex_json.write('currentTemp', r_history.current_temp);

        apex_json.write('remarks', r_history.remarks);

        apex_json.write('timestamp', r_history.timestamp);

        apex_json.close_object;

    END LOOP;



    apex_json.close_array;  -- history

    apex_json.close_object; -- data

    apex_json.close_object; -- main



    htp.prn(apex_json.get_clob_output);

     DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.write('response_code', 500);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

         DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);

END xx_otm_get_plug_in_out_container_details;




-- PROCEDURE: XX_OTM_GET_POSITION_TRUCKS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_POSITION_TRUCKS (

   search_text in varchar2

) as

   l_credentials    varchar2(50);

   l_username       varchar2(50);

   l_password       varchar2(50);

   l_encoded_cred   varchar2(200);

   l_url            varchar2(4000);

   l_shipment_xid   varchar2(50);

   l_response_clob  clob;

   l_count          number;

   l_gate_out_count number;

   l_ship_num_ref   varchar2(50);

   l_               varchar2(50);

   cursor c_trucks is

   select truck_nbr

     from xxotm_vehicle_master_t

    where entry_time is not null

      and exit_time is null

      and status like '%GATE IN%'

      and ( search_text is null

       or truck_nbr like '%'

                         || search_text

                         || '%' );



begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );

   apex_json.open_array('data');

   for r_truck in c_trucks loop

      begin

         select shipment_xid

           into l_shipment_xid

           from xxotm_shipments_t st

          where ( r_truck.truck_nbr = st.power_unit

             or r_truck.truck_nbr = st.truck_3pl )

            and ( st.shipment_name like '%INBOUND_CONTAINER% '

             or st.shipment_name like '%STORE_AS_IT_IS%' )

            and rownum = 1;

      exception

         when no_data_found then

            l_shipment_xid := null;

      end;



      if l_shipment_xid is not null then

         -- Check Reference Number

        --  l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

        --           || l_shipment_xid

        --           || '/refnums?q=shipmentRefnumQualGid eq NAQLEEN.CFS_SERVICE_TYPE';

        --  l_credentials := 'NAQLEEN.INTEGRATION:NaqleenInt@123';

        --  l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));



        --  apex_web_service.g_request_headers.delete;

        --  apex_web_service.g_request_headers(1).name := 'Content-Type';

        --  apex_web_service.g_request_headers(1).value := 'application/json';

        --  apex_web_service.g_request_headers(2).name := 'Authorization';

        --  apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;

        --  begin

        --     l_response_clob := apex_web_service.make_rest_request(

        --        p_url         => l_url,

        --        p_http_method => 'GET',

        --        p_wallet_path => 'file:/u01/app/oracle/product/wallet'

        --     );

        --     apex_json.parse(l_response_clob);

        --     l_ship_num_ref := apex_json.get_varchar2('items[1].shipmentRefnumValue');

        --  exception

        --     when others then

        --        l_ship_num_ref := null;

        --  end;



        --  if ( l_ship_num_ref = 'STORE_AS_IT_IS' ) then



            -- Check GATE OUT

         l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

                  || l_shipment_xid

                  || '/trackingEvents?q=statusCodeGid eq NAQLEEN.GATE OUT';

         apex_web_service.g_request_headers(1).name := 'Content-Type';

         apex_web_service.g_request_headers(1).value := 'application/json';

         apex_web_service.g_request_headers(2).name := 'Authorization';

         apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;

         begin

            l_response_clob := apex_web_service.make_rest_request(

               p_url         => l_url,

               p_http_method => 'GET',

               p_wallet_path => 'file:/u01/app/oracle/product/wallet'

            );

            apex_json.parse(l_response_clob);

            l_gate_out_count := apex_json.get_number('count');

         exception

            when others then

               l_gate_out_count := 0;

         end;



         if l_gate_out_count = 0 then

                -- Check GATE IN

            l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

                     || l_shipment_xid

                     || '/trackingEvents?q=statusCodeGid eq NAQLEEN.GATE IN';



              -- Headers persist

            begin

               l_response_clob := apex_web_service.make_rest_request(

                  p_url         => l_url,

                  p_http_method => 'GET',

                  p_wallet_path => 'file:/u01/app/oracle/product/wallet'

               );

               apex_json.parse(l_response_clob);

               l_count := apex_json.get_number('count');

            exception

               when others then

                  l_count := 0;

            end;



            if ( l_count = 1 ) then

               apex_json.write(r_truck.truck_nbr);

            end if;

         end if;

        --  end if;

      end if;



   end loop;

   apex_json.close_array;

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_get_position_trucks;




-- PROCEDURE: XX_OTM_GET_RESTACKING_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_RESTACKING_CONTAINERS (

    p_search_text IN VARCHAR2

) AS

    TYPE record_type IS RECORD (

        container_nbr    VARCHAR2(50),

        current_position VARCHAR2(20)

    );

    l_record           record_type;

    l_event_data       json_object_t;

    l_event_data_array json_array_t;

    l_response         json_object_t;

    j                  apex_json.t_values;



    CURSOR c_data_cursor (

        p_search_text VARCHAR2

    ) IS

    SELECT 

        ci.container_nbr,

        NVL(rl.restack_position, ci.position) AS current_position

    FROM 

        xxotm_container_inventory_t ci

    LEFT JOIN (

        SELECT 

            container_nbr,

            restack_position,

            timestamp,

            ROW_NUMBER() OVER (PARTITION BY container_nbr ORDER BY timestamp DESC) AS rn

        FROM 

            xxotm_restack_lolo_t

    ) rl ON ci.container_nbr = rl.container_nbr AND rl.rn = 1

    WHERE 

        ci.position IS NOT NULL

        AND (p_search_text IS NULL 

             OR UPPER(ci.container_nbr) LIKE '%' || UPPER(p_search_text) || '%'

             OR UPPER(NVL(rl.restack_position, ci.position)) LIKE '%' || UPPER(p_search_text) || '%')

    ORDER BY ci.container_nbr;



BEGIN

    l_response := json_object_t();

    l_event_data_array := json_array_t();



    OPEN c_data_cursor(p_search_text);

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%notfound;



        l_event_data := json_object_t();

        l_event_data.put('container_nbr', l_record.container_nbr);

        l_event_data.put('current_position', l_record.current_position);

        l_event_data_array.append(l_event_data);

    END LOOP;

    CLOSE c_data_cursor;



    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_event_data_array);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));

    -- Converting json string to table of values

    apex_json.parse(j,

                    l_response.get('data').to_string());

    apex_json.write('data', j);

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_get_restacking_containers;




-- PROCEDURE: XX_OTM_GET_ROLE_INFO



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_ROLE_INFO (

P_ROLE IN VARCHAR2

) AS

V_SCREEN_COUNT NUMBER := 0;

BEGIN

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('response_message', 'Role info retrieved successfully');



        -- Role information with screens included

        APEX_JSON.OPEN_OBJECT('role_info');

APEX_JSON.WRITE('role', P_ROLE);

APEX_JSON.WRITE('name', INITCAP(REPLACE(P_ROLE, '_', ' ')));



            -- Screens array within role_info

            APEX_JSON.OPEN_ARRAY('screens');

FOR REC IN (

    SELECT

        SCREEN_NAME,

        SCREEN_PATH,

        IS_ACTIVE

    FROM

        XX_ROLE_CONFIG

    WHERE

        ROLE = UPPER(TRIM(P_ROLE))

    ORDER BY

        SCREEN_NAME

        ) LOOP

    V_SCREEN_COUNT := V_SCREEN_COUNT + 1;

                APEX_JSON.OPEN_OBJECT;

    APEX_JSON.WRITE('screen_name', REC.SCREEN_NAME);

    APEX_JSON.WRITE('screen_path', REC.SCREEN_PATH);

    APEX_JSON.WRITE('is_active',

        CASE

            WHEN REC.IS_ACTIVE = 'Y' THEN

                TRUE

            ELSE

                FALSE

        END);

                APEX_JSON.CLOSE_OBJECT;

            END LOOP;



            APEX_JSON.CLOSE_ARRAY;

        APEX_JSON.CLOSE_OBJECT;

    APEX_JSON.CLOSE_OBJECT;

    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN NO_DATA_FOUND THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 404);

        APEX_JSON.WRITE('response_message', 'Role not found: '

                                    || P_ROLE);

        APEX_JSON.WRITE('role', P_ROLE);

            APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

    WHEN OTHERS THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                    || SQLERRM);

            APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END xx_otm_GET_ROLE_INFO;




-- PROCEDURE: XX_OTM_GET_SHIPMENT_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_SHIPMENT_DETAILS (

   p_shipment_nbr  in varchar2,

   p_customer_name in varchar2

) as

   l_shipment_type    varchar2(50);

   l_shipment_name    varchar2(100);

   l_shipment_nbr     varchar2(50);

   l_container_nbr    varchar2(50);

   l_container_type   varchar2(50);

   l_truck_nbr        varchar2(50);

   l_driver_name      varchar2(100);

   l_driver_iqama_nbr varchar2(50);

   l_otm_order_nbr    varchar2(50);

   l_power_unit       varchar2(50);

   l_truck_3pl        varchar2(50);

begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );

   apex_json.open_object('data');

   begin

        -- Fetch Shipment and Order Details

      select st.shipment_name,

             st.shipment_xid,

             st.cont_no,

             st.container_type, -- Assuming column exists

             st.power_unit,

             st.truck_3pl,

             om.order_movement_xid

        into

         l_shipment_name,

         l_shipment_nbr,

         l_container_nbr,

         l_container_type,

         l_power_unit,

         l_truck_3pl,

         l_otm_order_nbr

        from xxotm_shipments_t st

        left join xxotm_order_movements_t om

      on st.shipment_xid = om.shipment_xid

       where st.shipment_xid = p_shipment_nbr

         and st.customer_name = p_customer_name

         and rownum = 1;



        -- Determine Truck Number (Power Unit or 3PL)

      l_truck_nbr := nvl(

         l_power_unit,

         l_truck_3pl

      );



        -- Fetch Driver Details if Truck Number exists

      if l_truck_nbr is not null then

         begin

            select xvmt.driver_name,

                   xvmt.driver_iqama

              into

               l_driver_name,

               l_driver_iqama_nbr

              from xxotm_vehicle_master_t xvmt

             where xvmt.truck_nbr = l_truck_nbr

               and rownum = 1;

         exception

            when no_data_found then

               l_driver_name := null;

               l_driver_iqama_nbr := null;

         end;

      end if;



   exception

      when no_data_found then

            -- Handle case where shipment/customer combo is not found

         l_shipment_type := null;

         l_shipment_name := null;

         l_shipment_nbr := null;

         l_container_nbr := null;

         l_container_type := null;

         l_truck_nbr := null;

         l_driver_name := null;

         l_driver_iqama_nbr := null;

         l_otm_order_nbr := null;

   end;



    -- Write JSON Output



   apex_json.write(

      'shipment_type',

      l_shipment_type

   );

   apex_json.write(

      'shipment_name',

      l_shipment_name

   );

   apex_json.write(

      'shipment_nbr',

      l_shipment_nbr

   );

   apex_json.write(

      'container_nbr',

      l_container_nbr

   );

   apex_json.write(

      'container_type',

      l_container_type

   );

   apex_json.write(

      'truck_nbr',

      l_truck_nbr

   );

   apex_json.write(

      'driver_name',

      l_driver_name

   );

   apex_json.write(

      'driver_iqama_nbr',

      l_driver_iqama_nbr

   );

   apex_json.write(

      'otm_order_nbr',

      l_otm_order_nbr

   );

   apex_json.close_object; -- Close data object

   apex_json.close_object; -- Close main object



   htp.prn(apex_json.get_clob_output);

exception

   when others then

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_get_shipment_details;




-- PROCEDURE: XX_OTM_GET_STUFFING_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_STUFFING_CONTAINERS (

p_search_text IN VARCHAR2)

AS



    CURSOR c_containers IS

         SELECT  cont_no AS container_nbr,

                        shipment_xid

          FROM xxotm_shipments_t

         WHERE shipment_name IN ('DESTUFFING', 'STUFFING', 'STORE_AS_IT_IS','CRO')

         AND CONT_NO like '%' || p_search_text || '%';



    l_api_url        VARCHAR2(500);

    l_track_response CLOB;

    l_has_gate_in    BOOLEAN;

    l_status_code    VARCHAR2(200);

    l_found_any      BOOLEAN := FALSE;  



BEGIN



    FOR r_container IN c_containers LOOP





        l_api_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'

                     || 'NAQLEEN.' || r_container.shipment_xid || '/trackingEvents';



        l_has_gate_in := FALSE;





        l_track_response := apex_web_service.make_rest_request(

                                p_url         => l_api_url,

                                p_http_method => 'GET',

                                p_username    => 'NAQLEEN.INTEGRATION',

                                p_password    => 'NaqleenInt@123',

                                p_wallet_path => 'file:/u01/app/oracle/product/wallet'

                            );





        apex_json.parse(l_track_response);





        FOR i IN 1 .. apex_json.get_count('items') LOOP

            l_status_code := apex_json.get_varchar2('items[%d].statusCodeGid', i);



            IF UPPER(l_status_code) LIKE '%GATE IN%'

               OR UPPER(l_status_code) = 'NAQLEEN.GATE IN'

               OR UPPER(l_status_code) = 'GATE_IN' THEN

                l_has_gate_in := TRUE;

                EXIT; -- Stop looping once found

            END IF;

        END LOOP;





        IF l_has_gate_in THEN

            l_found_any := TRUE;

        END IF;



    END LOOP;





    apex_json.initialize_clob_output;

    apex_json.open_object;



    IF l_found_any THEN

        apex_json.write('response_code', 200);

        apex_json.write('response_message', 'Success');

        apex_json.open_array('data');





        FOR r_container IN c_containers LOOP

            l_api_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'

                         || 'NAQLEEN.' || r_container.shipment_xid || '/trackingEvents';



            l_track_response := apex_web_service.make_rest_request(

                                    p_url         => l_api_url,

                                    p_http_method => 'GET',

                                    p_username    => 'NAQLEEN.INTEGRATION',

                                    p_password    => 'NaqleenInt@123',

                                    p_wallet_path => 'file:/u01/app/oracle/product/wallet'

                                );



            l_has_gate_in := FALSE;

            apex_json.parse(l_track_response);



            FOR i IN 1 .. apex_json.get_count('items') LOOP

                l_status_code := apex_json.get_varchar2('items[%d].statusCodeGid', i);

                IF UPPER(l_status_code) LIKE '%GATE IN%'

                   OR UPPER(l_status_code) = 'NAQLEEN.GATE IN'

                   OR UPPER(l_status_code) = 'GATE_IN' THEN

                    l_has_gate_in := TRUE;

                    EXIT;

                END IF;

            END LOOP;



            IF l_has_gate_in THEN

                apex_json.write(r_container.container_nbr);

            END IF;

        END LOOP;



        apex_json.close_array;



    ELSE

        apex_json.write('response_code', 404);

        apex_json.write('response_message', 'No data found');

--        apex_json.open_array('data');

--        apex_json.close_array;

    END IF;



    apex_json.close_object;



    -- Output JSON

    htp.prn(apex_json.get_clob_output);

    dbms_output.put_line(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.write('response_code', 500);

        apex_json.open_array('data');

        apex_json.close_array;

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        dbms_output.put_line(apex_json.get_clob_output);



END xx_otm_get_stuffing_containers;




-- PROCEDURE: XX_OTM_GET_TRACKING_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_TRACKING_CONTAINERS (

    p_search_text IN VARCHAR2

) AS

    TYPE record_type IS RECORD (

        container_nbr    VARCHAR2(50),

        current_position VARCHAR2(20)  

    );

    l_record           record_type;

    l_event_data       json_object_t;

    l_event_data_array json_array_t;

    l_response         json_object_t;

    j                  apex_json.t_values;



    CURSOR c_data_cursor (

        p_search_text VARCHAR2

    ) IS

    SELECT 

        ci.container_nbr,

        NVL(rl.restack_position, ci.position) AS current_position

    FROM 

        xxotm_container_inventory_t ci,

        (SELECT 

            container_nbr,

            restack_position,

            timestamp,

            ROW_NUMBER() OVER (PARTITION BY container_nbr ORDER BY timestamp DESC) AS rn

        FROM 

            xxotm_restack_lolo_t) rl

    WHERE 

        ci.container_nbr = rl.container_nbr(+)

        AND rl.rn(+) = 1

        AND ci.position IS NOT NULL

        AND  

              UPPER(ci.container_nbr) LIKE UPPER(p_search_text) 

    ORDER BY ci.container_nbr;



BEGIN

    l_response := json_object_t();

    l_event_data_array := json_array_t();



    OPEN c_data_cursor(p_search_text);

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%notfound;



        l_event_data := json_object_t();

        l_event_data.put('container_nbr', l_record.container_nbr);

        l_event_data.put('current_position', l_record.current_position);

        l_event_data_array.append(l_event_data);

    END LOOP;

    CLOSE c_data_cursor;



    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_event_data_array);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));

    -- Converting json string to table of values

    apex_json.parse(j,

                    l_response.get('data').to_string());

    apex_json.write('data', j);

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_get_tracking_containers;




-- PROCEDURE: XX_OTM_GET_VALIDATE_CONTAINER_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_VALIDATE_CONTAINER_APEX (

    p_container_number IN VARCHAR2

) AS

    TYPE record_type IS RECORD (

        container_type VARCHAR2(100),

        cont_no        VARCHAR2(100),

        shipment_xid   VARCHAR2(100),

        customer_name  VARCHAR2(100)

    );



    l_record         record_type;

    l_data           json_object_t;

    v_found          BOOLEAN := FALSE;

    l_status_value   VARCHAR2(100) := NULL;

    l_count          NUMBER := 0;

    l_remarks        VARCHAR2(240) := NULL;

    l_http_status    VARCHAR2(240) := NULL;

    l_customername   VARCHAR2(240) := NULL;

    l_track_response CLOB := NULL;

    l_output         CLOB;



    CURSOR c_data_cursor (p_container_number VARCHAR2) IS

    SELECT DISTINCT

        container_type,

        cont_no,

        shipment_xid,

        customer_name

    FROM xxotm_shipments_t

    WHERE cont_no = p_container_number

      AND shipment_name = 'INBOUND_CONTAINER';



BEGIN

    l_data := json_object_t();



    OPEN c_data_cursor(p_container_number);

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%NOTFOUND;



        -- First API call - Get Trip Status

        BEGIN

            apex_web_service.g_request_headers.delete();

            l_track_response := apex_web_service.make_rest_request(

                p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

                         || l_record.shipment_xid

                         || '/statuses/NAQLEEN.TRIP_STATUS?expand=all',

                p_http_method => 'GET',

                p_username    => 'NAQLEEN.INTEGRATION',

                p_password    => 'NaqleenInt@123',

                p_wallet_path => 'file:/u01/app/oracle/product/wallet'

            );

        EXCEPTION

            WHEN OTHERS THEN

                l_remarks := SQLERRM;

                DBMS_OUTPUT.PUT_LINE('Error in first API call: ' || SQLERRM);

        END;



        l_http_status := apex_web_service.g_status_code;

        DBMS_OUTPUT.PUT_LINE('First API Status: ' || l_http_status);



        IF l_http_status IN ('200', '201') THEN

            apex_json.parse(l_track_response);

            l_status_value := apex_json.get_varchar2(p_path => 'statusValueGid');

            DBMS_OUTPUT.PUT_LINE('Status Value: ' || l_status_value);



            IF l_status_value IN ('NAQLEEN.TRIP_STARTED', 'NAQLEEN.TRIP_NOT_STARTED') THEN

                l_count := l_count + 1;

                DBMS_OUTPUT.PUT_LINE('Count: ' || l_count);



                -- Second API call - Get Customer Name

                IF l_count = 1 THEN

                    l_track_response := NULL;



                    BEGIN

                        l_track_response := apex_web_service.make_rest_request(

                            p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

                                     || l_record.shipment_xid

                                     || '/refnums?expand=all',

                            p_http_method => 'GET',

                            p_username    => 'NAQLEEN.INTEGRATION',

                            p_password    => 'NaqleenInt@123',

                            p_wallet_path => 'file:/u01/app/oracle/product/wallet'

                        );

                    EXCEPTION

                        WHEN OTHERS THEN

                            l_remarks := SQLERRM;

                            DBMS_OUTPUT.PUT_LINE('Error in second API call: ' || SQLERRM);

                    END;



                    l_http_status := apex_web_service.g_status_code;

                    DBMS_OUTPUT.PUT_LINE('Second API Status: ' || l_http_status);



                    IF l_http_status IN ('200', '201') THEN

                        apex_json.parse(l_track_response);



                        FOR i IN 1..apex_json.get_count('items') LOOP

                            IF apex_json.get_varchar2(

                                p_path => 'items[%d].shipmentRefnumQualGid',

                                p0     => i

                            ) = 'NAQLEEN.CUS_NAME' THEN

                                l_customername := apex_json.get_varchar2(

                                    p_path => 'items[%d].shipmentRefnumValue',

                                    p0     => i

                                );

                                v_found := TRUE;

                                EXIT; -- Exit loop after finding customer name

                            END IF;

                        END LOOP;



                        DBMS_OUTPUT.PUT_LINE('Customer Name: ' || l_customername);

                    END IF;

                END IF;

            END IF;

        END IF;



        -- Build data object if found

        IF v_found THEN

            l_data.put('container_type', l_record.container_type);

            l_data.put('liner', l_customername);

            EXIT; -- Exit after first successful match

        END IF;



    END LOOP;

    CLOSE c_data_cursor;



    -- Build final response

    apex_json.initialize_clob_output;

    apex_json.open_object;



    IF v_found THEN

        apex_json.write('response_code', 200);

        apex_json.write('response_message', 'Success');

        apex_json.open_object('data');

        apex_json.write('container_type', l_data.get_string('container_type'));

        apex_json.write('liner', l_data.get_string('liner'));

        apex_json.close_object;

    ELSE

        apex_json.write('response_code', 404);

        apex_json.write('response_message', 'No Data Found');

    END IF;



    apex_json.close_object;



    l_output := apex_json.get_clob_output;

    DBMS_OUTPUT.PUT_LINE('Final Output: ' || l_output);

    htp.prn(l_output);

    apex_json.free_output;



EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || SQLERRM);

        apex_json.close_object;



        l_output := apex_json.get_clob_output;

        DBMS_OUTPUT.PUT_LINE('Error Output: ' || l_output);

        htp.prn(l_output);

        apex_json.free_output;

END xx_otm_get_validate_container_apex;




-- PROCEDURE: XX_OTM_GET_VEHICLE_EXIT_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_VEHICLE_EXIT_APEX (

    p_truck_number IN VARCHAR2

) AS



    TYPE record_type IS RECORD (

        driver_iqama VARCHAR2(100),

        driver_name  VARCHAR2(100)

    );

    l_record     record_type;

    l_response   json_object_t;

    l_data       json_object_t;

    j            apex_json.t_values;

    v_found      BOOLEAN := FALSE;



    CURSOR c_data_cursor (p_truck_number VARCHAR2) IS

    SELECT DISTINCT driver_iqama, driver_name

    FROM xxotm_vehicle_master_t

    WHERE truck_nbr = p_truck_number;



BEGIN

    l_response := json_object_t();

    l_data := json_object_t();



    OPEN c_data_cursor(p_truck_number);

    LOOP

        FETCH c_data_cursor INTO l_record;

        EXIT WHEN c_data_cursor%NOTFOUND;



        v_found := TRUE;

        -- Single object instead of array

        l_data.put('driver_iqama', l_record.driver_iqama);

        l_data.put('driver_name',  l_record.driver_name);

        EXIT; -- exit after first match

    END LOOP;

    CLOSE c_data_cursor;



    -- If no driver found

    IF NOT v_found THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 404);

        apex_json.write('response_message', 'No Data Found');

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        RETURN;

    END IF;



    l_response.put('response_code', 200);

    l_response.put('response_message', 'Success');

    l_response.put('data', l_data);



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'Success');



    -- Convert object to JSON

    apex_json.parse(j, l_response.get('data').to_string());

    apex_json.write('data', j);



    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);



END XX_OTM_GET_VEHICLE_EXIT_APEX;




-- PROCEDURE: XX_OTM_GET_VEHICLE_INQUIRY_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_VEHICLE_INQUIRY_APEX (

    p_truck_number IN VARCHAR2

) AS



    TYPE record_type IS RECORD (

            truck_nbr        VARCHAR2(100),

            type             VARCHAR2(100),

            driver_name      VARCHAR2(100),

            driver_iqama     VARCHAR2(100),

            entry_time       VARCHAR2(100),

            exit_time        VARCHAR2(100)

    );

    l_record           record_type;

    l_data             json_object_t;

    l_response         json_object_t;

    l_found            BOOLEAN := FALSE;

    j                  apex_json.t_values;

    

    CURSOR c_data_cursor (

        p_truck_number VARCHAR2

    ) IS

    SELECT DISTINCT

        truck_nbr,

        type,

        driver_name,

        driver_iqama,

        entry_time,

        exit_time

    FROM

        xxotm_vehicle_master_t

    WHERE

        truck_nbr = p_truck_number;



BEGIN

    l_response := json_object_t();

    l_data := json_object_t();

    

    OPEN c_data_cursor(p_truck_number);

    FETCH c_data_cursor INTO l_record;

    

    IF c_data_cursor%FOUND THEN

        l_found := TRUE;

        l_data.put('truck_nbr', l_record.truck_nbr);

        l_data.put('type', l_record.type);

        l_data.put('driver_name', l_record.driver_name);

        l_data.put('driver_iqama_nbr', l_record.driver_iqama);

        l_data.put('entry_time', l_record.entry_time);

        l_data.put('exit_time', l_record.exit_time);

    END IF;

    

    CLOSE c_data_cursor;



    apex_json.initialize_clob_output;

    apex_json.open_object;

    

    IF l_found THEN

        apex_json.write('response_code', 200);

        apex_json.write('response_message', 'Success');

        apex_json.parse(j, l_data.to_string());

        apex_json.write('data', j);

    ELSE

        apex_json.write('response_code', 404);

        apex_json.write('response_message', 'No Data Found');

    END IF;

    

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

    

EXCEPTION

    WHEN OTHERS THEN

        apex_json.free_output;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 400);

        apex_json.write('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END XX_OTM_GET_VEHICLE_INQUIRY_APEX;




-- PROCEDURE: XX_OTM_PACKING_LIST



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_PACKING_LIST (

   p_body in blob

) as

   l_clob           clob;

   l_count          number;



    -- Header Variables

   l_customer       varchar2(200);

   l_customer_nbr   varchar2(100);

   l_container_nbr  varchar2(100);

   l_shipment_nbr   varchar2(100);

   l_hs_code        varchar2(100);

   l_cargo_desc     varchar2(4000);



    -- Item Variables

   l_item_desc      varchar2(4000);

   l_quantity       number;

   l_quantity_uom   varchar2(50);

   l_gross_weight   number;

   l_net_weight     number;

   l_weight_uom     varchar2(50);

   l_volume         number;

   l_volume_uom     varchar2(50);

   l_un_class       varchar2(50);

   l_country_origin varchar2(100);

begin

    -- Convert BLOB to CLOB

   l_clob := to_clob(p_body);



    -- Parse JSON

   apex_json.parse(l_clob);



    -- Extract Header Data

   l_customer := apex_json.get_varchar2('customer_name');

   l_customer_nbr := apex_json.get_varchar2('customer_nbr');

   l_container_nbr := apex_json.get_varchar2('container_nbr');

   l_shipment_nbr := apex_json.get_varchar2('shipment_nbr');

   l_hs_code := apex_json.get_varchar2('HS_Code');

   l_cargo_desc := apex_json.get_varchar2('cargo_description');



    -- Process Items Array

   l_count := apex_json.get_count('items');

   for i in 1..l_count loop

        -- Extract Item Data

      l_item_desc := apex_json.get_varchar2(

         'items[%d].item_description',

         i

      );

      l_quantity := apex_json.get_number(

         'items[%d].quantity',

         i

      );

      l_quantity_uom := apex_json.get_varchar2(

         'items[%d].quantity_uom',

         i

      );

      l_gross_weight := apex_json.get_number(

         'items[%d].gross_weight',

         i

      );

      l_net_weight := apex_json.get_number(

         'items[%d].net_weight',

         i

      );

      l_weight_uom := apex_json.get_varchar2(

         'items[%d].weight_uom',

         i

      );

      l_volume := apex_json.get_number(

         'items[%d].volume',

         i

      );

      l_volume_uom := apex_json.get_varchar2(

         'items[%d].volume_uom',

         i

      );

      l_un_class := apex_json.get_varchar2(

         'items[%d].UN_Class',

         i

      );

      l_country_origin := apex_json.get_varchar2(

         'items[%d].country_of_origin',

         i

      );



        -- Insert into Inventory Table

      insert into xxotm_customer_inventory_t (

         cust_name,

         cust_nbr,

         container_nbr,

         shipment_nbr,

         hs_code,

         cargo_description,

         item_description,

         qty,

         qty_uom,

         gross_weight,

         net_weight,

         weight_uom,

         volume,

         volume_uom,

         un_class,

         country_of_origin,

         creation_date,

         created_by

      ) values ( l_customer,

      l_customer_nbr,

                 l_container_nbr,

                 l_shipment_nbr,

                 l_hs_code,

                 l_cargo_desc,

                 l_item_desc,

                 l_quantity,

                 l_quantity_uom,

                 l_gross_weight,

                 l_net_weight,

                 l_weight_uom,

                 l_volume,

                 l_volume_uom,

                 l_un_class,

                 l_country_origin,

                 sysdate,

                 user );

   end loop;



    -- Output Success Response

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);



    -- Clean up

   if dbms_lob.isopen(l_clob) = 1 then

      dbms_lob.freetemporary(l_clob);

   end if;



exception

   when others then

      if dbms_lob.isopen(l_clob) = 1 then

         dbms_lob.freetemporary(l_clob);

      end if;



      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_packing_list;




-- PROCEDURE: XX_OTM_POSITIONTRUCK_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POSITIONTRUCK_DETAILS (

   TRUCK_NBR in varchar2

   

) AS

   l_credentials Varchar2(50);

   l_username varchar2(50);

   l_password varchar2(50);

   l_encoded_cred varchar2(50);

   l_url varchar2(200);

    l_shipment_xid varchar2(50);

    l_container_nbr varchar2(50);

    l_position varchar2(50);

    l_con_type varchar2(50);

    l_shipment_name varchar2(50);

    l_truck_nbr varchar2(50);

    l_driver_name varchar2(50);

    l_driver_iqama varchar2(50);

    l_terminal varchar2(50);   



begin

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      'Success'

   );

   apex_json.write(

      'response_code',

      200

   );





   apex_json.open_OBJECT('data');





  SELECT shipment_xid ,CONT_NO, CONTAINER_TYPE , shipment_name,(SELECT truck_nbr FROM XXOTM_VEHICLE_MASTER_T xvmt),(SELECT driver_name FROM XXOTM_VEHICLE_MASTER_T xvmt),(SELECT driver_iqama FROM XXOTM_VEHICLE_MASTER_T xvmt)   

INTO l_shipment_xid,l_container_nbr ,l_con_type,l_shipment_name,l_truck_nbr,l_driver_name,l_driver_iqama from xxotm_shipments_t st  WHERE (TRUCK_NBR = st.power_unit OR TRUCK_NBR = st.truck_3pl);



apex_json.open_array('terminals');

FOR i IN

   ( SELECT DISTINCT TERMINAL  INTO  l_terminal from POSITION_MASTER where  is_occupied = 'N'

              AND lower(container_type) = lower(l_con_type) )LOOP

	    apex_json.write(i);

   END LOOP;

	apex_json.close_array;

    apex_json.write('shipment_nbr', l_shipment_xid);

    apex_json.write('container_nbr', l_container_nbr);

    apex_json.write('container_type', l_con_type);

    apex_json.write('shipment_name', l_shipment_name);

    apex_json.write('truck_nbr', l_truck_nbr);

    apex_json.write('driver_nbr', l_driver_name);

    apex_json.write('driver_iqama', l_driver_iqama);

    apex_json.write('terminal', l_terminal);

    apex_json.close_object;





   htp.prn(apex_json.get_clob_output);

exception

   when others then

        -- Handle unexpected errors

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);



end XX_OTM_GET_POSITION_TRUCKS;






-- PROCEDURE: XX_OTM_POSITION_TRUCK_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POSITION_TRUCK_DETAILS (

   p_truck_nbr in varchar2

) as

   l_shipment_xid   varchar2(50);

   l_container_nbr  varchar2(50);

   l_con_type       varchar2(50);

   l_shipment_name  varchar2(50);

   l_truck_nbr      varchar2(50);

   l_driver_name    varchar2(50);

   l_driver_iqama   varchar2(50);

   l_terminal       varchar2(50);

   l_data_found     boolean := false;



    -- API Variables

   l_url            varchar2(4000);

   l_response_clob  clob;

   l_gate_in_count  number;

   l_gate_out_count number;

   cursor c_shipments is

   select st.shipment_xid,

          st.cont_no,

          st.container_type,

          st.shipment_name

     from xxotm_shipments_t st

    where ( st.power_unit = p_truck_nbr

       or st.truck_3pl = p_truck_nbr )

      and ( st.shipment_name like '%INBOUND_CONTAINER%'

       or st.shipment_name like '%STORE_AS_IT_IS%' );



begin

   apex_json.initialize_clob_output;

   apex_json.open_object;



    -- Get Truck/Driver Details (Once, as they are common for the truck)

   begin

      select xvmt.truck_nbr,

             xvmt.driver_name,

             xvmt.driver_iqama

        into

         l_truck_nbr,

         l_driver_name,

         l_driver_iqama

        from xxotm_vehicle_master_t xvmt

       where xvmt.truck_nbr = p_truck_nbr

         and entry_time is not null

         and exit_time is null

         and status like '%GATE IN%'

         and rownum = 1;

   exception

      when no_data_found then

         l_truck_nbr := p_truck_nbr;

         l_driver_name := null;

         l_driver_iqama := null;

   end;



    -- Iterate Shipments to find one with GATE IN and no GATE OUT

   for r in c_shipments loop

        -- 1. Check for GATE OUT (If exists, skip)

      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

               || r.shipment_xid

               || '/trackingEvents?q=statusCodeGid co GATE OUT';

      apex_web_service.g_request_headers.delete;

      apex_web_service.g_request_headers(1).name := 'Content-Type';

      apex_web_service.g_request_headers(1).value := 'application/json';

      begin

         l_response_clob := apex_web_service.make_rest_request(

            p_url         => l_url,

            p_http_method => 'GET',

            p_username    => 'NAQLEEN.INTEGRATION',

            p_password    => 'NaqleenInt@123',

            p_wallet_path => 'file:/u01/app/oracle/product/wallet'

         );

         apex_json.parse(l_response_clob);

         l_gate_out_count := apex_json.get_number('count');

      exception

         when others then

            l_gate_out_count := 0;

      end;



      if l_gate_out_count = 0 then

            -- 2. Check for GATE IN (If exists, Match!)

         l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'

                  || r.shipment_xid

                  || '/trackingEvents?q=statusCodeGid co GATE IN';

         begin

            l_response_clob := apex_web_service.make_rest_request(

               p_url         => l_url,

               p_http_method => 'GET',

               p_username    => 'NAQLEEN.INTEGRATION',

               p_password    => 'NaqleenInt@123',

               p_wallet_path => 'file:/u01/app/oracle/product/wallet'

            );

            apex_json.parse(l_response_clob);

            l_gate_in_count := apex_json.get_number('count');

         exception

            when others then

               l_gate_in_count := 0;

         end;



         if l_gate_in_count > 0 then

                -- FOUND IT!

            l_shipment_xid := r.shipment_xid;

            l_container_nbr := r.cont_no;

            l_con_type := r.container_type;

            l_shipment_name := r.shipment_name;

            l_data_found := true;

            exit; -- Break loop

         end if;

      end if;

   end loop;



   if l_data_found then

      apex_json.write(

         'response_message',

         'Success'

      );

      apex_json.write(

         'response_code',

         200

      );

      apex_json.open_object('data');



        -- Map Container Type

      if l_con_type like '2%' then

         l_con_type := '20FT';

      elsif l_con_type like '4%' then

         l_con_type := '40FT';

      end if;



      apex_json.open_array('terminals');

      for i in (

         select distinct terminal

           from position_master

          where is_occupied = 'N'

            and lower(container_type) = lower(l_con_type)

      ) loop

         apex_json.write(i.terminal);

      end loop;

      apex_json.close_array;

      apex_json.write(

         'shipment_nbr',

         l_shipment_xid

      );

      apex_json.write(

         'container_nbr',

         l_container_nbr

      );

      apex_json.write(

         'container_type',

         l_con_type

      );

      apex_json.write(

         'shipment_name',

         l_shipment_name

      );

      apex_json.write(

         'truck_nbr',

         l_truck_nbr

      );

      apex_json.write(

         'driver_nbr',

         l_driver_name

      );

      apex_json.write(

         'driver_iqama',

         l_driver_iqama

      );

      apex_json.write(

         'terminal',

         l_terminal

      );

      apex_json.close_object; -- Close data object

   else

      apex_json.write(

         'response_message',

         'No Data Found'

      );

      apex_json.write(

         'response_code',

         404

      );

      apex_json.open_object('data');

      apex_json.close_object;

   end if;



   apex_json.close_object; -- Close main object

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.open_array('data');

      apex_json.close_array;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_position_truck_details;




-- PROCEDURE: XX_OTM_POST_DESTUFFING_CONTAINER



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_DESTUFFING_CONTAINER (

   payload in blob

) is

   p_payload          clob;

   l_container_number varchar2(50);

   l_customer         varchar2(100);

   l_response         json_object_t;

   l_item_code        varchar2(20);

   l_description      varchar2(50);

   l_rcvd_quantity    number;

   l_rows_updated     number;

   l_status_code      varchar2(100);

   l_shipment_gid     varchar2(100);

   l_shipment_xid     varchar2(100);

   l_attribute1       varchar2(100);

   l_attribute2       varchar2(100);

   l_items_updated    number := 0;

   l_events_posted    number := 0;

begin

    -- Blob payload to Clob type conversion

   p_payload := to_clob(payload);

   apex_json.initialize_clob_output;

   apex_json.open_object;



    -- Parse the JSON payload

   apex_json.parse(p_payload);



    -- Extract values from the JSON payload

   l_container_number := apex_json.get_varchar2(p_path => 'container_number');

   l_customer := apex_json.get_varchar2(p_path => 'customer');



    -- Initialize the response object

   l_response := json_object_t();

   begin

        -- ============================================================

        -- OPERATION 1: Update received quantities for items

        -- ============================================================

      for i in 1..apex_json.get_count(p_path => 'items') loop

         l_item_code := apex_json.get_varchar2(

            p_path => 'items[%d].item_code',

            p0     => i

         );

         l_description := apex_json.get_varchar2(

            p_path => 'items[%d].description',

            p0     => i

         );

         l_rcvd_quantity := apex_json.get_number(

            p_path => 'items[%d].rcvd_quantity',

            p0     => i

         );



            -- Update received quantity in customer inventory table

         update xxotm_customer_inventory_t

            set

            qty = l_rcvd_quantity

          where container_nbr = l_container_number

            and item_code = l_item_code;



         l_rows_updated := sql%rowcount;

         if l_rows_updated = 0 then

            rollback;

            l_response.put(

               'response_code',

               404

            );

            l_response.put(

               'response_message',

               'Item not found: '

               || l_item_code

               || ' in container: '

               || l_container_number

            );

            apex_json.write(

               'response_code',

               l_response.get('response_code').to_number()

            );

            apex_json.write(

               'response_message',

               replace(

                  l_response.get('response_message').to_string(),

                  '',

                  ''

               )

            );

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

            return;

         else

            l_items_updated := l_items_updated + 1;

         end if;

      end loop;



        -- Commit item updates

      commit;



        -- ============================================================

        -- OPERATION 2: Post tracking events using existing procedure

        -- ============================================================

        -- Get the actual count of tracking events (array starts at index 1)

      declare

         l_event_count  number;

         l_api_success  boolean;

         l_response_out clob;

      begin

         l_event_count := apex_json.get_count(p_path => 'trackingEvents');

         for j in 1..l_event_count loop

            l_status_code := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].statusCodeGid',

               p0     => j

            );

            l_shipment_gid := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].shipmentGid',

               p0     => j

            );

            l_attribute1 := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].attribute1',

               p0     => j

            );

            l_attribute2 := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].attribute2',

               p0     => j

            );



                -- Extract shipment XID from shipmentGid (remove NAQLEEN. prefix)

            l_shipment_xid := replace(

               l_shipment_gid,

               'NAQLEEN.',

               ''

            );



                -- Call existing tracking events procedure

            l_api_success := false;

            begin

               post_otm_tracking_events(

                  p_integration_name => 'XX_OTM_POST_DESTUFFING_CONTAINER',

                  p_statuscodegid    => l_status_code,

                  p_shipmentxid      => l_shipment_xid,

                  p_attribute1       => nvl(

                     l_attribute1,

                     ''

                  ),

                  p_attribute2       => nvl(

                     l_attribute2,

                     ''

                  ),

                  p_attribute3       => '',

                  p_attribute4       => '',

                  p_attribute5       => '',

                  p_attribute6       => '',

                  p_attribute7       => '',

                  p_attribute8       => '',

                  p_attribute9       => '',

                  p_attribute10      => '',

                  x_response     => l_response_out

               );



                    -- If no exception, mark as success

               l_api_success := true;

               l_events_posted := l_events_posted + 1;

            exception

               when others then

                        -- Log error but continue with other events

                  dbms_output.put_line('Error posting tracking event '

                                       || j

                                       || ': '

                                       || sqlerrm);

                  l_api_success := false;

            end;



                -- Optional: Log each event status

            dbms_output.put_line('Event '

                                 || j

                                 || ' - Status: '

                                 || l_status_code

                                 || ' - Success: '

                                 || case

               when l_api_success then

                  'YES'

               else 'NO'

            end);



         end loop;

      end;



        -- Build success response

      l_response.put(

         'response_code',

         200

      );

      l_response.put(

         'response_message',

         'Success'

      );

      l_response.put(

         'items_updated',

         l_items_updated

      );

      l_response.put(

         'events_posted',

         l_events_posted

      );

   exception

      when others then

         rollback;

         l_response.put(

            'response_code',

            400

         );

         l_response.put(

            'response_message',

            sqlerrm

         );

   end;



    -- Output the JSON response

   apex_json.write(

      'response_code',

      l_response.get('response_code').to_number()

   );

   apex_json.write(

      'response_message',

      replace(

         l_response.get('response_message').to_string(),

         '',

         ''

      )

   );



   if l_response.has('items_updated') then

      apex_json.write(

         'items_updated',

         l_response.get('items_updated').to_number()

      );

   end if;



   if l_response.has('events_posted') then

      apex_json.write(

         'events_posted',

         l_response.get('events_posted').to_number()

      );

   end if;



   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

exception

   when others then

      rollback;

        -- Handle any other errors

      l_response := json_object_t();

      l_response.put(

         'response_code',

         400

      );

      l_response.put(

         'response_message',

         sqlerrm

      );



        -- Output the error JSON response

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_code',

         l_response.get('response_code').to_number()

      );

      apex_json.write(

         'response_message',

         replace(

            l_response.get('response_message').to_string(),

            '',

            ''

         )

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_post_destuffing_container;




-- PROCEDURE: XX_OTM_POST_DESTUFFING_CONTAINERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_DESTUFFING_CONTAINERS (

   payload in blob

) is

   p_payload          clob;

   l_container_number varchar2(50);

   l_customer         varchar2(100);

   l_response         json_object_t;

   l_item_code        varchar2(20);

   l_description      varchar2(50);

   l_rcvd_quantity    number;

   l_rows_updated     number;

   l_status_code      varchar2(100);

   l_shipment_gid     varchar2(100);

   l_shipment_xid     varchar2(100);

   l_attribute1       varchar2(100);

   l_attribute2       varchar2(100);

   l_items_updated    number := 0;

   l_events_posted    number := 0;

begin

    -- Blob payload to Clob type conversion

   p_payload := to_clob(payload);

   apex_json.initialize_clob_output;

   apex_json.open_object;



    -- Parse the JSON payload

   apex_json.parse(p_payload);



    -- Extract values from the JSON payload

   l_container_number := apex_json.get_varchar2(p_path => 'container_number');

   l_customer := apex_json.get_varchar2(p_path => 'customer');



    -- Initialize the response object

   l_response := json_object_t();

   begin

        -- ============================================================

        -- OPERATION 1: Update received quantities for items

        -- ============================================================

      for i in 1..apex_json.get_count(p_path => 'items') loop

         l_item_code := apex_json.get_varchar2(

            p_path => 'items[%d].item_code',

            p0     => i

         );

         l_description := apex_json.get_varchar2(

            p_path => 'items[%d].description',

            p0     => i

         );

         l_rcvd_quantity := apex_json.get_number(

            p_path => 'items[%d].rcvd_quantity',

            p0     => i

         );



            -- Update received quantity in customer inventory table

         update xxotm_customer_inventory_t

            set

            qty = l_rcvd_quantity

          where container_nbr = l_container_number

            and item_code = l_item_code;



         l_rows_updated := sql%rowcount;

         if l_rows_updated = 0 then

            rollback;

            l_response.put(

               'response_code',

               404

            );

            l_response.put(

               'response_message',

               'Item not found: '

               || l_item_code

               || ' in container: '

               || l_container_number

            );

            apex_json.write(

               'response_code',

               l_response.get('response_code').to_number()

            );

            apex_json.write(

               'response_message',

               replace(

                  l_response.get('response_message').to_string(),

                  '',

                  ''

               )

            );

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

            return;

         else

            l_items_updated := l_items_updated + 1;

         end if;

      end loop;



        -- Commit item updates

      commit;



        -- ============================================================

        -- OPERATION 2: Post tracking events using existing procedure

        -- ============================================================

        -- Get the actual count of tracking events (array starts at index 1)

      declare

         l_event_count  number;

         l_api_success  boolean;

         l_response_out clob;

      begin

         l_event_count := apex_json.get_count(p_path => 'trackingEvents');

         for j in 1..l_event_count loop

            l_status_code := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].statusCodeGid',

               p0     => j

            );

            l_shipment_gid := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].shipmentGid',

               p0     => j

            );

            l_attribute1 := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].attribute1',

               p0     => j

            );

            l_attribute2 := apex_json.get_varchar2(

               p_path => 'trackingEvents[%d].attribute2',

               p0     => j

            );



                -- Extract shipment XID from shipmentGid (remove NAQLEEN. prefix)

            l_shipment_xid := replace(

               l_shipment_gid,

               'NAQLEEN.',

               ''

            );



                -- Call existing tracking events procedure

            l_api_success := false;

            begin

               post_otm_tracking_events(

                  p_integration_name => 'XX_OTM_POST_DESTUFFING_CONTAINER',

                  p_statuscodegid    => l_status_code,

                  p_shipmentxid      => l_shipment_xid,

                  p_attribute1       => nvl(

                     l_attribute1,

                     ''

                  ),

                  p_attribute2       => nvl(

                     l_attribute2,

                     ''

                  ),

                  p_attribute3       => '',

                  p_attribute4       => '',

                  p_attribute5       => '',

                  p_attribute6       => '',

                  p_attribute7       => '',

                  p_attribute8       => '',

                  p_attribute9       => '',

                  p_attribute10      => '',

                  x_response     => l_response_out

               );



                    -- If no exception, mark as success

               l_api_success := true;

               l_events_posted := l_events_posted + 1;

            exception

               when others then

                        -- Log error but continue with other events

                  dbms_output.put_line('Error posting tracking event '

                                       || j

                                       || ': '

                                       || sqlerrm);

                  l_api_success := false;

            end;



                -- Optional: Log each event status

            dbms_output.put_line('Event '

                                 || j

                                 || ' - Status: '

                                 || l_status_code

                                 || ' - Success: '

                                 || case

               when l_api_success then

                  'YES'

               else 'NO'

            end);



         end loop;

      end;



        -- Build success response

      l_response.put(

         'response_code',

         200

      );

      l_response.put(

         'response_message',

         'Success'

      );

      l_response.put(

         'items_updated',

         l_items_updated

      );

      l_response.put(

         'events_posted',

         l_events_posted

      );

   exception

      when others then

         rollback;

         l_response.put(

            'response_code',

            400

         );

         l_response.put(

            'response_message',

            sqlerrm

         );

   end;



    -- Output the JSON response

   apex_json.write(

      'response_code',

      l_response.get('response_code').to_number()

   );

   apex_json.write(

      'response_message',

      replace(

         l_response.get('response_message').to_string(),

         '',

         ''

      )

   );



   if l_response.has('items_updated') then

      apex_json.write(

         'items_updated',

         l_response.get('items_updated').to_number()

      );

   end if;



   if l_response.has('events_posted') then

      apex_json.write(

         'events_posted',

         l_response.get('events_posted').to_number()

      );

   end if;



   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

exception

   when others then

      rollback;

        -- Handle any other errors

      l_response := json_object_t();

      l_response.put(

         'response_code',

         400

      );

      l_response.put(

         'response_message',

         sqlerrm

      );



        -- Output the error JSON response

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_code',

         l_response.get('response_code').to_number()

      );

      apex_json.write(

         'response_message',

         replace(

            l_response.get('response_message').to_string(),

            '',

            ''

         )

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_post_destuffing_containers;




-- PROCEDURE: XX_OTM_POST_INSPECTION_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_INSPECTION_DETAILS (

    payload IN BLOB

) IS

    -- Converted payload as CLOB

    p_payload              CLOB;

    l_blob_len             INTEGER;

    l_pos                  INTEGER := 1;

    l_chunk_raw            RAW(32767);

    l_chunk_vc             VARCHAR2(32767);

    l_chunk_size CONSTANT PLS_INTEGER := 32767;



    -- Core fields

    l_shipment_gid         VARCHAR2(100);

    l_shipment_xid         VARCHAR2(100);

    l_container_nbr        VARCHAR2(50);

    l_inspection_clob      CLOB;

    -- Response string

    l_response             CLOB := '{';



    -- Document variables

    l_document_xid         VARCHAR2(100);

    l_document_filename    VARCHAR2(200);

    l_document_mimetype    VARCHAR2(100);

    l_document_defgid      VARCHAR2(100);

    l_owner_object_gid     VARCHAR2(100);

    l_clob_content         CLOB;

    l_api_response         CLOB;



    -- Refnum variables

    l_refnum_obj           json_object_t;

    l_refnums_array        json_array_t := json_array_t();



    -- Inspection details

    l_inspection_obj       json_object_t;

    l_images_array         json_array_t;

    l_comments             VARCHAR2(4000);

    l_hotspot_name         VARCHAR2(100);



    -- Tracking event

    l_status_code          VARCHAR2(100);



    -- Counters

    l_docs_posted          NUMBER := 0;

    l_refnums_posted       NUMBER := 0;

    l_inspections_inserted NUMBER := 0;



    -- API URLs / credentials (replace with secure retrieval in production)

    l_refnums_url          VARCHAR2(1000);

    l_username             VARCHAR2(100) := 'NAQLEEN.INTEGRATION';

    l_password             VARCHAR2(100) := 'NaqleenInt@123';



    l_count                PLS_INTEGER;

BEGIN

    -- 1) Convert BLOB -> CLOB safely

    DBMS_LOB.createtemporary(p_payload, TRUE);

    l_blob_len := NVL(DBMS_LOB.getlength(payload),0);



    WHILE l_pos <= l_blob_len LOOP

        l_chunk_raw := DBMS_LOB.substr(payload, LEAST(l_chunk_size, l_blob_len - l_pos + 1), l_pos);

        l_chunk_vc := UTL_RAW.cast_to_varchar2(l_chunk_raw);

        DBMS_LOB.writeappend(p_payload, LENGTH(l_chunk_vc), l_chunk_vc);

        l_pos := l_pos + LENGTH(l_chunk_raw);

    END LOOP;



    -- 2) Parse payload JSON using APEX_JSON for internal processing only

    apex_json.parse(p_payload);



    -- Extract main fields

    l_shipment_gid := apex_json.get_varchar2(p_path => 'shipmentGid');

    l_container_nbr := apex_json.get_varchar2(p_path => 'ContainerNbr');

    l_shipment_xid := REPLACE(l_shipment_gid, 'NAQLEEN.', '');



    l_refnums_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'

                     || l_shipment_gid || '/refnums';



    -- -------------------------------

    -- OPERATION 1: Post Documents

    -- -------------------------------

    l_count := apex_json.get_count(p_path => 'documents');

    IF l_count > 0 THEN

        FOR i IN 1..l_count LOOP

            BEGIN

                l_document_xid := apex_json.get_varchar2(p_path => 'documents[%d].documentXid', p0 => i);

                l_document_filename := apex_json.get_varchar2(p_path => 'documents[%d].documentFilename', p0 => i);

                    l_document_mimetype := apex_json.get_varchar2(p_path => 'documents[%d].documentMimeType', p0 => i);

                   --l_document_mimetype := REPLACE(l_document_mimetype,'\/','/');

                l_document_defgid := apex_json.get_varchar2(p_path => 'documents[%d].documentDefGid', p0 => i);

                l_owner_object_gid := apex_json.get_varchar2(p_path => 'documents[%d].ownerObjectGid', p0 => i);

                l_clob_content := apex_json.get_clob(p_path => 'documents[%d].contents.items[1].blobContent', p0 => i);



                post_otm_documents_test(

                    p_documentxid      => l_document_xid,

                    p_documentfilename => l_document_filename,

                    p_ownerobjectgid   => l_owner_object_gid,

                    p_clobcontent      => l_clob_content,

                    p_documentmimetype => l_document_mimetype,

                    p_documentdefgid   => l_document_defgid,

                    x_response_clob    => l_api_response

                );



                IF l_api_response IS NOT NULL AND INSTR(LOWER(l_api_response),'error') = 0 THEN

                    l_docs_posted := l_docs_posted + 1;

                END IF;

            EXCEPTION

                WHEN OTHERS THEN

                    NULL;

            END;

        END LOOP;

    END IF;



    -- -------------------------------

    -- OPERATION 2: Post Refnums

    -- -------------------------------

    l_count := apex_json.get_count(p_path => 'refnums');

    IF l_count > 0 THEN

        FOR j IN 1..l_count LOOP

            BEGIN

                l_refnum_obj := json_object_t();

                l_refnum_obj.put('shipmentRefnumQualGid', apex_json.get_varchar2(p_path => 'refnums[%d].shipmentRefnumQualGid', p0 => j));

                l_refnum_obj.put('shipmentRefnumValue', apex_json.get_varchar2(p_path => 'refnums[%d].shipmentRefnumValue', p0 => j));

                l_refnum_obj.put('domainName', apex_json.get_varchar2(p_path => 'refnums[%d].domainName', p0 => j));

                l_refnums_array.append(l_refnum_obj);

            EXCEPTION

                WHEN OTHERS THEN NULL;

            END;

        END LOOP;



        IF l_refnums_array.get_size > 0 THEN

            BEGIN

                l_api_response := apex_web_service.make_rest_request(

                    p_url => l_refnums_url,

                    p_http_method => 'POST',

                    p_username => l_username,

                    p_password => l_password,

                    p_body => l_refnums_array.to_clob(),

                    p_wallet_path => 'file:/u01/app/oracle/product/wallet'

                );

                l_refnums_posted := l_refnums_array.get_size;

            EXCEPTION

                WHEN OTHERS THEN NULL;

            END;

        END IF;

    END IF;



    -- -------------------------------

    -- OPERATION 3: Insert Inspections

    -- -------------------------------

    l_count := apex_json.get_count(p_path => 'inspection_details');

    IF l_count > 0 THEN

        FOR k IN 1..l_count LOOP

            BEGIN

                l_hotspot_name := apex_json.get_varchar2(p_path => 'inspection_details[%d].hotspot_name', p0 => k);

                l_comments := apex_json.get_varchar2(p_path => 'inspection_details[%d].comments', p0 => k);



                BEGIN

                    l_images_array := json_array_t(apex_json.get_clob(p_path => 'inspection_details[%d].images', p0 => k));

                EXCEPTION

                    WHEN OTHERS THEN l_images_array := json_array_t();

                END;



                l_inspection_obj := json_object_t();

                l_inspection_obj.put('hotspot_name', l_hotspot_name);

                l_inspection_obj.put('images', l_images_array);

                l_inspection_obj.put('comments', l_comments);



                l_inspection_clob:=l_inspection_obj.to_clob();

                INSERT INTO xxotm_container_inspection_t (

                    container_nbr,

                    shipment_nbr,

                    inspection_details,

                    timestamp

                ) VALUES (

                    l_container_nbr,

                    l_shipment_xid,

                    l_inspection_clob,

                    TO_CHAR(SYSDATE,'YYYY-MM-DD HH24:MI:SS')

                );



                l_inspections_inserted := l_inspections_inserted + 1;

            EXCEPTION

                WHEN OTHERS THEN NULL;

            END;

        END LOOP;

    END IF;



    -- -------------------------------

    -- OPERATION 4: Update Inventory

    -- -------------------------------

    BEGIN

        UPDATE xxotm_container_inventory_t

        SET inbound_shipment_nbr = l_shipment_xid

        WHERE container_nbr = l_container_nbr;



        IF SQL%ROWCOUNT = 0 THEN

            INSERT INTO xxotm_container_inventory_t (

                container_nbr, inbound_shipment_nbr, cust_nbr, cust_name, inbound_order_nbr, outbound_order_nbr, outbound_shipment_nbr, position

            ) VALUES (

                l_container_nbr, l_shipment_xid, NULL,NULL,NULL,NULL,NULL,NULL

            );

        END IF;

    EXCEPTION

        WHEN OTHERS THEN NULL;

    END;



    -- -------------------------------

    -- OPERATION 5: Tracking Event

    -- -------------------------------

    BEGIN

        l_status_code := apex_json.get_varchar2(p_path => 'trackingEvents.statusCodeGid');

        IF l_status_code IS NOT NULL THEN

            post_otm_tracking_events(

                    p_integration_name => 'XX_OTM_POST_INSPECTION_APEX',

                    p_statuscodegid    => l_status_code,

                    p_shipmentxid      => l_shipment_xid,

                    p_attribute1       => NULL,

                    p_attribute2       => NULL,

                    p_attribute3       => NULL,

                    p_attribute4       => NULL,

                    p_attribute5       => NULL,

                    p_attribute6       => NULL,

                    p_attribute7       => NULL,

                    p_attribute8       => NULL,

                    p_attribute9       => NULL,

                    p_attribute10      => NULL

                );

        END IF;

    EXCEPTION

        WHEN OTHERS THEN NULL;

    END;



    COMMIT;



    -- -------------------------------

    -- Build manual JSON response

    -- -------------------------------

    l_response := l_response || 'response_code:200,';

    l_response := l_response || 'response_message:Success,';

--    l_response := l_response || 'documents_posted:' || l_docs_posted || ',';

--    l_response := l_response || 'refnums_posted:' || l_refnums_posted || ',';

--    l_response := l_response || 'inspections_inserted:' || l_inspections_inserted;

    l_response := l_response || '}';



    htp.prn(l_response);

--             htp.prn(l_document_mimetype);







EXCEPTION

    WHEN OTHERS THEN

        l_response := '{response_code:400,response_message:' || REPLACE(SUBSTR(SQLERRM,1,1000),'','') || '}';

     htp.prn(l_response);

     htp.prn(l_inspection_obj.to_clob());

      htp.prn(l_container_nbr || ' ' || l_shipment_xid || ' ' || l_inspection_obj.to_string());



END xx_otm_post_inspection_details;




-- PROCEDURE: XX_OTM_POST_INSPECTION_DETAILS_TEST



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_INSPECTION_DETAILS_TEST (

    payload IN BLOB

) IS

    p_payload              CLOB;

    l_shipment_gid         VARCHAR2(100);

    l_shipment_xid         VARCHAR2(100);

    l_container_nbr        VARCHAR2(50);

    l_response             json_object_t;



    -- Document variables

    l_document_xid         VARCHAR2(100);

    l_document_filename    VARCHAR2(200);

    l_document_mimetype    VARCHAR2(100);

    l_document_defgid      VARCHAR2(100);

    l_owner_object_gid     VARCHAR2(100);

    l_clob_content         CLOB;

    l_api_response         CLOB;



    -- Refnum variables

    l_refnum_obj           json_object_t;

    l_refnum_payload       CLOB;

    l_refnums_array        json_array_t;



    -- Inspection details

    l_inspection_obj       json_object_t;

    l_inspection_details   CLOB;

    l_hotspot_name         VARCHAR2(100);

    l_images_array         json_array_t;

    l_comments             VARCHAR2(4000);



    -- Tracking event

    l_status_code          VARCHAR2(100);



    -- Counters

    l_docs_posted          NUMBER := 0;

    l_refnums_posted       NUMBER := 0;

    l_inspections_inserted NUMBER := 0;



    -- API URLs

    l_refnums_url          VARCHAR2(500);

    l_username             VARCHAR2(100) := 'NAQLEEN.INTEGRATION';

    l_password             VARCHAR2(100) := 'NaqleenInt@123';



BEGIN

    -- Blob payload to Clob type conversion

    p_payload := to_clob(payload);

    apex_json.initialize_clob_output;

    apex_json.open_object;



    -- Parse the JSON payload

    apex_json.parse(p_payload);



    -- Extract main values

    l_shipment_gid := apex_json.get_varchar2(p_path => 'shipmentGid');

    l_container_nbr := apex_json.get_varchar2(p_path => 'ContainerNbr');



    -- Extract shipment XID

    l_shipment_xid := REPLACE(l_shipment_gid, 'NAQLEEN.', '');



    -- Build refnums URL

    l_refnums_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/' 

                     || l_shipment_gid || '/refnums';



    -- Initialize the response object

    l_response := json_object_t();



    BEGIN

        -- ============================================================

        -- OPERATION 1: Post Documents to Oracle GTM using post_otm_documents

        -- ============================================================

        FOR i IN 1..apex_json.get_count(p_path => 'documents') LOOP

            BEGIN

                -- Extract document details from payload

                l_document_xid := apex_json.get_varchar2(p_path => 'documents[%d].documentXid', p0 => i);

                l_document_filename := apex_json.get_varchar2(p_path => 'documents[%d].documentFilename', p0 => i);

                l_document_mimetype := apex_json.get_varchar2(p_path => 'documents[%d].documentMimeType', p0 => i);

                l_document_defgid := apex_json.get_varchar2(p_path => 'documents[%d].documentDefGid', p0 => i);

                l_owner_object_gid := apex_json.get_varchar2(p_path => 'documents[%d].ownerObjectGid', p0 => i);



                -- Extract BLOB content (Base64) from nested structure

                l_clob_content := apex_json.get_varchar2(p_path => 'documents[%d].contents.items[1].blobContent', p0 => i);



                -- Call existing document posting procedure

                post_otm_documents(

                    p_documentxid      => l_document_xid,

                    p_documentfilename => l_document_filename,

                    p_ownerobjectgid   => l_owner_object_gid,

                    p_clobcontent      => l_clob_content,

                    p_documentmimetype => l_document_mimetype,

                    p_documentdefgid   => l_document_defgid,

                    x_response_clob    => l_api_response

                );



                -- Check if response indicates success

                IF l_api_response NOT LIKE '%Error%' THEN

                    l_docs_posted := l_docs_posted + 1;

                ELSE

                    dbms_output.put_line('Document ' || i || ' failed: ' || l_api_response);

                END IF;



            EXCEPTION

                WHEN OTHERS THEN

                    dbms_output.put_line('Error posting document ' || i || ': ' || SQLERRM);

            END;

        END LOOP;



        -- ============================================================

        -- OPERATION 2: Post Reference Numbers to Oracle GTM

        -- ============================================================

        -- Build refnums array payload

        l_refnums_array := json_array_t();



        FOR j IN 1..apex_json.get_count(p_path => 'refnums') LOOP

            BEGIN

                l_refnum_obj := json_object_t();

                l_refnum_obj.put('shipmentRefnumQualGid', 

                                 apex_json.get_varchar2(p_path => 'refnums[%d].shipmentRefnumQualGid', p0 => j));

                l_refnum_obj.put('shipmentRefnumValue', 

                                 apex_json.get_varchar2(p_path => 'refnums[%d].shipmentRefnumValue', p0 => j));

                l_refnum_obj.put('domainName', 

                                 apex_json.get_varchar2(p_path => 'refnums[%d].domainName', p0 => j));



                l_refnums_array.append(l_refnum_obj);



            EXCEPTION

                WHEN OTHERS THEN

                    dbms_output.put_line('Error building refnum ' || j || ': ' || SQLERRM);

            END;

        END LOOP;



        -- Post all refnums in one call

        IF l_refnums_array.get_size > 0 THEN

            BEGIN

                l_api_response := apex_web_service.make_rest_request(

                    p_url => l_refnums_url,

                    p_http_method => 'POST',

                    p_username => l_username,

                    p_password => l_password,

                    p_body => l_refnums_array.to_clob(),

                    p_wallet_path => 'file:/u01/app/oracle/product/wallet'

                );



                l_refnums_posted := l_refnums_array.get_size;



            EXCEPTION

                WHEN OTHERS THEN

                    dbms_output.put_line('Error posting refnums: ' || SQLERRM);

            END;

        END IF;



        -- ============================================================

        -- OPERATION 3: Insert Container Inspection Records

        -- ============================================================

        FOR k IN 1..apex_json.get_count(p_path => 'inspection_details') LOOP

            BEGIN

                l_hotspot_name := apex_json.get_varchar2(p_path => 'inspection_details[%d].hotspot_name', p0 => k);

                l_comments := apex_json.get_varchar2(p_path => 'inspection_details[%d].comments', p0 => k);



                -- Get images array as JSON string

                l_images_array := json_array_t(apex_json.get_clob(p_path => 'inspection_details[%d].images', p0 => k));



                -- Build inspection details JSON

                l_inspection_obj := json_object_t();

                l_inspection_obj.put('hotspot_name', l_hotspot_name);

                l_inspection_obj.put('images', l_images_array);

                l_inspection_obj.put('comments', l_comments);



                -- Insert into container inspection table

                INSERT INTO xxotm_container_inspection_t (

                    container_nbr,

                    shipment_nbr,

                    inspection_details,

                    timestamp

                ) VALUES (

                    l_container_nbr,

                    l_shipment_xid,

                    l_inspection_obj.to_clob(),

                    TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS')

                );



                l_inspections_inserted := l_inspections_inserted + 1;



            EXCEPTION

                WHEN OTHERS THEN

                    dbms_output.put_line('Error inserting inspection ' || k || ': ' || SQLERRM);

            END;

        END LOOP;



        -- Commit inspection inserts

        COMMIT;



        -- ============================================================

        -- OPERATION 4: Update Container Inventory Table

        -- ============================================================

        BEGIN

            UPDATE xxotm_container_inventory_t

            SET inbound_shipment_nbr = l_shipment_xid

            WHERE container_nbr = l_container_nbr;



            -- If container doesn't exist, insert new record

            IF SQL%ROWCOUNT = 0 THEN

                INSERT INTO xxotm_container_inventory_t (

                    container_nbr,

                    inbound_shipment_nbr,

                    cust_nbr,

                    cust_name,

                    inbound_order_nbr,

                    outbound_order_nbr,

                    outbound_shipment_nbr,

                    position

                ) VALUES (

                    l_container_nbr,

                    l_shipment_xid,

                    NULL,

                    NULL,

                    NULL,

                    NULL,

                    NULL,

                    NULL

                );

            END IF;



            COMMIT;



        EXCEPTION

            WHEN OTHERS THEN

                dbms_output.put_line('Error updating container inventory: ' || SQLERRM);

        END;



        -- ============================================================

        -- OPERATION 5: Post Tracking Event

        -- ============================================================

        BEGIN

            l_status_code := apex_json.get_varchar2(p_path => 'trackingEvents.statusCodeGid');



            post_otm_tracking_events(

                p_integration_name => 'XX_OTM_POST_INSPECTION_APEX',

                p_statuscodegid    => l_status_code,

                p_shipmentxid      => l_shipment_xid,

                p_attribute1       => '',

                p_attribute2       => '',

                p_attribute3       => '',

                p_attribute4       => '',

                p_attribute5       => '',

                p_attribute6       => '',

                p_attribute7       => '',

                p_attribute8       => '',

                p_attribute9       => '',

                p_attribute10      => ''

            );



        EXCEPTION

            WHEN OTHERS THEN

                dbms_output.put_line('Error posting tracking event: ' || SQLERRM);

        END;



        -- Build success response

        l_response.put('response_code', 200);

        l_response.put('response_message', 'Success');

        l_response.put('documents_posted', l_docs_posted);

        l_response.put('refnums_posted', l_refnums_posted);

        l_response.put('inspections_inserted', l_inspections_inserted);



    EXCEPTION

        WHEN OTHERS THEN

            ROLLBACK;

            l_response.put('response_code', 400);

            l_response.put('response_message', SQLERRM);

    END;



    -- Output the JSON response

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));



    IF l_response.has('documents_posted') THEN

        apex_json.write('documents_posted',

                        l_response.get('documents_posted').to_number());

    END IF;



    IF l_response.has('refnums_posted') THEN

        apex_json.write('refnums_posted',

                        l_response.get('refnums_posted').to_number());

    END IF;



    IF l_response.has('inspections_inserted') THEN

        apex_json.write('inspections_inserted',

                        l_response.get('inspections_inserted').to_number());

    END IF;



    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', SQLERRM);



        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_post_inspection_details;




-- PROCEDURE: XX_OTM_POST_PLUG_IN_OUT_CONTAINER



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_PLUG_IN_OUT_CONTAINER (

    payload IN BLOB

) AS

    p_payload           CLOB;

    l_container_nbr     VARCHAR2(50);

    l_type              VARCHAR2(20);

    l_set_point_temp    NUMBER;

    l_current_temp      NUMBER;

    l_remarks           VARCHAR2(200);

    l_timestamp         varchar2(240);

    l_position          VARCHAR2(20);

    l_outbound_shipment VARCHAR2(50);

    l_container_exists  NUMBER := 0;

BEGIN

    -- Convert BLOB to CLOB

    p_payload := TO_CLOB(payload);



    -- Parse JSON payload

    apex_json.parse(p_payload);



    -- Extract values from JSON

    l_container_nbr := apex_json.get_varchar2(p_path => 'container_nbr');

    l_type := apex_json.get_varchar2(p_path => 'type');

    l_set_point_temp := apex_json.get_number(p_path => 'setPointTemp');

    l_current_temp := apex_json.get_number(p_path => 'currentTemp');

    l_remarks := apex_json.get_varchar2(p_path => 'remarks');

    l_timestamp := apex_json.get_varchar2(p_path => 'timestamp');





    BEGIN

        SELECT COUNT(*)

        INTO l_container_exists

        FROM xxotm_container_inventory_t

        WHERE container_nbr = l_container_nbr;



        IF l_container_exists = 0 THEN

            apex_json.initialize_clob_output;

            apex_json.open_object;

            apex_json.write('response_code', 404);

            apex_json.write('response_message', 'Container not found in inventory');

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

            RETURN;

        END IF;

    END;



    -- Get position and outbound shipment from inventory

    BEGIN

        SELECT position, outbound_shipment_nbr

        INTO l_position, l_outbound_shipment

        FROM xxotm_container_inventory_t

        WHERE container_nbr = l_container_nbr;



    EXCEPTION

        WHEN NO_DATA_FOUND THEN

            l_position := NULL;

            l_outbound_shipment := NULL;

    END;



    -- Insert plug in/out record

    BEGIN

        INSERT INTO xxotm_pluginout_t (

            container_nbr,

            set_point_temp,

            current_temp,

            type,

            remarks,

            timestamp,

            outbound_shipment_nbr,

            position

        ) VALUES (

            l_container_nbr,

            l_set_point_temp,

            l_current_temp,

            l_type,

            l_remarks,

            l_timestamp,

            l_outbound_shipment,

            l_position

        );



        COMMIT;



        -- Success response

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 200);

        apex_json.write('response_message', 'Plug in/out operation recorded successfully');

        apex_json.open_object('data');

        apex_json.write('container_nbr', l_container_nbr);

        apex_json.write('type', l_type);

        apex_json.write('setPointTemp', l_set_point_temp);

        apex_json.write('currentTemp', l_current_temp);

        apex_json.write('timestamp',l_timestamp);

        apex_json.close_object;

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);



    EXCEPTION

        WHEN OTHERS THEN

            ROLLBACK;

            apex_json.initialize_clob_output;

            apex_json.open_object;

            apex_json.write('response_code', 500);

            apex_json.write('response_message', 'Database error: ' || SQLERRM);

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

    END;



EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 500);

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_post_plug_in_out_container;




-- PROCEDURE: XX_OTM_POST_PLUG_IN_OUT_CONTAINER_TEST



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_PLUG_IN_OUT_CONTAINER_TEST (

    payload IN CLOB

) AS

    p_payload           CLOB;

    l_container_nbr     VARCHAR2(50);

    l_type              VARCHAR2(20);

    l_set_point_temp    NUMBER;

    l_current_temp      NUMBER;

    l_remarks           VARCHAR2(200);

    l_timestamp          VARCHAR2(200);

    l_position          VARCHAR2(20);

    l_outbound_shipment VARCHAR2(50);

    l_container_exists  NUMBER := 0;

BEGIN

    -- Convert BLOB to CLOB

  p_payload := payload;



    -- Parse JSON payload

    apex_json.parse(p_payload);



    -- Extract values from JSON

    l_container_nbr := apex_json.get_varchar2(p_path => 'container_nbr');

    l_type := apex_json.get_varchar2(p_path => 'type');

    l_set_point_temp := apex_json.get_number(p_path => 'setPointTemp');

    l_current_temp := apex_json.get_number(p_path => 'currentTemp');

    l_remarks := apex_json.get_varchar2(p_path => 'remarks');

    l_timestamp := apex_json.get_varchar2(p_path => 'timestamp');





    -- Verify container exists in inventory

    BEGIN

        SELECT COUNT(*)

        INTO l_container_exists

        FROM xxotm_container_inventory_t

        WHERE container_nbr = l_container_nbr;





    END;



    -- Get position and outbound shipment from inventory

    BEGIN

        SELECT position, outbound_shipment_nbr

        INTO l_position, l_outbound_shipment

        FROM xxotm_container_inventory_t

        WHERE container_nbr = l_container_nbr

        AND ROWNUM = 1;

    EXCEPTION

        WHEN NO_DATA_FOUND THEN

            l_position := NULL;

            l_outbound_shipment := NULL;

    END;



    -- Insert plug in/out record

    BEGIN

        INSERT INTO xxotm_pluginout_t (

            container_nbr,

            set_point_temp,

            current_temp,

            type,

            remarks,

            timestamp,

            outbound_shipment_nbr,

            position

        ) VALUES (

            l_container_nbr,

            l_set_point_temp,

            l_current_temp,

            l_type,

            l_remarks,

         l_timestamp,

            l_outbound_shipment,

            l_position

        );



        COMMIT;



        -- Success response

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 200);

        apex_json.write('response_message', 'Plug in/out operation recorded successfully');

        apex_json.open_object('data');

        apex_json.write('container_nbr', l_container_nbr);

        apex_json.write('type', l_type);

        apex_json.write('setPointTemp', l_set_point_temp);

        apex_json.write('currentTemp', l_current_temp);

        apex_json.write('timestamp',l_timestamp);

        apex_json.close_object;

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        dbms_output.put_line(apex_json.get_clob_output);



    EXCEPTION

        WHEN OTHERS THEN

            ROLLBACK;

            apex_json.initialize_clob_output;

            apex_json.open_object;

            apex_json.write('response_code', 500);

            apex_json.write('response_message', 'Database error: ' || SQLERRM);

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

            dbms_output.put_line(apex_json.get_clob_output);

    END;



EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 500);

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        dbms_output.put_line(apex_json.get_clob_output);

END xx_otm_post_plug_in_out_container_test;




-- PROCEDURE: XX_OTM_POST_RESTACKCONTAINER



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_RESTACKCONTAINER (

    payload IN BLOB

) IS

    p_payload         CLOB;

    l_container_nbr   VARCHAR2(50);

    l_type            VARCHAR2(20);

    l_new_position    VARCHAR2(20);

    l_current_position VARCHAR2(20);

    l_timestamp       VARCHAR2(100);

    l_response        json_object_t;

BEGIN

    -- Blob payload to Clob type conversion

    p_payload := to_clob(payload);

    apex_json.initialize_clob_output;

    apex_json.open_object;



    -- Parse the JSON payload

    apex_json.parse(p_payload);



    -- Extract values from the JSON payload

    l_container_nbr := apex_json.get_varchar2(p_path => 'contianer_nbr');

    l_type := apex_json.get_varchar2(p_path => 'type');

    l_new_position := apex_json.get_varchar2(p_path => 'newPosition');

    l_current_position := apex_json.get_varchar2(p_path => 'currentPosition');

    l_timestamp := apex_json.get_varchar2(p_path => 'timestamp');



    -- Initialize the response object

    l_response := json_object_t();



    BEGIN

        -- Insert record into LOLO table

        INSERT INTO  xxotm_restack_lolo_t (

            container_nbr,

            current_position,

            restack_position,

            timestamp

        ) VALUES (

            l_container_nbr,

            l_current_position,

            l_new_position,

             l_timestamp

        );



        -- Update position in container inventory table

        UPDATE xxotm_container_inventory_t

        SET position = l_new_position

        WHERE container_nbr = l_container_nbr;



        -- Check if update was successful

        IF SQL%ROWCOUNT > 0 THEN

            COMMIT;

            l_response.put('response_code', 200);

            l_response.put('response_message', 'Success');

        ELSE

            ROLLBACK;

            l_response.put('response_code', 404);

            l_response.put('response_message', 'Container not found in inventory');

        END IF;



    EXCEPTION

        WHEN OTHERS THEN

            ROLLBACK;

            l_response.put('response_code', 400);

            l_response.put('response_message', sqlerrm);

    END;



    -- Output the JSON response

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));



    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        -- Handle any other errors

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', sqlerrm);



        -- Output the error JSON response

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_post_restackContainer;  




-- PROCEDURE: XX_OTM_POST_RESTACKCONTAINER_TEST



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_RESTACKCONTAINER_TEST (

    payload IN CLOB

) IS

    p_payload         CLOB;

    l_container_nbr   VARCHAR2(50);

    l_type            VARCHAR2(20);

    l_new_position    VARCHAR2(20);

    l_current_position VARCHAR2(20);

    l_timestamp       VARCHAR2(100);

    l_response        json_object_t;

BEGIN

    -- Blob payload to Clob type conversion

    p_payload := payload;

    apex_json.initialize_clob_output;

    apex_json.open_object;



    -- Parse the JSON payload

    apex_json.parse(p_payload);



    -- Extract values from the JSON payload

    l_container_nbr := apex_json.get_varchar2(p_path => 'contianer_nbr');

    l_type := apex_json.get_varchar2(p_path => 'type');

    l_new_position := apex_json.get_varchar2(p_path => 'newPosition');

    l_current_position := apex_json.get_varchar2(p_path => 'currentPosition');

    l_timestamp := apex_json.get_varchar2(p_path => 'timestamp');



    -- Initialize the response object

    l_response := json_object_t();



    BEGIN

        -- Insert record into LOLO table

        INSERT INTO xxotm_restack_lolo_t (

            container_nbr,

            current_position,

            restack_position,

            timestamp

        ) VALUES (

            l_container_nbr,

            l_current_position,

            l_new_position,

            TO_DATE(l_timestamp, 'YYYY-MM-DD HH24:MI:SS')



        );



        -- Update position in container inventory table

        UPDATE xxotm_container_inventory_t

        SET position = l_new_position

        WHERE container_nbr = l_container_nbr;



        -- Check if update was successful

        IF SQL%ROWCOUNT > 0 THEN

            COMMIT;

            l_response.put('response_code', 200);

            l_response.put('response_message', 'Success');

        ELSE

            ROLLBACK;

            l_response.put('response_code', 404);

            l_response.put('response_message', 'Container not found in inventory');

        END IF;



    EXCEPTION

        WHEN OTHERS THEN

            ROLLBACK;

            l_response.put('response_code', 400);

            l_response.put('response_message', sqlerrm);

    END;



    -- Output the JSON response

    apex_json.write('response_code',

                    l_response.get('response_code').to_number());

    apex_json.write('response_message',

                    replace(

                        l_response.get('response_message').to_string(),

                        '',

                        ''

                    ));



    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

      DBMS_OUTPUT.PUT_LINE(apex_json.get_clob_output);





EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        -- Handle any other errors

        l_response := json_object_t();

        l_response.put('response_code', 400);

        l_response.put('response_message', sqlerrm);



        -- Output the error JSON response

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                            l_response.get('response_message').to_string(),

                            '',

                            ''

                        ));

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_post_restackContainer_test;  




-- PROCEDURE: XX_OTM_POST_STUFFING_CONTAINER



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_STUFFING_CONTAINER (

   payload in blob

) as

   p_payload         clob;

   l_container_nbr   varchar2(50);

   l_customer        varchar2(100);

   l_items_count     number;

   l_item_code       varchar2(20);

   l_description     varchar2(50);

   l_stuffed_qty     varchar2(500) := null;

   l_tracking_count  number;

   l_shipment_gid    varchar2(50);

   l_status_code_gid varchar2(100);

   l_attribute1      varchar2(100);

   l_attribute2      varchar2(100);

   l_out_response    clob;

begin

    -- Convert BLOB to CLOB

   p_payload := to_clob(payload);



    -- Parse JSON payload

   apex_json.parse(p_payload);



    -- Extract container and customer info

   l_container_nbr := apex_json.get_varchar2(p_path => 'container_number');

   l_customer := apex_json.get_varchar2(p_path => 'customer');

   l_items_count := apex_json.get_count(p_path => 'items');



    -- Process each item and update stuffed_quantity

   for i in 1..l_items_count loop

      l_item_code := apex_json.get_varchar2(

         p_path => 'items[%d].item_code',

         p0     => i

      );

      l_description := apex_json.get_varchar2(

         p_path => 'items[%d].description',

         p0     => i

      );

      l_stuffed_qty := apex_json.get_number(

         p_path => 'items[%d].stuffed_quantity',

         p0     => i

      );



        -- Update stuffed_quantity in customer inventory

      begin

         update xxotm_customer_inventory_t

            set

            stuffed_qty = l_stuffed_qty

          where trim(upper(container_nbr)) = trim(upper(l_container_nbr))

            and trim(upper(item_code)) = trim(upper(l_item_code));



         if sql%rowcount = 0 then

            dbms_output.put_line('NOT FOUND → '

                                 || l_container_nbr

                                 || ' / '

                                 || l_item_code);

         end if;



      exception

         when others then

            rollback;

            apex_json.initialize_clob_output;

            apex_json.open_object;

            apex_json.write(

               'response_code',

               500

            );

            apex_json.write(

               'response_message',

               'Error updating item '

               || l_item_code

               || ': '

               || sqlerrm

            );

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

            return;

      end;

   end loop;



   commit;



    -- Get tracking events count

   l_tracking_count := apex_json.get_count(p_path => 'trackingEvents');



    -- Send each tracking event using common procedure

   for i in 1..l_tracking_count loop

      begin

            -- Extract tracking event fields

         l_status_code_gid := apex_json.get_varchar2(

            p_path => 'trackingEvents[%d].statusCodeGid',

            p0     => i

         );

         l_shipment_gid := apex_json.get_varchar2(

            p_path => 'trackingEvents[%d].shipmentGid',

            p0     => i

         );

         l_attribute1 := apex_json.get_varchar2(

            p_path => 'trackingEvents[%d].attribute1',

            p0     => i

         );

         l_attribute2 := apex_json.get_varchar2(

            p_path => 'trackingEvents[%d].attribute2',

            p0     => i

         );



            -- Remove domain prefix from shipmentGid if present (NAQLEEN.SH20250326-0001 → SH20250326-0001)

         if instr(

            l_shipment_gid,

            '.'

         ) > 0 then

            l_shipment_gid := substr(

               l_shipment_gid,

               instr(

                          l_shipment_gid,

                          '.'

                       ) + 1

            );

         end if;



            -- Call common tracking events procedure

         post_otm_tracking_events(

            p_integration_name => 'XX_OTM_POST_STUFFING_CONTAINER',

            p_statuscodegid    => l_status_code_gid,

            p_shipmentxid      => l_shipment_gid,

            p_attribute1       => l_attribute1,

            p_attribute2       => l_attribute2,

            p_attribute3       => null,

            p_attribute4       => null,

            p_attribute5       => null,

            p_attribute6       => null,

            p_attribute7       => null,

            p_attribute8       => null,

            p_attribute9       => null,

            p_attribute10      => null,

            x_response         => l_out_response

         );



      exception

         when others then

            dbms_output.put_line('Error sending tracking event '

                                 || i

                                 || ': '

                                 || sqlerrm);

                -- Continue with next tracking event

      end;

   end loop;



    -- Success response

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_code',

      200

   );

   apex_json.write(

      'response_message',

      'success'

   );

   apex_json.open_object('data');

   apex_json.write(

      'items_updated',

      l_items_count

   );

   apex_json.write(

      'events_posted',

      l_tracking_count

   );

   apex_json.close_object;

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

exception

   when others then

      rollback;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_code',

         500

      );

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

end xx_otm_post_stuffing_container;




-- PROCEDURE: XX_OTM_POST_STUFFING_CONTAINER_TEST



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_STUFFING_CONTAINER_TEST (

    payload IN CLOB

) AS

    p_payload           CLOB;

    l_container_nbr     VARCHAR2(50);

    l_customer          VARCHAR2(100);

    l_items_count       NUMBER;

    l_item_code         VARCHAR2(20);

    l_description       VARCHAR2(50);

    l_stuffed_qty       VARCHAR2(500):=NULL;

    l_tracking_count    NUMBER;

    l_shipment_gid      VARCHAR2(50);

    l_status_code_gid   VARCHAR2(100);

    l_attribute1        VARCHAR2(100);

    l_attribute2        VARCHAR2(100);



BEGIN

    -- Convert BLOB to CLOB

--    p_payload := TO_CLOB(payload);



    -- Parse JSON payload

    apex_json.parse(p_payload);



    -- Extract container and customer info

    l_container_nbr := apex_json.get_varchar2(p_path => 'container_number');

    l_customer := apex_json.get_varchar2(p_path => 'customer');





    l_items_count := apex_json.get_count(p_path => 'items');



    -- Process each item and update stuffed_quantity

    FOR i IN 1..l_items_count LOOP

        l_item_code := apex_json.get_varchar2(p_path => 'items[%d].item_code', p0 => i);

        l_description := apex_json.get_varchar2(p_path => 'items[%d].description', p0 => i);

        l_stuffed_qty := apex_json.get_number(p_path => 'items[%d].stuffed_quantity', p0 => i);





        dbms_output.put_line(l_item_code);

        dbms_output.put_line(l_description);

        dbms_output.put_line(l_stuffed_qty);



        -- Update stuffed_quantity in customer inventory

       BEGIN

    UPDATE xxotm_customer_inventory_t

       SET stuffed_qty = l_stuffed_qty

     WHERE TRIM(UPPER(container_nbr)) = TRIM(UPPER(l_container_nbr))

       AND TRIM(UPPER(item_code))     = TRIM(UPPER(l_item_code));



    IF SQL%ROWCOUNT = 0 THEN

        DBMS_OUTPUT.PUT_LINE('NOT FOUND → ' 

            || l_container_nbr || ' / ' || l_item_code);

    END IF;



EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 500);

        apex_json.write('response_message', 'Error updating item ' || l_item_code || ': ' || SQLERRM);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        RETURN;

END;

    END LOOP;



    COMMIT;



    -- Get tracking events count

    l_tracking_count := apex_json.get_count(p_path => 'trackingEvents');



    -- Send each tracking event using common procedure

    FOR i IN 1..l_tracking_count LOOP

        BEGIN

            -- Extract tracking event fields

            l_status_code_gid := apex_json.get_varchar2(p_path => 'trackingEvents[%d].statusCodeGid', p0 => i);

            l_shipment_gid := apex_json.get_varchar2(p_path => 'trackingEvents[%d].shipmentGid', p0 => i);

            l_attribute1 := apex_json.get_varchar2(p_path => 'trackingEvents[%d].attribute1', p0 => i);

            l_attribute2 := apex_json.get_varchar2(p_path => 'trackingEvents[%d].attribute2', p0 => i);



            -- Remove domain prefix from shipmentGid if present (NAQLEEN.SH20250326-0001 → SH20250326-0001)

            IF INSTR(l_shipment_gid, '.') > 0 THEN

                l_shipment_gid := SUBSTR(l_shipment_gid, INSTR(l_shipment_gid, '.') + 1);

            END IF;



            -- Call common tracking events procedure

            post_otm_tracking_events(

                p_integration_name => 'XX_OTM_POST_STUFFING_CONTAINER',

                p_statuscodegid    => l_status_code_gid,

                p_shipmentxid      => l_shipment_gid,

                p_attribute1       => l_attribute1,

                p_attribute2       => l_attribute2,

                p_attribute3       => NULL,

                p_attribute4       => NULL,

                p_attribute5       => NULL,

                p_attribute6       => NULL,

                p_attribute7       => NULL,

                p_attribute8       => NULL,

                p_attribute9       => NULL,

                p_attribute10      => NULL

            );



        EXCEPTION

            WHEN OTHERS THEN

                DBMS_OUTPUT.PUT_LINE('Error sending tracking event ' || i || ': ' || SQLERRM);

                -- Continue with next tracking event

        END;

    END LOOP;



    -- Success response

    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code', 200);

    apex_json.write('response_message', 'success');

    apex_json.open_object('data');

    apex_json.write('container_number', l_container_nbr);

    apex_json.write('items_updated', l_items_count);

    apex_json.write('tracking_events_sent', l_tracking_count);

    apex_json.close_object;

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_code', 500);

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_post_stuffing_container_test;




-- PROCEDURE: XX_OTM_POST_UPDATE_TRUCK_STATUS_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_UPDATE_TRUCK_STATUS_APEX (

    payload IN BLOB

) IS

    p_payload             CLOB;

    l_status              VARCHAR2(100);

    l_truck_number        VARCHAR2(10);

    l_entry_time          VARCHAR2(100);

    l_entry_timestamp     TIMESTAMP;

    l_response            json_object_t;

    l_updated_count       NUMBER := 0;

    l_not_found_count     NUMBER := 0;

    l_output              CLOB;

    l_array_count         NUMBER;

BEGIN

    -- Convert the BLOB payload to a CLOB

    p_payload := to_clob(payload);



    -- Parse the JSON payload

    apex_json.parse(p_payload);



    -- Extract the status

    l_status := apex_json.get_varchar2(p_path => 'status');



    -- Get count of trucks array

    l_array_count := apex_json.get_count(p_path => 'trucks');



    -- Initialize the response object

    l_response := json_object_t();



    BEGIN

        -- Loop through each truck in the array

        FOR i IN 1 .. l_array_count LOOP

            -- Extract truck details

            l_truck_number := apex_json.get_varchar2(p_path => 'trucks[%d].truck_number', p0 => i);

            l_entry_time := apex_json.get_varchar2(p_path => 'trucks[%d].entry_time', p0 => i);



            UPDATE xxotm_vehicle_master_t

            SET status = l_status

            WHERE truck_nbr = l_truck_number

              AND entry_time = l_entry_time;



            IF SQL%ROWCOUNT > 0 THEN

                l_updated_count := l_updated_count + 1;

            ELSE

                l_not_found_count := l_not_found_count + 1;

            END IF;

        END LOOP;



        COMMIT;



        -- Set response based on results

        IF l_updated_count > 0 AND l_not_found_count = 0 THEN

            l_response.put('response_code', 200);

            l_response.put('response_message', 'Success');

        ELSE

            l_response.put('response_code', 404);

            l_response.put('response_message', 'No data found');

        END IF;



    EXCEPTION

        WHEN OTHERS THEN

            ROLLBACK;

            l_response.put('response_code', 400);

            l_response.put('response_message', 'ERROR: ' || SQLERRM);

    END;



    -- Build JSON output using apex_json

    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_code', l_response.get_number('response_code'));

    apex_json.write('response_message', l_response.get_string('response_message'));

    apex_json.close_object;



    -- Get output

    l_output := apex_json.get_clob_output;



    -- Print output

    htp.prn(l_output);



    apex_json.free_output;



END XX_OTM_POST_UPDATE_TRUCK_STATUS_APEX;




-- PROCEDURE: XX_OTM_POST_VEHICLE_ENTRY_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_VEHICLE_ENTRY_APEX (

        payload IN BLOB

    ) IS



        p_payload             CLOB;

        l_truck_number        VARCHAR2(100);

        l_power_unit_truck    VARCHAR2(100);

        l_driver_name         VARCHAR2(100);

        l_iqama_number        VARCHAR2(100);

        l_driver_phone_number VARCHAR2(200);

        l_entry_time          VARCHAR2(100);

        l_exit_time           VARCHAR2(100);

        l_status              VARCHAR2(200);

        l_response            json_object_t;

    BEGIN

    -- Blob payload to Clob type conversion

        p_payload := to_clob(payload);

        apex_json.initialize_clob_output;

        apex_json.open_object;



    -- Parse the JSON payload

        apex_json.parse(p_payload);



    -- Extract values from the JSON payload

        l_truck_number := apex_json.get_varchar2(p_path => 'truck_number');

        l_driver_name := apex_json.get_varchar2(p_path => 'driver_name');

        l_iqama_number := apex_json.get_varchar2(p_path => 'iqama_number');

        l_driver_phone_number := apex_json.get_varchar2(p_path => 'driver_phone_number');

        l_entry_time := apex_json.get_varchar2(p_path => 'entry_time');



    -- Initialize the response object

        l_response := json_object_t();

        BEGIN

            SELECT DISTINCT

                truck_nbr

            INTO l_power_unit_truck

            FROM

                xxotm_power_units_t

            WHERE

                truck_nbr = l_truck_number;



        EXCEPTION

            WHEN OTHERS THEN

                l_power_unit_truck := NULL;

        END;



    -- Check if the truck number exists in the vehicle master table

        BEGIN

        -- Try to find an existing truck number

            SELECT

                truck_nbr

            INTO l_truck_number

            FROM

                xxotm_vehicle_master_t

            WHERE

                truck_nbr = l_truck_number;





        -- If found, no need to insert, just set response and return

        l_response.put('response_code', 200);

        l_response.put('response_message', 'Truck already registered');



        EXCEPTION

            WHEN no_data_found THEN

            -- Truck number not found, insert new entry

                INSERT INTO xxotm_vehicle_master_t (

                    truck_nbr,

                    driver_iqama,

                    driver_name,

                    entry_time,

                    exit_time,

                    type,

                    status

                ) VALUES ( l_truck_number,

                           l_iqama_number,

                           l_driver_name,

                           l_entry_time,

                           NULL,  -- You can adjust exit_time if you have a value in payload

                           CASE

                               WHEN l_power_unit_truck IS NOT NULL THEN

                                   'Own'

                               ELSE

                                   '3PL'

                           END,  -- You can replace 'unknown' with a type based on payload

                           'vehicle_entry'   -- Status is set as '200' as requested

                            );



            -- Set the response code and message

                l_response.put('response_code', 200);

                l_response.put('response_message', 'Success');

        END;



    -- Output the JSON response

        apex_json.write('response_code',

                        l_response.get('response_code').to_number());

        apex_json.write('response_message',

                        replace(

                  l_response.get('response_message').to_string(),

                  '',

                  ''

              ));



        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

    EXCEPTION

        WHEN OTHERS THEN

        -- Handle any other errors

            l_response.put('response_code', 400);

            l_response.put('response_message', sqlerrm);



        -- Output the error JSON response

            apex_json.write('response_code',

                            l_response.get('response_code').to_number());

            apex_json.write('response_message',

                            replace(

                      l_response.get('response_message').to_string(),

                      '',

                      ''

                  ));



            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

    END XX_OTM_POST_VEHICLE_ENTRY_APEX;




-- PROCEDURE: XX_OTM_POST_VEHICLE_EXIT_APEX



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_VEHICLE_EXIT_APEX (

    payload IN BLOB

) IS



    p_payload             CLOB;

    l_truck_number        VARCHAR2(100);

    l_exit_time           VARCHAR2(100);

    l_response            json_object_t;

    l_shipment_gid        VARCHAR2(240);

    l_http_status         NUMBER;

    l_track_response      CLOB;

    l_has_gate_in         BOOLEAN := FALSE;

    l_has_gate_out        BOOLEAN := FALSE;

    l_track_json          json_object_t;

    l_items_array         json_array_t;

    l_item_obj            json_object_t;

    l_status_code         VARCHAR2(200);

    l_api_url             VARCHAR2(2000);

    l_username            VARCHAR2(4000) :='NAQLEEN.INTEGRATION' ; -- set if required

    l_password            VARCHAR2(4000) :='NaqleenInt@123' ; -- set if required

    l_wallet_path         VARCHAR2(4000) := 'file:/u01/app/oracle/product/wallet'; -- set if required

    i                     PLS_INTEGER;

BEGIN

    -- Convert the BLOB payload to a CLOB (ensure payload is convertible in your environment)

    p_payload := TO_CLOB(payload);



    apex_json.initialize_clob_output;

    apex_json.open_object;



    -- Parse the JSON payload

    apex_json.parse(p_payload);



    -- Extract values from the JSON payload

    l_truck_number := apex_json.get_varchar2(p_path => 'truck_number');

    l_exit_time    := apex_json.get_varchar2(p_path => 'exit_time');



    -- Initialize the response object

    l_response := json_object_t();



    -- Lookup shipment_xid based on truck number



    BEGIN

        SELECT s.shipment_xid

        INTO   l_shipment_gid

        FROM   xxotm_vehicle_master_t vm

               , xxotm_shipments_t s

                 WHERE vm.truck_nbr = s.power_unit

        AND   vm.truck_nbr = l_truck_number;

    EXCEPTION

        WHEN NO_DATA_FOUND THEN

            l_shipment_gid := NULL;

        WHEN OTHERS THEN

            l_shipment_gid := NULL;

            DBMS_OUTPUT.PUT_LINE('Error fetching shipment: ' || SQLERRM);

    END;



    IF l_shipment_gid IS NOT NULL THEN

        -- build API URL (use your exact base URL)

        l_api_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'

                     || 'NAQLEEN.' || l_shipment_gid || '/trackingEvents';



        -- Prepare headers if needed

        apex_web_service.g_request_headers.DELETE;



        -- Call OTM to get tracking events

        BEGIN

            l_track_response := apex_web_service.make_rest_request(

                p_url         => l_api_url,

                p_http_method => 'GET',

                p_username    => l_username,

                p_password    => l_password,

                p_wallet_path => l_wallet_path

            );



            l_http_status := apex_web_service.g_status_code;

            DBMS_OUTPUT.PUT_LINE('OTM API Status: ' || l_http_status);



            IF l_http_status = 200 AND l_track_response IS NOT NULL THEN

                BEGIN

                    l_track_json := json_object_t(l_track_response);



                    IF l_track_json.has('items') THEN

                        l_items_array := json_array_t(l_track_json.get('items'));



                        DBMS_OUTPUT.PUT_LINE('Found ' || l_items_array.get_size || ' tracking events');

                        DBMS_OUTPUT.PUT_LINE('');



                        -- Loop through all tracking events

                        FOR i IN 0 .. l_items_array.get_size - 1 LOOP

                            l_item_obj := json_object_t(l_items_array.get(i));



                            IF l_item_obj.has('statusCodeGid') THEN

                                l_status_code := l_item_obj.get_string('statusCodeGid');



                                DBMS_OUTPUT.PUT_LINE('Event ' || (i+1) || ': ' || l_status_code);



                                -- Check for GATE IN event

                                IF UPPER(l_status_code) LIKE '%GATE IN%'

                                   OR UPPER(l_status_code) = 'NAQLEEN.GATE IN' THEN

                                    l_has_gate_in := TRUE;

                                    DBMS_OUTPUT.PUT_LINE(' GATE IN found');

                                END IF;



                                -- Check for GATE OUT event

                                IF UPPER(l_status_code) LIKE '%GATE OUT%'

                                   OR UPPER(l_status_code) = 'NAQLEEN.GATE OUT' THEN

                                    l_has_gate_out := TRUE;

                                    DBMS_OUTPUT.PUT_LINE('   GATE OUT found');

                                END IF;

                            END IF;

                        END LOOP;



                        DBMS_OUTPUT.PUT_LINE('');

                        DBMS_OUTPUT.PUT_LINE('Tracking Events Summary:');

                        DBMS_OUTPUT.PUT_LINE('  Has GATE IN: ' || CASE WHEN l_has_gate_in THEN 'YES' ELSE 'NO' END);

                        DBMS_OUTPUT.PUT_LINE('  Has GATE OUT: ' || CASE WHEN l_has_gate_out THEN 'YES' ELSE 'NO' END);



                    ELSE

                        DBMS_OUTPUT.PUT_LINE(' No tracking events found in response');

                    END IF;



                EXCEPTION

                    WHEN OTHERS THEN

                        DBMS_OUTPUT.PUT_LINE(' Error parsing tracking events: ' || SQLERRM);

                        l_has_gate_in := FALSE;

                        l_has_gate_out := FALSE;

                END;

            ELSE

                l_response.put('response_code', 404);

                l_response.put('response_message', 'No Data Found from OTM tracking API');

            END IF;



        EXCEPTION

            WHEN OTHERS THEN

                DBMS_OUTPUT.PUT_LINE('Error calling OTM tracking API: ' || SQLERRM);

                l_response.put('response_code', 500);

                l_response.put('response_message', 'OTM call failed: ' || SUBSTR(SQLERRM,1,200));

        END;

    END IF;



    -- Update vehicle master record

    BEGIN

        UPDATE xxotm_vehicle_master_t

        SET    exit_time = l_exit_time,

               status    = 'NAQLEEN.VEHICLE EXIT'

        WHERE  truck_nbr = l_truck_number;



        COMMIT;



        IF SQL%ROWCOUNT > 0 AND l_has_gate_in THEN

            -- Call your post_otm_tracking_events procedure (verify parameters)

            BEGIN

                post_otm_tracking_events(

                    p_integration_name => 'XX_OTM_POST_VEHICLE_EXIT_APEX',

                    p_statuscodegid    => 'NAQLEEN.VEHICLE EXIT',

                    p_shipmentxid      => l_shipment_gid,

                    p_attribute1       => NULL,

                    p_attribute2       => NULL,

                    p_attribute3       => NULL,

                    p_attribute4       => NULL,

                    p_attribute5       => NULL,

                    p_attribute6       => NULL,

                    p_attribute7       => NULL,

                    p_attribute8       => NULL,

                    p_attribute9       => NULL,

                    p_attribute10      => NULL

                );

            EXCEPTION

                WHEN OTHERS THEN

                    DBMS_OUTPUT.PUT_LINE('Error posting OTM tracking event: ' || SQLERRM);

            END;

        END IF;



        IF SQL%ROWCOUNT > 0 THEN

            l_response.put('response_code', 200);

            l_response.put('response_message', 'Success');

        ELSE

            l_response.put('response_code', 404);

            l_response.put('response_message', 'No Data Found');

        END IF;



    EXCEPTION

        WHEN OTHERS THEN

            l_response.put('response_code', 400);

            l_response.put('response_message', SUBSTR(SQLERRM,1,200));

    END;



    -- Write the response in JSON format

    apex_json.write('response_code', TO_NUMBER(l_response.get('response_code').to_string));

    apex_json.write('response_message', REPLACE(l_response.get('response_message').to_string(), '', ''));



    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);



END XX_OTM_POST_VEHICLE_EXIT_APEX;




-- PROCEDURE: XX_OTM_POWER_UNITS_SYNC



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POWER_UNITS_SYNC (

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

    l_merge_sql       varchar2(4000);

    

    -- Variable to store the value from API

    v_powerUnitXid    varchar2(100);

   

begin

    l_params := utl_url.escape(l_query_params);

    l_full_url := l_base_url || '?' || l_params;

    l_next_page_url := l_full_url;

    

    while l_next_page_url is not null and lower(l_next_page_url) <> 'null'

    loop

        l_credentials := l_username || ':' || l_password;

        l_encoded_cred := utl_raw.cast_to_varchar2(

            utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials))

        );

        

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

        

        -- Handle pagination

        if jo.has('hasMore') and jo.get_boolean('hasMore') then

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



        -- Process items

        if jo.get('items').is_array then

            l_results := json_array_t.parse(jo.get('items').to_clob());

        else

            return;

        end if;



        for idx in 0..l_results.get_size() - 1 loop

            l_item := treat(l_results.get(idx) as json_object_t);

            

            -- ✅ Extract powerUnitXid from JSON

            v_powerUnitXid := l_item.get_string('powerUnitXid');

           

            -- ✅ MERGE: Sync powerUnitXid → TRUCK_NBR column

            l_merge_sql := 'MERGE INTO ' || l_table_name || ' t '

                        || 'USING (SELECT :truck_nbr AS TRUCK_NBR FROM dual) s '

                        || 'ON (t.TRUCK_NBR = s.TRUCK_NBR) '

                        || 'WHEN NOT MATCHED THEN INSERT (TRUCK_NBR) '

                        ||   'VALUES (s.TRUCK_NBR)';



            execute immediate l_merge_sql

                using v_powerUnitXid;



            commit;

        end loop;

    end loop;

    

exception

    when others then

        dbms_output.put_line('Error occurred XX_OTM_POWER_UNITS_SYNC: ' 

            || sqlerrm || ' | ' || utl_http.get_detailed_sqlerrm);

end xx_otm_power_units_sync;




-- PROCEDURE: XX_OTM_STUFFING_CONTAINER_DETAILS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_STUFFING_CONTAINER_DETAILS (

    p_container_nbr IN VARCHAR2

) AS

    l_customer VARCHAR2(100);

    l_container_found NUMBER := 0;



    CURSOR c_items IS

    SELECT item_code,

           cargo_description AS description,

           qty AS actual_quantity,

           qty_uom AS quantity_uom

      FROM xxotm_customer_inventory_t

     WHERE container_nbr = p_container_nbr;

BEGIN

    -- Validate container parameter

    IF p_container_nbr IS NULL THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'Container number is required');

        apex_json.write('response_code', 400);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

        RETURN;

    END IF;



    -- Get customer name and verify container exists

    BEGIN

        SELECT cust_name, COUNT(*)

        INTO l_customer, l_container_found

        FROM xxotm_customer_inventory_t

        WHERE container_nbr = p_container_nbr

        GROUP BY cust_name;



        IF l_container_found = 0 THEN

            apex_json.initialize_clob_output;

            apex_json.open_object;

            apex_json.write('response_message', 'No Data found');

            apex_json.write('response_code', 404);

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

            RETURN;

        END IF;

    EXCEPTION

        WHEN NO_DATA_FOUND THEN

            apex_json.initialize_clob_output;

            apex_json.open_object;

            apex_json.write('response_message', 'No Data Found');

            apex_json.write('response_code', 404);

            apex_json.close_object;

            htp.prn(apex_json.get_clob_output);

                dbms_output.put_line(apex_json.get_clob_output);



            RETURN;

    END;



    apex_json.initialize_clob_output;

    apex_json.open_object;

    apex_json.write('response_message', 'Success');

    apex_json.write('response_code', 200);

    apex_json.open_object('data');

    apex_json.write('container_number', p_container_nbr);

    apex_json.write('customer', l_customer);



    apex_json.open_array('items');

    FOR r_item IN c_items LOOP

        apex_json.open_object;

        apex_json.write('item_code', r_item.item_code);

        apex_json.write('description', r_item.description);

        apex_json.write('actual_quantity', r_item.actual_quantity);

        apex_json.write('quantity_uom', r_item.quantity_uom);

        apex_json.close_object;

    END LOOP;

    apex_json.close_array;



    apex_json.close_object;

    apex_json.close_object;

    htp.prn(apex_json.get_clob_output);

    dbms_output.put_line(apex_json.get_clob_output);



EXCEPTION

    WHEN OTHERS THEN

        apex_json.initialize_clob_output;

        apex_json.open_object;

        apex_json.write('response_message', 'Error: ' || SQLERRM);

        apex_json.write('response_code', 500);

        apex_json.close_object;

        htp.prn(apex_json.get_clob_output);

END xx_otm_stuffing_container_details;




-- PROCEDURE: XX_OTM_SUBMIT_CONTAINER_POSITION



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SUBMIT_CONTAINER_POSITION (

   p_body in blob

) as

   l_clob          clob;

   l_container_nbr varchar2(100);

   l_shipment_nbr  varchar2(100);

   l_position      varchar2(200);



   -- Position components

   l_terminal      varchar2(50);

   l_block         varchar2(50);

   l_row           varchar2(50);

   l_lot           varchar2(50);

   l_level         varchar2(50);



   -- API response

   l_api_response  clob;

   l_response_code number := 200;

   l_response_msg  varchar2(4000) := 'Success';



   -- Blob conversion

   l_dest_offset   integer := 1;

   l_src_offset    integer := 1;

   l_lang_context  integer := dbms_lob.default_lang_ctx;

   l_warning       integer;

begin

   -- Convert BLOB to CLOB

   if p_body is not null then

      dbms_lob.createtemporary(

         l_clob,

         true

      );

      dbms_lob.converttoclob(

         dest_lob     => l_clob,

         src_blob     => p_body,

         amount       => dbms_lob.lobmaxsize,

         dest_offset  => l_dest_offset,

         src_offset   => l_src_offset,

         blob_csid    => dbms_lob.default_csid,

         lang_context => l_lang_context,

         warning      => l_warning

      );

   else

      l_clob := empty_clob();

   end if;



   -- Parse JSON

   apex_json.parse(l_clob);

   l_container_nbr := apex_json.get_varchar2('container_nbr');

   l_shipment_nbr := apex_json.get_varchar2('shipment');

   l_position := apex_json.get_varchar2('position');



   -- Parse position string: 'terminal-block-row-lot-level'

   l_terminal := regexp_substr(

      l_position,

      '[^-]+',

      1,

      1

   );

   l_block := regexp_substr(

      l_position,

      '[^-]+',

      1,

      2

   );

   l_row := regexp_substr(

      l_position,

      '[^-]+',

      1,

      3

   );

   l_lot := regexp_substr(

      l_position,

      '[^-]+',

      1,

      4

   );

   l_level := regexp_substr(

      l_position,

      '[^-]+',

      1,

      5

   );

   if l_response_code = 200 then

      begin

         post_otm_tracking_events(

            p_integration_name => 'XX_OTM_POST_POSITION_CONTAINER',

            p_statuscodegid    => 'NAQLEEN.CONTAINER STORED',

            p_shipmentxid      => l_shipment_nbr,

            p_attribute1       => l_position,

            x_response         => l_api_response

         );



         if l_api_response like '%Error%' then

            l_response_code := 500;

            l_response_msg := 'OTM API Error: ' || l_api_response;

         end if;

      exception

         when others then

            l_response_code := 500;

            l_response_msg := 'Error calling tracking events: ' || sqlerrm;

      end;

   end if;

   -- Update position_master





   -- Update container_inventory

   if l_response_code = 200 then

      begin

         update xxotm_container_inventory_t

            set

            position = l_position

          where container_nbr = l_container_nbr;



         if sql%rowcount = 0 then

            -- Container not found in inventory table, but we continue

            null;

         end if;

      exception

         when others then

            l_response_code := 500;

            l_response_msg := 'Error updating container inventory: ' || sqlerrm;

      end;

   end if;



   begin

      update xxotm_position_master_t

         set

         is_occupied = l_container_nbr

       where terminal = l_terminal

         and block = l_block

         and row_no = to_number(l_row)

         and lot_no = to_number(l_lot)

         and level_no = to_number(l_level);



      if sql%rowcount = 0 then

         l_response_code := 404;

         l_response_msg := 'Position not found in position master';

      end if;

   exception

      when others then

         l_response_code := 500;

         l_response_msg := 'Error updating position master: ' || sqlerrm;

   end;





   -- Commit or rollback

   if l_response_code = 200 then

      commit;

   else

      rollback;

   end if;



   -- Clean up CLOB

   if dbms_lob.istemporary(l_clob) = 1 then

      dbms_lob.freetemporary(l_clob);

   end if;



   -- Generate response

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_message',

      l_response_msg

   );

   apex_json.write(

      'response_code',

      l_response_code

   );

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      rollback;

      if dbms_lob.istemporary(l_clob) = 1 then

         dbms_lob.freetemporary(l_clob);

      end if;



      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_submit_container_position;




-- PROCEDURE: XX_OTM_SUBMIT_GATE_IN



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SUBMIT_GATE_IN (

   p_blob_content in blob

) as

   l_json_content   clob;

   l_values         apex_json.t_values;

   l_shipment_nbr   varchar2(100);

   l_container_nbr  varchar2(100);



    -- Document variables

   l_document_count pls_integer;

   l_doc_xid        varchar2(100);

   l_doc_name       varchar2(200);

   l_doc_mime       varchar2(100);

   l_doc_content    clob;

   l_doc_response   clob;



    -- Tracking Event variables

   l_event_count    pls_integer;

   l_status_code    varchar2(100);

   l_event_response clob;



    -- Error handling

   l_error_message  clob;

   l_has_error      boolean := false;



    -- Blob conversion variables

   l_dest_offset    integer := 1;

   l_src_offset     integer := 1;

   l_lang_context   integer := dbms_lob.default_lang_ctx;

   l_warning        integer;

begin

    -- Convert BLOB to CLOB

   if p_blob_content is not null then

      dbms_lob.createtemporary(

         l_json_content,

         true

      );

      dbms_lob.converttoclob(

         dest_lob     => l_json_content,

         src_blob     => p_blob_content,

         amount       => dbms_lob.lobmaxsize,

         dest_offset  => l_dest_offset,

         src_offset   => l_src_offset,

         blob_csid    => dbms_lob.default_csid,

         lang_context => l_lang_context,

         warning      => l_warning

      );

   else

      l_json_content := empty_clob();

   end if;



    -- Parse the JSON content

   apex_json.parse(

      p_values => l_values,

      p_source => l_json_content

   );



    -- Extract top-level fields

   l_shipment_nbr := apex_json.get_varchar2(

      p_values => l_values,

      p_path   => 'shipment_nbr'

   );

   l_container_nbr := apex_json.get_varchar2(

      p_values => l_values,

      p_path   => 'container_nbr'

   );



    -- Process Documents

   l_document_count := apex_json.get_count(

      p_values => l_values,

      p_path   => 'documents'

   );

   if l_document_count > 0 then

      for i in 1..l_document_count loop

         l_doc_xid := apex_json.get_varchar2(

            p_values => l_values,

            p_path   => 'documents[%d].documentXid',

            p0       => i

         );

         l_doc_name := apex_json.get_varchar2(

            p_values => l_values,

            p_path   => 'documents[%d].documentName',

            p0       => i

         );

         l_doc_mime := apex_json.get_varchar2(

            p_values => l_values,

            p_path   => 'documents[%d].documentMimeType',

            p0       => i

         );

         l_doc_content := apex_json.get_clob(

            p_values => l_values,

            p_path   => 'documents[%d].documentBase64Content',

            p0       => i

         );





      -- Call post_otm_documents

         post_otm_documents(

            p_documentxid      => l_doc_xid,

            p_documentfilename => l_doc_name,

            p_ownerobjectgid   => l_shipment_nbr,

            p_clobcontent      => l_doc_content,

            p_documentmimetype => l_doc_mime,

            p_documentdefgid   => null,

            x_response_clob    => l_doc_response

         );



      -- Check for error in response

         if l_doc_response like 'Error%' then

            l_has_error := true;

            l_error_message := l_error_message

                               || 'Document Error ('

                               || l_doc_xid

                               || '): '

                               || l_doc_response

                               || '; ';

         end if;

      end loop;

   end if;

    -- Process Tracking Events

   l_event_count := apex_json.get_count(

      p_values => l_values,

      p_path   => 'trackingEvents'

   );





      -- Call post_otm_tracking_events

   post_otm_tracking_events(

      p_statuscodegid => 'NAQLEEN.VEHICLE ENTERED',

      p_shipmentxid   => l_shipment_nbr,

      x_response      => l_event_response

   );

   if l_event_response like 'Error%' then

      l_has_error := true;

      l_error_message := l_error_message

                         || 'Event Error (NAQLEEN.VEHICLE ENTERED): '

                         || l_event_response

                         || '; ';

   end if;

   post_otm_tracking_events(

      p_statuscodegid => 'NAQLEEN.GATE IN',

      p_shipmentxid   => l_shipment_nbr,

      x_response      => l_event_response

   );





      -- Check for error in response

   if l_event_response like 'Error%' then

      l_has_error := true;

      l_error_message := l_error_message

                         || 'Event Error (NAQLEEN.GATE IN): '

                         || l_event_response

                         || '; ';

   end if;



    -- Clean up temporary CLOB

   if dbms_lob.istemporary(l_json_content) = 1 then

      dbms_lob.freetemporary(l_json_content);

   end if;



    -- Construct Response

   apex_json.initialize_clob_output;

   apex_json.open_object;

   if l_has_error then

      apex_json.write(

         'response_message',

         'Partial or Full Failure: ' || l_error_message

      );

      apex_json.write(

         'response_code',

         500

      );

   else

      apex_json.write(

         'response_message',

         'Success'

      );

      apex_json.write(

         'response_code',

         200

      );

   end if;



   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

        -- Clean up temporary CLOB in case of error

      if dbms_lob.istemporary(l_json_content) = 1 then

         dbms_lob.freetemporary(l_json_content);

      end if;



      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_submit_gate_in;




-- PROCEDURE: XX_OTM_SUBMIT_GATE_OUT



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SUBMIT_GATE_OUT (

   p_body in blob

) as

   l_clob          clob;

   l_shipment_nbr  varchar2(100);

   l_truck_nbr     varchar2(100);

   l_status_code   varchar2(100);

   l_api_response  clob;

   l_response_code number := 200;

   l_response_msg  varchar2(4000) := 'Success';

    -- Blob conversion variables

   l_dest_offset   integer := 1;

   l_src_offset    integer := 1;

   l_lang_context  integer := dbms_lob.default_lang_ctx;

   l_warning       integer;

begin

   l_clob := to_clob(p_body);





    -- Parse JSON

   apex_json.parse(l_clob);

   l_shipment_nbr := apex_json.get_varchar2('shipment_nbr');

   l_truck_nbr := apex_json.get_varchar2('truck_nbr');

   l_status_code := 'NAQLEEN.GATE OUT';



    -- Update Vehicle Master Table

   begin

      update xxotm_vehicle_master_t

         set

         status = l_status_code

       where truck_nbr = l_truck_nbr

         and exit_time is null;



      commit;

   exception

      when others then

         l_response_code := 500;

         l_response_msg := 'Error updating vehicle master: ' || sqlerrm;

   end;



    -- Call OTM Tracking Events API if local update was successful (or proceeded)

   if l_response_code = 200 then

        -- Strip 'NAQLEEN.' from shipment number if present, as POST_OTM_TRACKING_EVENTS adds it

      if l_shipment_nbr like 'NAQLEEN.%' then

         l_shipment_nbr := substr(

            l_shipment_nbr,

            9

         );

      end if;

      post_otm_tracking_events(

         p_statuscodegid => l_status_code,

         p_shipmentxid   => l_shipment_nbr,

         x_response      => l_api_response

      );



        -- Check API response

      if l_api_response like '%Error%' then

         l_response_code := 500;

         l_response_msg := 'OTM API Error: ' || l_api_response;

      end if;

   end if;



    -- Clean up temporary CLOB

   if dbms_lob.istemporary(l_clob) = 1 then

      dbms_lob.freetemporary(l_clob);

   end if;



    -- Generate Response

   apex_json.initialize_clob_output;

   apex_json.open_object;

   apex_json.write(

      'response_mssage',

      l_response_msg

   );

   apex_json.write(

      'response_code',

      l_response_code

   );

   apex_json.close_object;

   htp.prn(apex_json.get_clob_output);

   apex_json.free_output;

exception

   when others then

      if dbms_lob.istemporary(l_clob) = 1 then

         dbms_lob.freetemporary(l_clob);

      end if;



      apex_json.free_output;

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_message',

         'Error: ' || sqlerrm

      );

      apex_json.write(

         'response_code',

         500

      );

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

      apex_json.free_output;

end xx_otm_submit_gate_out;




-- PROCEDURE: XX_OTM_UPDATE_CONTAINER_NUMBERS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_UPDATE_CONTAINER_NUMBERS AS

    V_SQL VARCHAR2(4000);

    V_COUNT NUMBER;

BEGIN

    -- Get count of available container numbers from shipments

    SELECT COUNT(DISTINCT cont_no) INTO V_COUNT

    FROM xxotm_shipments_t 

    WHERE cont_no IS NOT NULL 

    AND cont_no != ' ';

    

    DBMS_OUTPUT.PUT_LINE('Available container patterns: ' || V_COUNT);

    

    -- Update container inventory with random container numbers from shipments

    -- Using DBMS_RANDOM to select random container numbers

    V_SQL := 'UPDATE XXOTM_CONTAINER_INVENTORY_T ci 

              SET container_nbr = (

                SELECT cont_no 

                FROM (

                  SELECT cont_no, 

                         ROW_NUMBER() OVER (ORDER BY DBMS_RANDOM.RANDOM) as rn

                  FROM xxotm_shipments_t 

                  WHERE cont_no IS NOT NULL 

                  AND cont_no != '' ''

                ) sh 

                WHERE sh.rn = MOD(DBMS_RANDOM.RANDOM, ' || V_COUNT || ') + 1

              )';

    

    EXECUTE IMMEDIATE V_SQL;

    

    COMMIT;

    

    DBMS_OUTPUT.PUT_LINE('Container numbers updated successfully');

    

    -- Show sample results

    FOR REC IN (SELECT container_nbr FROM XXOTM_CONTAINER_INVENTORY_T WHERE ROWNUM <= 5 ORDER BY DBMS_RANDOM.RANDOM) LOOP

        DBMS_OUTPUT.PUT_LINE('Updated container: ' || REC.container_nbr);

    END LOOP;

    

EXCEPTION

    WHEN OTHERS THEN

        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);

        ROLLBACK;

END XX_OTM_UPDATE_CONTAINER_NUMBERS;




-- PROCEDURE: XX_OTM_UPDATE_CURRENT_LOCATION



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_UPDATE_CURRENT_LOCATION (

    P_PAYLOAD IN BLOB

) AS

    V_DRIVER_ID       NUMBER;

    V_LATITUDE        NUMBER;

    V_LONGITUDE       NUMBER;

    V_LOCATION_STRING VARCHAR2(200);

    V_DRIVER_EXISTS   NUMBER;

    V_PAYLOAD_CLOB    CLOB;

BEGIN

    -- Convert BLOB to CLOB for JSON parsing

    V_PAYLOAD_CLOB := TO_CLOB(P_PAYLOAD);



    -- Initialize JSON parser

    APEX_JSON.PARSE(V_PAYLOAD_CLOB);



    -- Extract values from JSON payload

    V_DRIVER_ID := APEX_JSON.GET_NUMBER(P_PATH => 'driver_id');

    V_LATITUDE := APEX_JSON.GET_NUMBER(P_PATH => 'latitude');

    V_LONGITUDE := APEX_JSON.GET_NUMBER(P_PATH => 'longitude');



    -- Validate input parameters

    IF V_DRIVER_ID IS NULL OR V_LATITUDE IS NULL OR V_LONGITUDE IS NULL THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 400);

            APEX_JSON.WRITE('response_message', 'Driver ID, latitude, and longitude are required');

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

        RETURN;

    END IF;



    -- Check if driver exists

    SELECT

        COUNT(*) INTO V_DRIVER_EXISTS

    FROM

        XX_DRIVER_INFO

    WHERE

        DRIVER_ID = V_DRIVER_ID;

    IF V_DRIVER_EXISTS = 0 THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 404);

            APEX_JSON.WRITE('response_message', 'Driver not found');

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

        RETURN;

    END IF;



    -- Format location as 'lat,long'

    V_LOCATION_STRING := V_LATITUDE

                         || ','

                         || V_LONGITUDE;



    -- Update the driver's current location

    UPDATE XX_DRIVER_INFO

    SET

        CURRENT_LOC = V_LOCATION_STRING,

        LAST_UPDATED_DATE = SYSDATE,

        LAST_UPDATED_BY = USER

    WHERE

        DRIVER_ID = V_DRIVER_ID;



    -- Check if update was successful

    IF SQL%ROWCOUNT = 0 THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

            APEX_JSON.WRITE('response_message', 'Failed to update location');

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

        RETURN;

    END IF;



    -- Return success response

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('response_message', 'Location updated successfully');

    APEX_JSON.WRITE('driver_id', V_DRIVER_ID);

    APEX_JSON.WRITE('location', V_LOCATION_STRING);

        APEX_JSON.WRITE('updated_at', TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));

    APEX_JSON.CLOSE_OBJECT;

    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN OTHERS THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                    || SQLERRM);

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END xx_otm_UPDATE_CURRENT_LOCATION;




-- PROCEDURE: XX_OTM_UPDATE_ROLE_ACCESS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_UPDATE_ROLE_ACCESS (

    P_SCREENS IN CLOB

) AS

    V_SCREEN_COUNT  NUMBER := 0;

    V_ROLE          VARCHAR2(100);

    V_JSON_OBJ      JSON_OBJECT_T;

    V_SCREENS_ARRAY JSON_ARRAY_T;

    V_SCREEN_OBJ    JSON_OBJECT_T;

    V_SCREEN_NAME   VARCHAR2(240);

    V_SCREEN_PATH   VARCHAR2(500);

    V_SCREEN_ACTIVE VARCHAR2(1);

BEGIN

    -- Parse the JSON payload to extract role and screens

    V_JSON_OBJ := JSON_OBJECT_T.PARSE(P_SCREENS);

    

    -- Extract role from JSON

    V_ROLE := V_JSON_OBJ.GET_STRING('role');

    

    -- Get screens array

    V_SCREENS_ARRAY := V_JSON_OBJ.GET_ARRAY('screens');

    

    -- Inactivate all existing screens for the role

    UPDATE XX_ROLE_CONFIG

SET

    IS_ACTIVE = 'N',

           LAST_UPDATED_DATE = SYSDATE,

           LAST_UPDATED_BY = USER

WHERE

    ROLE = UPPER(TRIM(V_ROLE));



    -- Upsert new role screen access from payload

IF V_SCREENS_ARRAY IS NOT NULL AND V_SCREENS_ARRAY.GET_SIZE > 0 THEN

    FOR I IN 0 .. V_SCREENS_ARRAY.GET_SIZE - 1 LOOP

        V_SCREEN_OBJ := JSON_OBJECT_T(V_SCREENS_ARRAY.GET(I));

        V_SCREEN_NAME := V_SCREEN_OBJ.GET_STRING('screen_name');

        V_SCREEN_PATH := V_SCREEN_OBJ.GET_STRING('screen_path');

        V_SCREEN_ACTIVE := CASE

            WHEN V_SCREEN_OBJ.GET_BOOLEAN('is_active') = TRUE THEN

                'Y'

            ELSE

                'N'

        END;



        -- Upsert into role config

        MERGE INTO XX_ROLE_CONFIG RC USING (

            SELECT

                UPPER(TRIM(V_ROLE)) AS ROLE,

                V_SCREEN_NAME       AS SCREEN_NAME

            FROM

                DUAL

        ) SRC ON (RC.ROLE = SRC.ROLE

        AND RC.SCREEN_NAME = SRC.SCREEN_NAME) WHEN MATCHED THEN

            UPDATE

            SET

                RC.SCREEN_PATH = V_SCREEN_PATH,

                RC.IS_ACTIVE = V_SCREEN_ACTIVE,

                RC.LAST_UPDATED_DATE = SYSDATE,

                RC.LAST_UPDATED_BY = USER WHEN NOT MATCHED THEN INSERT (

                    ROLE,

                    SCREEN_NAME,

                    SCREEN_PATH,

                    IS_ACTIVE,

                    CREATED_DATE,

                    CREATED_BY,

                    LAST_UPDATED_DATE,

                    LAST_UPDATED_BY

            ) VALUES (

                    UPPER(TRIM(V_ROLE)),

                    V_SCREEN_NAME,

                    V_SCREEN_PATH,

                    V_SCREEN_ACTIVE,

                    SYSDATE,

                    USER,

                    SYSDATE,

                    USER

                );

            V_SCREEN_COUNT := V_SCREEN_COUNT + 1;

        END LOOP;

    END IF;



    COMMIT;



    -- Success response

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('response_message', 'Role access updated successfully');

    APEX_JSON.WRITE('role', V_ROLE);

    APEX_JSON.WRITE('screens_updated', V_SCREEN_COUNT);

    APEX_JSON.CLOSE_OBJECT;

    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN OTHERS THEN

        ROLLBACK;

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                        || SQLERRM);

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END XX_OTM_UPDATE_ROLE_ACCESS;




-- PROCEDURE: XX_OTM_UPDATE_STOP_STATUS



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_UPDATE_STOP_STATUS (

    P_STOP_ID IN NUMBER,

    P_STATUS IN VARCHAR2

) AS

    V_STOP_EXISTS NUMBER;

BEGIN

    -- Validate input parameters

    IF P_STOP_ID IS NULL OR P_STATUS IS NULL THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 400);

            APEX_JSON.WRITE('response_message', 'Stop ID and Status are required');

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

        RETURN;

    END IF;



    -- Validate status value

    IF P_STATUS NOT IN ('PENDING', 'COMPLETED', 'SKIPPED') THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 400);

            APEX_JSON.WRITE('response_message', 'Invalid status. Must be PENDING, COMPLETED, or SKIPPED');

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

        RETURN;

    END IF;



    -- Check if stop exists

    SELECT COUNT(*) INTO V_STOP_EXISTS

    FROM XX_SHIPMENT_STOPS

    WHERE STOP_ID = P_STOP_ID;



    IF V_STOP_EXISTS = 0 THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 404);

            APEX_JSON.WRITE('response_message', 'Stop not found');

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

        RETURN;

    END IF;



    -- Update stop status

    UPDATE XX_SHIPMENT_STOPS

    SET

        STATUS = P_STATUS,

        LAST_UPDATED_DATE = SYSDATE,

        LAST_UPDATED_BY = USER

    WHERE

        STOP_ID = P_STOP_ID;



    -- Return success response

    APEX_JSON.INITIALIZE_CLOB_OUTPUT;

    APEX_JSON.OPEN_OBJECT;

        APEX_JSON.WRITE('response_code', 200);

        APEX_JSON.WRITE('response_message', 'Stop status updated successfully');

        APEX_JSON.WRITE('stop_id', P_STOP_ID);

        APEX_JSON.WRITE('new_status', P_STATUS);

        APEX_JSON.WRITE('updated_at', TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));

    APEX_JSON.CLOSE_OBJECT;

    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

EXCEPTION

    WHEN OTHERS THEN

        APEX_JSON.INITIALIZE_CLOB_OUTPUT;

        APEX_JSON.OPEN_OBJECT;

            APEX_JSON.WRITE('response_code', 500);

        APEX_JSON.WRITE('response_message', 'Unexpected error: '

                                            || SQLERRM);

        APEX_JSON.CLOSE_OBJECT;

        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);

END xx_otm_UPDATE_STOP_STATUS;




-- PROCEDURE: XX_OTM_VALIDATE_USER



  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_VALIDATE_USER (

   p_email    in varchar2,

   p_password in varchar2

) as

   v_user_id      number;

   v_username     varchar2(240);

   v_email        varchar2(240);

   v_role         varchar2(50);

   v_created      date;

   v_last_login   date;

   v_is_active    char(1);

   v_screen_count number := 0;



    -- Cursor for screens

   cursor c_screens is

   select r.screen_name,

          r.screen_path,

          r.is_active

     from xx_role_config r

    where r.role = v_role

      and r.is_active = 'Y'

    order by r.screen_name;

begin

   begin

      select id,

             username,

             email,

             role,

             created_date,

             nvl(

                lastloginat,

                created_date

             ),

             is_active

        into

         v_user_id,

         v_username,

         v_email,

         v_role,

         v_created,

         v_last_login,

         v_is_active

        from xx_user_config

       where upper(email) = upper(trim(p_email))

         and password = trim(p_password);



        -- Check if user is active

      if v_is_active = 'N' then

         apex_json.initialize_clob_output;

         apex_json.open_object;

         apex_json.write(

            'response_code',

            403

         );

         apex_json.write(

            'response_message',

            'User account is inactive: ' || p_email

         );

         apex_json.write(

            'email',

            p_email

         );

         apex_json.write(

            'role',

            v_role

         );

         apex_json.write(

            'is_active',

            v_is_active

         );

         apex_json.close_object;

         htp.prn(apex_json.get_clob_output);

         return;

      end if;



        -- Update last login time

      update xx_user_config

         set lastloginat = sysdate,

             last_updated_date = sysdate,

             last_updated_by = user

       where id = v_user_id;

      commit;



        -- Success JSON with user info including screens

      apex_json.initialize_clob_output;

      apex_json.open_object;

      apex_json.write(

         'response_code',

         200

      );

      apex_json.write(

         'response_message',

         'User validated successfully'

      );



            -- User information with screens included

      apex_json.open_object('user_info');

      apex_json.write(

         'id',

         v_user_id

      );

      apex_json.write(

         'username',

         v_username

      );

      apex_json.write(

         'email',

         v_email

      );

      apex_json.write(

         'role',

         v_role

      );

      apex_json.write(

         'is_active',

         v_is_active

      );

      apex_json.write(

         'created_at',

         to_char(

            v_created,

            'YYYY-MM-DDTHH24:MI:SS'

         )

      );

      apex_json.write(

         'last_login_at',

         to_char(

            sysdate,

            'YYYY-MM-DDTHH24:MI:SS'

         )

      );



                -- Screens array within user_info

      apex_json.open_array('screens');

      for rec in c_screens loop

         v_screen_count := v_screen_count + 1;

         apex_json.open_object;

         apex_json.write(

            'screen_name',

            rec.screen_name

         );

         apex_json.write(

            'screen_path',

            rec.screen_path

         );

         apex_json.write(

            'is_active',

            case

                  when rec.is_active = 'Y' then

                     true

                  else false

               end

         );

         apex_json.close_object;

      end loop;



      apex_json.close_array;

      apex_json.close_object;

      apex_json.close_object;

      htp.prn(apex_json.get_clob_output);

   exception

      when no_data_found then

         apex_json.initialize_clob_output;

         apex_json.open_object;

         apex_json.write(

            'response_code',

            401

         );

         apex_json.write(

            'response_message',

            'Invalid email or password'

         );

         apex_json.close_object;

         htp.prn(apex_json.get_clob_output);

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

   end;

end xx_otm_validate_user;
