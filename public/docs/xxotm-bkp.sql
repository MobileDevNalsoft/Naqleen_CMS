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


-- PROCEDURE: POST_OTM_REFNUMS

  CREATE OR REPLACE EDITIONABLE PROCEDURE POST_OTM_REFNUMS (
   p_shipmentxid     varchar2 ,
   p_containerxid    varchar2 default null,
   p_refnum_qual_gid varchar2,
   p_refnum_value    varchar2 default null,
   x_response        out clob
) is
   l_clob          clob;
   l_input_request clob := null;
   l_error_msg     varchar2(240);
   l_url           varchar2(4000);
begin
   apex_web_service.g_request_headers(1).name := 'Content-Type';
   apex_web_service.g_request_headers(1).value := 'application/json';

   -- Construct URL with shipment XID
   l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
            || trim(both ' ' from ltrim(
      p_shipmentxid,
      'NAQLEEN.'
   ))
            || '/refnums';

   -- Prepare JSON request body
   l_input_request := '{
    shipmentRefnumQualGid: '
                      || p_refnum_qual_gid
                      || ',
    shipmentRefnumValue: '
                      || nvl(
      p_refnum_value,
      p_containerxid
   )
                      || ',
    domainName: NAQLEEN
}';

   begin
      l_clob := apex_web_service.make_rest_request(
         p_url         => l_url,
         p_http_method => 'POST',
         p_username    => 'NAQLEEN.INTEGRATION',
         p_password    => 'NaqleenInt@123',
         p_body        => l_input_request,
         p_wallet_path => 'file:/u01/app/oracle/product/wallet'
      );
      x_response := l_clob;
   exception
      when others then
         l_error_msg := 'Error occurred while calling Naqleen refnums service: ' || sqlerrm;
         dbms_output.put_line('ERROR: ' || l_error_msg);
         x_response := l_error_msg;
   end;

   -- Log payload
   begin
      insert into xx_ws_payloads_t values ( p_refnum_qual_gid,
                                            null,
                                            l_input_request,
                                            l_clob,
                                            sysdate,
                                            xx_payload_seq.nextval );
      commit;
   exception
      when others then
         null;
   end;

end post_otm_refnums;

-- PROCEDURE: POST_OTM_TRACKING_EVENTS

  CREATE OR REPLACE EDITIONABLE PROCEDURE POST_OTM_TRACKING_EVENTS (
   p_integration_name varchar2 default null,
   p_statuscodegid    varchar2 default null,
   p_shipmentxid      varchar2 default null,
    p_event_timestamp  VARCHAR2 DEFAULT NULL,
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
 	p_attribute_number1       NUMBER default null,
    p_attribute_number2       NUMBER  default null,
    p_attribute_number3      NUMBER  default null,
   x_response         out clob
) is

   l_clob           clob;
   l_input_request  clob := null;
   l_error_msg      varchar2(240);
   p_input_body     clob;
   l_transaction_id varchar2(240);
   l_parm_names     apex_application_global.vc_arr2;
   l_parm_values    apex_application_global.vc_arr2;
   
    FUNCTION format_iso_timestamp(p_iso_str VARCHAR2) RETURN VARCHAR2 IS
      l_parsed_ts TIMESTAMP WITH TIME ZONE;
   BEGIN
      IF p_iso_str IS NULL THEN
         RETURN TO_CHAR(SYS_EXTRACT_UTC(SYSTIMESTAMP), 'YYYY-MM-DDTHH24:MI:SS.FF6Z');
      END IF;
      
      -- Parse and reformat to exact ISO with 6-digit microseconds + Z
      l_parsed_ts := TO_TIMESTAMP_TZ(
        REGEXP_REPLACE(p_iso_str, '(\.\d{6})Z$', 'Z'),
        'YYYY-MM-DDTHH24:MI:SS.FF6Z'
      );
      
      RETURN TO_CHAR(l_parsed_ts, 'YYYY-MM-DDTHH24:MI:SS.FF6Z');
   EXCEPTION
      WHEN OTHERS THEN
         RETURN TO_CHAR(SYS_EXTRACT_UTC(SYSTIMESTAMP), 'YYYY-MM-DDTHH24:MI:SS.FF6Z');
   END format_iso_timestamp;
	
BEGIN
	
	
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
    timeZoneGid: UTC,
    eventdate: {
        value: '
                      || format_iso_timestamp(p_event_timestamp)
                      || '
    },
    eventReceivedDate: {
        value: '
                      || format_iso_timestamp(p_event_timestamp)
                      || '
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
  when
         p_integration_name = upper('XX_OTM_RELEASE_CONTAINER')
         and p_statuscodegid = 'NAQLEEN.CONTAINER RELEASED'
      then
          l_input_request := l_input_request
                            || ',attribute3: '
                            || p_attribute3
                            || ',attributeNumber1: '
                            || NVL(p_attribute_number1, 0)
                            || ',attributeNumber2: '
                            || NVL(p_attribute_number2, 0)
                            || ',attributeNumber3: '
                            || NVL(p_attribute_number3, 0)
                            || '
}';
  when
         p_integration_name = upper('XX_OTM_RESTACK_CONTAINER')
         and p_statuscodegid = 'NAQLEEN.CONTAINER_RESTACKED'
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

-- PROCEDURE: XXOTM_GET_OPERATORDETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XXOTM_GET_OPERATORDETAILS (
    p_operator_name IN VARCHAR2 DEFAULT NULL
) IS
    l_response_clob CLOB;
BEGIN
    -- 1. Input validation
    IF p_operator_name IS NULL THEN
        l_response_clob := JSON_OBJECT(
            'response_code' VALUE '400',
            'response_message' VALUE 'Missing required parameter: operator_name',
            'data' VALUE NULL
        );
        HTP.P(l_response_clob);
        RETURN;
    END IF;

    -- 2. Execute optimized SELECT into a JSON object (single row)
    BEGIN
        SELECT JSON_OBJECT(
            'response_code' VALUE '200',
            'response_message' VALUE 'Success',
            'data' VALUE JSON_OBJECT(
                'status' VALUE t.STATUS,
                'shipment_nbr' VALUE t.SHIPMENT_NBR,
                'assigned_date' VALUE TO_CHAR(t.ASSIGNED_DATE, 'YYYY-MM-DDTHH24:MI:SSZ')
            )
        ) INTO l_response_clob
        FROM XXOTM_TASK_ASSIGNMENT_T t
        JOIN XXOTM_CUSTOMER_INVENTORY_T c ON t.SHIPMENT_NBR = c.SHIPMENT_NBR
        WHERE t.OPERATOR = p_operator_name
        ORDER BY t.ASSIGNED_DATE DESC
        FETCH FIRST 1 ROWS ONLY;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
             l_response_clob := JSON_OBJECT(
                'response_code' VALUE '404',
                'response_message' VALUE 'No data found',
                'data' VALUE NULL
            );
    END;

    -- 6. Return/print the JSON
    HTP.P(l_response_clob);

EXCEPTION
    WHEN OTHERS THEN
        l_response_clob := JSON_OBJECT(
            'response_code' VALUE '500',
            'response_message' VALUE 'Internal Error: ' || SQLERRM,
            'data' VALUE NULL
        );
        HTP.P(l_response_clob);
END XXOTM_GET_OPERATORDETAILS;

-- PROCEDURE: XX_OTM_ASSIGN_TASK_TO_OPERATOR

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_ASSIGN_TASK_TO_OPERATOR (
   p_body in blob
) as
   l_clob          clob;
   l_shipment_nbr  varchar2(100);
   l_operator      varchar2(100);
   l_exists        number;
   l_response_msg  varchar2(200);
   l_response_code number := 200;
    
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
   l_shipment_nbr := apex_json.get_varchar2('shipment_nbr');
   l_operator := apex_json.get_varchar2('operator');
    
    -- Check if record exists in task assignment table
   select count(*)
     into l_exists
     from xxotm_task_assignment_t
    where shipment_nbr = l_shipment_nbr;

   if l_exists > 0 then
        -- Update existing record
      update xxotm_task_assignment_t
         set operator = l_operator,
             ASSIGNED_DATE	 = sysdate
       where shipment_nbr = l_shipment_nbr;

      l_response_msg := 'Task updated successfully';
   else
        -- Insert new record with status as null
      insert into xxotm_task_assignment_t (
         shipment_nbr,
         operator,
         status,
         ASSIGNED_DATE
         
      ) values ( l_shipment_nbr,
                 l_operator,
                 null,
                 sysdate
                  );

      l_response_msg := 'Task assigned successfully';
   end if;

   commit;
    
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
end xx_otm_assign_task_to_operator;


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

-- PROCEDURE: XX_OTM_DELETE_RESERVATION_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_DELETE_RESERVATION_CONTAINERS (
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


-- PROCEDURE: XX_OTM_GATE_IN_TRUCK_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GATE_IN_TRUCK_DETAILS (
   p_truck_nbr in varchar2
) as
  l_shipment_name    varchar2(100);
   l_shipment_nbr     varchar2(50);
   l_container_nbr    varchar2(50);
   l_container_type   varchar2(50);
   l_customer_name    varchar2(50);
   l_truck_nbr        varchar2(50);
   l_driver_name      varchar2(100);
   l_driver_iqama_nbr varchar2(50);
   l_otm_order_nbr    varchar2(50);
   l_data_found       boolean := false;
   l_truck_type       varchar2(50);
   -- Fallback variables
   l_fallback_count   number;
   l_shipment_attr2   varchar2(200);
   l_ref_qual         varchar2(200);
   l_ref_value        varchar2(200);
   l_has_booking      boolean;
   l_fetched_cus_name varchar2(200);
   l_refnum_count     number;
   -- API Variables
   l_url              varchar2(4000);
   l_response_clob    clob;
   l_items_count      number;
   l_status_type      varchar2(200);
   l_status_value     varchar2(200);
   l_is_active_trip   boolean;
   type t_cust_map is
      table of varchar2(200) index by varchar2(200);
   l_customers        t_cust_map;
   l_cust_idx         varchar2(200);
   cursor c_shipments is
   select st.shipment_xid,
          st.shipment_name,
          st.cont_no,
          st.container_type,
          st.customer_name
     from xxotm_shipments_t st
    where ( st.power_unit = p_truck_nbr
       or st.truck_3pl = p_truck_nbr );

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

   -- Iterate through shipments associated with the truck
   for r_ship in c_shipments loop
      l_is_active_trip := true;

      -- Construct API URL to get statuses
      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'
               || 'NAQLEEN.'
               || r_ship.shipment_xid
               || '/?expand=statuses';
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
        
         -- Parse JSON Response to check statuses
         apex_json.parse(l_response_clob);
         l_items_count := apex_json.get_count('statuses.items');
         if l_items_count is null then
            l_items_count := 0;
         end if;
         
         -- Iterate statuses
         for i in 1..l_items_count loop
            l_status_type := apex_json.get_varchar2(
               'statuses.items[%d].statusTypeGid',
               i
            );
            l_status_value := apex_json.get_varchar2(
               'statuses.items[%d].statusValueGid',
               i
            );
            if l_status_type = 'NAQLEEN.TRIP_STATUS' then
               if l_status_value = 'NAQLEEN.TRIP_COMPLETED'
               or l_status_value = 'NAQLEEN.TRIP_CANCELLED' then
                  l_is_active_trip := false;
                  l_data_found := false;
                  exit;
               else
                  l_data_found := true;
               end if;
            end if;
         end loop;

      exception
         when others then
            l_is_active_trip := false;
      end;

      if
         l_is_active_trip
         and l_data_found
      then
         -- Found Valid Active Shipment
         l_shipment_nbr := r_ship.shipment_xid;
         l_shipment_name := r_ship.shipment_name;
         l_container_nbr := r_ship.cont_no;
         l_container_type := r_ship.container_type;
         l_customer_name := r_ship.customer_name;
         l_truck_nbr := p_truck_nbr;

         -- Get Driver Details
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

         -- Get Order Release XID
         begin
            select order_release_xid
              into l_otm_order_nbr
              from xxotm_order_movements_t
             where shipment_xid = l_shipment_nbr
               and rownum = 1;
         exception
            when no_data_found then
               l_otm_order_nbr := null;
         end;

         l_data_found := true;
         exit;
      end if;

   end loop;

   if l_data_found then
      -- Output Shipment Details
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
         'customer_name',
         l_customer_name
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
   else
      -- Fallback: Truck Details + Customer List
      begin
         select truck_nbr,
                driver_name,
                driver_iqama,
                '3PL'
           into
            l_truck_nbr,
            l_driver_name,
            l_driver_iqama_nbr,
            l_truck_type
           from xxotm_vehicle_master_t
          where truck_nbr = p_truck_nbr
            and rownum = 1;
      exception
         when no_data_found then
            l_truck_nbr := p_truck_nbr;
            l_driver_name := null;
            l_driver_iqama_nbr := null;
            l_truck_type := '3PL';
      end;

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
         'truck_type',
         l_truck_type
      );
    
      -- Fallback: Get Customer List from API
      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'
      ;
      l_url := l_url || '?q=attribute1 eq TERMINAL';
      l_url := l_url || ' and perspective eq B';
      l_url := l_url || ' and statuses.statusTypeGid eq NAQLEEN.TRIP_STATUS';
      l_url := l_url || ' and statuses.statusValueGid eq NAQLEEN.TRIP_NOT_STARTED';
      l_url := l_url || ' and (shipmentName eq STUFFING or shipmentName eq DESTUFFING or shipmentName eq STORE_AS_IT_IS or shipmentName eq CRO or shipmentName eq LRO)'
      ;
      l_url := l_url || '&expand=refnums';
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
         l_fallback_count := apex_json.get_count('items');
         if l_fallback_count is null then
            l_fallback_count := 0;
         end if;
         for i in 1..l_fallback_count loop
            l_has_booking := true;
            l_fetched_cus_name := null;
            l_shipment_attr2 := apex_json.get_varchar2(
               'items[%d].attribute2',
               i
            );
             
            -- Iterate Refnums only to find CUS_NAME
            l_refnum_count := apex_json.get_count(
               'items[%d].refnums.items',
               i
            );
            if l_refnum_count is null then
               l_refnum_count := 0;
            end if;
            for j in 1..l_refnum_count loop
               l_ref_qual := apex_json.get_varchar2(
                  'items[%d].refnums.items[%d].shipmentRefnumQualGid',
                  i,
                  j
               );
               l_ref_value := apex_json.get_varchar2(
                  'items[%d].refnums.items[%d].shipmentRefnumValue',
                  i,
                  j
               );
               if l_ref_qual = 'NAQLEEN.CUS_NAME' then
                  l_fetched_cus_name := l_ref_value;
               end if;
            end loop;

            if
               l_fetched_cus_name is not null
               and l_shipment_attr2 is not null
            then
               l_customers(l_shipment_attr2) := l_fetched_cus_name;
            end if;
         end loop;

      exception
         when others then
            null;
      end;

      apex_json.open_array('customer_list');
      l_cust_idx := l_customers.first;
      while l_cust_idx is not null loop
         apex_json.open_object();
         apex_json.write(
            'customer_name',
            l_customers(l_cust_idx)
         );
         apex_json.write(
            'customer_nbr',
            l_cust_idx
         );
         apex_json.close_object();
         l_cust_idx := l_customers.next(l_cust_idx);
      end loop;
      apex_json.close_array;
   end if;

   apex_json.close_object; -- Close data object
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
end xx_otm_gate_in_truck_details;

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
	l_customer_name varchar2(100);
l_order_nbr varchar2(100);
cursor c_shipments is
   select s.shipment_xid,s.shipment_name,
   			s.liner_name,			
          s.cont_no,
          s.container_type,
          o.ORDER_RELEASE_XID
     from xxotm_shipments_t s, xxotm_order_movements_t o
    where 
    s.shipment_xid = o.shipment_xid AND 
    (power_unit = p_truck_nbr
       or truck_3pl = p_truck_nbr);

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
            l_shipment_type := r.shipment_name;
            l_container_nbr := r.cont_no;
            l_container_type := r.container_type;
         	l_order_nbr := r.ORDER_RELEASE_XID;
            l_customer_name := r.liner_name;
         
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
         'shipment_name',
         l_shipment_type
      );
    apex_json.write(
         'order_nbr',
         l_order_nbr
      );
    apex_json.write(
         'customer_name',
         l_customer_name
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
         'driver_iqama',
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

-- PROCEDURE: XX_OTM_GET_ASSIGNED_TASK_ASSIGNMENT_SHIPMENTS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_ASSIGNED_TASK_ASSIGNMENT_SHIPMENTS (
   p_search_text   in varchar2 default '',
   p_page_num in number default 0
) as
   l_cursor sys_refcursor;
   p_page_size number:=5;
begin
    -- Configure APEX_JSON to output to CLOB
   apex_json.initialize_clob_output;
   apex_json.open_object;
    
    -- Write Standard Response Headers
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );

    -- Open the cursor for the query with aliased columns to match desired JSON keys
   open l_cursor for select ta.shipment_nbr as shipment_nbr,
                            s.shipment_name as shipment_name,
                            nvl(ta.status,'assigned') as shipment_status
                                         from xxotm_task_assignment_t ta
                                         join xxotm_shipments_t s
                                       on ta.shipment_nbr = s.shipment_xid
                      where ( p_search_text is null
                         or upper(ta.shipment_nbr) like '%'
                                                        || upper(p_search_text)
                                                        || '%' )
                                                        ORDER BY ta.shipment_nbr
OFFSET (p_page_num-1 ) * p_page_size ROWS
FETCH NEXT p_page_size ROWS ONLY;

    -- Write cursor to 'shipments' array
   apex_json.write(
      'data',
      l_cursor
   );
   apex_json.close_object;

 htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      apex_json.free_output;
end xx_otm_get_assigned_task_assignment_shipments;

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
   searchtext in varchar2 default null
) as
   l_data_found boolean := false;
begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
   for r_operator in (
      select distinct ta.operator as operator_number
        from xxotm_task_assignment_t ta
       where ta.operator like '%'
                              || searchtext
                              || '%'
   ) loop
        -- If this is the first row, write the success header
      if not l_data_found then
         apex_json.write(
            'response_message',
            'Success'
         );
         apex_json.write(
            'response_code',
            200
         );
         apex_json.open_array('data');
         l_data_found := true;
      end if;

      -- Write the value directly to the array, creating a list of strings/numbers
      apex_json.write(r_operator.operator_number);
   end loop;

   if not l_data_found then
      apex_json.write(
         'response_message',
         'No data found'
      );
      apex_json.write(
         'response_code',
         404
      );
   else
      apex_json.close_array; -- Close the data array
   end if;

   apex_json.close_object; -- Close the root object

   htp.prn(apex_json.get_clob_output);
   dbms_output.put_line(apex_json.get_clob_output);
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
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      dbms_output.put_line(apex_json.get_clob_output);
end xx_otm_get_available_operators;

-- PROCEDURE: XX_OTM_GET_AVAILABLE_POSITION_LOV

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_POSITION_LOV (
   p_flag           in varchar2,
   p_terminal       in varchar2 default null,
   p_block          in varchar2 default null,
   p_row            in varchar2 default null,
   p_lot            in number default null,
   p_container_type in varchar2 default null
) as
   -- Define collection types
   type t_varchar_list is
      table of varchar2(100);
   type t_number_list is
      table of number;
   
   -- Initialize collections to avoid ORA-06531
   v_terminals t_varchar_list := t_varchar_list();
   v_blocks    t_varchar_list := t_varchar_list();
   v_rows      t_varchar_list := t_varchar_list();
   v_lots      t_number_list := t_number_list();
   v_level     number := 0;
   v_has_data  boolean := false;
   v_rephrased_container_type varchar2(10);
begin
   apex_json.initialize_clob_output;
   apex_json.open_object; -- Root object

   if p_flag not in ( 'I',
                      'T',
                      'B',
                      'R',
                      'L' ) then
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'Invalid flag passed'
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
      return;
   end if;
   
   IF p_container_type LIKE '2%'THEN
   		v_rephrased_container_type:='20FT';
   ELSE 
      		v_rephrased_container_type:='40FT';
   END IF;
   -- Fetch data
   case p_flag
      when 'I' then
         -- Get Terminals (Based on Container Type)
         select distinct terminal
         bulk collect
           into v_terminals
           from xxotm_position_master_t
          where container_type = v_rephrased_container_type
            and is_occupied = 'N'
          order by terminal;
         v_has_data := v_terminals.count > 0;
      when 'T' then
         -- Get Blocks (Based on Terminal)
         select distinct block
         bulk collect
           into v_blocks
           from xxotm_position_master_t
          where terminal = p_terminal
            and is_occupied = 'N'
            and container_type = v_rephrased_container_type
          order by block;
         v_has_data := v_blocks.count > 0;
      when 'B' then
         -- Get Lots (Based on Terminal + Block)
         select distinct lot_no
         bulk collect
           into v_lots
           from xxotm_position_master_t
          where terminal = p_terminal
            and block = p_block
            and is_occupied = 'N'
            and container_type = v_rephrased_container_type
          order by lot_no;
         v_has_data := v_lots.count > 0;
      when 'L' then
         -- Get Rows (Based on Terminal + Block + Lot)
         select distinct row_no
         bulk collect
           into v_rows
           from xxotm_position_master_t
          where terminal = p_terminal
            and block = p_block
            and lot_no = p_lot
            and is_occupied = 'N'
            and container_type = v_rephrased_container_type
          order by row_no;
         v_has_data := v_rows.count > 0;
      when 'R' then
         -- Get Levels (Based on Terminal + Block + Lot + Row)
         -- Logic Change: Get ONLY the lowest available level (next stackable position)
         begin
            select level_no
              into v_level
              from xxotm_position_master_t
             where terminal = p_terminal
               and block = p_block
               and lot_no = p_lot
               and row_no = p_row
               and is_occupied = 'N'
               and container_type = v_rephrased_container_type
             order by level_no asc
             fetch first 1 rows only;
            v_has_data := true;
         exception
            when no_data_found then
               v_level := 0;
               v_has_data := false;
         end;
   end case;
   
   -- Write Response
   if not v_has_data then
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No Data Found'
      );
   else
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_object('data');
      case p_flag
         when 'I' then
            apex_json.open_array('terminals');
            for i in 1..v_terminals.count loop
               apex_json.write(v_terminals(i));
            end loop;
            apex_json.close_array;
         when 'T' then
            apex_json.open_array('blocks');
            for i in 1..v_blocks.count loop
               apex_json.write(v_blocks(i));
            end loop;
            apex_json.close_array;
         when 'B' then
            apex_json.open_array('lots');
            for i in 1..v_lots.count loop
               apex_json.write(v_lots(i));
            end loop;
            apex_json.close_array;
         when 'L' then
            apex_json.open_array('rows');
            for i in 1..v_rows.count loop
               apex_json.write(v_rows(i));
            end loop;
            apex_json.close_array;
         when 'R' then
            apex_json.write(
               'level',
               v_level
            );
      end case;

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
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Error: ' || sqlerrm
      );
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

-- PROCEDURE: XX_OTM_GET_AVAILABLE_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_AVAILABLE_TRUCKS as
   type record_type is record (
         truck_nbr    varchar2(100),
         driver_name  varchar2(100),
         driver_iqama varchar2(100),
         type         varchar2(100),
         entry_time   varchar2(100)
   );
   l_record record_type;
   cursor c_data_cursor is
   select distinct truck_nbr,
                   driver_name,
                   driver_iqama,
                   type,
                   entry_time
     from xxotm_vehicle_master_t
    where entry_time is not null
      and exit_time is null
      and status = 'vehicle_entry';

begin
   owa_util.mime_header(
      'application/json',
      true
   );
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');
   open c_data_cursor;
   loop
      fetch c_data_cursor into l_record;
      exit when c_data_cursor%notfound;
      apex_json.open_object;
      apex_json.write(
         'truck_number',
         l_record.truck_nbr
      );
      apex_json.write(
         'driver_name',
         l_record.driver_name
      );
      apex_json.write(
         'iqama_number',
         l_record.driver_iqama
      );
      apex_json.write(
         'type',
         l_record.type
      );
      apex_json.write(
         'entry_time',
         l_record.entry_time
      );
      apex_json.close_object;
   end loop;
   close c_data_cursor;
   apex_json.close_array;
   apex_json.close_object;

    -- Use apex_util.prn for CLOB support
   htp.prn(apex_json.get_clob_output);
   dbms_output.put_line(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      apex_json.free_output;
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'ERROR WHILE EXECUTING METHOD: ' || sqlerrm
      );
      apex_json.close_object;
      apex_util.prn(apex_json.get_clob_output);
      apex_json.free_output;
end;

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

-- PROCEDURE: XX_OTM_GET_CHAT_MESSAGES

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CHAT_MESSAGES (
    P_USER1_ID IN NUMBER,
    P_USER2_ID IN NUMBER
) AS
    V_COUNT NUMBER := 0;
BEGIN
    APEX_JSON.INITIALIZE_CLOB_OUTPUT;
    APEX_JSON.OPEN_OBJECT;
        APEX_JSON.WRITE('response_code', 200);
        APEX_JSON.WRITE('response_message', 'Messages retrieved successfully');
        APEX_JSON.OPEN_ARRAY('messages');
        FOR REC IN (
            SELECT 
                MESSAGE_ID,
                SENDER_ID,
                RECEIVER_ID,
                MESSAGE_TEXT,
                TO_CHAR(SENT_AT, 'YYYY-MM-DD HH24:MI:SS') as SENT_AT_STR      
            FROM 
                XXOTM_CHAT_MESSAGES_T
            WHERE 
                (SENDER_ID = P_USER1_ID AND RECEIVER_ID = P_USER2_ID)
                OR 
                (SENDER_ID = P_USER2_ID AND RECEIVER_ID = P_USER1_ID)
            ORDER BY 
                SENT_AT ASC
        ) LOOP
            V_COUNT := V_COUNT + 1;
            APEX_JSON.OPEN_OBJECT;
            APEX_JSON.WRITE('message_id', REC.MESSAGE_ID);
            APEX_JSON.WRITE('sender_id', REC.SENDER_ID);
            APEX_JSON.WRITE('receiver_id', REC.RECEIVER_ID);
            APEX_JSON.WRITE('text', REC.MESSAGE_TEXT);
            APEX_JSON.WRITE('sent_at', REC.SENT_AT_STR);
           
            -- Helper flag to easily identify if message is from the requester (User 1)
            APEX_JSON.WRITE('is_me', CASE WHEN REC.SENDER_ID = P_USER1_ID THEN TRUE ELSE FALSE END);
            APEX_JSON.CLOSE_OBJECT;
        END LOOP;
        APEX_JSON.CLOSE_ARRAY;
        
        APEX_JSON.WRITE('total_messages', V_COUNT);
    APEX_JSON.CLOSE_OBJECT;
    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
EXCEPTION
    WHEN OTHERS THEN
        APEX_JSON.INITIALIZE_CLOB_OUTPUT;
        APEX_JSON.OPEN_OBJECT;
            APEX_JSON.WRITE('response_code', 500);
            APEX_JSON.WRITE('response_message', 'Unexpected error: ' || SQLERRM);
        APEX_JSON.CLOSE_OBJECT;
        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
END XX_OTM_GET_CHAT_MESSAGES;

-- PROCEDURE: XX_OTM_GET_CHAT_USERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CHAT_USERS (
    P_CURRENT_USER_ID IN NUMBER
) AS
    V_COUNT NUMBER := 0;
BEGIN
    APEX_JSON.INITIALIZE_CLOB_OUTPUT;
    APEX_JSON.OPEN_OBJECT;
        APEX_JSON.WRITE('response_code', 200);
        APEX_JSON.WRITE('response_message', 'Chat users retrieved successfully');
        APEX_JSON.OPEN_ARRAY('users');
        FOR REC IN (
            SELECT 
                USER_ID,
                USERNAME,
                FULL_NAME
                              
            FROM 
                XXOTM_CHAT_USERS_T
            WHERE 
                USER_ID != P_CURRENT_USER_ID
            ORDER BY 
                FULL_NAME
        ) LOOP
            V_COUNT := V_COUNT + 1;
            APEX_JSON.OPEN_OBJECT;
            APEX_JSON.WRITE('user_id', REC.USER_ID);
            APEX_JSON.WRITE('username', REC.USERNAME);
            APEX_JSON.WRITE('full_name', REC.FULL_NAME);
          
            
            APEX_JSON.CLOSE_OBJECT;
        END LOOP;
        APEX_JSON.CLOSE_ARRAY;
        
        APEX_JSON.WRITE('total_users', V_COUNT);
    APEX_JSON.CLOSE_OBJECT;
    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
