schema_name : XXOTM
tables : [XXOTM_CONTAINER_INSPECTION_T, XXOTM_SHIPMENTS_T, XXOTM_DRIVER_VEHICLE_MASTER_T]
join_logic : join using container_nbr in XXOTM_CONTAINER_INSPECTION_T and cont_no in XXOTM_SHIPMENTS_T then power_unit in XXOTM_SHIPMENTS_T and vehicle_xid in XXOTM_DRIVER_VEHICLE_MASTER_T
request_structure :
type : query_params
example : {"container_nbr" : "MSKA1234651"}
response_requirements: 
   {
    "response_code": 200,
    "response_message": "Success",
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

json_key_mapping : 
for json key mapping get container_nbr as container_number, shipment_nbr as shipment_number, timestamp as inspected_time, inspection_details (clob) as inspection_details(json array) from XXOTM_CONTAINER_INSPECTION_T and container_type as container_type, power_unit as truck_number, liner_name as liner from XXOTM_SHIPMENTS_T and driver_name as driver_name, driver_xid as iqama_number from XXOTM_DRIVER_VEHICLE_MASTER_T

additional_instructions:
for urls in images array 
add the url https://otmgtm-test-naqleen.otmgtm.me-jeddah-1.ocs.oraclecloud.com:443/logisticsRestApi/resources-int/v2/documents?q=ownerObjectGid eq "NAQLEEN.<shipment_nbr>" for now








ROLE:
You are a Senior UI/UX Designer and 3D Visualization Engineer with 10+ years of experience in
large-scale logistics platforms, Inland Container Depots (ICD), Terminal Operating Systems (TOS),
and Web-based 3D yard visualization.

CONTEXT:
An image is attached that represents the complete master layout of an ICD terminal.
The ICD layout is logically divided into two halves:
- The RIGHT HALF of the ICD layout has already been fully implemented in a 3D yard view.
- The LEFT HALF of the ICD layout is NOT yet implemented and must now be completed.

TASK OBJECTIVES:
1. Perform a **detailed and accurate OCR + spatial interpretation** of the attached ICD layout image.
2. Understand the layout requirements from below Layout Requirements Section.
3. Identify all visible elements in the LEFT HALF (TRL terminal) of the layout, including:
   - Container blocks
   - Lot / yard block identifiers
   - Roadways, lanes.
   - Orientation and alignment relative to the RIGHT HALF

4. Continue the **3D implementation of the LEFT HALF ONLY**, strictly following:
   - The same visual language
   - Scale, spacing, orientation, and block proportions
   - Functional behavior and interaction patterns
   already used in the RIGHT HALF implementation.

LAYOUT REQUIREMENTS:
1. 

CRITICAL CONSTRAINTS:
- ❌ Do NOT modify, refactor, or visually disturb the RIGHT HALF of the ICD layout.
- ❌ Do NOT introduce new design patterns, colors, or interactions.
- ✔ The LEFT HALF must feel like a seamless continuation of the existing 3D yard.

LAYOUT CORRECTIONS & STANDARDIZATION:
- The layout image contains **known errors in Block A lot numbering**.
- Correct this by:
  - Renumbering Block A lots sequentially from LEFT to RIGHT.
  - Ensure continuity across BOTH Block A sections.
- Add **missing lot numbers** for all other blocks visible in the LEFT HALF:
  - Follow the same numbering logic, orientation, and formatting used in the RIGHT HALF.
  - Maintain consistency in font size, placement, and readability.

IMPLEMENTATION GUIDELINES:
- Preserve real-world terminal realism (industrial, operational, non-gaming).
- Move the Gates and left Fencing to left end
- Any assumptions must be derived strictly from the image layout (no hallucinated zones).

OUTPUT EXPECTATION:
Provide:
1. A structured explanation of the LEFT HALF layout interpretation.
2. A corrected and standardized block + lot numbering scheme.
3. Clear implementation guidance suitable for direct translation into a 3D yard rendering system
   (e.g., Three.js).
4. Explicit confirmation that RIGHT HALF functionality and visuals remain unchanged.

IMPORTANT:
Base all decisions strictly on the attached layout image.
If any element is ambiguous, clearly flag it instead of guessing.
