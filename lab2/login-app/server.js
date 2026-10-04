// server.js - Backend Node.js + Express cho bài tập form đăng nhập
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Tài khoản hợp lệ (theo yêu cầu bài tập)
const VALID_USER = { username: 'admin', password: '12345' };

// ---------- Middleware ----------
app.use(express.json());                                  // đọc body JSON từ fetch()
app.use(express.static(path.join(__dirname, 'public')));  // phục vụ file frontend
app.use(session({
  secret: 'bai-tap-fullstack-secret', // thực tế nên lấy từ biến môi trường
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 30 * 60 * 1000 } // 30 phút
}));

// ---------- Validate backend (mở rộng) ----------
function validateLogin(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['Dữ liệu gửi lên không hợp lệ.'];
  }
  const { username, password } = body;

  if (typeof username !== 'string' || username.trim() === '') {
    errors.push('Username không được để trống.');
  } else {
    if (username.trim().length < 3 || username.trim().length > 30)
      errors.push('Username phải dài từ 3 đến 30 ký tự.');
    if (!/^[a-zA-Z0-9_.]+$/.test(username.trim()))
      errors.push('Username chỉ gồm chữ, số, dấu "_" hoặc ".".');
  }

  if (typeof password !== 'string' || password === '') {
    errors.push('Password không được để trống.');
  } else if (password.length > 100) {
    errors.push('Password quá dài.');
  }
  return errors;
}

// ---------- API ----------

// POST /api/login : nhận dữ liệu form đăng nhập
app.post('/api/login', (req, res) => {
  const errors = validateLogin(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(' ') });
  }

  const username = req.body.username.trim();
  const { password } = req.body;

  if (username === VALID_USER.username && password === VALID_USER.password) {
    req.session.user = { username, loginAt: new Date().toISOString() };
    return res.json({ success: true, message: `Đăng nhập thành công! Xin chào ${username}.` });
  }

  return res.status(401).json({ success: false, message: 'Sai username hoặc password.' });
});

// GET /api/me : kiểm tra trạng thái đăng nhập (dựa vào session cookie)
app.get('/api/me', (req, res) => {
  if (req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  res.json({ loggedIn: false });
});

// POST /api/logout : huỷ session
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Đã đăng xuất.' });
  });
});

// Bắt lỗi JSON sai định dạng
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON không hợp lệ.' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
