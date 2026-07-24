import json
import os
import sys

transcript_path = r"C:\Users\ADMIN\.gemini\antigravity-ide\brain\cbefb4a3-587c-472a-b47c-e4e55bff7e87\.system_generated\logs\transcript_full.jsonl"
target_dir = r"D:\paid-erp\invenza-erp\invenza-website\frontend\src"

files_to_recover = {
    "App.tsx": "",
    "main.tsx": "",
    "pages/Auth/Signup.tsx": "",
    "pages/Auth/Login.tsx": "",
    "pages/Auth/ForgotPassword.tsx": "",
    "pages/Auth/ResetPassword.tsx": "",
    "pages/Auth/VerifyEmail.tsx": "",
    "pages/Portal/Dashboard.tsx": "",
    "pages/Portal/Pricing.tsx": "",
    "pages/Portal/Settings.tsx": ""
}

print(f"Reading {transcript_path}...")

# Read the file backwards or keep the latest content
file_contents = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("type") == "PLANNER_RESPONSE" and "tool_calls" in entry:
                for tool_call in entry["tool_calls"]:
                    name = tool_call.get("name")
                    args = tool_call.get("args", {})
                    
                    target_file = args.get("TargetFile", "")
                    if not target_file:
                        continue
                        
                    target_file = target_file.replace("\\\\", "\\").replace('"', '')
                    
                    for fname in files_to_recover.keys():
                        if fname.replace("/", "\\") in target_file:
                            if name == "write_to_file":
                                file_contents[fname] = args.get("CodeContent", "")
                                print(f"Found write_to_file for {fname}")
                            elif name == "replace_file_content" or name == "multi_replace_file_content":
                                # We could try to apply diffs, but usually write_to_file has the full code
                                pass
        except Exception as e:
            pass

for fname, content in file_contents.items():
    if content:
        out_path = os.path.join(target_dir, fname.replace("/", "\\"))
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf-8') as f:
            # Strip extra quotes if it's stringified
            if content.startswith('"') and content.endswith('"'):
                # it's JSON encoded
                try:
                    content = json.loads(content)
                except:
                    pass
            f.write(content)
        print(f"Recovered {fname}")
    else:
        print(f"Could not find full content for {fname}")

print("Done")
