// server.js - ỨNG DỤNG MỤC TIÊU (cố ý chứa lỗ hổng) cho Lab 9 - Đánh giá ATTT
// CHỈ dùng để thực hành đánh giá trên localhost. KHÔNG dùng cách viết này cho app thật.
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 9090;
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, email TEXT);`);
const seed = db.prepare('INSERT INTO users (username,password,role,email) VALUES (?,?,?,?)');
seed.run('user1', 'Pass123', 'user', 'user1@example.com');
seed.run('alice', 'Alice456', 'user', 'alice@example.com');
seed.run('admin', 'Admin@secret', 'admin', 'admin@example.com');

function layout(title, body) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <link rel="stylesheet" href="/style.css"></head><body><main class="card">${body}</main></body></html>`;
}

app.get('/', (req, res) => res.send(layout('TargetApp', `
  <h1>TargetApp (ứng dụng mục tiêu)</h1>
  <p class="subtitle">Dùng để thực hành đánh giá ATTT – Lab 9</p>
  <nav class="menu"><a href="/login">Đăng nhập</a><a href="/search">Tìm kiếm</a><a href="/admin">Trang admin</a></nav>
  <p class="muted">Tài khoản: user1/Pass123 · admin/Admin@secret</p>`)));

// ---- LỖ HỔNG 1: SQL Injection (nối chuỗi) ----
app.get('/login', (req, res) => res.send(layout('Login', `
  <h1>Đăng nhập</h1>
  <form method="POST" action="/login">
    <label>Username</label><input name="username">
    <label>Password</label><input name="password" type="password">
    <button>Đăng nhập</button>
  </form>`)));
app.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  try {
    const row = db.prepare(sql).get();
    if (row) {
      // ---- LỖ HỔNG 3: Session/Auth yếu - vai trò đặt trong cookie, không ký, không HttpOnly ----
      res.cookie('auth', `${row.username}:${row.role}`, { httpOnly: false });
      return res.send(layout('OK', `<h1>Xin chào ${row.username}</h1>
        <p class="ok">Đăng nhập thành công (role=${row.role}).</p>
        <p>Cookie auth = <code>${row.username}:${row.role}</code></p><a href="/admin">Vào trang admin</a>`));
    }
    res.send(layout('Fail', `<h1>Đăng nhập</h1><p class="fail">Sai thông tin.</p><a href="/login">Thử lại</a>`));
  } catch (e) {
    res.send(layout('Err', `<h1>Lỗi SQL</h1><pre>${e.message}</pre><p class="muted">${sql}</p>`));
  }
});

// ---- LỖ HỔNG 2: Reflected XSS (không mã hoá đầu ra) ----
app.get('/search', (req, res) => {
  const q = req.query.q;
  res.send(layout('Search', `
    <h1>Tìm kiếm</h1>
    <form method="GET"><input name="q" placeholder="Từ khoá"><button>Tìm</button></form>
    ${q !== undefined ? `<p>Kết quả cho: ${q}</p>` : ''}`));
});

// ---- LỖ HỔNG 4: Broken Access Control - /admin không kiểm tra đăng nhập đúng cách ----
app.get('/admin', (req, res) => {
  // chỉ xem cookie auth có chứa "admin" hay không -> dễ giả mạo
  const auth = req.cookies.auth || '';
  if (!auth.includes(':admin')) {
    return res.send(layout('Admin', `<h1>Khu vực admin</h1>
      <p class="fail">Cần quyền admin. (Cookie hiện tại: ${auth || 'trống'})</p><a href="/login">Đăng nhập</a>`));
  }
  const rows = db.prepare('SELECT id,username,role,email FROM users').all();
  res.send(layout('Admin', `<h1>Bảng điều khiển ADMIN</h1>
    <p class="ok">Truy cập admin thành công.</p>
    <table border=1 cellpadding=6><tr><th>id</th><th>user</th><th>role</th><th>email</th></tr>
    ${rows.map(u => `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.role}</td><td>${u.email}</td></tr>`).join('')}</table>`));
});

// ---- LỖ HỔNG 5: IDOR - xem hồ sơ người khác chỉ bằng đổi id ----
app.get('/api/profile', (req, res) => {
  const id = req.query.id || 1;
  const row = db.prepare('SELECT id,username,role,email FROM users WHERE id=?').get(id);
  res.json(row || {});
});

app.listen(PORT, () => console.log(`TargetApp (có lỗ hổng) chạy tại http://localhost:${PORT}`));