EXCEPTION
    WHEN OTHERS THEN
        APEX_JSON.INITIALIZE_CLOB_OUTPUT;
        APEX_JSON.OPEN_OBJECT;
            APEX_JSON.WRITE('response_code', 500);
            APEX_JSON.WRITE('response_message', 'Unexpected error: ' || SQLERRM);
        APEX_JSON.CLOSE_OBJECT;
        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
END XX_OTM_GET_CHAT_USERS;

-- PROCEDURE: XX_OTM_GET_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CONTAINERS AS
   l_data_clob  CLOB;
   l_final_clob CLOB;
BEGIN

   -- Initialize Response
   DBMS_LOB.createtemporary(l_final_clob, TRUE);

   -- 1. Fetch Data grouped by cust_name (Option A structure)
   SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
         'customer_name' VALUE cust_name,
         'containers' VALUE containers
         RETURNING CLOB
      )
      RETURNING CLOB
   )
   INTO l_data_clob
   FROM (
      SELECT 
         i.cust_name,
         JSON_ARRAYAGG(
            JSON_OBJECT(
               'container_nbr' VALUE i.container_nbr,
               'position' VALUE
                  JSON_OBJECT(
                     'terminal' VALUE UPPER(REGEXP_SUBSTR(i.position, '[^-]+', 1, 1)),
                     'block' VALUE UPPER(REGEXP_SUBSTR(i.position, '[^-]+', 1, 2)),
                     'block_id' VALUE LOWER(REGEXP_SUBSTR(i.position, '[^-]+', 1, 1))
                                     || '_block_'
                                     || LOWER(REGEXP_SUBSTR(i.position, '[^-]+', 1, 2)),
                     'lot' VALUE TO_NUMBER(REGEXP_SUBSTR(i.position, '[^-]+', 1, 3)),
                     'row' VALUE ASCII(REGEXP_SUBSTR(i.position, '[^-]+', 1, 4)) - 64,
                     'level' VALUE TO_NUMBER(REGEXP_SUBSTR(i.position, '[^-]+', 1, 5))
                  )
               RETURNING CLOB
            )
            RETURNING CLOB
         ) AS containers
      FROM xxotm_container_inventory_t i
      WHERE i.position IS NOT NULL
        AND i.inbound_shipment_nbr IS NOT NULL
        AND i.container_stored_time IS NOT NULL
        AND i.container_released_time IS NULL
        AND i.outbound_shipment_nbr IS NULL
        AND i.cust_name IS NOT NULL
      GROUP BY i.cust_name
   );

   -- Handle Empty Result
   IF l_data_clob IS NULL THEN
      l_data_clob := '[]';
   END IF;

   -- 2. Build Standard Response Envelope
   l_final_clob := '{response_code: 200, response_message: Success, data: '
                   || l_data_clob
                   || '}';

   -- 3. Output Response (Chunked)
   DECLARE
      l_offset NUMBER := 1;
      l_amount NUMBER := 32000;
      l_len    NUMBER;
      l_buffer VARCHAR2(32767);
   BEGIN
      l_len := DBMS_LOB.getlength(l_final_clob);
      WHILE l_offset <= l_len LOOP
         DBMS_LOB.read(
            l_final_clob,
            l_amount,
            l_offset,
            l_buffer
         );
         HTP.prn(l_buffer);
         l_offset := l_offset + l_amount;
      END LOOP;
   END;

   -- Cleanup
   DBMS_LOB.freetemporary(l_final_clob);
EXCEPTION
   WHEN OTHERS THEN
      HTP.p('{response_code: 400, response_message: Error involving XX_OTM_GET_CONTAINERS: '
            || REPLACE(SQLERRM, '', '\')
            || '}');
END;

-- PROCEDURE: XX_OTM_GET_CONTAINERS_OF_TYPE

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CONTAINERS_OF_TYPE
(p_container_type in varchar2, p_offset in number, p_search_text in varchar2)
as
   v_req_clob  clob;
   v_container varchar2(20);
   cursor c_containers (
      p_ctype varchar2
   ) is
   select container_nbr from (select container_nbr
     from xxotm_container_inventory_t
    where container_type = p_ctype
      and booking_id is null
      and container_released_time is null
      and outbound_shipment_nbr is null
      and position is not null
      and container_stored_time is not null
      and inbound_shipment_nbr is not null
    order by 
            -- 1. Cluster by Block (Minimize Gantry Move)
     regexp_substr(
      position,
      '[^-]+',
      1,
      2
   ) asc,
        -- 2. Cluster by Lot (Bay)
        to_number(regexp_substr(
        position,
        '[^-]+',
        1,
        3
        )) asc,
            -- 3. Cluster by Row (Linear Movement)
             regexp_substr(
                position,
                '[^-]+',
                1,
                4
             ) desc,
                -- 4. Pick Topmost Container First (Safety/Accessibility)
                to_number(regexp_substr(
                    position,
                    '[^-]+',
                    1,
                    5
                )) desc offset p_offset rows) where container_nbr like '%'||upper(p_search_text)||'%' fetch first 20 rows only;

begin

    select container_nbr into v_container from (select container_nbr, position
     from xxotm_container_inventory_t
    where container_type = p_container_type
      and booking_id is null
      and container_released_time is null
      and outbound_shipment_nbr is null
      and position is not null
      and container_stored_time is not null
      and inbound_shipment_nbr is not null
      order by 
            -- 1. Cluster by Block (Minimize Gantry Move)
     regexp_substr(
      position,
      '[^-]+',
      1,
      2
   ) asc,
        -- 2. Cluster by Lot (Bay)
        to_number(regexp_substr(
        position,
        '[^-]+',
        1,
        3
        )) asc,
            -- 3. Cluster by Row (Linear Movement)
             regexp_substr(
                position,
                '[^-]+',
                1,
                4
             ) desc,
                -- 4. Pick Topmost Container First (Safety/Accessibility)
                to_number(regexp_substr(
                    position,
                    '[^-]+',
                    1,
                    5
                )) desc offset p_offset rows) where container_nbr like '%'||upper(p_search_text)||'%' fetch first 1 rows only;
   
    if v_container is null
    then
        raise no_data_found;
    end if;
   
   -- Initialize Output
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');
    for r in c_containers(p_container_type) loop
        exit when c_containers%notfound;
        apex_json.write(r.container_nbr);
    end loop;

   apex_json.close_array; -- data
   apex_json.close_object; -- root
   
   -- Flush Output
   htp.prn(apex_json.get_clob_output);
exception
   when no_data_found then
      apex_json.initialize_clob_output;
        apex_json.open_object;
        apex_json.write(
        'response_code',
        404
        );
        apex_json.write(
        'response_message',
        'NO DATA FOUND'
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
         sqlerrm
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
end;


-- PROCEDURE: XX_OTM_GET_CONTAINER_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CONTAINER_DETAILS (
    p_container_nbr IN VARCHAR2
) AS
    v_container_nbr        VARCHAR2(50);
    v_cust_name            VARCHAR2(100);
    v_inbound_order_nbr    VARCHAR2(50);
    v_inbound_shipment_nbr VARCHAR2(50);
    v_container_type       VARCHAR2(100);
    v_booking_id           VARCHAR2(100);
    v_container_stored_time VARCHAR2(100);
    v_shipment_name        VARCHAR2(100);
BEGIN
    -- Fetch container details
    SELECT 
        CONTAINER_NBR,
        CUST_NAME,
        INBOUND_ORDER_NBR,
        INBOUND_SHIPMENT_NBR,
        CONTAINER_TYPE,
        BOOKING_ID,
        CONTAINER_STORED_TIME,
        SHIPMENT_NAME
    INTO
        v_container_nbr,
        v_cust_name,
        v_inbound_order_nbr,
        v_inbound_shipment_nbr,
        v_container_type,
        v_booking_id,
        v_container_stored_time,
        v_shipment_name
    FROM XXOTM_CONTAINER_INVENTORY_T
    WHERE CONTAINER_NBR = p_container_nbr
    AND ROWNUM = 1;

    -- Initialize JSON output
    APEX_JSON.initialize_clob_output;
    APEX_JSON.open_object;
    
    APEX_JSON.write('response_code', 200);
    APEX_JSON.write('response_message', 'Success');
    
    APEX_JSON.open_object('data');
    APEX_JSON.write('container_number', v_container_nbr);
    APEX_JSON.write('customer_name', v_cust_name);
    APEX_JSON.write('inbound_order_nbr', v_inbound_order_nbr);
    APEX_JSON.write('inbound_shipment_nbr', v_inbound_shipment_nbr);
    APEX_JSON.write('container_type', v_container_type);
    APEX_JSON.write('booking_id', v_booking_id);
    APEX_JSON.write('container_stored_time', v_container_stored_time);
    APEX_JSON.write('shipment_name', v_shipment_name);
    APEX_JSON.close_object; -- data
    
    APEX_JSON.close_object; -- root
    
    HTP.prn(APEX_JSON.get_clob_output);
    APEX_JSON.free_output;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        APEX_JSON.initialize_clob_output;
        APEX_JSON.open_object;
        APEX_JSON.write('response_code', 404);
        APEX_JSON.write('response_message', 'Container not found');
        APEX_JSON.write('data', '');
        APEX_JSON.close_object;
        HTP.prn(APEX_JSON.get_clob_output);
        APEX_JSON.free_output;
    WHEN OTHERS THEN
        APEX_JSON.initialize_clob_output;
        APEX_JSON.open_object;
        APEX_JSON.write('response_code', 500);
        APEX_JSON.write('response_message', SQLERRM);
        APEX_JSON.write('data', '');
        APEX_JSON.close_object;
        HTP.prn(APEX_JSON.get_clob_output);
        APEX_JSON.free_output;
END XX_OTM_GET_CONTAINER_DETAILS;

-- PROCEDURE: XX_OTM_GET_CONTAINER_REPAIR_STATUS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CONTAINER_REPAIR_STATUS (
   p_container_nbr in varchar2
) as
   v_shipment_xid    varchar2(100);
   v_url             varchar2(1000);
   v_response_clob   clob;
   v_jo              json_object_t;
   v_items           json_array_t;
   v_item            json_object_t;
   v_date_obj        json_object_t;
   v_event_date_str  varchar2(200);
   v_event_date      timestamp with time zone;
   v_status_code_gid varchar2(200);
   l_username        varchar2(100) := 'NAQLEEN.INTEGRATION';
   l_password        varchar2(100) := 'NaqleenInt@123';
   v_response_json   json_object_t;
   v_data_json       json_object_t;
   v_events_array    json_array_t;
   v_event_json      json_object_t;
   
   -- Type for storing events before sorting
   type t_event_rec is record (
         event_date     timestamp with time zone,
         status_code    varchar2(200),
         event_date_str varchar2(200)
   );
   type t_event_tab is
      table of t_event_rec index by pls_integer;
   l_events          t_event_tab;
   l_event_count     pls_integer := 0;
   l_temp_event      t_event_rec;
   l_swapped         boolean;
begin
   -- 1. Get Shipment XID
   begin
      select shipment_xid
        into v_shipment_xid
        from xxotm.xxotm_shipments_t
       where cont_no = p_container_nbr
         and rownum = 1;
   exception
      when no_data_found then
         v_response_json := json_object_t();
         v_response_json.put(
            'response_code',
            404
         );
         v_response_json.put(
            'response_message',
            'Container not found or no shipment associated'
         );
         htp.prn(v_response_json.to_clob);
         return;
   end;

   -- 2. Call OTM API
   v_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
            || v_shipment_xid
            || '/trackingEvents';
   apex_web_service.g_request_headers.delete;
   apex_web_service.g_request_headers(1).name := 'Content-Type';
   apex_web_service.g_request_headers(1).value := 'application/json';
   v_response_clob := apex_web_service.make_rest_request(
      p_url         => v_url,
      p_http_method => 'GET',
      p_username    => l_username,
      p_password    => l_password,
      p_wallet_path => 'file:/u01/app/oracle/product/wallet'
   );

   -- 3. Process Response
   if apex_web_service.g_status_code = 200 then
      v_jo := json_object_t.parse(v_response_clob);
      if v_jo.has('items') then
         v_items := v_jo.get_array('items');
         
         -- Collect all events
         for i in 0..v_items.get_size - 1 loop
            v_item := treat(v_items.get(i) as json_object_t);
            v_event_date := null;
            v_status_code_gid := null;
            v_event_date_str := null;
                
            -- Get Status Code
            if v_item.has('statusCodeGid') then
               v_status_code_gid := v_item.get_string('statusCodeGid');
            end if;
                
            -- Get Event Date (Check for both 'eventdate' and 'eventDate')
            v_date_obj := null;
            if v_item.has('eventdate') then
               v_date_obj := treat(v_item.get('eventdate') as json_object_t);
            elsif v_item.has('eventDate') then
               v_date_obj := treat(v_item.get('eventDate') as json_object_t);
            end if;

            if v_date_obj is not null then
               v_event_date_str := v_date_obj.get_string('value');
               begin
                  -- Handle potential 'Z' or timezone offsets
                  v_event_date := to_timestamp_tz ( replace(
                     v_event_date_str,
                     'Z',
                     '+00:00'
                  ),'YYYY-MM-DDTHH24:MI:SS.FFTZH:TZM' );
               exception
                  when others then
                     begin
                        v_event_date := to_timestamp_tz ( replace(
                           v_event_date_str,
                           'Z',
                           '+00:00'
                        ),'YYYY-MM-DDTHH24:MI:SSTZH:TZM' );
                     exception
                        when others then
                           v_event_date := null;
                     end;
               end;
            end if;
            
            -- Store event in collection (only repair-related events)
            if v_status_code_gid in ( 'NAQLEEN.ESTIMATION SENT',
                                      'NAQLEEN.APPROVAL RECEIVED',
                                      'NAQLEEN.APPROVAL DENIED',
                                      'NAQLEEN.REPAIR ORDER CREATED',
                                      'NAQLEEN.REPAIR COMPLETED' ) then
               l_event_count := l_event_count + 1;
               l_events(l_event_count).event_date := v_event_date;
               l_events(l_event_count).status_code := v_status_code_gid;
               if v_event_date is not null then
                  l_events(l_event_count).event_date_str := to_char(
                     v_event_date,
                     'YYYY-MM-DDTHH24:MI:SSZ'
                  );
               else
                  l_events(l_event_count).event_date_str := '';
               end if;
            end if;
         end loop;
      end if;
      
      -- Sort events by event_date ascending (bubble sort)
      if l_event_count > 1 then
         loop
            l_swapped := false;
            for i in 1..l_event_count - 1 loop
               -- Handle nulls: put nulls at the end
               if
                  l_events(i).event_date is null
                  and l_events(i + 1).event_date is not null
               then
                  l_temp_event := l_events(i);
                  l_events(i) := l_events(i + 1);
                  l_events(i + 1) := l_temp_event;
                  l_swapped := true;
               elsif
                  l_events(i).event_date is not null
                  and l_events(i + 1).event_date is not null
                  and l_events(i).event_date > l_events(i + 1).event_date
               then
                  l_temp_event := l_events(i);
                  l_events(i) := l_events(i + 1);
                  l_events(i + 1) := l_temp_event;
                  l_swapped := true;
               end if;
            end loop;
            exit when not l_swapped;
         end loop;
      end if;
      
      -- Build response JSON
      v_response_json := json_object_t();
      v_response_json.put(
         'response_code',
         200
      );
      v_response_json.put(
         'response_message',
         'Success'
      );
      v_data_json := json_object_t();
      v_data_json.put(
         'container_nbr',
         p_container_nbr
      );
      v_data_json.put(
         'shipment_xid',
         v_shipment_xid
      );
      
      -- Build events array
      v_events_array := json_array_t();
      for i in 1..l_event_count loop
         v_event_json := json_object_t();
         v_event_json.put(
            'status_code',
            l_events(i).status_code
         );
         v_event_json.put(
            'event_time',
            l_events(i).event_date_str
         );
         v_events_array.append(v_event_json);
      end loop;

      v_data_json.put(
         'events',
         v_events_array
      );
      v_data_json.put(
         'total_events',
         l_event_count
      );
      v_response_json.put(
         'data',
         v_data_json
      );
      htp.prn(v_response_json.to_clob);
   else
      v_response_json := json_object_t();
      v_response_json.put(
         'response_code',
         apex_web_service.g_status_code
      );
      v_response_json.put(
         'response_message',
         'Error calling OTM API'
      );
      htp.prn(v_response_json.to_clob);
   end if;

exception
   when others then
      v_response_json := json_object_t();
      v_response_json.put(
         'response_code',
         500
      );
      v_response_json.put(
         'response_message',
         sqlerrm
      );
      htp.prn(v_response_json.to_clob);
end xx_otm_get_container_repair_status;

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
         OR UPPER(cust_name) LIKE '%' || UPPER(p_customer) || '%')
    ORDER BY  
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

END xx_otm_get_CustomerInventory;

-- PROCEDURE: XX_OTM_GET_CUSTOMER_BOOKINGS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUSTOMER_BOOKINGS (
   p_customer_name in varchar2,
   p_search_text   in varchar2 default null
) as
   l_url            varchar2(32767);
   l_response_clob  clob;
   l_shipment_count number;
   l_refnum_count   number;
   l_refnum_qual    varchar2(200);
   l_refnum_value   varchar2(200);
   l_booking_no     varchar2(200);
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

   -- Construct URL with filters
   l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'
            || '?q=attribute1 eq TERMINAL and perspective eq B and shipmentName in [STUFFING,DESTUFFING,STORE_AS_IT_IS,CRO,LRO] and statuses.statusTypeGid eq NAQLEEN.TRIP_STATUS'
            || ' and ( statuses.statusValueGid eq NAQLEEN.TRIP_NOT_STARTED)'
            || ' and attribute2 eq NAQLEEN.'
            || p_customer_name
            || '';
   
   -- Append Booking Number search filter if text is provided
   if p_search_text is not null then
      l_url := l_url
               || ' and refnums.shipmentRefnumQualGid eq NAQLEEN.BOOKING_NO and refnums.shipmentRefnumValue co '
               || upper(p_search_text)
               || '';
   end if;

   l_url := l_url || '&expand=refnums,statuses';
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
      l_shipment_count := apex_json.get_count('items');
      for i in 1..l_shipment_count loop
         l_booking_no := null;
         l_refnum_count := apex_json.get_count(
            'items[%d].refnums.items',
            i
         );
         for j in 1..l_refnum_count loop
            l_refnum_qual := apex_json.get_varchar2(
               'items[%d].refnums.items[%d].shipmentRefnumQualGid',
               i,
               j
            );
            if l_refnum_qual = 'NAQLEEN.BOOKING_NO' then
               l_refnum_value := apex_json.get_varchar2(
                  'items[%d].refnums.items[%d].shipmentRefnumValue',
                  i,
                  j
               );
               l_booking_no := l_refnum_value;
               exit;
            end if;
         end loop;

         if l_booking_no is not null then
             -- Check if search text matches locally too if needed, but API filter handles main filtering.
             -- If API does co (contains), and we iterate through all shipments returned, we just output the booking number found.
             
             -- Note: The API might return multiple shipments with the same booking number or different ones matching the pattern.
             -- We simply output what we find.

            
            apex_json.write(
               
               l_booking_no
            );
            
         end if;

      end loop;
   exception
      when others then
         null;
   end;

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
end xx_otm_get_customer_bookings;

-- PROCEDURE: XX_OTM_GET_CUSTOMER_INVENTORY_CUSTOMERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUSTOMER_INVENTORY_CUSTOMERS (
   p_search_text in varchar2 default null
) as
   cursor c_customers is
   select distinct upper(liner_name) liner_name,
                   upper(customer_name) customer_name
     from xxotm_shipments_t
    where customer_name is not null
      and liner_name is not null
      and ( p_search_text is null
       or upper(customer_name) like '%'
                                    || upper(p_search_text)
                                    || '%' )
    order by customer_name
    fetch first 10 rows only;
begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');
   for r in c_customers loop
      -- Assuming customer name is same or not available, using nbr as placeholder to match structure
      apex_json.write(r.customer_name);
   end loop;
   apex_json.close_array;
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      apex_json.free_output;
end;

-- PROCEDURE: XX_OTM_GET_CUSTOMER_SHIPMENTS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUSTOMER_SHIPMENTS (
   p_customer_name in varchar2,
   p_search_text in varchar2,
   p_page_num      in number default 0
) as
   l_url           varchar2(4000);
   l_response_clob clob;
   l_count         number;
   l_shipment_xid  varchar2(50);
   l_status_value  varchar2(100);
   l_shipment_name varchar2(200);
   l_cont_no       varchar2(100);
   l_offset        number;
   l_limit         number := 25;
   l_date_filter   varchar2(50);
   
   -- Variables for JSON parsing
   l_items_count   number;
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
   -- Calculate offset
   l_offset := p_page_num * l_limit;
   
   -- Calculate date filter (yesterday)
   l_date_filter := to_char(
      sysdate - 1,
      'YYYY-MM-DDTHH24:MI:SSZ'
   );
   -- Construct API URL with filters
   -- Base URL
   l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/shipments/?q='
   ;
   
   -- Filters
   l_url := l_url
            || 'attribute1 eq TERMINAL and '
            || 'perspective eq B and '
            || 'statuses.statusTypeGid eq NAQLEEN.TRIP_STATUS and '
            || '(statuses.statusValueGid eq NAQLEEN.TRIP_STARTED or statuses.statusValueGid eq NAQLEEN.TRIP_NOT_STARTED) and '
            || '(shipmentName co DESTUFFING or shipmentName co STUFFING or shipmentName co STORE_AS_IT_IS or shipmentName co LRO or shipmentName co CRO ) and '
            || 'shipmentXid co '||upper(p_search_text)||' and '
            || 'attribute2 eq NAQLEEN.'
            || replace( p_customer_name,'NAQLEEN.','')
            || '';
            
   -- Pagination
   l_url := l_url
            || '&offset='
            || l_offset;

   apex_web_service.g_request_headers.delete;
   apex_web_service.g_request_headers(1).name := 'Content-Type';
   apex_web_service.g_request_headers(1).value := 'application/json';
   begin
      l_response_clob := apex_web_service.make_rest_request(
         p_url         => l_url,
         p_http_method => 'GET',
         p_username    => 'NAQLEEN.INTEGRATION', -- Placeholder
         p_password    => 'NaqleenInt@123',      -- Placeholder
         p_wallet_path => 'file:/u01/app/oracle/product/wallet'
      );
      -- Parse JSON Response
      apex_json.parse(l_response_clob);
      -- Check if items exist
      l_items_count := apex_json.get_count(p_path => 'items');
      for i in 1..l_items_count loop
        
   
             
             -- If found, write to JSON
            apex_json.open_object;
            apex_json.write(
               'shipment_nbr',
              apex_json.get_varchar2(
            p_path => 'items[%d].shipmentXid',
            p0     => i
         )
            );
            apex_json.write(
               'shipment_name',
              apex_json.get_varchar2(
            p_path => 'items[%d].shipmentName',
            p0     => i
         )
            );
            apex_json.write(
               'container_nbr',
               apex_json.get_varchar2(
            p_path => 'items[%d].attribute3',
            p0     => i
         )
            );
             
           
            apex_json.close_object;
         
      end loop;
   exception
      when others then
         apex_json.open_object;
         apex_json.write(
            'error',
            'API Request Failed: ' || sqlerrm
         );
         apex_json.close_object;
   end;
   
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
      apex_json.open_array('data');
      apex_json.close_array;
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
end xx_otm_get_customer_shipments;

-- PROCEDURE: XX_OTM_GET_CUST_AND_BOOKINGS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_CUST_AND_BOOKINGS is
   -- Last Updated Date : 17-DEC-2025
   -- Author : Madhan
   -- Modification: Added reserved_containers array to response
   l_json_clob clob;
begin
    -- Initialize JSON object
   l_json_clob := '{
    response_message: Success,
    response_code: 200,
    data: [';
   declare
      v_first_cust_output boolean := true;
      v_first_book_output boolean;
      v_first_type_output boolean;
      v_first_res_output  boolean;
      l_cust_buffer       clob;
      l_types_buffer      clob;
      l_res_buffer        clob;
      l_valid_types_count number;
      l_valid_books_count number;

      -- 1. Get Distinct Customers
      cursor c_cust is
      select distinct cust_name
        from xxotm_container_inventory_t
       where cust_name is not null
         and container_nbr is null
         and upper(order_type) like '%LRO%'
       order by cust_name;

      -- 2. Get Bookings for a Customer
      cursor c_books (
         p_cust varchar2
      ) is
      select distinct booking_id
        from xxotm_container_inventory_t
       where cust_name = p_cust
         and container_nbr is null
         and upper(order_type) like '%LRO%'
         and container_released_time is null;

      -- 3. Get Container Types
      cursor c_types (
         p_cust varchar2,
         p_book varchar2
      ) is
      select container_type,
             count(*) as container_count
        from xxotm_container_inventory_t
       where cust_name = p_cust
         and booking_id = p_book
         and container_type is not null
         and container_nbr is null
         and container_released_time is null
       group by container_type;

      -- 4. Get Reserved Containers (New Cursor)
      cursor c_reserved (
         p_book varchar2,
         p_type varchar2
      ) is
      select container_nbr
        from xxotm_container_inventory_t
       where booking_id = p_book
         and container_type = p_type
         and container_nbr is not null
         and container_released_time is null;

   begin
      for cust in c_cust loop
         -- Reset Customer Buffer
         l_cust_buffer := '{ cust_name: '
                          || cust.cust_name
                          || ', bookings: [';
         l_valid_books_count := 0;
         v_first_book_output := true;
         for book in c_books(cust.cust_name) loop
             -- Reset Types Buffer
            l_types_buffer := null;
            l_valid_types_count := 0;
            v_first_type_output := true;
            for ctype in c_types(
               cust.cust_name,
               book.booking_id
            ) loop
               -- Build Reserved Containers Array
               l_res_buffer := '[';
               v_first_res_output := true;
               for res in c_reserved(
                  book.booking_id,
                  ctype.container_type
               ) loop
                  if not v_first_res_output then
                     l_res_buffer := l_res_buffer || ',';
                  end if;
                  v_first_res_output := false;
                  l_res_buffer := l_res_buffer || '' || res.container_nbr || '';
               end loop;
               l_res_buffer := l_res_buffer || ']';

               if not v_first_type_output then
                  l_types_buffer := l_types_buffer || ',';
               end if;
               v_first_type_output := false;
               l_types_buffer := l_types_buffer
                                 || '{ container_type: '
                                 || ctype.container_type
                                 || ', container_count: '
                                 || ctype.container_count
                                 || ', reserved_containers: ' 
                                 || l_res_buffer
                                 || '}';
               l_valid_types_count := l_valid_types_count + 1;
            end loop;

             -- Only add booking if we found container types
            if l_valid_types_count > 0 then
               if not v_first_book_output then
                  l_cust_buffer := l_cust_buffer || ',';
               end if;
               v_first_book_output := false;
               l_cust_buffer := l_cust_buffer
                                || '{ booking_id: '
                                || book.booking_id
                                || ', container_types: ['
                                || l_types_buffer
                                || ']}';
               l_valid_books_count := l_valid_books_count + 1;
            end if;
         end loop;

         l_cust_buffer := l_cust_buffer || ']}';

         -- Only add customer if we found valid bookings
         if l_valid_books_count > 0 then
            if not v_first_cust_output then
               l_json_clob := l_json_clob || ',';
            end if;
            v_first_cust_output := false;
            l_json_clob := l_json_clob || l_cust_buffer;
         end if;
      end loop;
   end;

   l_json_clob := l_json_clob || ']}';

    -- Output JSON
   htp.prn(l_json_clob);
exception
   when others then
      htp.prn('{
            response_message: Error: '
              || replace(
         sqlerrm,
         '',
         '\'
      )
              || ',
            response_code: 500,
            data: []
        }');
end;

-- PROCEDURE: XX_OTM_GET_DESTUFFING_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_DESTUFFING_CONTAINERS (
   p_search_text in varchar2
) as
   cursor c_containers is
   select cont_no as container_nbr,
          shipment_xid
     from xxotm_shipments_t
    where shipment_name = 'DESTUFFING'
      and ( p_search_text is null
       or cont_no like '%'
                       || p_search_text
                       || '%' );

   l_api_url          varchar2(500);
   l_track_response   clob;
   l_status_code      varchar2(200);
   l_gate_in_count    number;
   l_gate_out_count   number;
   type t_container_list is
      table of varchar2(100);
   l_valid_containers t_container_list := t_container_list();
begin
    -- Configure APEX_JSON
   apex_json.initialize_clob_output;
   apex_json.open_object;
   for r in c_containers loop
      l_api_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'
                   || 'NAQLEEN.'
                   || r.shipment_xid
                   || '/trackingEvents';
        
        -- Reset counters for each container
      l_gate_in_count := 0;
      l_gate_out_count := 0;
      begin
            -- Make API Call
         apex_web_service.g_request_headers.delete;
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         l_track_response := apex_web_service.make_rest_request(
            p_url         => l_api_url,
            p_http_method => 'GET',
            p_username    => 'NAQLEEN.INTEGRATION',
            p_password    => 'NaqleenInt@123',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );
            
            -- Parse Response
         apex_json.parse(l_track_response);
            
            -- Check Events
         for i in 1..apex_json.get_count('items') loop
            l_status_code := apex_json.get_varchar2(
               'items[%d].statusCodeGid',
               i
            );
                
                -- Check for GATE IN
            if upper(l_status_code) like '%GATE IN%'
           then
               l_gate_in_count := l_gate_in_count + 1;
                
                -- Check for GATE OUT
            elsif upper(l_status_code) like '%GATE OUT%'
             then
               l_gate_out_count := l_gate_out_count + 1;
            end if;
         end loop;

            -- Logic: Valid if (Has Gate In) AND (Has NO Gate Out)
         if
            l_gate_in_count >= 1
            and l_gate_out_count = 0
         then
            l_valid_containers.extend;
            l_valid_containers(l_valid_containers.count) := r.container_nbr;
                
                -- Limit to 10 records
            if l_valid_containers.count >= 10 then
               exit;
            end if;
         end if;

      exception
         when others then
                -- Ignore API errors for a single container, just don't add it
            null;
      end;
   end loop;

    -- Build Final Response
   if l_valid_containers.count > 0 then
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_array('data');
      for i in 1..l_valid_containers.count loop
         apex_json.write(l_valid_containers(i));
      end loop;
      apex_json.close_array;
   else
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No data found'
      );
   end if;

   apex_json.close_object;
    
    -- Output
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      apex_json.free_output;
end xx_otm_get_destuffing_containers;


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

-- PROCEDURE: XX_OTM_GET_GATE_IN_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_GATE_IN_TRUCKS (
   p_search_text in varchar2 default null
) as
   l_count number;
   cursor c_trucks is
   select truck_nbr
     from xxotm_vehicle_master_t
    where entry_time is not null
      and exit_time is null
      and ( status = 'gate_in'
       or status like '%INSPECTED%' )
      and ( p_search_text is null
       or upper(truck_nbr) like '%'
                                || upper(p_search_text)
                                || '%' );
begin
    -- Check if data exists
   select count(*)
     into l_count
     from xxotm_vehicle_master_t
    where entry_time is not null
      and exit_time is null
      and ( status = 'gate_in'
       or status like '%INSPECTED%' )
      and ( p_search_text is null
       or upper(truck_nbr) like '%'
                                || upper(p_search_text)
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
end;

-- PROCEDURE: XX_OTM_GET_GATE_OUT_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_GATE_OUT_TRUCKS (
   p_search_text in varchar2 default null
) as
   l_url           varchar2(4000);
   l_response_clob clob;
   l_status_found  boolean;
   l_items_count   number;
   l_status_code   varchar2(200);

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
    where 
      v.exit_time is NULL
      AND v.status NOT LIKE '%GATE OUT%'
      and ( p_search_text is null
       or v.truck_nbr like '%'
                           || p_search_text
                           || '%' );

begin
    -- Initialize output
   apex_json.initialize_clob_output;

    -- Iterate through trucks
   for r in c_trucks loop
      l_status_found := false;

      -- Construct API URL to get ALL tracking events (no query filter)
      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
               || r.shipment_xid
               || '/trackingEvents';

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
         l_items_count := apex_json.get_count('items');

         -- Iterate through events to find matching status
         for i in 1..l_items_count loop
            l_status_code := apex_json.get_varchar2(
               'items[%d].statusCodeGid',
               i
            );
            
            -- Check for required statuses
            if instr(
               l_status_code,
               'CONTAINER STORED'
            ) > 0
            or instr(
               l_status_code,
               'CONTAINER RELEASED'
            ) > 0
            or instr(
               l_status_code,
               'STUFFING'
            ) > 0
            or instr(
               l_status_code,
               'DESTUFFING'
            ) > 0 then
               l_status_found := true;
               exit;
            end if;
         end loop;

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
end xx_otm_get_gate_out_trucks;

-- PROCEDURE: XX_OTM_GET_INSPECTED_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_INSPECTED_CONTAINERS (
   p_search_text in varchar2 default null
) as
   l_count      number := 0;
   type t_container_list is
      table of xxotm_container_inspection_t.container_nbr%type;
   l_containers t_container_list;
begin
   select distinct container_nbr
   bulk collect
     into l_containers
     from xxotm_container_inspection_t
    where ( p_search_text is null
       or upper(container_nbr) like '%'
                                    || upper(p_search_text)
                                    || '%' )
      and rownum <= 50;

   apex_json.open_object;
   if l_containers.count > 0 then
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_array('data');
      for i in 1..l_containers.count loop
         apex_json.write(l_containers(i));
      end loop;
      apex_json.close_array;
   else
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No data found'
      );
   end if;

   apex_json.close_object;
exception
   when others then
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
end;

-- PROCEDURE: XX_OTM_GET_INSPECTED_CONTAINER_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_INSPECTED_CONTAINER_DETAILS (
   p_container_nbr in varchar2
) as
   cursor c_details is
   select c.container_nbr,
          c.shipment_nbr,
          s.container_type,
          d.truck_nbr as truck_number,
          s.liner_name as liner,
          d.driver_name,
          d.driver_iqama as iqama_number,
          c.timestamp as inspected_time,
          c.inspection_details
     from xxotm_container_inspection_t c , xxotm_shipments_t s, xxotm_vehicle_master_t d
  
    WHERE c.container_nbr = s.cont_no and ( s.power_unit = d.truck_nbr OR s.truck_3pl= d.truck_nbr) AND c.container_nbr = p_container_nbr
ORDER BY c.timestamp DESC;
   l_detail            c_details%rowtype;
   l_details_count     number;
   l_images_count      number;
   l_image_name        varchar2(4000);
   l_image_name_no_ext varchar2(4000);
   l_hotspot_name      varchar2(4000);
   l_comments          varchar2(4000);
   l_base_url          varchar2(4000) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/custom-actions/download/documents/NAQLEEN.INSPECTION-'
   ;
begin
   open c_details;
   fetch c_details into l_detail;
   if c_details%found then
      apex_json.open_object;
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_object('data');
      apex_json.write(
         'container_number',
         l_detail.container_nbr
      );
      apex_json.write(
         'shipment_number',
         l_detail.shipment_nbr
      );
      apex_json.write(
         'container_type',
         l_detail.container_type
      );
      apex_json.write(
         'truck_number',
         l_detail.truck_number
      );
      apex_json.write(
         'liner',
         l_detail.liner
      );
      apex_json.write(
         'driver_name',
         l_detail.driver_name
      );
      apex_json.write(
         'iqama_number',
         l_detail.iqama_number
      );
      apex_json.write(
         'inspected_time',
         l_detail.inspected_time
      );

      -- Parse inspection details once
      if l_detail.inspection_details is not null then
         begin
            apex_json.parse(l_detail.inspection_details);
            l_details_count := apex_json.get_count(p_path => '.');
         exception
            when others then
               l_details_count := 0;
         end;
      else
         l_details_count := 0;
      end if;

      -- Images array (Root)
      apex_json.open_array('images');
      if l_details_count > 0 then
         for i in 1..l_details_count loop
            l_images_count := apex_json.get_count(
               p_path => '[%d].images',
               p0     => i
            );
            for j in 1..l_images_count loop
               l_image_name := apex_json.get_varchar2(
                  p_path => '[%d].images[%d]',
                  p0     => i,
                  p1     => j
               );
               -- Strip extension for URL
               l_image_name_no_ext := regexp_replace(
                  l_image_name,
                  '\.[jJ][pP][gG]$',
                  ''
               );
               if l_image_name_no_ext is not null then
                  apex_json.write(l_base_url
                                  || l_image_name_no_ext
                                  || '/contents/NAQLEEN.INSPECTION-'
                                  || l_image_name_no_ext);
               end if;
            end loop;
         end loop;
      end if;
      apex_json.close_array;

      -- Inspection Details Array (Parsed and Reconstructed)
      apex_json.open_array('inspection_details');
      if l_details_count > 0 then
         for i in 1..l_details_count loop
            apex_json.open_object;
            l_hotspot_name := apex_json.get_varchar2(
               p_path => '[%d].hotspot_name',
               p0     => i
            );
            l_comments := apex_json.get_varchar2(
               p_path => '[%d].comments',
               p0     => i
            );
            apex_json.write(
               'hotspot_name',
               l_hotspot_name
            );
            apex_json.write(
               'comments',
               l_comments
            );

            -- Recalculate images count for this detail item!
            l_images_count := apex_json.get_count(
               p_path => '[%d].images',
               p0     => i
            );
            apex_json.open_array('images');
            for j in 1..l_images_count loop
               l_image_name := apex_json.get_varchar2(
                  p_path => '[%d].images[%d]',
                  p0     => i,
                  p1     => j
               );
               if l_image_name is not null then
                   -- Keep original filename in details to allow UI matching (or should we strip? user said remove from image name before adding to url)
                   -- If we strip here, UI matching is easier. But let's follow: image.jpg in details, INSPECTION-image in URL. 
                   -- UI matching 'url.contains(filename)' will FAIL if we don't handle it.
                   -- But I must follow strict prompt.
                  apex_json.write(l_image_name);
               end if;
            end loop;
            apex_json.close_array;
            apex_json.close_object;
         end loop;
      end if;
      apex_json.close_array;
      apex_json.close_object; -- data
      apex_json.close_object; -- root
   else
      apex_json.open_object;
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No data found'
      );
      apex_json.close_object;
   end if;

   close c_details;
