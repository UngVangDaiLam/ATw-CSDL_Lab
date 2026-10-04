// server.js - App demo Lab 5: Brute Force và phòng chống
// Hai endpoint để SO SÁNH:
//   /api/login-unprotected : không giới hạn -> brute force chạy thoải mái
//   /api/login-protected   : giới hạn 5 lần sai/10 phút + CAPTCHA -> chặn brute force
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Tài khoản cài sẵn (demo). Thực tế: lưu trong CSDL, mật khẩu băm bcrypt.
const USER = { username: 'user1', password: 'Pass123' };

const MAX_FAILS = 5;            // số lần sai tối đa
const LOCK_MS = 10 * 60 * 1000; // khóa 10 phút
const CAPTCHA_AFTER = 3;        // sau 3 lần sai thì bắt buộc CAPTCHA

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'lab5-demo', resave: false, saveUninitialized: true }));

// Bộ nhớ theo dõi số lần sai theo username (demo dùng RAM; thực tế nên theo IP + username, lưu Redis)
const attempts = new Map(); // username -> { fails, lockUntil }

function getRecord(u) {
  if (!attempts.has(u)) attempts.set(u, { fails: 0, lockUntil: 0 });
  return attempts.get(u);
}

// Sinh "CAPTCHA" dạng phép cộng đơn giản (demo). Thực tế dùng Google reCAPTCHA.
function newCaptcha(req) {
  const a = Math.floor(Math.random() * 8) + 1, b = Math.floor(Math.random() * 8) + 1;
  req.session.captcha = a + b;
  return { question: `${a} + ${b} = ?` };
}

// ❌ Endpoint KHÔNG bảo vệ: brute force bao nhiêu lần cũng được
app.post('/api/login-unprotected', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  if (username === USER.username && password === USER.password)
    return res.json({ success: true, message: 'Đăng nhập thành công!' });
  res.status(401).json({ success: false, message: 'Sai username hoặc mật khẩu.' });
});

// ✅ Endpoint CÓ bảo vệ: khóa sau 5 lần sai + yêu cầu CAPTCHA sau 3 lần sai
app.post('/api/login-protected', (req, res) => {
  const { username = '', password = '', captcha } = req.body || {};
  const rec = getRecord(username);
  const now = Date.now();

  // 1) Đang bị khóa?
  if (rec.lockUntil > now) {
    const left = Math.ceil((rec.lockUntil - now) / 1000);
    return res.status(429).json({ success: false, locked: true,
      message: `Tài khoản tạm khóa do thử sai quá nhiều. Thử lại sau ${left} giây.` });
  }

  // 2) Nếu đã sai >= 3 lần thì bắt buộc giải CAPTCHA đúng
  const needCaptcha = rec.fails >= CAPTCHA_AFTER;
  if (needCaptcha) {
    if (captcha === undefined || Number(captcha) !== req.session.captcha) {
      const c = newCaptcha(req);
      return res.status(403).json({ success: false, needCaptcha: true, captcha: c,
        message: 'Yêu cầu xác thực CAPTCHA. Hãy trả lời phép tính.' });
    }
  }

  // 3) Kiểm tra mật khẩu
  if (username === USER.username && password === USER.password) {
    attempts.delete(username); // đăng nhập đúng -> reset
    return res.json({ success: true, message: 'Đăng nhập thành công!' });
  }

  // 4) Sai -> tăng đếm, có thể khóa
  rec.fails += 1;
  let extra = {};
  if (rec.fails >= MAX_FAILS) {
    rec.lockUntil = now + LOCK_MS;
    rec.fails = 0;
    return res.status(429).json({ success: false, locked: true,
      message: `Sai ${MAX_FAILS} lần. Tài khoản bị khóa ${LOCK_MS / 60000} phút.` });
  }
  if (rec.fails >= CAPTCHA_AFTER) {
    extra = { needCaptcha: true, captcha: newCaptcha(req) };
  }
  res.status(401).json({ success: false,
    message: `Sai username hoặc mật khẩu. (Đã sai ${rec.fails}/${MAX_FAILS} lần)`, ...extra });
});

// Xem CAPTCHA hiện tại (demo cho script có thể giải được để minh hoạ)
app.get('/api/captcha', (req, res) => res.json(newCaptcha(req)));

app.listen(PORT, () => console.log(`Demo Lab 5 chạy tại http://localhost:${PORT}`));
