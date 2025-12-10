schema_name : XXOTM
tables : [XXOTM_CONTAINER_INSPECTION_T, XXOTM_SHIPMENTS_T, XXOTM_DRIVER_VEHICLE_MASTER_T]
join_logic : join using container_nbr in XXOTM_CONTAINER_INSPECTION_T and cont_no in XXOTM_SHIPMENTS_T then power_unit in XXOTM_SHIPMENTS_T and vehicle_xid in XXOTM_DRIVER_VEHICLE_MASTER_T
request_structure :
type : query_params
example : {"container_nbr" : "MSKA1234651"}
response_requirements: 
   {
    "response_message": "Success",
    "response_code": 200,
    "data": {
        "contianer_number": "string",
        "shipment_number": "string",
        "container_type": "string",
        "truck_number": "string",
        "liner": "string",
        "driver_name": "string",
        "iqama_number": "string",
        "inspected_time": "2024-06-01T12:00:00Z",
        "images": [
            "url1",
            "url2"
        ],
        "inspection_details": [],
    }
}

module_name : otm_mobile
endpoint_name : getInspectedContainers
http_method: GET

for json key mapping get container_nbr as container_number, shipment_nbr as shipment_number, timestamp as inspected_time, inspection_details (clob) as inspection_details(json array) from XXOTM_CONTAINER_INSPECTION_T and container_type as container_type, power_unit as truck_number, liner_name as liner from XXOTM_SHIPMENTS_T and driver_name as driver_name, driver_xid as iqama_number from XXOTM_DRIVER_VEHICLE_MASTER_T


for urls in images array 
add the url https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/documents?q=ownerObjectGid eq "NAQLEEN.<shipment_nbr>" for now

considering the api_automation_prompt.json as a system instructions to you and inject the above details into it then create api using mcp tool otm_execute_sql