exception
   when others then
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
end;

-- PROCEDURE: XX_OTM_GET_INSPECTION_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_INSPECTION_TRUCKS as
   type record_type is record (
         truck_nbr    varchar2(100),
         driver_name  varchar2(100),
         driver_iqama varchar2(100),
         type         varchar2(100),
         entry_time   varchar2(100)
   );
   l_record record_type;
   cursor c_data_cursor is
   select distinct v.truck_nbr,
                   v.driver_name,
                   v.driver_iqama,
                   v.type,
                   v.entry_time
     from xxotm_vehicle_master_t v
    where v.exit_time is null
      and v.status = 'inspection';

begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');
   open c_data_cursor;
   loop
      fetch c_data_cursor into l_record;
      exit when c_data_cursor%notfound;
      apex_json.open_object;
      apex_json.write(
         'truck_number',
         l_record.truck_nbr
      );
      apex_json.write(
         'driver_name',
         l_record.driver_name
      );
      apex_json.write(
         'iqama_number',
         l_record.driver_iqama
      );
      apex_json.write(
         'type',
         l_record.type
      );
      apex_json.write(
         'entry_time',
         l_record.entry_time
      );
      apex_json.close_object;
   end loop;
   close c_data_cursor;
   apex_json.close_array;
   apex_json.close_object;

    -- Use apex_util.prn for CLOB support
   htp.prn(apex_json.get_clob_output);
   dbms_output.put_line(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      apex_json.free_output;
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'ERROR WHILE EXECUTING METHOD: ' || sqlerrm
      );
      apex_json.close_object;
      apex_util.prn(apex_json.get_clob_output);
      apex_json.free_output;
end;

-- PROCEDURE: XX_OTM_GET_INSPECTION_TRUCKS_APEX

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_INSPECTION_TRUCKS_APEX as
   type record_type is record (
         truck_nbr    varchar2(100),
         driver_name  varchar2(100),
         driver_iqama varchar2(100),
         type         varchar2(100),
         entry_time   varchar2(100)
   );
   l_record record_type;
   cursor c_data_cursor is
   select distinct v.truck_nbr,
                   v.driver_name,
                   v.driver_iqama,
                   v.type,
                   v.entry_time
     from xxotm_vehicle_master_t v
    where v.exit_time is null
      and v.status = 'inspection';

begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');
   open c_data_cursor;
   loop
      fetch c_data_cursor into l_record;
      exit when c_data_cursor%notfound;
      apex_json.open_object;
      apex_json.write(
         'truck_number',
         l_record.truck_nbr
      );
      apex_json.write(
         'driver_name',
         l_record.driver_name
      );
      apex_json.write(
         'iqama_number',
         l_record.driver_iqama
      );
      apex_json.write(
         'type',
         l_record.type
      );
      apex_json.write(
         'entry_time',
         l_record.entry_time
      );
      apex_json.close_object;
   end loop;
   close c_data_cursor;
   apex_json.close_array;
   apex_json.close_object;

    -- Use apex_util.prn for CLOB support
   htp.prn(apex_json.get_clob_output);
   dbms_output.put_line(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      apex_json.free_output;
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'ERROR WHILE EXECUTING METHOD: ' || sqlerrm
      );
      apex_json.close_object;
      apex_util.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_get_inspection_trucks_apex;

-- PROCEDURE: XX_OTM_GET_INVENTORY

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_INVENTORY (
   p_search_cust in varchar2 default '',
   p_search_cont in varchar2 default '',
   p_search_ship in varchar2 default '',
   p_page_num    in number default 0
) as
   l_prev_cust     varchar2(200) := null;
   l_prev_cont     varchar2(100) := null;
   l_is_first_cust boolean := true;
   l_final_clob    clob;
    
    -- Filtered and Ranked Data Cursor
   cursor c_data is
   with ranked_data as (
      select t.cust_name,
             t.cust_nbr,
             t.container_nbr,
             t.shipment_nbr,
             t.cargo_description,
             t.qty,
             t.qty_uom,
             t.hs_code,
             t.gross_weight,
             t.net_weight,
             t.weight_uom,
             t.volume,
             t.volume_uom,
             t.un_class,
             t.country_of_origin,
             t.rcvd_qty,
             t.item_description,
             dense_rank()
             over(
                 order by t.cust_name
             ) as cust_rn,
             dense_rank()
             over(partition by t.cust_name
                  order by t.container_nbr
             ) as cont_rn,
             row_number()
             over(partition by t.cust_name,
                               t.container_nbr
                  order by t.cargo_description
             ) as item_rn
        from xxotm_customer_inventory_t t
       where ( p_search_cust is null
          or upper(t.cust_name) like '%'
                                     || upper(p_search_cust)
                                     || '%' )
         and ( p_search_cont is null
          or upper(t.container_nbr) like '%'
                                         || upper(p_search_cont)
                                         || '%' )
         and ( p_search_ship is null
          or upper(t.shipment_nbr) like '%'
                                        || upper(p_search_ship)
                                        || '%' )
   )
   select *
     from ranked_data
    where cust_rn > ( nvl(
         p_page_num,
         0
      ) * 10 )
      and cust_rn <= ( ( nvl(
      p_page_num,
      0
   ) + 1 ) * 10 )
      and cont_rn <= 10
      and item_rn <= 10
    order by cust_name,
             container_nbr,
             cargo_description;

begin
    -- Configure APEX_JSON Output
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');
   for r in c_data loop
        -- New Customer Handling
        -- BUG FIX: Use l_is_first_cust boolean instead of checking if l_prev_cust is null, 
        -- because cust_name itself can be null.
      if l_is_first_cust
      or nvl(
         l_prev_cust,
         '###'
      ) != nvl(
         r.cust_name,
         '###'
      ) then
         if not l_is_first_cust then
            apex_json.close_array; -- Close previous container items
            apex_json.close_object; -- Close previous container
            apex_json.close_array; -- Close previous customer containers
            apex_json.close_object; -- Close previous customer
         end if;

         apex_json.open_object; -- New Customer
         apex_json.write(
            'customer',
            r.cust_name
         );
         apex_json.write(
            'customer_nbr',
            r.cust_nbr
         );
         apex_json.open_array('containers');
         l_prev_cust := r.cust_name;
         l_is_first_cust := false;
         l_prev_cont := '###START###'; -- Reset container tracker for new customer
      end if;
        
        -- New Container Handling
      if l_prev_cont = '###START###'
      or nvl(
         l_prev_cont,
         '###'
      ) != nvl(
         r.container_nbr,
         '###'
      ) then
         if l_prev_cont != '###START###' then
            apex_json.close_array; -- Close previous container items
            apex_json.close_object; -- Close previous container
         end if;
         apex_json.open_object; -- New Container
         apex_json.write(
            'container_nbr',
            r.container_nbr
         );
         apex_json.write(
            'shipment_nbr',
            r.shipment_nbr
         );
         apex_json.open_array('items');
         l_prev_cont := r.container_nbr;
      end if;
        
        -- Add Item
      apex_json.open_object;
      apex_json.write(
         'item_description',
         r.item_description
      );
      apex_json.write(
         'cargo_description',
         r.cargo_description
      );
      apex_json.write(
         'hs_code',
         r.hs_code
      );
      apex_json.write(
         'gross_weight',
         r.gross_weight
      );
      apex_json.write(
         'net_weight',
         r.net_weight
      );
      apex_json.write(
         'weight_uom',
         r.weight_uom
      );
      apex_json.write(
         'volume',
         r.volume
      );
      apex_json.write(
         'volume_uom',
         r.volume_uom
      );
      apex_json.write(
         'un_class',
         r.un_class
      );
      apex_json.write(
         'country_of_origin',
         r.country_of_origin
      );
      apex_json.write(
         'rcvd_qty',
         r.rcvd_qty
      );
      apex_json.write(
         'quantity',
         r.qty
      );
      apex_json.write(
         'quantity_uom',
         r.qty_uom
      );
      apex_json.close_object;
   end loop;

    -- Close remaining open structures
   if not l_is_first_cust then
      apex_json.close_array; -- Close last container items
      apex_json.close_object; -- Close last container
      apex_json.close_array; -- Close last customer containers
      apex_json.close_object; -- Close last customer
   end if;

   apex_json.close_array; -- Close data array
   apex_json.close_object; -- Close root object

   -- Capture Output
   l_final_clob := apex_json.get_clob_output;

   -- Chunked Output
   declare
      l_offset number := 1;
      l_amount number := 32000;
      l_len    number;
      l_buffer varchar2(32767);
   begin
      if l_final_clob is not null then
         l_len := dbms_lob.getlength(l_final_clob);
         while l_offset <= l_len loop
            dbms_lob.read(
               l_final_clob,
               l_amount,
               l_offset,
               l_buffer
            );
            htp.prn(l_buffer);
            l_offset := l_offset + l_amount;
         end loop;
      end if;
   end;

   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      
      -- Simple output for error
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_get_inventory;

-- PROCEDURE: XX_OTM_GET_OPERATORS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_OPERATORS as
   l_clob       clob;
   
   l_url        varchar2(4000) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/drivers?q=driverTypeGid ne DEFAULT';
   j            apex_json.t_values;
   l_count      number;
   l_driver_xid varchar2(200);
begin
    -- Set Request Headers
   apex_web_service.g_request_headers.delete;
      apex_web_service.g_request_headers(1).name  := 'Content-Type';
      apex_web_service.g_request_headers(1).value := 'application/json';

    -- Make REST Request
   l_clob := apex_web_service.make_rest_request(
      p_url         => l_url,
       p_http_method => 'GET',
	    p_username    => 'NAQLEEN.INTEGRATION',
	    p_password    => 'NaqleenInt@123',
	    p_wallet_path => 'file:/u01/app/oracle/product/wallet'
   );

    -- Parse the Response
   apex_json.parse(
      j,
      l_clob
   );
    
    -- Construct the Output JSON
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.open_array('data');
    
    -- Loop through request items
   l_count := apex_json.get_count(
      p_path   => 'items',
      p_values => j
   );
   for i in 1..l_count loop
      l_driver_xid := apex_json.get_varchar2(
         p_path   => 'items[%d].driverXid',
         p0       => i,
         p_values => j
      );
      if l_driver_xid is not null then
         apex_json.write(l_driver_xid);
      end if;
   end loop;

   apex_json.close_array;
   apex_json.close_object;
    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
exception
   WHEN OTHERS THEN
        APEX_JSON.INITIALIZE_CLOB_OUTPUT;
        APEX_JSON.OPEN_OBJECT;
            APEX_JSON.WRITE('response_code', 500);
            APEX_JSON.WRITE('response_message', 'Unexpected error: ' || SQLERRM);
        APEX_JSON.CLOSE_OBJECT;
        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
end xx_otm_get_operators;

-- PROCEDURE: XX_OTM_GET_PLUG_IN_OUT_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_PLUG_IN_OUT_CONTAINERS (
   searchtext in varchar2 default null
) as
   cursor c_containers is
   select distinct container_nbr
     from xxotm_container_inventory_t
    where position is not null
      and container_type in ( '20RT',
                              '22RT',
                              '25RT',
                              '40RT',
                              '42RT',
                              '45RT' )
                              AND CONTAINER_RELEASED_TIME IS NULL  
      and upper(container_nbr) like '%'
                                    || upper(searchtext)
                                    || '%';

   l_count number := 0;
