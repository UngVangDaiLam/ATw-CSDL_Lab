// server.js - Lab 8: Ứng dụng web an toàn (gộp các biện pháp bảo mật)
// Biện pháp: (1) XSS escaping  (2) SQLi: prepared statement  (3) CSRF token
//            (4) MFA/OTP (TOTP - Google Authenticator)  (5) HTTPS  (6) bcrypt + salt
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const otplib = require('otplib');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 8443;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'strict', secure: true }, // (5) cookie chỉ qua HTTPS
}));

// ---------- CSDL (SQLite) ----------
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, pass_hash TEXT, totp_secret TEXT);
         CREATE TABLE comments (id INTEGER PRIMARY KEY, author TEXT, content TEXT);`);

// (6) Băm mật khẩu bằng bcrypt + salt khi tạo tài khoản mẫu
(function seed() {
  const secret = otplib.generateSecret();
  const hash = bcrypt.hashSync('Pass123!', 10); // 10 = cost; bcrypt tự sinh salt
  db.prepare('INSERT INTO users (username, pass_hash, totp_secret) VALUES (?, ?, ?)')
    .run('user1', hash, secret);
})();

// ---------- Tiện ích ----------
// (1) Mã hoá HTML đầu ra (chống XSS) - tương đương htmlspecialchars
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// (3) CSRF: sinh token theo phiên, nhúng vào form, xác minh khi POST
function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}
function checkCsrf(req, res, next) {
  if (!req.body._csrf || req.body._csrf !== req.session.csrf)
    return res.status(403).send(pageMsg('Bị chặn CSRF', 'Token CSRF không hợp lệ hoặc thiếu. Yêu cầu bị từ chối.', 'fail'));
  next();
}

function layout(title, body) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
  <link rel="stylesheet" href="/style.css"></head><body><main class="card">${body}</main></body></html>`;
}
function pageMsg(title, msg, type) {
  return layout(title, `<h1>${esc(title)}</h1><p class="msg ${type}">${esc(msg)}</p><p><a href="/">← Trang chủ</a></p>`);
}

// ---------- Trang chủ ----------
app.get('/', (req, res) => {
  const u = req.session.user;
  res.send(layout('Lab 8 – App an toàn', `
    <h1>Lab 8 – Ứng dụng web an toàn</h1>
    <p class="subtitle">Tài khoản demo: <b>user1 / Pass123!</b> (có bật MFA)</p>
    <p class="status">${u ? `Đang đăng nhập: <b>${esc(u)}</b> · <a href="/logout">Đăng xuất</a>` : 'Chưa đăng nhập'}</p>
    <nav class="menu">
      <a href="/login">Đăng nhập</a>
      <a href="/register">Đăng ký</a>
      <a href="/comments">Bình luận</a>
    </nav>
    <ul class="features">
      <li>✔ Mật khẩu băm bcrypt + salt</li>
      <li>✔ Chống SQL Injection (prepared statement)</li>
      <li>✔ Chống XSS (mã hoá đầu ra)</li>
      <li>✔ CSRF token trên mọi form</li>
      <li>✔ MFA bằng OTP (Google Authenticator)</li>
      <li>✔ HTTPS + cookie HttpOnly/Secure/SameSite</li>
    </ul>`));
});

// ---------- Đăng ký ----------
app.get('/register', (req, res) => {
  res.send(layout('Đăng ký', `
    <h1>Đăng ký</h1>
    <form method="POST" action="/register">
      <input type="hidden" name="_csrf" value="${csrfToken(req)}">
      <label>Username</label><input name="username" required>
      <label>Password</label><input name="password" type="password" required>
      <button>Tạo tài khoản</button>
    </form><p><a href="/">← Trang chủ</a></p>`));
});
app.post('/register', checkCsrf, (req, res) => {
  const { username = '', password = '' } = req.body;
  if (username.trim().length < 3 || password.length < 6)
    return res.send(pageMsg('Đăng ký', 'Username ≥ 3 ký tự và password ≥ 6 ký tự.', 'fail'));
  try {
    const secret = otplib.generateSecret();
    const hash = bcrypt.hashSync(password, 10); // (6) băm + salt
    // (2) prepared statement -> chống SQLi
    db.prepare('INSERT INTO users (username, pass_hash, totp_secret) VALUES (?, ?, ?)').run(username, hash, secret);
    res.send(pageMsg('Đăng ký thành công', `Đã tạo tài khoản "${username}". Mật khẩu được lưu dạng băm bcrypt.`, 'ok'));
  } catch (e) {
    res.send(pageMsg('Đăng ký', 'Username đã tồn tại.', 'fail'));
  }
});

