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
        
        # Match fields taking care of ForeignKeys
        lines = body.split('\n')
        defaults_str = ''
        for line in lines:
            if '=' not in line or 'models.' not in line:
                continue
            match = re.search(r'    ([a-z_0-9]+)\s*=\s*models\.', line)
            if match:
                f = match.group(1)
                if f in ['id', 'company', 'created_at', 'updated_at', 'sync_status', 'is_deleted']:
                    continue
                
                if 'ForeignKey' in line or 'OneToOneField' in line:
                    defaults_str += f"\n                                '{f}_id': row.get('{f}_id'),"
                else:
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


# Now inject into views_text
# 1. PULL
target_pull = 'salepay_data    = safe_values(SalePayment)'
pull_injection = '\n'.join(pull_code[0::2]) # Just the data fetch
views_text = views_text.replace(target_pull, target_pull + '\n' + pull_injection)

target_pull_dict = 'sale_payments":   salepay_data,'
pull_dict_injection = '\n'.join(pull_code[1::2]) # Just the dict entries
views_text = views_text.replace(target_pull_dict, target_pull_dict + '\n' + pull_dict_injection)

# 2. PUSH
target_push = "synced.setdefault('sale_payments', []).append(obj_id)\n                    except Exception: pass"
push_injection = ''.join(push_code)
views_text = views_text.replace(target_push, target_push + '\n' + push_injection)

with open('invenza-website/backend/erp_core/views.py', 'w', encoding='utf-8') as f:
    f.write(views_text)

print(f'Successfully injected {len(missing_models)} models into views.py.')