begin
    -- First count matching rows
   select count(*)
     into l_count
     from xxotm_container_inventory_t
    where position is not null
      and container_type in ( '20RT',
                              '22RT',
                              '25RT',
                              '40RT',
                              '42RT',
                              '45RT' )
                              AND CONTAINER_RELEASED_TIME IS NULL
      and upper(container_nbr) like '%'
                                    || upper(searchtext)
                                    || '%';


   apex_json.initialize_clob_output;
   apex_json.open_object;
   if l_count = 0 then
        -- No data found
      apex_json.write(
         'response_message',
         'No data found'
      );
      apex_json.write(
         'response_code',
         404
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      dbms_output.put_line(apex_json.get_clob_output);
      return;
   end if;

    -- If data exists → Success response
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.write(
      'response_code',
      200
   );
   apex_json.open_array('data');
   for r_container in c_containers loop
      apex_json.write(r_container.container_nbr);
   end loop;
   apex_json.close_array;
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   dbms_output.put_line(apex_json.get_clob_output);
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
--        apex_json.open_array('data');
--        apex_json.close_array;
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      dbms_output.put_line(apex_json.get_clob_output);
end xx_otm_get_plug_in_out_containers;

-- PROCEDURE: XX_OTM_GET_PLUG_IN_OUT_CONTAINER_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_PLUG_IN_OUT_CONTAINER_DETAILS (
    p_contianer_nbr IN VARCHAR2
) AS
     l_count NUMBER := 0;


    CURSOR c_history IS  
    SELECT type,
               set_point_temp,
               current_temp,
               remarks,
               timestamp
          FROM xxotm_pluginout_t p ,xxotm_container_inventory_t c
    where p.container_nbr = c.CONTAINER_NBR AND c.INBOUND_SHIPMENT_NBR = p.INBOUND_SHIPMENT_NBR AND 
    c.CONTAINER_STORED_TIME IS NOT NULL AND c.CONTAINER_RELEASED_TIME IS null
    AND c.CONTAINER_TYPE in ( '20RT',
                              '22RT',
                              '25RT',
                              '40RT',
                              '42RT',
                              '45RT' )
      and upper(c.container_nbr) like '%'
                                    || upper(p_contianer_nbr)
                                    || '%';
          
BEGIN

    apex_json.initialize_clob_output;
    apex_json.open_object;
    SELECT count(*) INTO l_count FROM xxotm_container_inventory_t c WHERE 
     c.CONTAINER_STORED_TIME IS NOT NULL AND c.CONTAINER_RELEASED_TIME IS NULL AND upper(c.container_nbr) = upper(p_contianer_nbr);
                                    
    IF (l_count > 0 ) THEN 
    
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
ELSE 
	  apex_json.write('response_message', 'Container Not Found');
    apex_json.write('response_code', 404);
     apex_json.close_object;
htp.prn(apex_json.get_clob_output);
	END IF;
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

-- PROCEDURE: XX_OTM_GET_POSITION_CONTAINER_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_POSITION_CONTAINER_TRUCKS (
   p_search_text in varchar2
) as
   l_url                  varchar2(4000);
   l_shipment_xid         varchar2(50);
   l_response_clob        clob;
   
   -- Flags for status checks
   l_has_gate_in          boolean;
   l_has_gate_out         boolean;
   l_has_container_stored boolean;
   l_event_count          number;
   l_status_code          varchar2(200);
   cursor c_trucks is
   select truck_nbr
     from xxotm_vehicle_master_t
    where entry_time is not null
      and exit_time is null
      and ( p_search_text is null
       or truck_nbr like '%'
                         || p_search_text
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
            and ( st.shipment_name like '%INBOUND_CONTAINER%'
             or st.shipment_name like '%STORE_AS_IT_IS%' ) 
            ORDER BY UPDATE_DATE DESC FETCH FIRST 1 ROWS only
				
            ;
      exception
         when no_data_found then
            l_shipment_xid := null;
      end;

      if l_shipment_xid is not null then
      
         -- Reset flags for each shipment
         l_has_gate_in := false;
         l_has_gate_out := false;
         l_has_container_stored := false;

         ------------------------------------------------------------------
         -- Single API Call: Fetch ALL tracking events
         ------------------------------------------------------------------
         l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
                  || l_shipment_xid
                  || '/trackingEvents';
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
            l_event_count := apex_json.get_count('items');
            for i in 1..l_event_count loop
               l_status_code := apex_json.get_varchar2(
                  'items[%d].statusCodeGid',
                  i
               );
               
            
               if instr(
                  l_status_code,
                  'GATE IN'
               ) > 0 then
                  l_has_gate_in := true;
               end if;
               if instr(
                  l_status_code,
                  'GATE OUT'
               ) > 0 then
                  l_has_gate_out := true;
               end if;
               if instr(
                  l_status_code,
                  'CONTAINER STORED'
               ) > 0 then
                  l_has_container_stored := true;
               end if;
            end loop;

         exception
            when others then
               -- If API fails, we likely can't validate position, so usually assume False or skip.
               l_has_gate_in := false;
         end;

       
         if
            l_has_gate_in
            and not l_has_gate_out
            and not l_has_container_stored
         then
            apex_json.write(r_truck.truck_nbr);
         end if;
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
end xx_otm_get_position_container_trucks;

-- PROCEDURE: XX_OTM_GET_RECOMMENDED_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_RECOMMENDED_CONTAINERS (
   p_payload IN BLOB
) AS
   v_req_clob  CLOB;
   v_count     NUMBER;
   v_type      VARCHAR2(100);
   v_req_count NUMBER;
   
   -- Gate OUT position (for distance calculation)
   c_gate_x CONSTANT NUMBER := -200;
   c_gate_z CONSTANT NUMBER := -35.4;
   
   -- Container dimensions
   c_20ft_length CONSTANT NUMBER := 6.058;
   c_40ft_length CONSTANT NUMBER := 12.192;
   c_lot_gap     CONSTANT NUMBER := 1.75;  -- From dynamic_icds.json
   
   -- Block center positions and lot counts (from dynamic_icds.json)
   -- Block A: x=-88.8, z=-55.75, 23 lots, 20ft
   -- Block B: x=-72, z=-15.06, 11 lots, 40ft
   -- Block C: x=-72, z=+15.06, 11 lots, 40ft
   -- Block D: x=-172, z=+59, varies, 20ft
   
   -- Cursor with proper distance calculation using lot_gap
   CURSOR c_containers (p_ctype VARCHAR2, p_limit NUMBER) IS
   SELECT container_nbr, position
   FROM (
      SELECT container_nbr,
             position,
             REGEXP_SUBSTR(position, '[^-]+', 1, 2) AS block_letter,
             TO_NUMBER(REGEXP_SUBSTR(position, '[^-]+', 1, 3)) AS lot_num,
             REGEXP_SUBSTR(position, '[^-]+', 1, 4) AS row_letter,
             -- Calculate approximate X position using proper formula:
             -- X = block_center_x + startX + (lotIndex * lot_spacing)
             -- startX = -totalWidth/2 + containerLength/2
             -- lot_spacing = containerLength + lot_gap
             CASE UPPER(REGEXP_SUBSTR(position, '[^-]+', 1, 2))
                -- Block A: center=-88.8, 23 lots, 20ft
                -- lot_spacing = 6.058 + 1.75 = 7.808
                -- totalWidth = 23 * 7.808 = 179.584
                -- startX = -179.584/2 + 6.058/2 = -86.763
                -- Lot 1: -88.8 + (-86.763 + 0*7.808) = -175.56
                WHEN 'A' THEN -88.8 + (-86.763 + (TO_NUMBER(REGEXP_SUBSTR(position, '[^-]+', 1, 3)) - 1) * 7.808)
                -- Block B: center=-72, 11 lots, 40ft
                -- lot_spacing = 12.192 + 1.75 = 13.942
                -- totalWidth = 11 * 13.942 = 153.362
                -- startX = -153.362/2 + 12.192/2 = -70.585
                -- Lot 1: -72 + (-70.585 + 0*13.942) = -142.585
                WHEN 'B' THEN -72 + (-70.585 + (TO_NUMBER(REGEXP_SUBSTR(position, '[^-]+', 1, 3)) - 1) * 13.942)
                -- Block C: same as B
                WHEN 'C' THEN -72 + (-70.585 + (TO_NUMBER(REGEXP_SUBSTR(position, '[^-]+', 1, 3)) - 1) * 13.942)
                -- Block D: center=-172, 20ft, assuming similar to A
                WHEN 'D' THEN -172 + (-40 + (TO_NUMBER(REGEXP_SUBSTR(position, '[^-]+', 1, 3)) - 1) * 7.808)
                ELSE 0
             END AS approx_x,
             -- Z position based on block
             CASE UPPER(REGEXP_SUBSTR(position, '[^-]+', 1, 2))
                WHEN 'A' THEN -55.75
                WHEN 'B' THEN -15.06
                WHEN 'C' THEN 15.06
                WHEN 'D' THEN 59
                ELSE 0
             END AS approx_z
        FROM xxotm_container_inventory_t
       WHERE container_type = p_ctype
         AND booking_id IS NULL
         AND container_released_time IS NULL
         AND outbound_shipment_nbr IS NULL
         AND position IS NOT NULL
         AND container_stored_time IS NOT NULL
         AND inbound_shipment_nbr IS NOT NULL
       ORDER BY TO_DATE(container_stored_time, 'YYYY-MM-DDTHH24:MI:SSZ') ASC
   )
   -- Order by distance from gate, then positional
   ORDER BY 
      -- 1. Manhattan distance from Gate OUT (smaller = closer = better)
      ABS(approx_x - c_gate_x) + ABS(approx_z - c_gate_z) ASC,
      -- 2. Lot number as tiebreaker (lower = closer to west)
      lot_num ASC,
      -- 3. Row ordering - conditional based on block letter
      CASE 
         WHEN UPPER(block_letter) IN ('A', 'D') THEN -ASCII(row_letter)
         ELSE ASCII(row_letter)
      END ASC,
      -- 4. Pick Topmost Container First (Safety/Accessibility)
      TO_NUMBER(REGEXP_SUBSTR(position, '[^-]+', 1, 5)) DESC
   FETCH FIRST p_limit ROWS ONLY;

BEGIN
   v_req_clob := TO_CLOB(p_payload);

   BEGIN
      APEX_JSON.parse(v_req_clob);
   EXCEPTION
      WHEN OTHERS THEN
         APEX_JSON.initialize_clob_output;
         APEX_JSON.open_object;
         APEX_JSON.write('response_code', 400);
         APEX_JSON.write('response_message', 'Invalid JSON Input');
         APEX_JSON.open_array('data');
         APEX_JSON.close_array;
         APEX_JSON.close_object;
         HTP.prn(APEX_JSON.get_clob_output);
         RETURN;
   END;
   
   APEX_JSON.initialize_clob_output;
   APEX_JSON.open_object;
   APEX_JSON.write('response_code', 200);
   APEX_JSON.write('response_message', 'Success');
   APEX_JSON.open_array('data');

   v_count := APEX_JSON.get_count('container_types');

   FOR i IN 1..v_count LOOP
      v_type := APEX_JSON.get_varchar2('container_types[%d].container_type', i);
      v_req_count := APEX_JSON.get_number('container_types[%d].container_count', i);
      
      APEX_JSON.open_object;
      APEX_JSON.write('container_type', v_type);
      APEX_JSON.open_array('recommended_containers');
      
      FOR r IN c_containers(v_type, v_req_count) LOOP
         APEX_JSON.write(r.container_nbr);
      END LOOP;

      APEX_JSON.close_array;
      APEX_JSON.close_object;
   END LOOP;

   APEX_JSON.close_array;
   APEX_JSON.close_object;
   HTP.prn(APEX_JSON.get_clob_output);
   
EXCEPTION
   WHEN OTHERS THEN
      APEX_JSON.initialize_clob_output;
      APEX_JSON.open_object;
      APEX_JSON.write('response_code', 500);
      APEX_JSON.write('response_message', SQLERRM);
      APEX_JSON.open_array('data');
      APEX_JSON.close_array;
      APEX_JSON.close_object;
      HTP.prn(APEX_JSON.get_clob_output);
END xx_otm_get_recommended_containers;

-- PROCEDURE: XX_OTM_GET_RELEASE_CONTAINER_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_RELEASE_CONTAINER_TRUCKS (
   p_search_text in varchar2 default null
) as
   l_url            varchar2(4000);
   l_response_clob  clob;
   l_gate_in_count  number;
   l_gate_out_count number;

    -- Collection to hold valid trucks
   type t_truck_list is
      table of varchar2(100);
   l_valid_trucks   t_truck_list := t_truck_list();
   cursor c_trucks is
   select v.truck_nbr,
          s.shipment_xid
     from xxotm_vehicle_master_t v
     join xxotm_shipments_t s
   on ( s.power_unit = v.truck_nbr
       or s.truck_3pl = v.truck_nbr )
    where v.entry_time is not null
      and ( upper(s.shipment_name) like '%LRO%'
       or upper(s.shipment_name) like '%CRO%' )
      and ( p_search_text is null
       or upper(v.truck_nbr) like '%'
                                  || upper(p_search_text)
                                  || '%' );
begin
    -- Initialize output
   apex_json.initialize_clob_output;

    -- Iterate through trucks
   for r in c_trucks loop
        -- Check for GATE OUT first
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
         l_gate_out_count := apex_json.get_number(p_path => 'count');
      exception
         when others then
            l_gate_out_count := 0;
      end;

        -- Only check GATE IN if no GATE OUT
      if l_gate_out_count = 0 then
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
            l_gate_in_count := apex_json.get_number(p_path => 'count');
         exception
            when others then
               l_gate_in_count := 0;
         end;

         if l_gate_in_count >= 1 then
                -- Check if truck already exists in list (simple loop check)
            declare
               l_found boolean := false;
            begin
               for i in 1..l_valid_trucks.count loop
                  if l_valid_trucks(i) = r.truck_nbr then
                     l_found := true;
                     exit;
                  end if;
               end loop;

                    -- Add truck if not found
               if not l_found then
                  l_valid_trucks.extend;
                  l_valid_trucks(l_valid_trucks.last) := r.truck_nbr;
               end if;
            end;
         end if;
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
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_get_release_container_trucks;

-- PROCEDURE: XX_OTM_GET_REPAIR_STATUS_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_REPAIR_STATUS_CONTAINERS (
   p_search_text in varchar2 default null
) as
   l_count      number := 0;
   type t_container_list is
      table of xxotm_container_inventory_t.container_nbr%type;
   l_containers t_container_list;
begin
   select distinct container_nbr
   bulk collect
     into l_containers
     from xxotm_container_inventory_t
    where ( p_search_text is null
       or upper(container_nbr) like '%'
                                    || upper(p_search_text)
                                    || '%' )
      and rownum <= 50;

   apex_json.open_object;
   if l_containers.count > 0 then
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_array('data');
      for i in 1..l_containers.count loop
         apex_json.write(l_containers(i));
      end loop;
      apex_json.close_array;
   else
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No data found'
      );
      apex_json.open_array('data');
      apex_json.close_array;
   end if;

   apex_json.close_object;
exception
   when others then
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
end;


-- PROCEDURE: XX_OTM_GET_RESERVED_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_RESERVED_CONTAINERS (
    P_BOOKING_ID IN VARCHAR2 DEFAULT NULL
) AS
    l_cursor SYS_REFCURSOR;
BEGIN
    OPEN l_cursor FOR
        SELECT
            i.container_nbr,
            CASE
               WHEN s.container_type LIKE '2%' THEN
                  '20FT'
               ELSE
                  '40FT'
            END AS container_type
        FROM xxotm_container_inventory_t_test i
             LEFT JOIN xxotm_shipments_t s
           ON i.container_nbr = s.cont_no
        WHERE (P_BOOKING_ID IS NULL OR i.booking_id = P_BOOKING_ID);

    APEX_JSON.open_object;
    APEX_JSON.write('response_message', 'Success');
    APEX_JSON.write('response_code', 200);
    APEX_JSON.write('data', l_cursor);
    APEX_JSON.close_object;
EXCEPTION
    WHEN OTHERS THEN
        APEX_JSON.open_object;
        APEX_JSON.write('response_message', 'Error: ' || SQLERRM);
        APEX_JSON.write('response_code', 500);
        APEX_JSON.close_object;
END;

-- PROCEDURE: XX_OTM_GET_RESTACKING_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_RESTACKING_CONTAINERS (
   p_search_text in varchar2 default null
) as
   l_data_array       json_array_t;
   l_response         json_object_t;
   l_obj              json_object_t;
   j                  apex_json.t_values;
   

   cursor c_data_cursor is
   select distinct ci.container_nbr
     from xxotm_container_inventory_t ci
    where ci.inbound_shipment_nbr IS NOT NULL AND  ci.outbound_shipment_nbr is NULL AND ci.POSITION IS NOT NULL 
    AND ci.container_nbr IS NOT NULL
    AND ci.container_stored_time IS NOT NULL AND ci.container_released_time IS null
      and ( p_search_text is null
       or upper(ci.container_nbr) like '%'
                                       || upper(p_search_text)
                                       || '%' )
    order by ci.container_nbr;
    
   l_container_nbr    varchar2(50);
   l_position         varchar2(100);
   l_container_type   varchar2(50);
   e_no_data exception;
begin
   l_response := json_object_t();
   l_data_array := json_array_t();
   
   -- 1. Build Containers Array
   open c_data_cursor;
   loop
      fetch c_data_cursor into
         l_container_nbr;
      exit when c_data_cursor%notfound;
      l_data_array.append(l_container_nbr);
   end loop;
   close c_data_cursor;

   if l_data_array.get_size() = 0 then
      raise e_no_data;
   end if;

   -- 4. Final Response
   l_response.put('response_code', 200);
   l_response.put('response_message', 'Success');
   l_response.put('data', l_data_array);

   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      l_response.get_number('response_code')
   );
   apex_json.write(
      'response_message',
      l_response.get_string('response_message')
   );
   
   -- Parse the data object to CLOB for output
   apex_json.parse(
      j,
      l_response.get('data').to_clob()
   );
   apex_json.write(
      'data',
      j
   );
   
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when e_no_data then
      l_response := json_object_t();
      l_response.put('response_code', 404);
      l_response.put('response_message', 'No data found');
      
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write('response_code', l_response.get_number('response_code'));
      apex_json.write('response_message', l_response.get_string('response_message'));
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
   when others then
      l_response := json_object_t();
      l_response.put('response_code', 400);
      l_response.put('response_message', 'ERROR WHILE EXECUTING METHOD: ' || sqlerrm);
      
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write('response_code', l_response.get_number('response_code'));
      apex_json.write('response_message', l_response.get_string('response_message'));
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_get_restacking_containers;

-- PROCEDURE: XX_OTM_GET_RESTACKING_CONTAINER_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_RESTACKING_CONTAINER_DETAILS (
   p_container_nbr in varchar2
) as
   type record_type is record (
         container_nbr    varchar2(50),
         current_position varchar2(20),
         container_type   varchar2(10)
   );
   l_record          record_type;
   l_event_data      json_object_t;
   l_terminals_array json_array_t;
   l_response        json_object_t;
   j                 apex_json.t_values;
   cursor c_data_cursor is
   select distinct ci.container_nbr,
                   ci.position,
                   sh.container_type
     from xxotm_container_inventory_t ci,
          xxotm_shipments_t sh
    where ci.outbound_shipment_nbr is null
      and ci.container_nbr = sh.cont_no
      and upper(ci.container_nbr) = upper(p_container_nbr);
begin
   -- Build JSON array from cursor
   l_response := json_object_t();
   open c_data_cursor;
   loop
      fetch c_data_cursor into l_record;
      exit when c_data_cursor%notfound;
      l_event_data := json_object_t();
      l_event_data.put(
         'container_nbr',
         l_record.container_nbr
      );
      l_event_data.put(
         'current_position',
         l_record.current_position
      );
      l_event_data.put(
         'type',
         l_record.container_type
      );
   end loop;

   l_terminals_array := json_array_t();
   for i in (
      select distinct terminal
        from xxotm_position_master_t
       where is_occupied = 'N'
       order by terminal
   ) loop
      l_terminals_array.append(i.terminal);
   end loop;

   -- 3. Construct Data Object
   l_event_data.put(
      'terminals',
      l_terminals_array
   );
   close c_data_cursor;
   -- Wrap in response object
   l_response.put(
      'response_code',
      200
   );
   l_response.put(
      'response_message',
      'Success'
   );
   l_response.put(
      'data',
      l_event_data
   );

   -- Output using APEX_JSON
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

   -- Convert JSON array string to APEX_JSON.t_values
   apex_json.parse(
      j,
      l_response.get('data').to_string()
   );
   apex_json.write(
      'data',
      j
   );
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      l_response := json_object_t();
      l_response.put(
         'response_code',
         400
      );
      l_response.put(
         'response_message',
         'ERROR WHILE EXECUTING METHOD: ' || sqlerrm
      );
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
      apex_json.free_output;
end xx_otm_get_restacking_container_details;

-- PROCEDURE: XX_OTM_GET_ROLE_INFO

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_ROLE_INFO (
   p_role in varchar2
) as
   v_screen_count    number := 0;
   v_associated_role varchar2(4000); -- Increased size for list
begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Role info retrieved successfully'
   );

    -- Role information with screens included
   apex_json.open_object('role_info');
   apex_json.write(
      'role',
      p_role
   );
   apex_json.write(
      'name',
      initcap(replace(
         p_role,
         '_',
         ' '
      ))
   );

    -- Screens array within role_info
   apex_json.open_array('screens');
   for rec in (
      select screen_name,
             screen_path,
             is_active
        from xx_role_config
       where role = upper(trim(p_role))
       order by screen_name
   ) loop
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

        -- Admin specific logic: Add 'role' field referencing other roles
        -- Uses LISTAGG to capture ALL roles associated with this screen
      if upper(trim(p_role)) = 'ADMIN' then
         begin
            select listagg(role, ',') within group (order by role)
              into v_associated_role
              from xx_role_config
             where screen_path = rec.screen_path
               and role <> 'ADMIN';
         exception
            when no_data_found then
               v_associated_role := null;
         end;

         if v_associated_role is not null then
            apex_json.write(
               'role',
               v_associated_role
            );
         end if;
      end if;

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
         404
      );
      apex_json.write(
         'response_message',
         'Role not found: ' || p_role
      );
      apex_json.write(
         'role',
         p_role
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
end xx_otm_get_role_info;

-- PROCEDURE: XX_OTM_GET_SHIPMENTS_BY_BOOKING

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_SHIPMENTS_BY_BOOKING (
   p_booking_no  in varchar2,
   p_search_text in varchar2 default null,
   p_page_num    in number default 1
) as
   l_url            varchar2(32767);
   l_response_clob  clob;
   l_shipment_count number;
   l_shipment_xid   varchar2(200);
   l_shipment_name  varchar2(200);
   l_container_nbr  varchar2(200);
   l_limit          number := 25;
   l_offset         number;
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
   
   -- Calculate offset (0-based) from page number (1-based)
   -- Page 1: offset 0
   -- Page 2: offset 25
   l_offset := ( p_page_num - 1 ) * l_limit;

   -- Construct URL with filters
   l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'
            || '?q=attribute1 eq TERMINAL and perspective eq B and statuses.statusTypeGid eq NAQLEEN.TRIP_STATUS'
            || ' and statuses.statusValueGid eq NAQLEEN.TRIP_NOT_STARTED and shipmentName in [STUFFING,DESTUFFING,STORE_AS_IT_IS,CRO,LRO]'
            ;
   
   -- Add Booking Number filter (exact match)
   l_url := l_url
            || ' and refnums.shipmentRefnumQualGid eq NAQLEEN.BOOKING_NO and refnums.shipmentRefnumValue eq '
            || p_booking_no
            || '';

   -- Add Shipment Number search filter (contains) if provided
   if p_search_text is not null then
      l_url := l_url
               || ' and shipmentXid co '
               || p_search_text
               || '';
   end if;
   
   -- Add Pagination and Expansion
   l_url := l_url
            || '&limit='
            || l_limit
            || '&offset='
            || l_offset
            || '&expand=refnums,statuses';

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
      l_shipment_count := apex_json.get_count('items');
      for i in 1..l_shipment_count loop
         l_shipment_xid := apex_json.get_varchar2(
            'items[%d].shipmentXid',
            i
         );
         l_shipment_name := apex_json.get_varchar2(
            'items[%d].shipmentName',
            i
         );
         l_container_nbr := apex_json.get_varchar2(
            'items[%d].attribute3',
            i
         );
         apex_json.open_object;
         apex_json.write(
            'shipment_nbr',
            l_shipment_xid
         );
         apex_json.write(
            'shipment_name',
            l_shipment_name
         );
         apex_json.write(
            'container_nbr',
            l_container_nbr
         );
         apex_json.close_object;
      end loop;

   exception
      when others then
         null;
   end;

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
end xx_otm_get_shipments_by_booking;

-- PROCEDURE: XX_OTM_GET_SHIPMENTS_FOR_CUSTOMER_INVENTORY

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_SHIPMENTS_FOR_CUSTOMER_INVENTORY (
   p_customer_nbr in varchar2,
      p_search_text  in varchar2 default null
) as
   cursor c_shipments is
   select shipment_xid,cont_no
     from xxotm_shipments_t
    where UPPER(liner_name) = UPPER(p_customer_nbr)
      and shipment_name in ( 'STORE_AS_IS_IT',
                             'DESTUFFING',
                             'STUFFING' )
                              and ( p_search_text is null
       or upper(shipment_xid) like '%'
                                   || upper(p_search_text)
                                   || '%' );
begin
   apex_json.initialize_clob_output;
    apex_json.open_object;
    apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
   apex_json.open_array('data');
   for r in c_shipments loop
      apex_json.open_object();
      apex_json.write(
      'shipment_nbr',
        r.shipment_xid
      );
    apex_json.write(
      'container_nbr',
        r.cont_no
      );
	 apex_json.close_object();
   end loop;

   apex_json.close_array;
    apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      apex_json.free_output;
end xx_otm_get_shipments_for_customer_inventory;

-- PROCEDURE: XX_OTM_GET_SHIPMENT_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_SHIPMENT_DETAILS (
   p_shipment_nbr  in varchar2
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
   l_customer_name 	  varchar2(50);	
   l_customer_nbr    varchar2(50);	
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
             st.container_type,
             st.customer_name,
             st.liner_name,
             st.power_unit,
             st.truck_3pl,
             om.order_release_xid
        into
         l_shipment_name,
         l_shipment_nbr,
         l_container_nbr,
         l_container_type,
         l_customer_name,
         l_customer_nbr,
         l_power_unit,
         l_truck_3pl,
         l_otm_order_nbr
        from xxotm_shipments_t st
        ,xxotm_order_movements_t om
      WHERE st.shipment_xid  = om.SHIPMENT_XID AND  st.shipment_xid = p_shipment_nbr
        
         and rownum = 1;

        -- Determine Truck Number (Power Unit or 3PL)
      l_truck_nbr := nvl(
         l_power_unit,
         l_truck_3pl
      );

        -- Fetch Driver Details if Truck Number exists
--      if l_truck_nbr is not null then
--         begin
--            select xvmt.driver_name,
--                   xvmt.driver_iqama
--              into
--               l_driver_name,
--               l_driver_iqama_nbr
--              from xxotm_vehicle_master_t xvmt
--             where xvmt.truck_nbr = l_truck_nbr
--               and rownum = 1;
--         exception
--            when no_data_found then
--               l_driver_name := null;
--               l_driver_iqama_nbr := null;
--         end;
--      end if;

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
      'customer_name',
      l_customer_name
   );
   apex_json.write(
      'customer_nbr',
      l_customer_nbr
   );
--   apex_json.write(
--      'driver_name',
--      l_driver_name
--   );
--   apex_json.write(
--      'driver_iqama_nbr',
--      l_driver_iqama_nbr
--   );
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
   p_search_text in varchar2
) as
   cursor c_containers is
   select cont_no as container_nbr,
          shipment_xid
     from xxotm_shipments_t
    where shipment_name = 'STUFFING'
      and ( p_search_text is null
       or cont_no like '%'
                       || p_search_text
                       || '%' );

   l_api_url          varchar2(500);
   l_track_response   clob;
   l_status_code      varchar2(200);
   l_gate_in_count    number;
   l_gate_out_count   number;
   type t_container_list is
      table of varchar2(100);
   l_valid_containers t_container_list := t_container_list();
begin
    -- Configure APEX_JSON
   apex_json.initialize_clob_output;
   apex_json.open_object;
   for r in c_containers loop
      l_api_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/'
                   || 'NAQLEEN.'
                   || r.shipment_xid
                   || '/trackingEvents';
        
        -- Reset counters for each container
      l_gate_in_count := 0;
      l_gate_out_count := 0;
      begin
            -- Make API Call
         apex_web_service.g_request_headers.delete;
         apex_web_service.g_request_headers(1).name := 'Content-Type';
         apex_web_service.g_request_headers(1).value := 'application/json';
         l_track_response := apex_web_service.make_rest_request(
            p_url         => l_api_url,
            p_http_method => 'GET',
            p_username    => 'NAQLEEN.INTEGRATION',
            p_password    => 'NaqleenInt@123',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );
            
            -- Parse Response
         apex_json.parse(l_track_response);
            
            -- Check Events
         for i in 1..apex_json.get_count('items') loop
            l_status_code := apex_json.get_varchar2(
               'items[%d].statusCodeGid',
               i
            );
                
                -- Check for GATE IN
            if upper(l_status_code) like '%GATE IN%'
            or upper(l_status_code) = 'NAQLEEN.GATE IN'
            or upper(l_status_code) = 'GATE_IN' then
               l_gate_in_count := l_gate_in_count + 1;
                
                -- Check for GATE OUT
            elsif upper(l_status_code) like '%GATE OUT%'
            or upper(l_status_code) = 'NAQLEEN.GATE OUT'
            or upper(l_status_code) = 'GATE_OUT' then
               l_gate_out_count := l_gate_out_count + 1;
            end if;
         end loop;

            -- Logic: Valid if (Has Gate In) AND (Has NO Gate Out)
         if
            l_gate_in_count >= 1
            and l_gate_out_count = 0
         then
            l_valid_containers.extend;
            l_valid_containers(l_valid_containers.count) := r.container_nbr;
            
            -- Limit to 10 records
            if l_valid_containers.count >= 10 then
               exit;
            end if;
         end if;

      exception
         when others then
                -- Ignore API errors for a single container, just don't add it
            null;
      end;
   end loop;

    -- Build Final Response
   if l_valid_containers.count > 0 then
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_array('data');
      for i in 1..l_valid_containers.count loop
         apex_json.write(l_valid_containers(i));
      end loop;
      apex_json.close_array;
   else
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No data found'
      );
        -- Empty data array might be polite, but adhering to user snippet style derived from chat history
        -- actually user snippet had commented out empty data array. I'll omit it for 404 to match.
   end if;

   apex_json.close_object;
    
    -- Output
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      apex_json.free_output;
end xx_otm_get_stuffing_containers;


-- PROCEDURE: XX_OTM_GET_TASK_ASSIGNMENT_SHIPMENTS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_TASK_ASSIGNMENT_SHIPMENTS (
   p_search_text in varchar2 default null,
   p_page_num    in number default 0
) as
   l_url             clob;
   l_response_clob   clob;
   l_items_count     number;
   l_shipment_xid    varchar2(100);
   l_shipment_name   varchar2(100);
   
   -- Local Task Status variables
   l_task_status     varchar2(100);
   l_shipment_status varchar2(100);
   l_limit           number := 10;
