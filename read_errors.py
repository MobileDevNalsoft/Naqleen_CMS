import os

file_path = r'd:\Madhan_Projects\naqleen-otm-react\errors.log'
if os.path.exists(file_path):
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Try to decode from UTF-16LE, then UTF-8
        try:
            decoded = content.decode('utf-16le')
        except UnicodeDecodeError:
            decoded = content.decode('utf-8', errors='replace')
            
        print(decoded)
    except Exception as e:
        print(f"Error reading file: {e}")
else:
    print("File not found.")
