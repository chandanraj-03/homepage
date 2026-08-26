"""
Script to upload media assets to Supabase Storage.
Creates the public 'assets' bucket (if not already existing) and uploads images and videos.
"""

import os
import mimetypes
import urllib.request
import urllib.parse
import json
import ssl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE = os.path.abspath(os.path.join(BASE_DIR, ".."))
FRONTEND_DIR = os.path.join(WORKSPACE, "frontend")

# Load environment variables from .env
env_file = os.path.join(WORKSPACE, ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
API_KEY = os.environ.get("SUPABASE_KEY", "")
BUCKET = "assets"

MEDIA_EXTS = {".png", ".jpg", ".jpeg", ".mp4", ".webp", ".svg", ".gif", ".ico"}

def upload_file(local_path: str, remote_path: str):
    mime_type, _ = mimetypes.guess_type(local_path)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    with open(local_path, "rb") as f:
        file_bytes = f.read()
    
    encoded_remote_path = urllib.parse.quote(remote_path.replace("\\", "/"))
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{encoded_remote_path}"
    
    headers = {
        "apikey": API_KEY,
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": mime_type,
        "x-upsert": "true"
    }
    
    req = urllib.request.Request(url, data=file_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{remote_path.replace(chr(92), '/')}"
            print(f" [OK {resp.status}] Uploaded {remote_path} ({len(file_bytes):,} bytes)")
            return public_url
    except urllib.error.HTTPError as e:
        print(f" [FAIL] {remote_path}: HTTP {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f" [ERROR] {remote_path}: {e}")
    return None

def upload_all_assets():
    print(f"Uploading assets to Supabase Storage bucket '{BUCKET}'...")
    uploaded = {}
    
    for root, _, files in os.walk(FRONTEND_DIR):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in MEDIA_EXTS:
                full_path = os.path.join(root, file)
                rel_to_frontend = os.path.relpath(full_path, FRONTEND_DIR).replace("\\", "/")
                
                # Upload root files directly (e.g. logo.png, retry.mp4)
                purl = upload_file(full_path, rel_to_frontend)
                if purl:
                    uploaded[rel_to_frontend] = purl
                
                # If in assets/features/..., also upload under features/...
                if rel_to_frontend.startswith("assets/"):
                    trimmed_path = rel_to_frontend[len("assets/"):]
                    upload_file(full_path, trimmed_path)

    print("\n" + "=" * 60)
    print(" Upload Completed Successfully!")
    print("=" * 60)
    for path, url in uploaded.items():
        print(f" - {path} -> {url}")

if __name__ == "__main__":
    upload_all_assets()