begin
   apex_json.initialize_clob_output;
   
   -- 1. Construct the API URL with filters
   l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/shipments/?q=attribute1 eq TERMINAL and perspective eq B and trackingEvents.statusCodeGid in [NAQLEEN.GATE IN] and statuses.statusTypeGid eq NAQLEEN.TRIP_STATUS and (statuses.statusValueGid ne NAQLEEN.TRIP_COMPLETED) and shipmentName in [INBOUND_CONTAINER,STUFFING,DESTUFFING]  and shipmentXid co '
            || nvl(
      upper(p_search_text),
      ''
   )
            || ' &offset='
            || (p_page_num-1) * l_limit;
   
   -- 2. Call the API
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
      
      -- 3. Parse Response
      apex_json.parse(l_response_clob);
      l_items_count := apex_json.get_count(p_path => 'items');
      apex_json.open_object;
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_array('shipments');
      if l_items_count > 0 then
         for i in 1..l_items_count loop
            l_shipment_xid := apex_json.get_varchar2(
               p_path => 'items[%d].shipmentXid',
               p0     => i
            );
            l_shipment_name := apex_json.get_varchar2(
               p_path => 'items[%d].shipmentName',
               p0     => i
            );
            
            -- Check if shipment exists in task assignment table
            begin
               select status
                 into l_task_status
                 from xxotm_task_assignment_t
                where shipment_nbr = l_shipment_xid
                  and rownum = 1;
               
               -- If found in table, SKIP this shipment (don't add to output)
               -- This implements if there is an assigned task, skip that shipment
               null; -- Do nothing, effectively skipping the shipment

            exception
               when no_data_found then
                  -- Not in table = new shipment, include it in output
                  l_shipment_status := 'new';
                  apex_json.open_object;
                  apex_json.write(
                     'shipment_xid',
                     l_shipment_xid
                  );
                  apex_json.write(
                     'shipment_name',
                     l_shipment_name
                  );
                  apex_json.write(
                     'shipment_status',
                     l_shipment_status
                  );
                  apex_json.close_object;
            end;
         end loop;
      end if;

      apex_json.close_array;
      apex_json.close_object;
   exception
      when others then
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
   end;

   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
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
         'Critical Error: ' || sqlerrm
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_get_task_assignment_shipments;

-- PROCEDURE: XX_OTM_GET_TASK_ASSIGNMENT_SHIPMENT_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_TASK_ASSIGNMENT_SHIPMENT_DETAILS (
   p_shipment_nbr in varchar2
) as
   l_shipment_xid  varchar2(100);
   l_shipment_name varchar2(200);
   l_cont_no       varchar2(100);
   l_customer      varchar2(200);
   l_operator      varchar2(100);
   l_status        varchar2(50);
   l_found         boolean := false;
begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
    
    -- Get shipment details
   begin
      select shipment_xid,
             shipment_name,
             cont_no,
             customer_name
        into
         l_shipment_xid,
         l_shipment_name,
         l_cont_no,
         l_customer
        from xxotm_shipments_t
       where shipment_xid = p_shipment_nbr
         and rownum = 1;

      l_found := true;
   exception
      when no_data_found then
         l_found := false;
   end;
   if l_found then
        -- Get operator and status from task assignment table
      begin
         select operator,
                status
           into
            l_operator,
            l_status
           from xxotm_task_assignment_t
          where shipment_nbr = p_shipment_nbr
            and rownum = 1;
      exception
         when no_data_found then
            l_operator := null;
            l_status := null;
      end;

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
         'shipment_nbr',
         l_shipment_xid
      );
      apex_json.write(
         'shipment_name',
         l_shipment_name
      );
      apex_json.write(
         'cont_no',
         l_cont_no
      );
      apex_json.write(
         'customer',
         l_customer
      );
      apex_json.write(
         'operator',
         l_operator
      );
      apex_json.write(
         'status',
         l_status
      );
      apex_json.close_object;
   else
      apex_json.write(
         'response_message',
         'Shipment Not Found'
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
end xx_otm_get_task_assignment_shipment_details;

-- PROCEDURE: XX_OTM_GET_TRACKING_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_TRACKING_CONTAINERS (
   p_search_text in varchar2
) as
   l_event_data_array json_array_t;
   l_response         json_object_t;
   cursor c_data_cursor is
   select distinct container_nbr
     from xxotm_container_inventory_t
    where upper(container_nbr) like '%'
                                    || upper(p_search_text)
                                    || '%'
    order by container_nbr
    fetch first 10 rows only;
begin
   -- Initialize Array
   l_event_data_array := json_array_t();
   
   -- Loop through cursor
   for r in c_data_cursor loop
      -- Append container number string directly to array
      l_event_data_array.append(r.container_nbr);
   end loop;
   -- Construct Response
   l_response := json_object_t();
   l_response.put(
      'response_code',
      200
   );
   l_response.put(
      'response_message',
      'Success'
   );
   l_response.put(
      'data',
      l_event_data_array
   );
   
   -- Output
   apex_json.initialize_clob_output;
   htp.prn(l_response.to_clob);
exception
   when others then
      l_response := json_object_t();
      l_response.put(
         'response_code',
         400
      );
      l_response.put(
         'response_message',
         'Error: ' || sqlerrm
      );
      apex_json.initialize_clob_output;
      htp.prn(l_response.to_clob);
end xx_otm_get_tracking_containers;

-- PROCEDURE: XX_OTM_GET_TRACK_CONTAINER_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_TRACK_CONTAINER_DETAILS (
   p_container_nbr in varchar2
) as
   -- Container Inventory Variables
   l_cust_nbr              varchar2(100);
   l_cust_name             varchar2(200);
   l_inbound_order_nbr     varchar2(100);
   l_inbound_shipment_nbr  varchar2(100);
   l_outbound_order_nbr    varchar2(100);
   l_outbound_shipment_nbr varchar2(100);
   l_position              varchar2(100);
   
   -- Shipment Variable
   l_shipment_xid          varchar2(100);
   
   -- API Variables
   l_url                   varchar2(4000);
   l_response_clob         clob;
   l_items_count           number;
   
   -- Event Variables
   l_status_code           varchar2(100);
   l_event_date            varchar2(100);
begin
   apex_json.initialize_clob_output;
   -- 1. Get Container Inventory Details
   begin
      select cust_nbr,
             cust_name,
             inbound_order_nbr,
             inbound_shipment_nbr,
             outbound_order_nbr,
             outbound_shipment_nbr,
             position
        into
         l_cust_nbr,
         l_cust_name,
         l_inbound_order_nbr,
         l_inbound_shipment_nbr,
         l_outbound_order_nbr,
         l_outbound_shipment_nbr,
         l_position
        from xxotm_container_inventory_t
       where container_nbr = p_container_nbr
         and rownum = 1;
   exception
      when no_data_found then
         l_cust_nbr := null;
   end;
   -- 2. Get Shipment XID
   begin
      select shipment_xid
        into l_shipment_xid
        from xxotm_shipments_t
       where cont_no = p_container_nbr
         and rownum = 1;
   exception
      when no_data_found then
         l_shipment_xid := null;
   end;
   -- If we have a shipment XID, call the API
   if l_shipment_xid is not null then
      
      -- Construct URL
      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
               || l_shipment_xid
               || '/trackingEvents';
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
         l_items_count := apex_json.get_count(p_path => 'items');
         apex_json.open_object; -- Root Object
         
         -- Write Container Inventory Data (Common fields)
         apex_json.write(
            'container_nbr',
            p_container_nbr
         );
--         apex_json.write(
--            'cust_nbr',
--            l_cust_nbr
--         );
         apex_json.write(
            'customer',
            l_cust_name
         );
         apex_json.write(
            'inbound_order_nbr',
            l_inbound_order_nbr
         );
         apex_json.write(
            'inbound_shipment_nbr',
            l_inbound_shipment_nbr
         );
         apex_json.write(
            'outbound_order_nbr',
            l_outbound_order_nbr
         );
         apex_json.write(
            'outbound_shipment_nbr',
            l_outbound_shipment_nbr
         );
         apex_json.write(
            'position',
            l_position
         );
         apex_json.open_array('tracking_events'); -- Nested Array
         for i in 1..l_items_count loop
            -- Extract Status Code first to check filter
            l_status_code := apex_json.get_varchar2(
               p_path => 'items[%d].statusCodeGid',
               p0     => i
            );
            
            -- Filter Condition
            if l_status_code in ( 'NAQLEEN.GATE IN',
                                  'NAQLEEN.INSPECTED',
                                  'NAQLEEN.CONTAINER STORED',
                                  'NAQLEEN.CONTAINER RELEASED',
                                  'NAQLEEN.GATE OUT' ) then
               apex_json.open_object;
               l_event_date := apex_json.get_varchar2(
                  p_path => 'items[%d].eventdate.value',
                  p0     => i
               );
               apex_json.write(
                  'status_code',
                  l_status_code
               );
               apex_json.write(
                  'event_date',
                  l_event_date
               );
               apex_json.close_object;
            end if;
         end loop;
         apex_json.close_array; -- tracking_events
         apex_json.close_object; -- Root Object
      exception
         when others then
            -- API Error
            apex_json.open_object;
            apex_json.write(
               'error',
               'API Request Failed: ' || sqlerrm
            );
            apex_json.close_object;
      end;
   else
      -- No shipment found
      apex_json.open_object;
      apex_json.write(
         'message',
         'No shipment found for container'
      );
      apex_json.close_object;
   end if;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      apex_json.free_output;
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'error',
         'Procedure Error: ' || sqlerrm
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_get_track_container_details;


-- PROCEDURE: XX_OTM_GET_VALIDATE_CONTAINER_APEX

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_VALIDATE_CONTAINER_APEX (
   p_container_number in varchar2
) as
   type record_type is record (
         container_type varchar2(100),
         cont_no        varchar2(100),
         shipment_xid   varchar2(100),
         customer_name  varchar2(100)
   );
   l_record         record_type;
   l_data           json_object_t;
   v_found          boolean := false;
   l_status_value   varchar2(100) := null;
   l_count          number := 0;
   l_remarks        varchar2(240) := null;
   l_http_status    varchar2(240) := null;
   l_customername   varchar2(240) := null;
   l_track_response clob := null;
   l_output         clob;
   cursor c_data_cursor (
      p_container_number varchar2
   ) is
   select distinct container_type,
                   cont_no,
                   shipment_xid,
                   customer_name
     from xxotm_shipments_t
    where cont_no = p_container_number
      and shipment_name = 'INBOUND_CONTAINER';

begin
   l_data := json_object_t();
   open c_data_cursor(p_container_number);
   loop
      fetch c_data_cursor into l_record;
      exit when c_data_cursor%notfound;

        -- First API call - Get Trip Status
      begin
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
      exception
         when others then
            l_remarks := sqlerrm;
            dbms_output.put_line('Error in first API call: ' || sqlerrm);
      end;

      l_http_status := apex_web_service.g_status_code;
      dbms_output.put_line('First API Status: ' || l_http_status);
      if l_http_status in ( '200',
                            '201' ) then
         apex_json.parse(l_track_response);
         l_status_value := apex_json.get_varchar2(p_path => 'statusValueGid');
         dbms_output.put_line('Status Value: ' || l_status_value);
         if l_status_value in ( 'NAQLEEN.TRIP_STARTED',
                                'NAQLEEN.TRIP_NOT_STARTED' ) then
            l_count := l_count + 1;
            dbms_output.put_line('Count: ' || l_count);

                -- Second API call - Get Customer Name
            if l_count = 1 then
               l_track_response := null;
               begin
                  l_track_response := apex_web_service.make_rest_request(
                     p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
                              || l_record.shipment_xid
                              || '/refnums?expand=all',
                     p_http_method => 'GET',
                     p_username    => 'NAQLEEN.INTEGRATION',
                     p_password    => 'NaqleenInt@123',
                     p_wallet_path => 'file:/u01/app/oracle/product/wallet'
                  );
               exception
                  when others then
                     l_remarks := sqlerrm;
                     dbms_output.put_line('Error in second API call: ' || sqlerrm);
               end;

               l_http_status := apex_web_service.g_status_code;
               dbms_output.put_line('Second API Status: ' || l_http_status);
               if l_http_status in ( '200',
                                     '201' ) then
                  apex_json.parse(l_track_response);
                  for i in 1..apex_json.get_count('items') loop
                     if apex_json.get_varchar2(
                        p_path => 'items[%d].shipmentRefnumQualGid',
                        p0     => i
                     ) = 'NAQLEEN.CUS_NAME' then
                        l_customername := apex_json.get_varchar2(
                           p_path => 'items[%d].shipmentRefnumValue',
                           p0     => i
                        );
                        v_found := true;
                        exit; -- Exit loop after finding customer name
                     end if;
                  end loop;

                  dbms_output.put_line('Customer Name: ' || l_customername);
               end if;
            end if;
         end if;
      end if;

        -- Build data object if found
      if v_found then
         l_data.put(
            'container_type',
            l_record.container_type
         );
         l_data.put(
            'liner',
            l_customername
         );
         exit; -- Exit after first successful match
      end if;

   end loop;
   close c_data_cursor;

    -- Build final response
   apex_json.initialize_clob_output;
   apex_json.open_object;
   if v_found then
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
      apex_json.open_object('data');
      apex_json.write(
         'container_type',
         l_data.get_string('container_type')
      );
      apex_json.write(
         'liner',
         l_data.get_string('liner')
      );
      apex_json.write(
         'shipment_nbr',
         l_record.shipment_xid
      );
      apex_json.close_object;
   else
      apex_json.write(
         'response_code',
         404
      );
      apex_json.write(
         'response_message',
         'No Data Found'
      );
   end if;

   apex_json.close_object;
   l_output := apex_json.get_clob_output;
   dbms_output.put_line('Final Output: ' || l_output);
   htp.prn(l_output);
   apex_json.free_output;
exception
   when others then
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         400
      );
      apex_json.write(
         'response_message',
         'ERROR WHILE EXECUTING METHOD: ' || sqlerrm
      );
      apex_json.close_object;
      l_output := apex_json.get_clob_output;
      dbms_output.put_line('Error Output: ' || l_output);
      htp.prn(l_output);
      apex_json.free_output;
end xx_otm_get_validate_container_apex;

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
    WHERE truck_nbr = p_truck_number AND exit_time IS NULL AND status LIKE '%GATE OUT%';

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
        apex_json.write('response_message', 'Vehicle Not Found');
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

-- PROCEDURE: XX_OTM_GET_VEHICLE_INQUIRY_TRUCKS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_GET_VEHICLE_INQUIRY_TRUCKS (
   p_search_text in varchar2 default null
) as
begin
    -- Configure APEX_JSON to output to CLOB
   apex_json.initialize_clob_output;
   apex_json.open_object;

    -- Write Standard Response Headers
   apex_json.write(
      'response_code',
      200
   );
   apex_json.write(
      'response_message',
      'Success'
   );
   apex_json.open_array('data');

   -- Loop through results and write directly as strings
   for i in (
      select truck_nbr
        from xxotm_vehicle_master_t
       where ( p_search_text is null
          or upper(truck_nbr) like '%'
                                   || upper(p_search_text)
                                   || '%' )
       group by truck_nbr
       order by max(entry_time) desc
   ) loop
      apex_json.write(i.truck_nbr);
   end loop;

   apex_json.close_array;
   apex_json.close_object;

    -- Output the generated JSON
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      apex_json.free_output;
end xx_otm_get_vehicle_inquiry_trucks;

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

-- PROCEDURE: XX_OTM_POSITION_TRUCK_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POSITION_TRUCK_DETAILS (
   p_truck_nbr in varchar2
) as
   l_shipment_xid         varchar2(50);
   l_container_nbr        varchar2(50);
   l_con_type             varchar2(50);
   l_shipment_name        varchar2(50);
   l_truck_nbr            varchar2(50);
   l_driver_name          varchar2(50);
   l_driver_iqama         varchar2(50);
   l_terminal             varchar2(50);
   l_data_found           boolean := false;

    -- API Variables
   l_url                  varchar2(4000);
   l_response_clob        clob;
   
   -- Optimization flags
   l_has_gate_in          boolean;
   l_has_gate_out         boolean;
   l_has_container_stored boolean;
   l_event_count          number;
   l_status_code          varchar2(200);
   l_rephrased_con_type   varchar2(10);
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
         and rownum = 1;
   exception
      when no_data_found then
         l_truck_nbr := p_truck_nbr;
         l_driver_name := null;
         l_driver_iqama := null;
   end;

   -- Iterate Shipments to find one with GATE IN and NO GATE OUT/STORED
   for r in c_shipments loop
      
      -- Reset flags
      l_has_gate_in := false;
      l_has_gate_out := false;
      l_has_container_stored := false;

      -- Single API Call: Fetch ALL tracking events
      l_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
               || r.shipment_xid
               || '/trackingEvents';
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
         l_event_count := apex_json.get_count('items');
         for i in 1..l_event_count loop
            l_status_code := apex_json.get_varchar2(
               'items[%d].statusCodeGid',
               i
            );
            if instr(
               l_status_code,
               'GATE IN'
            ) > 0 then
               l_has_gate_in := true;
            end if;
            if instr(
               l_status_code,
               'GATE OUT'
            ) > 0 then
               l_has_gate_out := true;
            end if;
            if instr(
               l_status_code,
               'CONTAINER STORED'
            ) > 0 then
               l_has_container_stored := true;
            end if;
         end loop;

      exception
         when others then
            l_has_gate_in := false; -- Fail safe
      end;

      -- Check logic: Must have GATE IN, Must NOT have GATE OUT, Must NOT have CONTAINER STORED
      if
         l_has_gate_in
         and not l_has_gate_out
         and not l_has_container_stored
      then
         
         -- FOUND IT!
         l_shipment_xid := r.shipment_xid;
         l_container_nbr := r.cont_no;
         l_con_type := r.container_type;
         l_shipment_name := r.shipment_name;
         l_data_found := true;
         exit; -- Break loop
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
         l_rephrased_con_type := '20FT';
      elsif l_con_type like '4%' then
         l_rephrased_con_type := '40FT';
      end if;

      apex_json.open_array('terminals');
      for i in (
         select distinct terminal
           from xxotm_position_master_t
          where is_occupied = 'N'
            and lower(container_type) = lower(l_rephrased_con_type)
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
      ); -- l_terminal comes from where? logic didn't populate it in user code except declaration. Assuming null is fine or it meant to be fetched. User code had `l_terminal varchar2(50)` but didn't assign result of terminal query to it, just looped. I'll leave as is (null).

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
      -- User code didn't output data object on 404 in matching block, but `apex_json.close_array`? No, user code was messy. 
      -- Correcting to valid JSON:
      -- User code 404 block:
      -- apex_json.write('response_message', 'No Data Found');
      -- apex_json.write('response_code', 404);
      -- end if;
      -- apex_json.close_object; 
      
      -- I will follow standard practice:
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
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_position_truck_details;

-- PROCEDURE: XX_OTM_POST_CUSTOMER_INVENTORY

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_CUSTOMER_INVENTORY (
   p_body in blob
) as
   l_json_clob         clob;
   l_flag              varchar2(50);
   l_count             number;
   l_data_count        number;
    
    -- Variables for JSON parsing
   l_customer          varchar2(200);
   l_customer_nbr      varchar2(100);
   l_container_nbr     varchar2(100);
   l_shipment_nbr      varchar2(100);
   l_item_description  varchar2(500);
   l_cargo_description varchar2(500);
   l_hs_code           varchar2(50);
   l_gross_weight      number;
   l_net_weight        number;
   l_weight_uom        varchar2(20);
   l_volume            number;
   l_volume_uom        varchar2(20);
   l_un_class          varchar2(50);
   l_country_of_origin varchar2(50);
   l_quantity          number;
   l_quantity_uom      varchar2(20);
   l_rcvd_qty          number;
   
   -- Tracking failures
   type t_index_list is
      table of number;
   l_failed_indices    t_index_list := t_index_list();
   l_final_clob        clob;
begin
    -- Convert BLOB to CLOB
   l_json_clob := to_clob(p_body);

    -- Parse JSON
   apex_json.parse(l_json_clob);
   l_flag := upper(apex_json.get_varchar2('flag'));
   l_data_count := apex_json.get_count('data');

   -- Processing Loop
   for i in 1..l_data_count loop
        -- Extract values
      l_customer := apex_json.get_varchar2(
         'data[%d].customer',
         i
      );
      l_customer_nbr := apex_json.get_varchar2(
         'data[%d].customer',
         i
      );
      l_container_nbr := apex_json.get_varchar2(
         'data[%d].container_nbr',
         i
      );
      l_shipment_nbr := apex_json.get_varchar2(
         'data[%d].shipment_nbr',
         i
      );
      l_item_description := apex_json.get_varchar2(
         'data[%d].item_description',
         i
      );
      l_cargo_description := apex_json.get_varchar2(
         'data[%d].cargo_description',
         i
      );
      l_hs_code := apex_json.get_varchar2(
         'data[%d].hs_code',
         i
      );
      l_gross_weight := apex_json.get_number(
         'data[%d].gross_weight',
         i
      );
      l_net_weight := apex_json.get_number(
         'data[%d].net_weight',
         i
      );
      l_weight_uom := apex_json.get_varchar2(
         'data[%d].weight_uom',
         i
      );
      l_volume := apex_json.get_number(
         'data[%d].volume',
         i
      );
      l_volume_uom := apex_json.get_varchar2(
         'data[%d].volume_uom',
         i
      );
      l_un_class := apex_json.get_varchar2(
         'data[%d].un_class',
         i
      );
      l_country_of_origin := apex_json.get_varchar2(
         'data[%d].country_of_origin',
         i
      );
      l_quantity := apex_json.get_number(
         'data[%d].quantity',
         i
      );
      l_quantity_uom := apex_json.get_varchar2(
         'data[%d].quantity_uom',
         i
      );
      l_rcvd_qty := apex_json.get_number(
         'data[%d].rcvd_qty',
         i
      );
      if l_flag = 'INSERT' then
          -- Directly insert without checking
         insert into xxotm_customer_inventory_t (
            cust_name,
            cust_nbr,
            container_nbr,
            shipment_nbr,
            item_description,
            cargo_description,
            hs_code,
            gross_weight,
            net_weight,
            weight_uom,
            volume,
            volume_uom,
            un_class,
            country_of_origin,
            qty,
            qty_uom,
            rcvd_qty,
            CREATION_DATE
         ) values ( l_customer,
                    l_customer_nbr,
                    l_container_nbr,
                    l_shipment_nbr,
                    l_item_description,
                    l_cargo_description,
                    l_hs_code,
                    l_gross_weight,
                    l_net_weight,
                    l_weight_uom,
                    l_volume,
                    l_volume_uom,
                    l_un_class,
                    l_country_of_origin,
                    l_quantity,
                    l_quantity_uom,
                    l_rcvd_qty,
   					sysdate
                    );

      elsif l_flag = 'CHECK' then
          -- Check for duplicate
         select count(*)
           into l_count
           from xxotm_customer_inventory_t
          where cust_name = l_customer
            and container_nbr = l_container_nbr
            and shipment_nbr = l_shipment_nbr
            and item_description = l_item_description
            and nvl(
            hs_code,
            '###'
         ) = nvl(
            l_hs_code,
            '###'
         );

         if l_count > 0 then
             -- Record failure (Duplicate)
            l_failed_indices.extend;
            l_failed_indices(l_failed_indices.count) := i;
         else
             -- Insert if not present
            insert into xxotm_customer_inventory_t (
               cust_name,
               cust_nbr,
               container_nbr,
               shipment_nbr,
               item_description,
               cargo_description,
               hs_code,
               gross_weight,
               net_weight,
               weight_uom,
               volume,
               volume_uom,
               un_class,
               country_of_origin,
               qty,
               qty_uom,
               rcvd_qty
            ) values ( l_customer,
                       l_customer_nbr,
                       l_container_nbr,
                       l_shipment_nbr,
                       l_item_description,
                       l_cargo_description,
                       l_hs_code,
                       l_gross_weight,
                       l_net_weight,
                       l_weight_uom,
                       l_volume,
                       l_volume_uom,
                       l_un_class,
                       l_country_of_origin,
                       l_quantity,
                       l_quantity_uom,
                       l_rcvd_qty );
         end if;
      end if;
   end loop;

   -- Response Generation
   apex_json.initialize_clob_output;
   apex_json.open_object;
   if l_failed_indices.count = 0 then
       -- Success (All inserted)
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
       -- No data array as requested
   else
       -- Failure (Duplicates found)
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Duplicate records found'
      );
      apex_json.open_array('data');
      for j in 1..l_failed_indices.count loop
           -- Get index of failed item
         declare
            idx number := l_failed_indices(j);
         begin
            apex_json.open_object;
            apex_json.write(
               'container_nbr',
               apex_json.get_varchar2(
                  'data[%d].container_nbr',
                  idx
               )
            );
              apex_json.write(
               'shipment_nbr',
               apex_json.get_varchar2(
                  'data[%d].shipment_nbr',
                  idx
               )
            );
            apex_json.write(
               'item_description',
               apex_json.get_varchar2(
                  'data[%d].item_description',
                  idx
               )
            );
            apex_json.write(
               'hs_code',
               apex_json.get_varchar2(
                  'data[%d].hs_code',
                  idx
               )
            );
            
            apex_json.close_object;
         end;
      end loop;
      apex_json.close_array;
   end if;

   apex_json.close_object;
   
   -- Capture Output
   l_final_clob := apex_json.get_clob_output;

   -- Chunked Output
   declare
      l_offset number := 1;
      l_amount number := 32000;
      l_len    number;
      l_buffer varchar2(32767);
   begin
      if l_final_clob is not null then
         l_len := dbms_lob.getlength(l_final_clob);
         while l_offset <= l_len loop
            dbms_lob.read(
               l_final_clob,
               l_amount,
               l_offset,
               l_buffer
            );
            htp.prn(l_buffer);
            l_offset := l_offset + l_amount;
         end loop;
      end if;
   end;

   apex_json.free_output;
exception
   when others then
      -- If DB error, return 500
      if apex_json.get_clob_output is not null then
         apex_json.free_output;
      end if;
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
      
      -- Simple output for error (usually small enough, but apply same logic if needed)
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_post_customer_inventory;

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

-- PROCEDURE: XX_OTM_POST_INSPECTION_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_INSPECTION_DETAILS (
   payload in blob
) is
    -- Converted payload as CLOB
   p_payload                       clob;
   l_blob_len                      integer;
   l_pos                           integer := 1;
   l_chunk_raw                     raw(32767);
   l_chunk_vc                      varchar2(32767);
   l_chunk_size                    constant pls_integer := 32767;
   l_container_type varchar2(100);
   -- Core fields
   l_shipment_gid                  varchar2(100);
   l_shipment_xid                  varchar2(100);
   l_container_nbr                 varchar2(50);
   l_truck_nbr                     varchar2(100);
   l_driver_nbr                    varchar2(100);
   l_customer_name					varchar2(100);
   l_liner_name						varchar2(100);
    l_order_nbr                      varchar2(100);
   -- API Response Variables
   l_api_response                  clob;
   l_tracking_events_response_clob clob;
   l_tracking_events_vehicle_response_clob clob;
   l_response_clob                 clob;
   l_request_clob                  clob;
l_entry_time VARCHAR2(100);
   
   -- Document variables
   l_document_xid                  varchar2(100);
   l_document_filename             varchar2(200);
   l_document_mimetype             varchar2(100);
   l_document_defgid               varchar2(100);
   l_owner_object_gid              varchar2(100);
   l_clob_content                  clob;
   
   -- Refnum variables
   l_refnum_qual_gid               varchar2(200);
   l_refnum_value                  clob;
   l_domain_name                   varchar2(100);
   
   -- Inspection details
   l_inspection_details            clob;
   l_status_code                   varchar2(100);
   
   -- Error Handling
   l_error_message                 clob;
   l_has_error                     boolean := false;
   
   -- Logging
   type t_log_array is
      table of varchar2(4000);
   l_logs                          t_log_array := t_log_array();
   
   -- Counters
   l_count                         pls_integer;
   l_documents_posted              pls_integer := 0;
   l_refnums_posted                pls_integer := 0;
   
   -- API Credentials
   l_refnums_url                   varchar2(1000);
   l_username                      varchar2(100) := 'NAQLEEN.INTEGRATION';
   l_password                      varchar2(100) := 'NaqleenInt@123';
   
   -- Procedure to add log entry
   procedure add_log (
      p_message varchar2
   ) is
   begin
      l_logs.extend;
      l_logs(l_logs.count) := to_char(
         systimestamp,
         'HH24:MI:SS.FF3'
      )
                              || ' - '
                              || p_message;
   end;

