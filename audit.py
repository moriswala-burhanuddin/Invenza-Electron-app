import re

def analyze_db_cjs():
    issues = set()
    try:
        with open(r'd:\paid-erp\invenza-erp\electron\db.cjs', 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                if 'db.prepare(' in line and '`' in line and '${' in line:
                    if 'generate_id' not in line and 'status' not in line: # rough heuristic
                        issues.add(f"SQL Injection risk (String interpolation in query) at line {i+1}: {line.strip()}")
                
                if 'password' in line.lower() and ('hardcode' in line.lower() or "='123" in line.replace(' ', '')):
                    issues.add(f"Hardcoded secret/password at line {i+1}: {line.strip()}")
                    
    except Exception as e:
        print("db.cjs error", e)
    return list(issues)

def analyze_main_cjs():
    issues = set()
    try:
        with open(r'd:\paid-erp\invenza-erp\electron\main.cjs', 'r', encoding='utf-8') as f:
            for i, line in enumerate(f.readlines()):
                if 'nodeIntegration: true' in line:
                    issues.add(f"Security: nodeIntegration is true at line {i+1}")
                if 'contextIsolation: false' in line:
                    issues.add(f"Security: contextIsolation is false at line {i+1}")
    except:
        pass
    return list(issues)

import json
print("DB.CJS:", json.dumps(analyze_db_cjs()[:5], indent=2))
print("MAIN.CJS:", json.dumps(analyze_main_cjs(), indent=2))
