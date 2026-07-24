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
    "pages/Portal/Dashboard.tsx": "",
    "pages/Portal/Pricing.tsx": "",
    "pages/Portal/Settings.tsx": ""
}

print(f"Reading {transcript_path}...")
file_contents = {k: "" for k in files_to_recover}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            # Check tool responses for view_file
            if entry.get("type") == "TOOL_RESPONSE" and "content" in entry:
                content = entry["content"]
                if "File Path: `file:///" in content:
                    for fname in files_to_recover.keys():
                        norm_fname = fname.replace("/", "\\")
                        if norm_fname in content:
                            # Extract lines from "The following code has been modified" to "The above content"
                            parts = content.split("The following code has been modified")
                            if len(parts) > 1:
                                lines_part = parts[1].split("The above content")[0]
                                lines = lines_part.strip().split("\n")[1:] # skip the explanatory sentence
                                reconstructed = []
                                for l in lines:
                                    if ": " in l:
                                        reconstructed.append(l.split(": ", 1)[1])
                                file_contents[fname] = "\n".join(reconstructed)
                                print(f"Recovered {fname} from view_file")
        except Exception as e:
            pass

for fname, content in file_contents.items():
    if content:
        out_path = os.path.join(target_dir, fname.replace("/", "\\"))
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Saved {fname}")
    else:
        print(f"Could not find view_file output for {fname}")

print("Done")