begin
   add_log('Starting inspection details processing');
   
   -- 1) Convert BLOB -> CLOB safely
   add_log('Converting BLOB payload to CLOB');
   p_payload:=to_clob(payload);
   -- 2) Parse payload JSON
   add_log('Parsing JSON payload');
   apex_json.parse(p_payload);
   
   -- Extract main fields
   l_shipment_gid := apex_json.get_varchar2(p_path => 'shipmentNbr');
   l_container_nbr := apex_json.get_varchar2(p_path => 'containerNbr');
   l_truck_nbr := apex_json.get_varchar2(p_path => 'truckNbr');
   l_driver_nbr := apex_json.get_varchar2(p_path => 'driverNbr');
   l_shipment_xid := replace(
      l_shipment_gid,
      'NAQLEEN.',
      ''
   );
   add_log('Extracted: Shipment='
           || l_shipment_xid
           || ', Container='
           || l_container_nbr
           || ', Truck='
           || l_truck_nbr);

   l_refnums_url := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.'
                    || l_shipment_xid
                    || '/refnums';
   
   begin
    SELECT st.customer_name,st.liner_name,om.ORDER_RELEASE_XID INTO l_customer_name,l_liner_name,l_order_nbr FROM xxotm_shipments_t st, xxotm_order_movements_t om WHERE st.shipment_xid = l_shipment_xid and om.shipment_xid = st.SHIPMENT_XID;
   exception
   when others then
    null;
   end;
   -- -------------------------------
   -- OPERATION 1: Post Documents
   -- -------------------------------
   add_log('OPERATION 1: Starting document posting');
   l_count := apex_json.get_count(p_path => 'documents');
   add_log('Found '
           || l_count
           || ' documents to post');
   if l_count > 0 then
      for i in 1..l_count loop
         begin
            l_document_xid := apex_json.get_varchar2(
               p_path => 'documents[%d].documentXid',
               p0     => i
            );
            l_document_filename := apex_json.get_varchar2(
               p_path => 'documents[%d].documentName',
               p0     => i
            );
            l_document_mimetype := apex_json.get_varchar2(
               p_path => 'documents[%d].documentMimeType',
               p0     => i
            );
            l_document_defgid := 'NAQLEEN.INSPECTION_DOCS';
            l_owner_object_gid := 'NAQLEEN.'||l_shipment_xid;
            l_clob_content := apex_json.get_clob(
               p_path => 'documents[%d].documentBase64Content',
               p0     => i
            );
            add_log('Posting document '
                    || i
                    || ': '
                    || l_document_filename);
            post_otm_documents(
               p_documentxid      => l_document_xid,
               p_documentfilename => l_document_filename,
               p_ownerobjectgid   => l_owner_object_gid,
               p_clobcontent      => l_clob_content,
               p_documentmimetype => l_document_mimetype,
               p_documentdefgid   => l_document_defgid,
               x_response_clob    => l_api_response
            );

            if l_api_response like 'Error%' then
               l_has_error := true;
               l_error_message := l_error_message
                                  || 'Document Error ('
                                  || l_document_xid
                                  || '): '
                                  || l_api_response
                                  || '; ';
               add_log('ERROR: Document post failed - '
                       || substr(
                  l_api_response,
                  1,
                  100
               ));
            else
               l_documents_posted := l_documents_posted + 1;
               add_log('SUCCESS: Document posted - ' || l_document_filename);
            end if;
         exception
            when others then
               l_has_error := true;
               l_error_message := l_error_message
                                  || 'Document Exception ('
                                  || l_document_xid
                                  || '): '
                                  || sqlerrm
                                  || '; ';
               add_log('EXCEPTION: Document post failed - ' || sqlerrm);
         end;
      end loop;
   end if;
   add_log('OPERATION 1 Complete: Posted '
           || l_documents_posted
           || ' of '
           || l_count
           || ' documents');
   
   -- -------------------------------
   -- OPERATION 2: Post Refnums
   -- -------------------------------
   add_log('OPERATION 2: Starting refnum posting');
   l_count := apex_json.get_count(p_path => 'refnums');
   add_log('Found '
           || l_count
           || ' refnums to post');
   if l_count > 0 then
      for j in 1..l_count loop
         begin
            -- Extract refnum values - using CLOB for value to handle long strings
            l_refnum_qual_gid := apex_json.get_varchar2(
               p_path => 'refnums[%d].shipmentRefnumQualGid',
               p0     => j
            );
            
            -- Use get_clob for the value since it can be long with newlines
            l_refnum_value := apex_json.get_clob(
               p_path => 'refnums[%d].shipmentRefnumValue',
               p0     => j
            );
            l_domain_name := apex_json.get_varchar2(
               p_path => 'refnums[%d].domainName',
               p0     => j
            );
            add_log('Posting refnum '
                    || j
                    || ': '
                    || l_refnum_qual_gid);
            
            -- Build JSON using APEX_JSON to ensure proper escaping
            apex_json.initialize_clob_output;
            apex_json.open_object;
            apex_json.write(
               'shipmentRefnumQualGid',
               l_refnum_qual_gid
            );
            apex_json.write(
               'shipmentRefnumValue',
               l_refnum_value
            );
            apex_json.write(
               'domainName',
               l_domain_name
            );
            apex_json.close_object;
            l_request_clob := apex_json.get_clob_output;
            apex_json.free_output;
            
            -- Post the refnum
            apex_web_service.g_request_headers.delete;
            apex_web_service.g_request_headers(1).name := 'Content-Type';
            apex_web_service.g_request_headers(1).value := 'application/json';
            l_api_response := apex_web_service.make_rest_request(
               p_url         => l_refnums_url,
               p_http_method => 'POST',
               p_username    => l_username,
               p_password    => l_password,
               p_body        => l_request_clob,
               p_wallet_path => 'file:/u01/app/oracle/product/wallet'
            );
            
            -- Check for API error
            if instr(
               lower(l_api_response),
               'error'
            ) > 0 then
               l_has_error := true;
               l_error_message := l_error_message
                                  || 'Refnum API Error ('
                                  || l_refnum_qual_gid
                                  || '): '
                                  || substr(
                  l_api_response,
                  1,
                  200
               )
                                  || '; ';
               add_log('ERROR: Refnum post failed - '
                       || substr(
                  l_api_response,
                  1,
                  100
               ));
            else
               l_refnums_posted := l_refnums_posted + 1;
               add_log('SUCCESS: Refnum posted - ' || l_refnum_qual_gid);
            end if;

         exception
            when others then
               l_has_error := true;
               l_error_message := l_error_message
                                  || 'Refnum Exception ('
                                  || nvl(
                  l_refnum_qual_gid,
                  'unknown'
               )
                                  || '): '
                                  || sqlerrm
                                  || '; ';
               add_log('EXCEPTION: Refnum post failed - ' || sqlerrm);
         end;
      end loop;
   end if;
   add_log('OPERATION 2 Complete: Posted '
           || l_refnums_posted
           || ' of '
           || l_count
           || ' refnums');
   
   -- -------------------------------
   -- OPERATION 3: Insert Inspections
   -- -------------------------------
   add_log('OPERATION 3: Inserting inspection details');
   begin
      select json_query(p_payload,
           '$.inspection_details' returning clob)
        into l_inspection_details
        from dual;

      insert into xxotm_container_inspection_t (
         container_nbr,
         
       
         shipment_nbr,
         inspection_details,
         timestamp
      ) values ( l_container_nbr,
      			
                 l_shipment_xid,
                 l_inspection_details,
                 to_char(
                    sysdate,
                    'YYYY-MM-DD HH24:MI:SS'
                 ) );
      add_log('SUCCESS: Inspection details inserted for container ' || l_container_nbr);
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Inspection Insert Error: '
                            || sqlerrm
                            || '; ';
         add_log('ERROR: Inspection insert failed - ' || sqlerrm);
   end;
   
   -- -------------------------------
   -- OPERATION 4: Update Inventory
   -- -------------------------------
                 
	SELECT container_type INTO l_container_type FROM XXOTM_SHIPMENTS_T xst WHERE xst.SHIPMENT_XID =l_shipment_gid;                 
   add_log('OPERATION 4: Inserting container inventory');
   begin
			    merge into xxotm_container_inventory_t t
			using (
			  select l_container_nbr    as container_nbr,
			         l_shipment_xid     as inbound_shipment_nbr,
			         l_customer_name    as cust_nbr,
			         l_liner_name       as cust_name,
			         l_order_nbr        as inbound_order_nbr,
			         l_container_type   as container_type
			    from dual
			) s
			on ( t.inbound_shipment_nbr = s.inbound_shipment_nbr )
			when matched then
			  update set
			    t.cust_nbr       = s.cust_nbr,
			    t.cust_name      = s.cust_name,
			    t.inbound_order_nbr = s.inbound_order_nbr,
			    t.container_type = s.container_type
			when not matched then
			  insert (
			    container_nbr,
			    inbound_shipment_nbr,
			    cust_nbr,
			    cust_name,
			    inbound_order_nbr,
			    outbound_order_nbr,
			    outbound_shipment_nbr,
			    position,
			    container_type
			  )
			  values (
			    s.container_nbr,
			    s.inbound_shipment_nbr,
			    s.cust_nbr,
			    s.cust_name,
			    s.inbound_order_nbr,
			    null,
			    null,
			    null,
			    s.container_type
			  );

      add_log('SUCCESS: Container inventory created for ' || l_container_nbr);
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Inventory Insert Error: '
                            || sqlerrm
                            || '; ';
         add_log('ERROR: Inventory insert failed - ' || sqlerrm);
   end;
   
   -- -------------------------------
   -- OPERATION 5: Tracking Event
   -- -------------------------------
     SELECT entry_time INTO l_entry_time FROM XXOTM_VEHICLE_MASTER_T xvmt WHERE upper(truck_nbr) = upper(l_truck_nbr) ORDER BY ENTRY_TIME DESC FETCH FIRST 1 ROWS only ;
  
  
      
     begin
      post_otm_tracking_events(
        p_integration_name => 'XX_OTM_POST_INSPECTION_APEX',
         p_statuscodegid => 'NAQLEEN.VEHICLE ENTERED',
         p_shipmentxid   => l_shipment_xid,
          p_event_timestamp =>  TO_CHAR(
					    TO_TIMESTAMP_TZ(
					      REGEXP_REPLACE(l_entry_time, '(\.\d{6})Z$', 'Z'),
					      'YYYY-MM-DDTHH24:MI:SS.FF6Z'
					    ),
					    'YYYY-MM-DDTHH24:MI:SS'
					  ),
         x_response      => l_tracking_events_vehicle_response_clob 
      );
      if l_tracking_events_vehicle_response_clob  like 'Error%' then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Event Error (NAQLEEN.VEHICLE ENTERED): '
                            || l_tracking_events_vehicle_response_clob 
                            || '; ';
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Event Exception (NAQLEEN.VEHICLE ENTERED): '
                            || sqlerrm
                            || '; ';
   end;
   
   begin
      post_otm_tracking_events(
         p_integration_name => 'XX_OTM_POST_INSPECTION_APEX',
         p_statuscodegid    => 'NAQLEEN.INSPECTED',
         p_shipmentxid      => l_shipment_xid,
         p_attribute1       => null,
         p_attribute2       => l_container_nbr,
         p_attribute3       => null,
         p_attribute4       => null,
         p_attribute5       => null,
         p_attribute6       => null,
         p_attribute7       => null,
         p_attribute8       => null,
         p_attribute9       => null,
         p_attribute10      => null,
         x_response         => l_tracking_events_response_clob
      );

      if l_tracking_events_response_clob like 'Error%' then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Tracking Event Error: '
                            || l_tracking_events_response_clob
                            || '; ';
         add_log('ERROR: Tracking event failed - '
                 || substr(
            l_tracking_events_response_clob,
            1,
            100
         ));
      else
         add_log('SUCCESS: Tracking event posted for shipment ' || l_shipment_xid);
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Tracking Event Exception: '
                            || sqlerrm
                            || '; ';
         add_log('EXCEPTION: Tracking event failed - ' || sqlerrm);
   end;
   
   -- -------------------------------
   -- OPERATION 6: Update Shipment Attributes (Truck/Driver)
   -- -------------------------------
   add_log('OPERATION 6: Updating shipment attributes (truck/driver)');
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'attribute7',
      l_truck_nbr
   );
   apex_json.write(
      'attribute8',
      l_driver_nbr
   );
   apex_json.close_object;
   l_request_clob := apex_json.get_clob_output;
   apex_json.free_output;
   apex_web_service.g_request_headers.delete;
   apex_web_service.g_request_headers(1).name := 'Content-Type';
   apex_web_service.g_request_headers(1).value := 'application/json';
   begin
      l_response_clob := apex_web_service.make_rest_request(
         p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.' || l_shipment_gid
         ,
         p_http_method => 'PATCH',
         p_username    => 'NAQLEEN.INTEGRATION',
         p_password    => 'NaqleenInt@123',
         p_wallet_path => 'file:/u01/app/oracle/product/wallet',
         p_body        => l_request_clob
      );
      
      -- Check for error in response
      if l_response_clob like 'Error%'
      or instr(
         lower(l_response_clob),
         'error'
      ) > 0 then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Shipment Update Error: '
                            || substr(
            l_response_clob,
            1,
            200
         )
                            || '; ';
         add_log('ERROR: Shipment update failed - '
                 || substr(
            l_response_clob,
            1,
            100
         ));
      else
         add_log('SUCCESS: Shipment attributes updated');
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Shipment Update Exception: '
                            || sqlerrm
                            || '; ';
         add_log('EXCEPTION: Shipment update failed - ' || sqlerrm);
   end;
   
   -- -------------------------------
   -- OPERATION 7: Update Vehicle Master
   -- -------------------------------
   add_log('OPERATION 7: Updating vehicle master status');
   begin
      update xxotm_vehicle_master_t
         set
         status = 'NAQLEEN.INSPECTED'
       where truck_nbr = l_truck_nbr
         and entry_time is not null
         and exit_time is null
         and status = 'inspection';

      if sql%rowcount > 0 then
         add_log('SUCCESS: Vehicle master updated for truck '
                 || l_truck_nbr
                 || ' ('
                 || sql%rowcount
                 || ' rows)');
      else
         add_log('WARNING: No vehicle master records updated for truck ' || l_truck_nbr);
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Vehicle Master Update Error: '
                            || sqlerrm
                            || '; ';
         add_log('ERROR: Vehicle master update failed - ' || sqlerrm);
   end;

   add_log('Committing transaction');
   commit;
   add_log('Processing complete');
   
   -- -------------------------------
   -- Build JSON Response
   -- -------------------------------
   apex_json.initialize_clob_output;
   apex_json.open_object;
   if l_has_error then
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Partial or Full Failure: ' || l_error_message
      );
   else
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         'Success'
      );
   end if;
   
   -- Add logs array to response
   apex_json.open_array('logs');
   for i in 1..l_logs.count loop
      apex_json.write(l_logs(i));
   end loop;
   apex_json.close_array;
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
   
   -- Clean up temp lob
   if dbms_lob.istemporary(p_payload) = 1 then
      dbms_lob.freetemporary(p_payload);
   end if;

exception
   when others then
      -- Global Exception Handler
      add_log('CRITICAL EXCEPTION: ' || sqlerrm);
      if dbms_lob.istemporary(p_payload) = 1 then
         dbms_lob.freetemporary(p_payload);
      end if;

      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Critical Error: ' || sqlerrm
      );
      
      -- Add logs array even in exception
      apex_json.open_array('logs');
      for i in 1..l_logs.count loop
         apex_json.write(l_logs(i));
      end loop;
      apex_json.close_array;
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
      apex_json.free_output;
end xx_otm_post_inspection_details;

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
    l_inbound_shipment_nbr VARCHAR2(50);
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

        -- Fetch additional details
        BEGIN
            SELECT position, inbound_shipment_nbr
            INTO l_position, l_inbound_shipment_nbr
            FROM xxotm_container_inventory_t
            WHERE container_nbr = l_container_nbr  AND 	outbound_shipment_nbr IS NULL 
        AND inbound_shipment_nbr IS NOT NULL AND POSITION IS NOT NULL fetch first 1 rows ONLY;

        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                l_position := NULL;
                l_inbound_shipment_nbr := NULL;
        END;

        -- Insert into history table
        INSERT INTO xxotm_pluginout_t (
            container_nbr,
            type,
            set_point_temp,
            current_temp,
            remarks,
            timestamp,
            inbound_shipment_nbr,
            position
        ) VALUES (
            l_container_nbr,
            l_type,
            l_set_point_temp,
            l_current_temp,
            l_remarks,
            TO_TIMESTAMP(l_timestamp, 'YYYY-MM-DD HH24:MI:SS'), -- Explicit conversion
            l_inbound_shipment_nbr,
            l_position
        );

        COMMIT;

        -- Success response
        apex_json.initialize_clob_output;
        apex_json.open_object;
        apex_json.write('response_code', 200);
        apex_json.write('response_message', 'Plug in-out operation recorded successfully');
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


-- PROCEDURE: XX_OTM_POST_RESERVATION_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_RESERVATION_CONTAINERS (
   -- Last Updated Date : 17-Dec-2025
   -- Last Updated By : Madhan
   -- Description : inserting the booking id to post success response for container.
   payload IN BLOB
) IS
   -- Convert payload
   p_payload              CLOB;

   -- Request variables
   l_booking_id           VARCHAR2(100);
   l_container_nbr        VARCHAR2(100);
   l_booking_order_nbr    VARCHAR2(100);   -- Order linked to booking (container_nbr IS NULL)
   l_container_order_nbr  VARCHAR2(100);   -- Order linked to container (booking_id IS NULL)

   -- Web service variables
   l_base_url             VARCHAR2(500) := 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2';
   l_username             VARCHAR2(100) := 'NAQLEEN.INTEGRATION';
   l_password             VARCHAR2(100) := 'NaqleenInt@123';
   l_wallet_path          VARCHAR2(100) := 'file:/u01/app/oracle/product/wallet';
   l_api_url              VARCHAR2(1000);
   l_api_payload          CLOB;
   l_api_response         CLOB;
   l_http_status          NUMBER;

   -- Tracking
   l_success_count        NUMBER := 0;
   l_fail_count           NUMBER := 0;
   l_total_count          NUMBER := 0;
   l_failed_containers    VARCHAR2(4000) := NULL;
   l_api_error_msg        VARCHAR2(500);

BEGIN
   -- Convert BLOB to CLOB
   p_payload := TO_CLOB(payload);

   -- Parse the JSON payload
   APEX_JSON.parse(p_payload);

   -- Extract booking_id
   l_booking_id := APEX_JSON.get_varchar2(p_path => 'booking_id');

   -- Validate booking_id
   IF l_booking_id IS NULL THEN
      APEX_JSON.initialize_clob_output;
      APEX_JSON.open_object;
      APEX_JSON.write('response_code', 400);
      APEX_JSON.write('response_message', 'booking_id is required');
      APEX_JSON.close_object;
      HTP.prn(APEX_JSON.get_clob_output);
      RETURN;
   END IF;

   -- Get containers array count
   l_total_count := APEX_JSON.get_count(p_path => 'reserve_containers');

   IF l_total_count IS NULL OR l_total_count = 0 THEN
      APEX_JSON.initialize_clob_output;
      APEX_JSON.open_object;
      APEX_JSON.write('response_code', 400);
      APEX_JSON.write('response_message', 'reserve_containers array is empty or missing');
      APEX_JSON.close_object;
      HTP.prn(APEX_JSON.get_clob_output);
      RETURN;
   END IF;

   -- Loop through each container
   FOR i IN 1..l_total_count LOOP
      BEGIN
         -- Get container number from array
         l_container_nbr := APEX_JSON.get_varchar2(p_path => 'reserve_containers[%d]', p0 => i);

         IF l_container_nbr IS NULL THEN
            l_fail_count := l_fail_count + 1;
            IF l_failed_containers IS NULL THEN
               l_failed_containers := 'Container[' || i || '] is null';
            ELSE
               l_failed_containers := l_failed_containers || ', Container[' || i || '] is null';
            END IF;
            CONTINUE;
         END IF;

         -- ==================================================
         -- STEP 1: Fetch inbound_order_nbr for the BOOKING
         -- (where booking_id matches and container_nbr IS NULL)
         -- Commented as per Narayana Anna Suggestion
         -- ==================================================
         -- BEGIN
         --    SELECT inbound_order_nbr
         --    INTO l_booking_order_nbr
         --    FROM xxotm_container_inventory_t
         --    WHERE booking_id = l_booking_id
         --      AND container_nbr IS NULL
         --      AND ROWNUM = 1;
         -- EXCEPTION
         --    WHEN NO_DATA_FOUND THEN
         --       l_booking_order_nbr := NULL;
         -- END;

         -- IF l_booking_order_nbr IS NULL THEN
         --    l_fail_count := l_fail_count + 1;
         --    IF l_failed_containers IS NULL THEN
         --       l_failed_containers := l_container_nbr || ' (no order for booking ' || l_booking_id || ')';
         --    ELSE
         --       l_failed_containers := l_failed_containers || ', ' || l_container_nbr || ' (no order for booking)';
         --    END IF;
         --    CONTINUE;
         -- END IF;

         -- ==================================================
         -- STEP 2: Fetch inbound_order_nbr for the CONTAINER
         -- (where container_nbr matches and booking_id IS NULL)
         -- ==================================================
         BEGIN
            SELECT inbound_order_nbr
            INTO l_container_order_nbr
            FROM xxotm_container_inventory_t
            WHERE container_nbr = l_container_nbr
              AND booking_id IS NULL
              AND ROWNUM = 1;
         EXCEPTION
            WHEN NO_DATA_FOUND THEN
               l_container_order_nbr := NULL;
         END;

         IF l_container_order_nbr IS NULL THEN
            l_fail_count := l_fail_count + 1;
            IF l_failed_containers IS NULL THEN
               l_failed_containers := l_container_nbr || ' (no unbooked order for container)';
            ELSE
               l_failed_containers := l_failed_containers || ', ' || l_container_nbr || ' (no unbooked order)';
            END IF;
            CONTINUE;
         END IF;

         -- ==================================================
         -- STEP 3: PATCH - Update booking's order with container_nbr
         -- PATCH /orderReleases/NAQLEEN.{booking_order_nbr}
         -- Set attribute3 = container_nbr
         -- ==================================================
         -- l_api_url := l_base_url || '/orderReleases/NAQLEEN.' || l_booking_order_nbr;
         -- l_api_payload := '{attribute3: ' || l_container_nbr || '}';

         -- APEX_WEB_SERVICE.g_request_headers.DELETE;
         -- APEX_WEB_SERVICE.g_request_headers(1).name := 'Content-Type';
         -- APEX_WEB_SERVICE.g_request_headers(1).value := 'application/json';

         -- l_api_response := APEX_WEB_SERVICE.make_rest_request(
         --    p_url         => l_api_url,
         --    p_http_method => 'PATCH',
         --    p_username    => l_username,     
         --    p_password    => l_password,
         --    p_wallet_path => l_wallet_path,
         --    p_body        => l_api_payload
         -- );
         -- l_http_status := APEX_WEB_SERVICE.g_status_code;

         -- IF l_http_status NOT IN (200, 201, 204) THEN
         --    l_fail_count := l_fail_count + 1;
         --    l_api_error_msg := SUBSTR(NVL(l_api_response, 'No response'), 1, 200);
         --    IF l_failed_containers IS NULL THEN
         --       l_failed_containers := l_container_nbr || ' (PATCH ' || l_http_status || ': ' || l_api_error_msg || ')';
         --    ELSIF LENGTH(l_failed_containers) < 3500 THEN
         --       l_failed_containers := l_failed_containers || ', ' || l_container_nbr || ' (PATCH ' || l_http_status || ')';
         --    END IF;
         --    CONTINUE;
         -- END IF;

         -- ==================================================
         -- STEP 4: POST refnums - Link booking to container's order
         -- POST /orderReleases/NAQLEEN.{container_order_nbr}/refnums
         -- ==================================================
         l_api_url := l_base_url || '/orderReleases/NAQLEEN.' || l_container_order_nbr || '/refnums';
         l_api_payload := '{' ||
            'orderReleaseRefnumQualGid: NAQLEEN.BOOKING_NO,' ||
            'orderReleaseRefnumValue: ' || l_booking_id || ',' ||
            'domainName: NAQLEEN' ||
         '}';

         APEX_WEB_SERVICE.g_request_headers.DELETE;
         APEX_WEB_SERVICE.g_request_headers(1).name := 'Content-Type';
         APEX_WEB_SERVICE.g_request_headers(1).value := 'application/json';

         l_api_response := APEX_WEB_SERVICE.make_rest_request(
            p_url         => l_api_url,
            p_http_method => 'POST',
            p_username    => l_username,     
            p_password    => l_password,
            p_wallet_path => l_wallet_path,
            p_body        => l_api_payload
         );
         l_http_status := APEX_WEB_SERVICE.g_status_code;

         IF l_http_status IN (200, 201, 204) THEN
            l_success_count := l_success_count + 1;
            -- if post is success then update that booking id agains that container number in the xxotm_container_inventory_t
            -- to solve UI descripencies due to sync time issues.
            UPDATE XXOTM_CONTAINER_INVENTORY_T SET BOOKING_ID = l_booking_id WHERE CONTAINER_NBR = l_container_nbr;
         ELSE
            l_fail_count := l_fail_count + 1;
            l_api_error_msg := SUBSTR(NVL(l_api_response, 'No response'), 1, 200);
            IF l_failed_containers IS NULL THEN
               l_failed_containers := l_container_nbr || ' (POST refnums ' || l_http_status || ': ' || l_api_error_msg || ')';
            ELSIF LENGTH(l_failed_containers) < 3500 THEN
               l_failed_containers := l_failed_containers || ', ' || l_container_nbr || ' (POST ' || l_http_status || ')';
            END IF;
         END IF;

      EXCEPTION
         WHEN OTHERS THEN
            l_fail_count := l_fail_count + 1;
            IF l_failed_containers IS NULL THEN
               l_failed_containers := l_container_nbr || ' (Exception: ' || SUBSTR(SQLERRM, 1, 150) || ')';
            ELSIF LENGTH(l_failed_containers) < 3500 THEN
               l_failed_containers := l_failed_containers || ', ' || l_container_nbr || ' (Ex: ' || SUBSTR(SQLERRM, 1, 50) || ')';
            END IF;
      END;
   END LOOP;

   -- Build response
   APEX_JSON.initialize_clob_output;
   APEX_JSON.open_object;

   IF l_fail_count = 0 THEN
      APEX_JSON.write('response_code', 200);
      APEX_JSON.write('response_message', 'Successfully reserved ' || l_success_count || ' containers for booking ' || l_booking_id);
   ELSIF l_success_count = 0 THEN
      APEX_JSON.write('response_code', 500);
      APEX_JSON.write('response_message', 'Failed to reserve containers');
   ELSE
      APEX_JSON.write('response_code', 207);
      APEX_JSON.write('response_message', 'Partial: ' || l_success_count || ' reserved, ' || l_fail_count || ' failed');
   END IF;

   APEX_JSON.write('success_count', l_success_count);
   APEX_JSON.write('fail_count', l_fail_count);
   APEX_JSON.write('booking_id', l_booking_id);

   IF l_failed_containers IS NOT NULL THEN
      APEX_JSON.write('debug_errors', l_failed_containers);
   END IF;

   APEX_JSON.close_object;
   HTP.prn(APEX_JSON.get_clob_output);

EXCEPTION
   WHEN OTHERS THEN
      APEX_JSON.initialize_clob_output;
      APEX_JSON.open_object;
      APEX_JSON.write('response_code', 500);
      APEX_JSON.write('response_message', 'Unexpected error: ' || SQLERRM);
      APEX_JSON.write('debug_errors', 'Global exception: ' || SUBSTR(SQLERRM, 1, 500));
      APEX_JSON.close_object;
      HTP.prn(APEX_JSON.get_clob_output);
END xx_otm_post_reservation_containers;

-- PROCEDURE: XX_OTM_POST_RESTACKCONTAINER

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_RESTACKCONTAINER (
   payload IN BLOB
) IS
   p_payload          CLOB;
   l_container_nbr    VARCHAR2(50);
   l_new_position     VARCHAR2(20);
   l_current_position VARCHAR2(20);
   l_timestamp        VARCHAR2(100);
   l_response         json_object_t;
   v_ts_tz            TIMESTAMP WITH TIME ZONE;
	l_shipment_nbr varchar(100);
   -- position master parsing variables
   v_curr_terminal    VARCHAR2(50);
   v_curr_block       VARCHAR2(50);
   v_curr_row_no      VARCHAR2(50);
   v_curr_lot_no      VARCHAR2(50);
   v_curr_level_no    VARCHAR2(50);

   v_new_terminal     VARCHAR2(50);
   v_new_block        VARCHAR2(50);
   v_new_row_no       VARCHAR2(50);
   v_new_lot_no       VARCHAR2(50);
   v_new_level_no     VARCHAR2(50);

   v_inv_rows         NUMBER;  -- rows updated in inventory table
   l_api_response    clob;
BEGIN
   -- Blob payload to Clob type conversion
   p_payload := TO_CLOB(payload);

   apex_json.initialize_clob_output;
   apex_json.open_object;
   -- Parse the JSON payload
   apex_json.parse(p_payload);

   -- Extract values from the JSON payload
   l_container_nbr    := apex_json.get_varchar2(p_path => 'container_nbr');
   l_new_position     := apex_json.get_varchar2(p_path => 'newPosition');
   l_current_position := apex_json.get_varchar2(p_path => 'currentPosition');
   l_timestamp        := apex_json.get_varchar2(p_path => 'timestamp');
   l_shipment_nbr     := apex_json.get_varchar2(p_path => 'shipment_nbr');

   -- Initialize the response object
   l_response := json_object_t();

   BEGIN
      -- Parse timestamp string into TIMESTAMP WITH TIME ZONE
      BEGIN
         v_ts_tz := TO_TIMESTAMP_TZ(
                       l_timestamp || '+00:00',
                       'YYYY-MM-DDTHH24:MI:SS.FF6TZH:TZM'
                    );
      EXCEPTION
         WHEN OTHERS THEN
            v_ts_tz := TO_TIMESTAMP_TZ(
                          l_timestamp || '+00:00',
                          'YYYY-MM-DDTHH24:MI:SSTZH:TZM'
                       );
      END;
   
   	BEGIN
	   	
	   	
		SELECT inbound_shipment_nbr INTO l_shipment_nbr FROM xxotm_container_inventory_t 
		WHERE container_nbr = l_container_nbr AND outbound_shipment_nbr IS NULL AND inbound_shipment_nbr IS NOT NULL AND POSITION IS NOT NULL;
     
   	-- Insert record into LOLO table
      INSERT INTO xxotm_restack_lolo_t (
         container_nbr,
         current_position,
         restack_position,
         updated_date,
         inbound_shipment_nbr
      )
      VALUES (
         l_container_nbr,
         l_current_position,
         l_new_position,
         v_ts_tz,
         l_shipment_nbr
      );

      -- Update position in container inventory table
      UPDATE xxotm_container_inventory_t
         SET position = l_new_position
       WHERE container_nbr = l_container_nbr AND inbound_shipment_nbr = l_shipment_nbr;

     v_inv_rows := SQL%ROWCOUNT;  -- preserve inventory update count

      ------------------------------------------------------------------
      -- Update xxotm_position_master_t for old & new slots
      ------------------------------------------------------------------

      -- Split l_current_position: TERMINAL-BLOCK-ROW_NO-LOT_NO-LEVEL_NO
      v_curr_terminal := REGEXP_SUBSTR(l_current_position, '[^-]+', 1, 1);
      v_curr_block    := REGEXP_SUBSTR(l_current_position, '[^-]+', 1, 2);
      v_curr_lot_no   := REGEXP_SUBSTR(l_current_position, '[^-]+', 1, 3);
      v_curr_row_no   := REGEXP_SUBSTR(l_current_position, '[^-]+', 1, 4);
      v_curr_level_no := REGEXP_SUBSTR(l_current_position, '[^-]+', 1, 5);

      -- Split l_new_position
      v_new_terminal  := REGEXP_SUBSTR(l_new_position, '[^-]+', 1, 1);
      v_new_block     := REGEXP_SUBSTR(l_new_position, '[^-]+', 1, 2);
      v_new_lot_no    := REGEXP_SUBSTR(l_new_position, '[^-]+', 1, 3);
      v_new_row_no    := REGEXP_SUBSTR(l_new_position, '[^-]+', 1, 4);
      v_new_level_no  := REGEXP_SUBSTR(l_new_position, '[^-]+', 1, 5);

      -- Mark current position as free: IS_OCCUPIED = 'N'
      UPDATE xxotm_position_master_t
         SET is_occupied = 'N'
       WHERE terminal  = v_curr_terminal
         AND block     = v_curr_block
         AND row_no    = v_curr_row_no
         AND lot_no    = v_curr_lot_no
         AND level_no  = v_curr_level_no;

      -- Mark new position as occupied by the container:
      -- store container number directly in IS_OCCUPIED
      UPDATE xxotm_position_master_t
         SET is_occupied = l_container_nbr
       WHERE terminal  = v_new_terminal
         AND block     = v_new_block
         AND row_no    = v_new_row_no
         AND lot_no    = v_new_lot_no
         AND level_no  = v_new_level_no;
      ------------------------------------------------------------------
      -- END position master logic
      ------------------------------------------------------------------
      
      
      
      
 EXCEPTION 
 WHEN OTHERS then
        l_response.put('response_code',    404);
         l_response.put('response_message', 'Shipment not found in inventory against the container' );
   	END;
 
 
  IF v_inv_rows > 0 THEN
         COMMIT;
         l_response.put('response_code',    200);
         l_response.put('response_message', 'Success');
      ELSE
         ROLLBACK;
         l_response.put('response_code',    404);
         l_response.put('response_message', 'Container not found in inventory');
      END IF;

 	begin
         post_otm_tracking_events(
            p_integration_name => 'XX_OTM_RESTACK_CONTAINER',
            p_statuscodegid    => 'NAQLEEN.CONTAINER_RESTACKED',
            p_shipmentxid      => l_shipment_nbr,
            p_attribute3       => l_container_nbr,
            p_attribute1       => l_new_position,
            x_response         => l_api_response
         );

         if l_api_response like '%Error%' then
            l_response.put('response_code',   500);
          l_response.put('response_message', 'Container Restacked Event Error: ' || l_api_response);
            
         end if;
      exception
         when others then
              l_response.put('response_code',   500);
          l_response.put('response_message', 'Container Restacked Event Error: ' || sqlerrm);
          
      end;
 	
     
     
   EXCEPTION
      WHEN OTHERS THEN
         ROLLBACK;
         l_response.put('response_code',    400);
         l_response.put('response_message', SQLERRM);
   END;

   -- Output the JSON response
   apex_json.write(
      'response_code',
      l_response.get('response_code').to_number()
   );
   apex_json.write(
      'response_message',
      REPLACE(
         l_response.get('response_message').to_string(),
         '',
         ''
      )
   );
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);

