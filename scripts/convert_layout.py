import json
import os

INPUT_FILE = 'public/naqleen_icds.json'
OUTPUT_FILE = 'public/dynamic_icds.json'

def convert():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found")
        return

    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    new_icds = {}

    for icd_key, icd_data in data.get('icds', {}).items():
        print(f"Processing {icd_key}...")
        
        # 1. Extract metadata
        icd_info = icd_data.get('icd_info', {})
        terminal_types = icd_data.get('terminal_types', {})
        
        # 2. Flatten entities
        entities = []
        
        def flatten_recursive(obj):
            if isinstance(obj, list):
                for item in obj:
                    flatten_recursive(item)
            elif isinstance(obj, dict):
                # Check if it looks like an entity (has position or corner_points)
                # And usually has an id and type
                if 'id' in obj and 'type' in obj and ('position' in obj or 'corner_points' in obj):
                    entity = obj.copy()
                    
                    # Merge properties from terminal_types based on type
                    type_def = terminal_types.get(entity['type'], {})
                    
                    # Create props object
                    props = {}
                    
                    # Transfer color/opacity/description from type def if not present
                    if 'color' in type_def: props['color'] = type_def['color']
                    if 'opacity' in type_def: props['opacity'] = type_def['opacity']
                    
                    # Transfer entity specific fields to props
                    # We keep id, type, position, rotation, dimensions at root for standard
                    # Everything else goes to props
                    
                    root_keys = ['id', 'type', 'position', 'rotation', 'dimensions', 'corner_points']
                    for key, value in entity.items():
                        if key not in root_keys:
                            props[key] = value
                    
                    # Clean entity
                    new_entity = {k: entity[k] for k in root_keys if k in entity}
                    new_entity['props'] = props
                    
                    entities.append(new_entity)
                else:
                    # Recurse deeper
                    for key, value in obj.items():
                        flatten_recursive(value)

        flatten_recursive(icd_data.get('terminals', {}))
        new_icds[icd_key] = {
            "id": icd_data.get('id', icd_key),
            **icd_info,
            "entities": entities
        }

    output_data = {
        "version": "3.0",
        "icds": new_icds
    }

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Successfully created {OUTPUT_FILE} with {len(new_icds)} ICDs")

if __name__ == "__main__":
    convert()