// ---------- Đăng nhập (bước 1: mật khẩu) ----------
app.get('/login', (req, res) => {
  res.send(layout('Đăng nhập', `
    <h1>Đăng nhập</h1>
    <form method="POST" action="/login">
      <input type="hidden" name="_csrf" value="${csrfToken(req)}">
      <label>Username</label><input name="username" required>
      <label>Password</label><input name="password" type="password" required>
      <button>Tiếp tục</button>
    </form>
    <p class="hint">Thử SQLi: nhập <code>' OR '1'='1</code> vào ô Username.</p>
    <p><a href="/">← Trang chủ</a></p>`));
});
app.post('/login', checkCsrf, (req, res) => {
  const { username = '', password = '' } = req.body;
  // (2) prepared statement: dữ liệu truyền qua ? -> ' OR '1'='1 vô hại
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  // (6) so khớp bằng bcrypt.compare (không so sánh chuỗi thô)
  if (!row || !bcrypt.compareSync(password, row.pass_hash))
    return res.send(pageMsg('Đăng nhập', 'Sai username hoặc mật khẩu.', 'fail'));
  // Mật khẩu đúng -> (4) yêu cầu bước OTP
  req.session.pending = row.username;
  res.redirect('/otp');
});

// ---------- Đăng nhập (bước 2: OTP / MFA) ----------
app.get('/otp', (req, res) => {
  if (!req.session.pending) return res.redirect('/login');
  res.send(layout('Xác thực OTP', `
    <h1>Xác thực 2 lớp (OTP)</h1>
    <p class="subtitle">Nhập mã 6 số từ Google Authenticator cho <b>${esc(req.session.pending)}</b>.</p>
    <form method="POST" action="/otp">
      <input type="hidden" name="_csrf" value="${csrfToken(req)}">
      <label>Mã OTP</label><input name="otp" inputmode="numeric" required>
      <button>Xác thực</button>
    </form><p><a href="/qr">Xem mã QR để thêm vào Google Authenticator</a></p>`));
});
app.post('/otp', checkCsrf, (req, res) => {
  const user = req.session.pending;
  if (!user) return res.redirect('/login');
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(user);
  const ok = otplib.verifySync({ token: String(req.body.otp || ''), secret: row.totp_secret }).valid;
  if (!ok) return res.send(pageMsg('OTP', 'Mã OTP không đúng hoặc đã hết hạn.', 'fail'));
  req.session.user = user;
  delete req.session.pending;
  res.send(pageMsg('Thành công', `Đăng nhập hoàn tất (đã qua MFA). Xin chào ${user}!`, 'ok'));
});

// Mã QR để nạp secret vào Google Authenticator (chỉ cho tài khoản đang chờ, demo)
app.get('/qr', async (req, res) => {
  const user = req.session.pending || 'user1';
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(user);
  const uri = otplib.generateURI({ secret: row.totp_secret, label: user, issuer: 'Lab8Demo' });
  const img = await QRCode.toDataURL(uri);
  res.send(layout('QR OTP', `<h1>Quét bằng Google Authenticator</h1>
    <img src="${img}" alt="QR" style="width:200px"><p class="muted">Secret: ${esc(row.totp_secret)}</p>
    <p><a href="/otp">← Nhập OTP</a></p>`));
});

// ---------- Bình luận (demo XSS + SQLi) ----------
app.get('/comments', (req, res) => {
  const rows = db.prepare('SELECT * FROM comments ORDER BY id DESC').all();
  const list = rows.map(c =>
    // (1) esc() -> script trong bình luận chỉ hiển thị dạng chữ, không chạy
    `<li><b>${esc(c.author)}</b>: ${esc(c.content)}</li>`).join('') || '<li class="muted">Chưa có bình luận.</li>';
  res.send(layout('Bình luận', `
    <h1>Bình luận</h1>
    <form method="POST" action="/comments">
      <input type="hidden" name="_csrf" value="${csrfToken(req)}">
      <label>Tên</label><input name="author" required>
      <label>Nội dung</label><input name="content" required>
      <button>Gửi</button>
    </form>
    <p class="hint">Thử XSS: nhập <code>&lt;script&gt;alert('XSS')&lt;/script&gt;</code> vào nội dung.</p>
    <ul class="comments">${list}</ul><p><a href="/">← Trang chủ</a></p>`));
});
app.post('/comments', checkCsrf, (req, res) => {
  const { author = '', content = '' } = req.body;
  // (2) prepared statement khi ghi vào CSDL
  db.prepare('INSERT INTO comments (author, content) VALUES (?, ?)').run(author, content);
  res.redirect('/comments');
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

// ---------- (5) Chạy HTTPS với self-signed certificate ----------
const certDir = path.join(__dirname, 'certs');
if (fs.existsSync(path.join(certDir, 'cert.pem'))) {
  const opts = { key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) };
  https.createServer(opts, app).listen(PORT, () => console.log(`Lab 8 (HTTPS) chạy tại https://localhost:${PORT}`));
} else {
  app.listen(PORT, () => console.log(`Lab 8 (HTTP - chưa có cert) chạy tại http://localhost:${PORT}`));
}