EXCEPTION
   WHEN OTHERS THEN
      ROLLBACK;

      l_response := json_object_t();
      l_response.put('response_code',    400);
      l_response.put('response_message', SQLERRM);

      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         l_response.get('response_code').to_number()
      );
      apex_json.write(
         'response_message',
         REPLACE(
            l_response.get('response_message').to_string(),
            '',
            ''
         )
      );
      apex_json.close_object;
      htp.prn(apex_json.get_clob_output);
END xx_otm_post_restackcontainer;

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

-- PROCEDURE: XX_OTM_POST_UPDATE_TRUCK_STATUS_APEX

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_POST_UPDATE_TRUCK_STATUS_APEX (
   payload in blob
) is
   p_payload         clob;
   l_status          varchar2(100);
   l_truck_number    varchar2(10);
   l_entry_timestamp timestamp;
   l_response        json_object_t;
   l_updated_count   number := 0;
   l_not_found_count number := 0;
   l_output          clob;
   l_array_count     number;
begin
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
   begin
        -- Loop through each truck in the array
      for i in 1..l_array_count loop
            -- Extract truck details
         l_truck_number := apex_json.get_varchar2(
            p_path => 'trucks[%d].truck_number',
            p0     => i
         );
         update xxotm_vehicle_master_t
            set
            status = l_status
          where truck_nbr = l_truck_number;

         if sql%rowcount > 0 then
            l_updated_count := l_updated_count + 1;
         else
            l_not_found_count := l_not_found_count + 1;
         end if;
      end loop;

      commit;

        -- Set response based on results
      if
         l_updated_count > 0
         and l_not_found_count = 0
      then
         l_response.put(
            'response_code',
            200
         );
         l_response.put(
            'response_message',
            'Success'
         );
      else
         l_response.put(
            'response_code',
            404
         );
         l_response.put(
            'response_message',
            'No data found'
         );
      end if;

   exception
      when others then
         rollback;
         l_response.put(
            'response_code',
            400
         );
         l_response.put(
            'response_message',
            'ERROR: ' || sqlerrm
         );
   end;

    -- Build JSON output using apex_json
   apex_json.initialize_clob_output;
   apex_json.open_object;
   apex_json.write(
      'response_code',
      l_response.get_number('response_code')
   );
   apex_json.write(
      'response_message',
      l_response.get_string('response_message')
   );
   apex_json.close_object;

    -- Get output
   l_output := apex_json.get_clob_output;

    -- Print output
   htp.prn(l_output);
   apex_json.free_output;
end xx_otm_post_update_truck_status_apex;

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
                truck_nbr = l_truck_number and exit_time is null;


        -- If found, no need to insert, just set response and return
        l_response.put('response_code', 500);
        l_response.put('response_message', 'Truck Already Inside - Cannot Re-enter');

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
                l_response.put('response_message', 'Truck Check-In Completed Successfully');
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
    l_username            VARCHAR2(4000) :='NAQLEEN.INTEGRATION' ; 
    l_password            VARCHAR2(4000) :='NaqleenInt@123' ; 
    l_wallet_path         VARCHAR2(4000) := 'file:/u01/app/oracle/product/wallet'; 
    i                     PLS_INTEGER;
    l_response_clob			clob;
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

  
    BEGIN
        SELECT s.shipment_xid
        INTO   l_shipment_gid
        FROM   xxotm_vehicle_master_t vm
               , xxotm_shipments_t s
                 WHERE (vm.truck_nbr = s.power_unit OR vm.truck_nbr = s.truck_3pl)
        AND   vm.truck_nbr = l_truck_number AND entry_time = (SELECT max(entry_time) FROM xxotm_vehicle_master_t v WHERE v.truck_nbr = l_truck_number);
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

        
        IF  l_has_gate_in AND l_has_gate_out THEN
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
                    p_attribute10      => NULL,
                    x_response         => l_response_clob
                );
            EXCEPTION
                WHEN OTHERS THEN
                    DBMS_OUTPUT.PUT_LINE('Error posting OTM tracking event: ' || SQLERRM);
            END;
        
            l_response.put('response_code', 200);
            l_response.put('response_message', 'Success');
        COMMIT;
        ELSE
            l_response.put('response_code', 404);
            l_response.put('response_message', 'No Data Found');
        	ROLLBACK;
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


-- PROCEDURE: XX_OTM_RELEASE_CONTAINER_TRUCK_DETAILS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_RELEASE_CONTAINER_TRUCK_DETAILS (
   p_truck_nbr in varchar2
) as
    -- Variables for truck and shipment details
   l_shipment_xid       varchar2(100);
   l_shipment_name      varchar2(100);
   l_container_nbr      varchar2(100);
   l_container_type     varchar2(100);
   l_customer_name      varchar2(200);
   l_truck_nbr          varchar2(100);
   l_driver_name        varchar2(100);
   l_driver_iqama_nbr   varchar2(100);
   l_shipment_type      varchar2(100);
   l_order_movement_xid varchar2(100);
    -- API variables
   l_url                varchar2(4000);
   l_response_clob      clob;
   l_gate_in_count      number;
   l_gate_out_count     number;
   l_found              boolean := false;
   l_prev_parent        varchar2(200);
   l_customer_nbr   varchar2(100);
   cursor c_shipments is
   select s.shipment_xid,
          s.shipment_name,
          s.cont_no,
          s.container_type,
          s.customer_name,
          s.liner_name
     from xxotm_shipments_t s 
    where ( s.power_unit = p_truck_nbr
       or s.truck_3pl = p_truck_nbr ) ;
begin
   apex_json.initialize_clob_output;
   apex_json.open_object;
    -- Get truck/driver details
   begin
      select truck_nbr,
             driver_name,
             driver_iqama
        into
         l_truck_nbr,
         l_driver_name,
         l_driver_iqama_nbr
        from xxotm_vehicle_master_t
       where truck_nbr = p_truck_nbr
         and rownum = 1;
   exception
      when no_data_found then
         l_truck_nbr := p_truck_nbr;
         l_driver_name := null;
         l_driver_iqama_nbr := null;
   end;
    -- Find shipment with GATE IN and no GATE OUT
   for r in c_shipments loop
        -- Check GATE OUT
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
            -- Check GATE IN
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
                -- Found the active shipment
            l_shipment_xid := r.shipment_xid;
            l_shipment_name := r.shipment_name;
            l_container_nbr := r.cont_no;
            l_container_type := r.container_type;
            l_customer_name := r.customer_name;
			l_customer_nbr := r.liner_name;
            l_found := true;
            exit;
         end if;
      end if;
   end loop;
   begin
      select order_movement_xid
        into l_order_movement_xid
        from xxotm_order_movements_t
       where shipment_xid = l_shipment_xid
         and rownum = 1;
   exception
      when no_data_found then
         l_order_movement_xid := null;
   end;
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
         l_shipment_xid
      );
      apex_json.write(
         'order_movement_xid',
         l_order_movement_xid
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
         'customer_nbr',
         l_customer_nbr
      );
	  apex_json.write(
         'customer_name',
         l_customer_name
      );
      -- Build positions_with_containers object
      apex_json.open_object('positions_with_containers');
      l_prev_parent := null;
      for r in (
         select parent_position,
                container_nbr,
                position -- Added position to selection
           from (
            select case
                      when instr(
                         position,
                         '-',
                         -1
                      ) > 0 then
                         substr(
                            position,
                            1,
                            instr(
                               position,
                               '-',
                               -1
                            ) - 1
                         )
                      else
                         position
                   end as parent_position,
                   container_nbr,
                   position -- Added position to subquery
              from xxotm_container_inventory_t
             where cust_nbr = l_customer_nbr AND container_type IS NOT NULL  
             AND container_type = l_container_type and position IS NOT  NULL AND container_stored_time IS NOT NULL AND container_released_time IS NULL 
				AND ((l_shipment_name LIKE '%LRO%' AND booking_id IS NOT NULL ) OR (l_shipment_name LIKE '%CRO%' AND booking_id IS NULL ) )
         ) t
          order by parent_position,
                   container_nbr
      ) loop
         if l_prev_parent is null
         or l_prev_parent != r.parent_position then
            if l_prev_parent is not null then
               apex_json.close_array;
            end if;
            apex_json.open_array(r.parent_position);
            l_prev_parent := r.parent_position;
         end if;
         
         -- Changed output format to object with position and container_nbr
         apex_json.open_object;
         apex_json.write(
            'position',
            r.position
         );
         apex_json.write(
            'container_nbr',
            r.container_nbr
         );
         apex_json.close_object;
      end loop;
      if l_prev_parent is not null then
         apex_json.close_array;
      end if;
      apex_json.close_object; -- positions_with_containers
      apex_json.close_object; -- data
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
end xx_otm_release_container_truck_details;

-- PROCEDURE: XX_OTM_SEND_CHAT_MESSAGE

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SEND_CHAT_MESSAGE (
    P_BODY IN BLOB
) AS
    L_CLOB          CLOB;
    L_SENDER_ID     NUMBER;
    L_RECEIVER_ID   NUMBER;
    L_TEXT          VARCHAR2(4000);
    L_NEW_ID        NUMBER;
    L_RESPONSE_CODE NUMBER := 200;
    L_RESPONSE_MSG  VARCHAR2(4000) := 'Message sent successfully';
