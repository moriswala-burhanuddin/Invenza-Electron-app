import re

with open('invenza-website/backend/erp_core/models.py', 'r', encoding='utf-8') as f:
    models_text = f.read()
with open('invenza-website/backend/erp_core/views.py', 'r', encoding='utf-8') as f:
    views_text = f.read()

models = re.findall(r'class ([A-Za-z0-9_]+)\(SyncableModel\):\n([\s\S]*?)(?=class |$)', models_text)

missing_models = []
pull_code = []
push_code = []

def to_snake(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

for model_name, body in models:
    if f'{model_name}.objects.update_or_create' not in views_text and f'safe_values({model_name})' not in views_text:
        if model_name in ['ERPUserPermission', 'UserStore', 'Setting']:
            continue
        missing_models.append(model_name)
        
        snake = to_snake(model_name)
        pull_code.append(f'        {snake}_data = safe_values({model_name})')
        pull_code.append(f'                "{snake}s": {snake}_data,')
        
        fields = re.findall(r'    ([a-z_0-9]+)\s*=\s*models\.', body)
        
        defaults_str = ''
        for f in fields:
            if f in ['id', 'company', 'created_at', 'updated_at', 'sync_status', 'is_deleted']:
                continue
            defaults_str += f"\n                                '{f}': row.get('{f}'),"

        block = f'''
                # ── PUSH {model_name.upper()} ──────────────────────────────────────
                {snake}_payload = payload.get('{snake}s', [])
                for row in {snake}_payload:
                    obj_id = row.get('id')
                    try:
                        {model_name}.objects.update_or_create(
                            id=obj_id, company=company,
                            defaults={{{defaults_str}
                                'sync_status': 1,
                            }}
                        )
                        synced.setdefault('{snake}s', []).append(obj_id)
                    except Exception: pass
'''
        push_code.append(block)

with open('missing-sync.txt', 'w', encoding='utf-8') as f:
    f.write('PULL:\\n' + '\\n'.join(pull_code) + '\\n\\nPUSH:\\n' + ''.join(push_code))
print(f'Generated sync code for {len(missing_models)} models.')