BEGIN
    -- Convert BLOB to CLOB
    L_CLOB := TO_CLOB(P_BODY);
    -- Parse JSON
    APEX_JSON.PARSE(L_CLOB);
    L_SENDER_ID   := APEX_JSON.GET_NUMBER('sender_id');
    L_RECEIVER_ID := APEX_JSON.GET_NUMBER('receiver_id');
    L_TEXT        := APEX_JSON.GET_VARCHAR2('text');
    -- Insert the message
    BEGIN
        INSERT INTO XXOTM_CHAT_MESSAGES_T (
            SENDER_ID,
            RECEIVER_ID,
            MESSAGE_TEXT,
            SENT_AT
            
        ) VALUES (
            L_SENDER_ID,
            L_RECEIVER_ID,
            L_TEXT,
            SYSTIMESTAMP
            
        ) RETURNING MESSAGE_ID INTO L_NEW_ID;
 
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            L_RESPONSE_CODE := 500;
            L_RESPONSE_MSG := 'Error inserting message: ' || SQLERRM;
    END;
    -- Clean up temporary CLOB
    IF DBMS_LOB.ISTEMPORARY(L_CLOB) = 1 THEN
        DBMS_LOB.FREETEMPORARY(L_CLOB);
    END IF;
    -- Generate Response
    APEX_JSON.INITIALIZE_CLOB_OUTPUT;
    APEX_JSON.OPEN_OBJECT;
        APEX_JSON.WRITE('response_code', L_RESPONSE_CODE);
        APEX_JSON.WRITE('response_message', L_RESPONSE_MSG);
        
        IF L_RESPONSE_CODE = 200 THEN
            APEX_JSON.WRITE('message_id', L_NEW_ID);
            APEX_JSON.WRITE('sent_at', TO_CHAR(SYSTIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'));
        END IF;
        
    APEX_JSON.CLOSE_OBJECT;
    HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
    APEX_JSON.FREE_OUTPUT;
EXCEPTION
    WHEN OTHERS THEN
        IF DBMS_LOB.ISTEMPORARY(L_CLOB) = 1 THEN
            DBMS_LOB.FREETEMPORARY(L_CLOB);
        END IF;
        APEX_JSON.FREE_OUTPUT;
        APEX_JSON.INITIALIZE_CLOB_OUTPUT;
        APEX_JSON.OPEN_OBJECT;
            APEX_JSON.WRITE('response_code', 500);
            APEX_JSON.WRITE('response_message', 'Unexpected error: ' || SQLERRM);
        APEX_JSON.CLOSE_OBJECT;
        HTP.PRN(APEX_JSON.GET_CLOB_OUTPUT);
        APEX_JSON.FREE_OUTPUT;
END XX_OTM_SEND_CHAT_MESSAGE;

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
	l_shipment_name  varchar2(200);
	l_order_release_xid  varchar2(200);
    l_cust_nbr  varchar2(200);
    l_cust_name  varchar2(200);
  	l_container_type  varchar2(200);
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
   l_shipment_nbr := apex_json.get_varchar2('shipment_nbr');
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
   l_lot := regexp_substr(
      l_position,
      '[^-]+',
      1,
      3
   );
   l_row := regexp_substr(
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

   -- Update position_master (row_no is now VARCHAR2 to support A, B, C...)
   begin
      update xxotm_position_master_t
         set
         is_occupied = l_container_nbr
       where terminal = l_terminal
         and block = l_block
         and row_no = l_row
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

   -- Update container_inventory
   if l_response_code = 200 then
      begin
		  update xxotm_container_inventory_t
		   set container_stored_time =
		         to_char(
		           sys_extract_utc(systimestamp),
		           'YYYY-MM-DDTHH24:MI:SSZ'
		         ),
		         POSITION = l_position
		 where container_nbr        = l_container_nbr
		   and inbound_shipment_nbr = l_shipment_nbr;



        if sql%rowcount = 0 then
            select shipment_name, order_release_xid,
              liner_name, customer_name, container_type
                into l_shipment_name, l_order_release_xid,
              l_cust_nbr, l_cust_name, l_container_type
            from xxotm_shipments_t s, xxotm_order_movements_t o
            where  s.shipment_xid = o.shipment_xid and s.shipment_xid = l_shipment_nbr;
            insert into xxotm_container_inventory_t (
                  shipment_name,
                  inbound_shipment_nbr,
                  inbound_order_nbr,
                  cust_nbr,
                  cust_name,
                  container_type,
                  container_stored_time,
                  container_nbr,
                  position) values(l_shipment_name,l_shipment_nbr,l_order_release_xid,l_cust_nbr,l_cust_name,l_container_type, 
                  to_char(
		           sys_extract_utc(systimestamp),
		           'YYYY-MM-DDTHH24:MI:SSZ'
		         ),l_container_nbr,l_position);
         end if;
        
      exception
         when others then
            l_response_code := 500;
            l_response_msg := 'Error updating container inventory: ' || sqlerrm;
      end;
   end if;
   -- Call tracking events API
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

   -- Commit or rollback
   if l_response_code = 200 THEN
	
   BEGIN
	   INSERT INTO XXOTM_RESTACK_LOLO_T(CONTAINER_NBR, INBOUND_SHIPMENT_NBR,CURRENT_POSITION,RESTACK_POSITION) VALUES(l_container_nbr,l_shipment_nbr,'NA',l_position);
	   EXCEPTION 
	   WHEN OTHERS THEN 
	   	            l_response_msg := 'UNABLE TO UPDATE THE RESTACK ';
		END;
   
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
   l_truck          varchar2(100);
   l_driver         varchar2(100);
   l_truck_type     varchar2(100);
	l_shipment_name  varchar2(100);
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
   
   -- API Request/Response
   l_request_clob   clob;
   l_response_clob  clob;
   
    -- Error handling
   l_error_message  clob;
   l_has_error      boolean := false;
    -- Blob conversion variables
   l_dest_offset    integer := 1;
   l_src_offset     integer := 1;
   l_lang_context   integer := dbms_lob.default_lang_ctx;
   l_warning        integer;
    l_entry_time varchar2(50);
    l_request  json_object_t;
    l_status varchar2(100);
begin
    -- Convert BLOB to CLOB
   
      l_json_content := to_clob(p_blob_content);
  
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
   l_truck := apex_json.get_varchar2(
      p_values => l_values,
      p_path   => 'truck_nbr'
   );
   l_driver := apex_json.get_varchar2(
      p_values => l_values,
      p_path   => 'driver_nbr'
   );
   l_truck_type := apex_json.get_varchar2(
      p_values => l_values,
      p_path   => 'truck_type'
   );
    -- -------------------------------
    -- OPERATION 1: Process Documents
    -- -------------------------------
   l_document_count := apex_json.get_count(
      p_values => l_values,
      p_path   => 'documents'
   );
   if l_document_count > 0 then
      for i in 1..l_document_count loop
         begin
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
            post_otm_documents(
               p_documentxid      => l_doc_xid,
               p_documentfilename => l_doc_name,
               p_ownerobjectgid   => 'NAQLEEN.'||replace(l_shipment_nbr,'NAQLEEN.',''),
               p_clobcontent      => l_doc_content,
               p_documentmimetype => l_doc_mime,
               p_documentdefgid   => 'NAQLEEN.PACKING_LIST',
               x_response_clob    => l_doc_response
            );
            if l_doc_response like 'Error%' then
               l_has_error := true;
               l_error_message := l_error_message
                                  || 'Document Error ('
                                  || l_doc_xid
                                  || '): '
                                  || l_doc_response
                                  || '; ';
            end if;
         exception
            when others then
               l_has_error := true;
               l_error_message := l_error_message
                                  || 'Document Exception ('
                                  || l_doc_xid
                                  || '): '
                                  || sqlerrm
                                  || '; ';
         end;
      end loop;
   end if;
    -- -------------------------------
    -- OPERATION 2: Process Tracking Events
	    -- -------------------------------
	BEGIN
	   SELECT shipment_name
	   INTO   l_shipment_name
	   FROM   xxotm_shipments_t
	   WHERE  shipment_xid = l_shipment_nbr;
	EXCEPTION
	   WHEN NO_DATA_FOUND THEN
	      l_shipment_name := NULL;
	END;
    
    
  IF UPPER(l_shipment_name) NOT LIKE '%INBOUND_CONTAINER' THEN
   -- Event 1: VEHICLE ENTERED
  
  SELECT entry_time INTO l_entry_time FROM XXOTM_VEHICLE_MASTER_T xvmt WHERE upper(truck_nbr) = upper(l_truck) ORDER BY ENTRY_TIME DESC FETCH FIRST 1 ROWS only; 
  
  
   begin
      post_otm_tracking_events(
         p_statuscodegid => 'NAQLEEN.VEHICLE ENTERED',
         p_shipmentxid   => l_shipment_nbr,
         p_event_timestamp => l_entry_time,
         x_response      => l_event_response
      );
      if l_event_response like 'Error%' then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Event Error (NAQLEEN.VEHICLE ENTERED): '
                            || l_event_response
                            || '; ';
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Event Exception (NAQLEEN.VEHICLE ENTERED): '
                            || sqlerrm
                            || '; ';
   end;
  END IF;
  
   -- Event 2: GATE IN
   begin
      post_otm_tracking_events(
         p_statuscodegid => 'NAQLEEN.GATE IN',
         p_shipmentxid   => l_shipment_nbr,
         x_response      => l_event_response
      );
      if l_event_response like 'Error%' then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Event Error (NAQLEEN.GATE IN): '
                            || l_event_response
                            || '; ';
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Event Exception (NAQLEEN.GATE IN): '
                            || sqlerrm
                            || '; ';
   end;
    -- -------------------------------
    -- OPERATION 3: Update 3PL Truck/Driver
    -- -------------------------------
   if
      l_truck_type is not null
      and l_truck_type = '3PL'
   then
      begin
      l_request := json_object_t();
    l_request.put('attribute7', l_truck);
    l_request.put('attribute8', l_driver);
    l_request_clob := l_request.to_clob();

         apex_web_service.g_request_headers.delete;
    apex_web_service.g_request_headers(1).name := 'Content-Type';
    apex_web_service.g_request_headers(1).value := 'application/json';
    
    dbms_output.put_line('Making PATCH request to OTM...');
    
    l_response_clob := apex_web_service.make_rest_request(
      p_url         => 'https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com/logisticsRestApi/resources-int/v2/shipments/NAQLEEN.' || l_shipment_nbr,
      p_http_method => 'PATCH',
      p_username    => 'NAQLEEN.INTEGRATION',
      p_password    => 'NaqleenInt@123',
      p_wallet_path => 'file:/u01/app/oracle/product/wallet',
      p_body        => l_request_clob
    );
    
    l_status := apex_web_service.g_status_code;
         -- Check for error in response
         if l_response_clob like 'Error%'
         or instr(
            lower(l_response_clob),
            'error'
         ) > 0 then
            l_has_error := true;
            l_error_message := l_error_message
                               || '3PL Update Error: '
                               || substr(
               l_response_clob,
               1,
               200
            )
                               || '; ';
         end if;
      exception
         when others then
            l_has_error := true;
            l_error_message := l_error_message
                               || '3PL Update Exception: '
                               || sqlerrm
                               || '; ';
      end;
   end if;
    -- -------------------------------
    -- OPERATION 4: Update Vehicle Master
    -- -------------------------------
   begin
      UPDATE xxotm_vehicle_master_t t
SET t.status = 'NAQLEEN.GATE IN'
WHERE t.truck_nbr = l_truck
  AND t.exit_time IS NULL
  AND t.entry_time = (
      SELECT MAX(entry_time)
      FROM xxotm_vehicle_master_t
      WHERE truck_nbr = l_truck
        AND exit_time IS NULL
  );

      if sql%rowcount = 0 then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Vehicle Master Update Failed: No matching record found for '
                            || l_truck
                            || '; ';
      end if;
   exception
      when others then
         l_has_error := true;
         l_error_message := l_error_message
                            || 'Vehicle Master Update Exception: '
                            || sqlerrm
                            || '; ';
   end;
    -- Clean up temporary CLOB
   if dbms_lob.istemporary(l_json_content) = 1 then
      dbms_lob.freetemporary(l_json_content);
   end if;
    -- -------------------------------
    -- Build JSON Response
    -- -------------------------------
   apex_json.initialize_clob_output;
   apex_json.open_object;
   if l_has_error then
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Partial or Full Failure: ' || l_error_message
      );
   else
      apex_json.write(
         'response_code',
         200
      );
      apex_json.write(
         'response_message',
         nvl(l_request_clob,'nothing')
      );
   end if;
   apex_json.close_object;
   htp.prn(apex_json.get_clob_output);
   apex_json.free_output;
exception
   when others then
      -- Global Exception Handler
      if dbms_lob.istemporary(l_json_content) = 1 then
         dbms_lob.freetemporary(l_json_content);
      end if;
      apex_json.initialize_clob_output;
      apex_json.open_object;
      apex_json.write(
         'response_code',
         500
      );
      apex_json.write(
         'response_message',
         'Critical Error: ' || sqlerrm
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

-- PROCEDURE: XX_OTM_SUBMIT_RELEASE_CONTAINER

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SUBMIT_RELEASE_CONTAINER (
   p_body in blob
) as
   l_clob          clob;
   l_container_nbr varchar2(100);
   l_shipment_nbr  varchar2(100);
   l_order_nbr     varchar2(100);
   l_position      varchar2(200);
   l_timestamp     timestamp;
   -- API response
   l_api_response  clob;
   l_response_code number := 200;
   l_response_msg  varchar2(4000) := 'Success';

   -- Blob conversion
   l_dest_offset   integer := 1;
   l_src_offset    integer := 1;
   l_lang_context  integer := dbms_lob.default_lang_ctx;
   l_warning       integer;
   v_curr_terminal varchar2(50);
v_curr_block    varchar2(50);
v_curr_row_no   varchar2(50);
v_curr_lot_no   varchar2(50);
v_curr_level_no varchar2(50);
l_lolo_count NUMBER;
l_plug_count NUMBER;

l_days_stored NUMBER;
BEGIN
	
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
   l_container_nbr := apex_json.get_varchar2('containerNbr');
   l_shipment_nbr := apex_json.get_varchar2('shipmentNbr');
--   l_order_nbr := apex_json.get_varchar2('orderNbr');
   l_position := apex_json.get_varchar2('position');

   SELECT ORDER_RELEASE_XID INTO l_order_nbr  FROM XXOTM_ORDER_MOVEMENTS_T WHERE SHIPMENT_XID = l_shipment_nbr;
   
   begin
     v_curr_terminal := REGEXP_SUBSTR(l_position, '[^-]+', 1, 1);
      v_curr_block    := REGEXP_SUBSTR(l_position, '[^-]+', 1, 2);
      v_curr_lot_no   := REGEXP_SUBSTR(l_position, '[^-]+', 1, 3);
      v_curr_row_no   := REGEXP_SUBSTR(l_position, '[^-]+', 1, 4);
      v_curr_level_no := REGEXP_SUBSTR(l_position, '[^-]+', 1, 5);
       
     UPDATE xxotm_position_master_t
         SET is_occupied = 'N'
       WHERE terminal  = v_curr_terminal
         AND block     = v_curr_block
         AND row_no    = v_curr_row_no
         AND lot_no    = v_curr_lot_no
         AND level_no  = v_curr_level_no;
     
       exception
      when others then
         l_response_code := 500;
         l_response_msg := 'Error updating position master: ' || sqlerrm;
   end;
     
   -- Update container_inventory
   begin
      update xxotm_container_inventory_t
         set outbound_shipment_nbr = l_shipment_nbr,
             outbound_order_nbr = l_order_nbr,
             container_released_time = TO_CHAR(SYS_EXTRACT_UTC(SYSTIMESTAMP), 'YYYY-MM-DDTHH24:MI:SS.FF6Z')
       where container_nbr = l_container_nbr
         and outbound_shipment_nbr is null
         and outbound_order_nbr is null;

      if sql%rowcount = 0 then
         l_response_code := 404;
         l_response_msg := 'Container not found in inventory';
      ELSE 
      COMMIT
      ;
      end if;
     
   exception
      when others then
         l_response_code := 500;
         l_response_msg := 'Error updating container inventory: ' || sqlerrm;
   end;
      
BEGIN 
  
   SELECT count(*)   INTO l_lolo_count FROM XXOTM_RESTACK_LOLO_T xrlt WHERE xrlt.CONTAINER_NBR = l_container_nbr 
   AND xrlt.INBOUND_SHIPMENT_NBR =  (	SELECT inbound_shipment_nbr FROM XXOTM_CONTAINER_INVENTORY_T xcit WHERE  xcit.OUTBOUND_SHIPMENT_NBR  = l_shipment_nbr);
     
   SELECT count(*)   INTO l_plug_count FROM XXOTM_PLUGINOUT_T xpt WHERE xpt.CONTAINER_NBR = l_container_nbr 
   AND xpt.INBOUND_SHIPMENT_NBR =  (	SELECT inbound_shipment_nbr FROM XXOTM_CONTAINER_INVENTORY_T xcit WHERE  xcit.OUTBOUND_SHIPMENT_NBR  = l_shipment_nbr);
  
   SELECT 
      EXTRACT(DAY FROM (SYS_EXTRACT_UTC(SYSTIMESTAMP) - TO_TIMESTAMP(xcit.container_stored_time, 'YYYY-MM-DDTHH24:MI:SSZ')))
   INTO l_days_stored 
   FROM XXOTM_CONTAINER_INVENTORY_T xcit 
   WHERE xcit.OUTBOUND_SHIPMENT_NBR = l_shipment_nbr;
   
  exception
      when others then
         l_response_code := 500;
         l_response_msg := 'Error updating LOLO and Plug IN-OUT details: ';
  END;
  
   -- Call tracking event: Container Released
   if l_response_code = 200 then
      begin
         post_otm_tracking_events(
            p_integration_name => 'XX_OTM_RELEASE_CONTAINER',
            p_statuscodegid    => 'NAQLEEN.CONTAINER RELEASED',
            p_shipmentxid      => l_shipment_nbr,
            p_attribute3       => l_container_nbr,
            p_attribute_number1       => l_days_stored,
            p_attribute_number2       => l_lolo_count,
            p_attribute_number3       => l_plug_count,
            x_response         => l_api_response
         );

         if l_api_response like '%Error%' then
            l_response_code := 500;
            l_response_msg := 'Container Released Event Error: ' || l_api_response;
         end if;
      exception
         when others then
            l_response_code := 500;
            l_response_msg := 'Error calling Container Released event: ' || sqlerrm;
      end;
   end if;

   -- Process LOLO records
   if l_response_code = 200 then
      for lolo_rec in (
         select restack_position,
                updated_date
           from xxotm_restack_lolo_t
          where container_nbr = l_container_nbr
          order by updated_date asc
      ) loop
         begin
            post_otm_tracking_events(
               p_integration_name => 'XX_OTM_RELEASE_CONTAINER',
               p_statuscodegid    => 'NAQLEEN.LOLO',
               p_shipmentxid      => l_shipment_nbr,
               p_event_timestamp  => lolo_rec.updated_date,
               p_attribute1       => lolo_rec.restack_position,
               x_response         => l_api_response
            );

            if l_api_response like '%Error%' then
               l_response_code := 500;
               l_response_msg := 'LOLO Event Error: ' || l_api_response;
               exit;
            end if;
         exception
            when others then
               l_response_code := 500;
               l_response_msg := 'Error calling LOLO event: ' || sqlerrm;
               exit;
         end;
      end loop;
   end if;

   -- Process Plug In/Out records
   if l_response_code = 200 then
      for plugin_rec in (
         select type,
                timestamp
           from xxotm_pluginout_t
          where container_nbr = l_container_nbr
          order by timestamp asc
      ) loop
         declare
            l_status_code varchar2(100);
         begin
            if upper(plugin_rec.type )= 'PLUGGED' then
               l_status_code := 'NAQLEEN.PLUG IN';
            ELSIF upper( plugin_rec.type )= 'UNPLUGGED' then
               l_status_code := 'NAQLEEN.PLUG OUT';
            else
               l_status_code := null;
            end if;
            l_timestamp := null;
            l_timestamp := plugin_rec.timestamp;
            if l_status_code is not null then
               post_otm_tracking_events(
                  p_integration_name => 'XX_OTM_RELEASE_CONTAINER',
                  p_statuscodegid    => l_status_code,
                  p_event_timestamp  => l_timestamp,
                  p_shipmentxid      => l_shipment_nbr,
                  x_response         => l_api_response
               );

               if l_api_response like '%Error%' then
                  l_response_code := 500;
                  l_response_msg := 'Plug In/Out Event Error: ' || l_api_response;
                  exit;
               end if;
            end if;
         exception
            when others then
               l_response_code := 500;
               l_response_msg := 'Error calling Plug In/Out event: ' || sqlerrm;
               exit;
         end;
      end loop;
   end if;
	
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
end xx_otm_submit_release_container;

-- PROCEDURE: XX_OTM_SWAP_RESERVATION_CONTAINERS

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SWAP_RESERVATION_CONTAINERS (
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
                          || 'orderReleaseRefnumQualGid: NAQLEEN.BOOKING_NO,'
                          || 'orderReleaseRefnumValue: '
                          || l_booking_id
                          || ','
                          || 'domainName: NAQLEEN'
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


-- PROCEDURE: XX_OTM_SYNC_ORDER_RELEASES

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SYNC_ORDER_RELEASES (
   p_base_url     in varchar2,
   p_username     in varchar2,
   p_password     in varchar2,
   p_query_params in varchar2
) is
  
   l_full_url                varchar2(700);
   l_credentials             varchar2(200);
   l_encoded_cred            varchar2(400);
   l_response_clob           clob;
   jo                        json_object_t;
   l_links                   json_array_t;
   l_results                 json_array_t;
   l_next_page_url           varchar2(4000);
   l_params                  varchar2(4000);
   
   -- Variables for logic
   l_item                    json_object_t;
   l_refnums                 json_array_t;
   
   -- Flow control
   l_existing_source         varchar2(100);
   l_record_exists           boolean;
   
   -- Mapped Fields
   v_inbound_order_nbr       varchar2(100); -- orderReleaseXid
   v_order_type              varchar2(100); -- orderReleaseTypeGid
   v_inbound_shipment_nbr    varchar2(100); -- From XXOTM_ORDER_MOVEMENTS_T
   v_shipment_name           varchar2(100); -- From XXOTM_SHIPMENTS_T
   v_outbound_order_nbr      varchar2(100) := null;
   v_outbound_shipment_nbr   varchar2(100) := null;
   v_cust_nbr                varchar2(100); -- attribute2
   v_cust_name               varchar2(200); -- Refnum: cust_name
   v_container_nbr           varchar2(100); -- attribute3
   v_container_type          varchar2(50);  -- Refnum: NAQLEEN.CONTAINER_TYPE
   v_position                varchar2(100); -- Refnum: NAQLEEN.PARKING_SLOT
   v_booking_id              varchar2(100); -- Refnum: NAQLEEN.BOOKING_NO
   v_container_stored_time   timestamp with time zone; -- attributeDate1
   v_container_released_time timestamp with time zone; -- attributeDate2

   -- Helper for refnums
   function get_refnum (
      p_refs json_array_t,
      p_qual varchar2
   ) return varchar2 is
      l_qual varchar2(200);
      l_obj  json_object_t;
   begin
      if p_refs is null then
         return null;
      end if;
      for i in 0..p_refs.get_size() - 1 loop
         l_obj := treat(p_refs.get(i) as json_object_t);
           -- Defensive check
         if l_obj is not null then
            if l_obj.has('orderReleaseRefnumQualGid') then
               l_qual := l_obj.get_string('orderReleaseRefnumQualGid');
               if l_qual = p_qual then
                  return l_obj.get_string('orderReleaseRefnumValue');
               end if;
            end if;
         end if;
      end loop;
      return null;
   end;

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
         return to_timestamp_tz ( v_str,'YYYY-MM-DDTHH24:MI:SSFFTZH:TZM' );
      exception
         when others then
            null;
      end;
      begin
         return to_timestamp_tz ( v_str,'YYYY-MM-DDTHH24:MI:SSTZH:TZM' );
      exception
         when others then
            return null;
      end;
   end normalize_tstz;

begin
--    dbms_output.put_line('Starting XX_OTM_SYNC_ORDER_RELEASES...');
   l_params := utl_url.escape(p_query_params);
   l_full_url := p_base_url
                 || '?'
                 || l_params;
   l_next_page_url := l_full_url;
--    dbms_output.put_line('Initial URL: ' || l_full_url);
   l_credentials := p_username
                    || ':'
                    || p_password;
   l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));

   while
      l_next_page_url is not null
      and lower(l_next_page_url) <> 'null'
   loop
    --   dbms_output.put_line('Fetching page: ' || l_next_page_url);
      
      -- Reset headers for each loop/call
      apex_web_service.g_request_headers.delete;
      apex_web_service.g_request_headers(1).name := 'Content-Type';
      apex_web_service.g_request_headers(1).value := 'application/json';
      apex_web_service.g_request_headers(2).name := 'Authorization';
      apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
      begin
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );
        --  dbms_output.put_line('API Response Length: ' || dbms_lob.getlength(l_response_clob));
      exception
         when others then
            dbms_output.put_line('API Call Failed: ' || sqlerrm);
            return;
      end;

      -- Defensive Parse
      begin
         jo := json_object_t.parse(l_response_clob);
      exception
         when others then
            dbms_output.put_line('JSON Parse Error: ' || sqlerrm);
            return;
      end;

      if jo is null then
         dbms_output.put_line('Parsed JSON Object is NULL');
         return;
      end if;

      -- Pagination Logic
      if
         jo.has('hasMore')
         and jo.get_boolean('hasMore')
      then
         if jo.has('links') then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            if l_links is not null then
               for i in 0..l_links.get_size() - 1 loop
                  declare
                     li json_object_t := treat(l_links.get(i) as json_object_t);
                  begin
                     if
                        li is not null
                        and li.has('rel')
                        and li.get_string('rel') = 'next'
                     then
                        l_next_page_url := li.get_string('href');
                        exit;
                     end if;
                  end;
               end loop;
            end if;
         end if;
        --  dbms_output.put_line('Next page URL: ' || l_next_page_url);
      else
         l_next_page_url := null;
        --  dbms_output.put_line('No more pages or hasMore is false.');
      end if;

      if
         jo.has('items')
         and jo.get('items').is_array
      then
         l_results := json_array_t.parse(jo.get('items').to_clob());
        --  dbms_output.put_line('Items count in page: ' || l_results.get_size());
      else
        --  dbms_output.put_line('No items array found in response.');
         return;
      end if;

      -- Process Items
      for idx in 0..l_results.get_size() - 1 loop
         l_item := treat(l_results.get(idx) as json_object_t);
         if l_item is not null then
             -- 1. Inbound Order Nbr (XID)
            if l_item.has('orderReleaseXid') then
               v_inbound_order_nbr := l_item.get_string('orderReleaseXid');
            else
               v_inbound_order_nbr := null;
            end if;
             
             -- Order Type GID
--            if l_item.has('orderReleaseTypeGid') then
               v_order_type := l_item.get_string('orderReleaseTypeGid');
            

            -- dbms_output.put_line('Processing Order Release: ' || v_inbound_order_nbr||' '||v_order_type);
             
             -- 6. Customer Number (Attribute 2)
            if l_item.has('attribute2') then
               v_cust_nbr := regexp_replace(
                  l_item.get_string('attribute2'),
                  '^.*?\.',
                  ''
               );
            else
               v_cust_nbr := null;
            end if;
             
             -- 8. Container Number (Attribute 3)
            if l_item.has('attribute3') then
               v_container_nbr := l_item.get_string('attribute3');
            else
               v_container_nbr := null;
            end if;
             
             -- Dates - Defensive chaining
            v_container_stored_time := null;
            if l_item.has('attributeDate1') then
               declare
                  ad1_obj json_object_t := l_item.get_object('attributeDate1');
               begin
                  if
                     ad1_obj is not null
                     and ad1_obj.has('value')
                  then
                     v_container_stored_time := normalize_tstz(ad1_obj.get_string('value'));
                  end if;
               end;
            end if;

            v_container_released_time := null;
            if l_item.has('attributeDate2') then
               declare
                  ad2_obj json_object_t := l_item.get_object('attributeDate2');
               begin
                  if
                     ad2_obj is not null
                     and ad2_obj.has('value')
                  then
                     v_container_released_time := normalize_tstz(ad2_obj.get_string('value'));
                  end if;
               end;
            end if;
             
             -- Refnums Extraction - Defensive
            v_container_type := null;
            v_position := null;
            v_booking_id := null;
            v_cust_name := null;
            if l_item.has('refnums') then
               declare
                  r_sect json_object_t := l_item.get_object('refnums');
               begin
                  if
                     r_sect is not null
                     and r_sect.has('items')
                  then
                     l_refnums := r_sect.get_array('items');
                     v_container_type := get_refnum(
                        l_refnums,
                        'NAQLEEN.CONTAINER_TYPE'
                     );
                     v_position := get_refnum(
                        l_refnums,
                        'NAQLEEN.PARKING_SLOT'
                     );
                     v_booking_id := get_refnum(
                        l_refnums,
                        'NAQLEEN.BOOKING_NO'
                     );
                     v_cust_name := get_refnum(
                        l_refnums,
                        'NAQLEEN.CUS_NAME'
                     );
                  end if;
               end;
            end if;
             
             -- 2. Inbound Shipment Number via LOCAL TABLE
            if v_inbound_order_nbr is not null then
               begin
                  select regexp_replace(
                     shipment_xid,
                     '^.*?\.',
                     ''
                  )
                    into v_inbound_shipment_nbr
                    from xxotm_order_movements_t
                   where order_release_xid = v_inbound_order_nbr
                   fetch first 1 rows only;
                --   dbms_output.put_line('  Found Inbound Shipment: ' || v_inbound_shipment_nbr);
               exception
                  when no_data_found then
                     v_inbound_shipment_nbr := null;
                    --  dbms_output.put_line('  No Inbound Shipment found for Order Release.');
               end;
            else
               v_inbound_shipment_nbr := null;
            end if;
             
             -- 3. Shipment Name via LOCAL TABLE
            if v_inbound_shipment_nbr is not null then
               begin
                  select shipment_name
                    into v_shipment_name
                    from xxotm_shipments_t
                   where shipment_xid = v_inbound_shipment_nbr
                   fetch first 1 rows only;
                --   dbms_output.put_line('  Found Shipment Name: ' || v_shipment_name);
               exception
                  when no_data_found then
                     v_shipment_name := null;
                    --  dbms_output.put_line('  No Shipment Name found for Shipment XID.');
               end;
            else
               v_shipment_name := null;
            end if;

             -- LOGIC: INSERT OR UPDATE BASED ON DATA SOURCE
            if v_inbound_shipment_nbr is not null then
               l_record_exists := false;
               l_existing_source := null;
               begin
                  select data_source
                    into l_existing_source
                    from xxotm_container_inventory_t
                   where 
                --    cust_nbr = v_cust_nbr
                --      and container_nbr = v_container_nbr
                inbound_shipment_nbr is not null
                     and
                      inbound_shipment_nbr = v_inbound_shipment_nbr
                   fetch first 1 rows only;
                  l_record_exists := true;
               exception
                  when no_data_found then
                     l_record_exists := false;
               end;

               if not l_record_exists then
                     -- INSERT
                  insert into xxotm_container_inventory_t (
                     inbound_order_nbr,
                     inbound_shipment_nbr,
                     shipment_name,
                     outbound_order_nbr,
                     outbound_shipment_nbr,
                     cust_nbr,
                     cust_name,
                     container_nbr,
                     container_type,
                     position,
                     booking_id,
                     container_stored_time,
                     container_released_time,
                     data_source,
                     order_type
                  ) values ( v_inbound_order_nbr,
                             v_inbound_shipment_nbr,
                             v_shipment_name,
                             v_outbound_order_nbr,
                             v_outbound_shipment_nbr,
                             v_cust_nbr,
                             v_cust_name,
                             v_container_nbr,
                             v_container_type,
                             v_position,
                             v_booking_id,
                             v_container_stored_time,
                             v_container_released_time,
                             'OTM',
                             v_order_type );
                  dbms_output.put_line('  Inserted new record (Source: OTM).');
               elsif
                  l_record_exists
                  and l_existing_source = 'OTM'
               then
                     -- UPDATE
                  update xxotm_container_inventory_t
                     set inbound_order_nbr = v_inbound_order_nbr,
                         shipment_name = v_shipment_name,
                         cust_name = v_cust_name,
                         container_type = v_container_type,
                         position = v_position,
                         booking_id = v_booking_id,
                         container_stored_time = v_container_stored_time,
                         container_released_time = v_container_released_time,
                         order_type = v_order_type
                   where cust_nbr = v_cust_nbr
                     and container_nbr = v_container_nbr
                     and inbound_shipment_nbr = v_inbound_shipment_nbr;
                --   dbms_output.put_line('  Updated existing OTM record.');
              
               end if;
           
            end if;
         end if; -- l_item is not null

      end loop; -- Items
   end loop; -- Pages

   dbms_output.put_line('XX_OTM_SYNC_ORDER_RELEASES Completed.');
exception
   when others then
      dbms_output.put_line('Error in XX_OTM_SYNC_ORDER_RELEASES: ' || sqlerrm);
end xx_otm_sync_order_releases;

-- PROCEDURE: XX_OTM_SYNC_ORDER_RELEASES_TEST

  CREATE OR REPLACE EDITIONABLE PROCEDURE XX_OTM_SYNC_ORDER_RELEASES_TEST (
   p_base_url     in varchar2,
   p_username     in varchar2,
   p_password     in varchar2,
   p_query_params in varchar2
) is
  
   l_full_url                varchar2(700);
   l_credentials             varchar2(200);
   l_encoded_cred            varchar2(400);
   l_response_clob           clob;
   jo                        json_object_t;
   l_links                   json_array_t;
   l_results                 json_array_t;
   l_next_page_url           varchar2(4000);
   l_params                  varchar2(4000);
   
   -- Variables for logic
   l_item                    json_object_t;
   l_refnums                 json_array_t;
   
   -- Flow control
   l_existing_source         varchar2(100);
   l_record_exists           boolean;
   
   -- Mapped Fields
   v_inbound_order_nbr       varchar2(100); -- orderReleaseXid
   v_order_type              varchar2(100); -- orderReleaseTypeGid
   v_inbound_shipment_nbr    varchar2(100); -- From XXOTM_ORDER_MOVEMENTS_T
   v_shipment_name           varchar2(100); -- From XXOTM_SHIPMENTS_T
   v_outbound_order_nbr      varchar2(100) := null;
   v_outbound_shipment_nbr   varchar2(100) := null;
   v_cust_nbr                varchar2(100); -- attribute2
   v_cust_name               varchar2(200); -- Refnum: cust_name
   v_container_nbr           varchar2(100); -- attribute3
   v_container_type          varchar2(50);  -- Refnum: NAQLEEN.CONTAINER_TYPE
   v_position                varchar2(100); -- Refnum: NAQLEEN.PARKING_SLOT
   v_booking_id              varchar2(100); -- Refnum: NAQLEEN.BOOKING_NO
   v_container_stored_time   timestamp with time zone; -- attributeDate1
   v_container_released_time timestamp with time zone; -- attributeDate2

   -- Helper for refnums
   function get_refnum (
      p_refs json_array_t,
      p_qual varchar2
   ) return varchar2 is
      l_qual varchar2(200);
      l_obj  json_object_t;
   begin
      if p_refs is null then
         return null;
      end if;
      for i in 0..p_refs.get_size() - 1 loop
         l_obj := treat(p_refs.get(i) as json_object_t);
           -- Defensive check
         if l_obj is not null then
            if l_obj.has('orderReleaseRefnumQualGid') then
               l_qual := l_obj.get_string('orderReleaseRefnumQualGid');
               if l_qual = p_qual then
                  return l_obj.get_string('orderReleaseRefnumValue');
               end if;
            end if;
         end if;
      end loop;
      return null;
   end;

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
         return to_timestamp_tz ( v_str,'YYYY-MM-DDTHH24:MI:SSFFTZH:TZM' );
      exception
         when others then
            null;
      end;
      begin
         return to_timestamp_tz ( v_str,'YYYY-MM-DDTHH24:MI:SSTZH:TZM' );
      exception
         when others then
            return null;
      end;
   end normalize_tstz;

begin
   dbms_output.put_line('Starting XX_OTM_SYNC_ORDER_RELEASES...');
   l_params := utl_url.escape(p_query_params);
   l_full_url := p_base_url
                 || '?'
                 || l_params;
   l_next_page_url := l_full_url;
   dbms_output.put_line('Initial URL: ' || l_full_url);
   l_credentials := p_username
                    || ':'
                    || p_password;
   l_encoded_cred := utl_raw.cast_to_varchar2(utl_encode.base64_encode(utl_raw.cast_to_raw(l_credentials)));

   while
      l_next_page_url is not null
      and lower(l_next_page_url) <> 'null'
   loop
      dbms_output.put_line('Fetching page: ' || l_next_page_url);
      
      -- Reset headers for each loop/call
      apex_web_service.g_request_headers.delete;
      apex_web_service.g_request_headers(1).name := 'Content-Type';
      apex_web_service.g_request_headers(1).value := 'application/json';
      apex_web_service.g_request_headers(2).name := 'Authorization';
      apex_web_service.g_request_headers(2).value := 'Basic ' || l_encoded_cred;
      begin
         l_response_clob := apex_web_service.make_rest_request(
            p_url         => l_next_page_url,
            p_http_method => 'GET',
            p_wallet_path => 'file:/u01/app/oracle/product/wallet'
         );
         dbms_output.put_line('API Response Length: ' || dbms_lob.getlength(l_response_clob));
      exception
         when others then
            dbms_output.put_line('API Call Failed: ' || sqlerrm);
            return;
      end;

      -- Defensive Parse
      begin
         jo := json_object_t.parse(l_response_clob);
      exception
         when others then
            dbms_output.put_line('JSON Parse Error: ' || sqlerrm);
            return;
      end;

      if jo is null then
         dbms_output.put_line('Parsed JSON Object is NULL');
         return;
      end if;

      -- Pagination Logic
      if
         jo.has('hasMore')
         and jo.get_boolean('hasMore')
      then
         if jo.has('links') then
            l_links := jo.get_array('links');
            l_next_page_url := null;
            if l_links is not null then
               for i in 0..l_links.get_size() - 1 loop
                  declare
                     li json_object_t := treat(l_links.get(i) as json_object_t);
                  begin
                     if
                        li is not null
                        and li.has('rel')
                        and li.get_string('rel') = 'next'
                     then
                        l_next_page_url := li.get_string('href');
                        exit;
                     end if;
                  end;
               end loop;
            end if;
         end if;
         dbms_output.put_line('Next page URL: ' || l_next_page_url);
      else
         l_next_page_url := null;
         dbms_output.put_line('No more pages or hasMore is false.');
      end if;

      if
         jo.has('items')
         and jo.get('items').is_array
      then
         l_results := json_array_t.parse(jo.get('items').to_clob());
         dbms_output.put_line('Items count in page: ' || l_results.get_size());
      else
         dbms_output.put_line('No items array found in response.');
         return;
      end if;

      -- Process Items
      for idx in 0..l_results.get_size() - 1 loop
         l_item := treat(l_results.get(idx) as json_object_t);
         if l_item is not null then
             -- 1. Inbound Order Nbr (XID)
            if l_item.has('orderReleaseXid') then
               v_inbound_order_nbr := l_item.get_string('orderReleaseXid');
            else
               v_inbound_order_nbr := null;
            end if;
             
             -- Order Type GID
--            if l_item.has('orderReleaseTypeGid') then
               v_order_type := l_item.get_string('orderReleaseTypeGid');
            

            dbms_output.put_line('Processing Order Release: ' || v_inbound_order_nbr||' '||v_order_type);
             
             -- 6. Customer Number (Attribute 2)
            if l_item.has('attribute2') then
               v_cust_nbr := regexp_replace(
                  l_item.get_string('attribute2'),
                  '^.*?\.',
                  ''
               );
            else
               v_cust_nbr := null;
            end if;
             
             -- 8. Container Number (Attribute 3)
            if l_item.has('attribute3') then
               v_container_nbr := l_item.get_string('attribute3');
            else
               v_container_nbr := null;
            end if;
             
             -- Dates - Defensive chaining
            v_container_stored_time := null;
            if l_item.has('attributeDate1') then
               declare
                  ad1_obj json_object_t := l_item.get_object('attributeDate1');
               begin
                  if
                     ad1_obj is not null
                     and ad1_obj.has('value')
                  then
                     v_container_stored_time := normalize_tstz(ad1_obj.get_string('value'));
                  end if;
               end;
            end if;

            v_container_released_time := null;
            if l_item.has('attributeDate2') then
               declare
                  ad2_obj json_object_t := l_item.get_object('attributeDate2');
               begin
                  if
                     ad2_obj is not null
                     and ad2_obj.has('value')
                  then
                     v_container_released_time := normalize_tstz(ad2_obj.get_string('value'));
                  end if;
               end;
            end if;
             
             -- Refnums Extraction - Defensive
            v_container_type := null;
            v_position := null;
            v_booking_id := null;
            v_cust_name := null;
            if l_item.has('refnums') then
               declare
                  r_sect json_object_t := l_item.get_object('refnums');
               begin
                  if
                     r_sect is not null
                     and r_sect.has('items')
                  then
                     l_refnums := r_sect.get_array('items');
                     v_container_type := get_refnum(
                        l_refnums,
                        'NAQLEEN.CONTAINER_TYPE'
                     );
                     v_position := get_refnum(
                        l_refnums,
                        'NAQLEEN.PARKING_SLOT'
                     );
                     v_booking_id := get_refnum(
                        l_refnums,
                        'NAQLEEN.BOOKING_NO'
                     );
                     v_cust_name := get_refnum(
                        l_refnums,
                        'NAQLEEN.CUS_NAME'
                     );
                  end if;
               end;
            end if;
             
             -- 2. Inbound Shipment Number via LOCAL TABLE
            if v_inbound_order_nbr is not null then
               begin
                  select regexp_replace(
                     shipment_xid,
                     '^.*?\.',
                     ''
                  )
                    into v_inbound_shipment_nbr
                    from xxotm_order_movements_t
                   where order_release_xid = v_inbound_order_nbr
                   fetch first 1 rows only;
                  dbms_output.put_line('  Found Inbound Shipment: ' || v_inbound_shipment_nbr);
               exception
                  when no_data_found then
                     v_inbound_shipment_nbr := null;
                     dbms_output.put_line('  No Inbound Shipment found for Order Release.');
               end;
            else
               v_inbound_shipment_nbr := null;
            end if;
             
             -- 3. Shipment Name via LOCAL TABLE
            if v_inbound_shipment_nbr is not null then
               begin
                  select shipment_name
                    into v_shipment_name
                    from xxotm_shipments_t
                   where shipment_xid = v_inbound_shipment_nbr
                   fetch first 1 rows only;
                  dbms_output.put_line('  Found Shipment Name: ' || v_shipment_name);
               exception
                  when no_data_found then
                     v_shipment_name := null;
                     dbms_output.put_line('  No Shipment Name found for Shipment XID.');
               end;
            else
               v_shipment_name := null;
            end if;

             -- LOGIC: INSERT OR UPDATE BASED ON DATA SOURCE
            if v_inbound_shipment_nbr is not null then
               l_record_exists := false;
               l_existing_source := null;
               begin
                  select data_source
                    into l_existing_source
                    from xxotm_container_inventory_t
                   where 
                --    cust_nbr = v_cust_nbr
                --      and container_nbr = v_container_nbr
                inbound_shipment_nbr is not null
                     and
                      inbound_shipment_nbr = v_inbound_shipment_nbr
                   fetch first 1 rows only;
                  l_record_exists := true;
               exception
                  when no_data_found then
                     l_record_exists := false;
               end;

               if not l_record_exists then
                     -- INSERT
                  insert into xxotm_container_inventory_t (
                     inbound_order_nbr,
                     inbound_shipment_nbr,
                     shipment_name,
                     outbound_order_nbr,
                     outbound_shipment_nbr,
                     cust_nbr,
                     cust_name,
                     container_nbr,
                     container_type,
                     position,
                     booking_id,
                     container_stored_time,
                     container_released_time,
                     data_source,
                     order_type
                  ) values ( v_inbound_order_nbr,
                             v_inbound_shipment_nbr,
                             v_shipment_name,
                             v_outbound_order_nbr,
                             v_outbound_shipment_nbr,
                             v_cust_nbr,
                             v_cust_name,
                             v_container_nbr,
                             v_container_type,
                             v_position,
                             v_booking_id,
                             v_container_stored_time,
                             v_container_released_time,
                             'OTM',
                             v_order_type );
                  dbms_output.put_line('  Inserted new record (Source: OTM).');
               elsif
                  l_record_exists
                  and l_existing_source = 'OTM'
               then
                     -- UPDATE
                  update xxotm_container_inventory_t
                     set inbound_order_nbr = v_inbound_order_nbr,
                         shipment_name = v_shipment_name,
                         cust_name = v_cust_name,
                         container_type = v_container_type,
                         position = v_position,
                         booking_id = v_booking_id,
                         container_stored_time = v_container_stored_time,
                         container_released_time = v_container_released_time,
                         order_type = v_order_type
                   where cust_nbr = v_cust_nbr
                     and container_nbr = v_container_nbr
                     and inbound_shipment_nbr = v_inbound_shipment_nbr;
                  dbms_output.put_line('  Updated existing OTM record.');
               else
                     -- SKIP
                  dbms_output.put_line('  Record exists with Source: '
                                       || l_existing_source
                                       || '. Skipping update.');
               end if;
            else
               dbms_output.put_line('  Skipping action due to missing shipment number.');
            end if;
         end if; -- l_item is not null

      end loop; -- Items
   end loop; -- Pages

   dbms_output.put_line('XX_OTM_SYNC_ORDER_RELEASES Completed.');
exception
   when others then
      dbms_output.put_line('Error in XX_OTM_SYNC_ORDER_RELEASES: ' || sqlerrm);
end xx_otm_sync_order_releases_test;

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
   v_associated_role varchar2(4000); -- Increased size

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
         
         -- Admin specific logic: Add 'role' field referencing other roles
         if v_role = 'ADMIN' then
             begin
                select listagg(role, ',') within group (order by role) 
                  into v_associated_role
                  from xx_role_config
                 where screen_path = rec.screen_path
                   and role <> 'ADMIN';
             exception
                when no_data_found then
                   v_associated_role := null;
             end;
             
             if v_associated_role is not null then
                 apex_json.write('role', v_associated_role);
             end if;
         end if;

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