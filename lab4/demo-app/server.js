// server.js - App demo cho Lab 4: bypass kiểm soát phía client
// Có 2 endpoint để SO SÁNH:
//   /api/login-insecure : CHỈ dựa vào client validate  -> bị bypass được (lỗ hổng)
//   /api/login-secure   : CÓ validate lại phía server  -> chặn được bypass
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Quy tắc dùng chung (để client và server cùng kiểm theo một chuẩn)
const RULES = { usernameNotEmpty: true, passwordMinLen: 6 };

function validate(body) {
  const errors = [];
  const username = (body && body.username) ?? '';
  const password = (body && body.password) ?? '';
  if (typeof username !== 'string' || username.trim() === '')
    errors.push('Username không được để trống.');
  if (typeof password !== 'string' || password.length < RULES.passwordMinLen)
    errors.push(`Password phải có ít nhất ${RULES.passwordMinLen} ký tự.`);
  return errors;
}

// ❌ KHÔNG AN TOÀN: server tin tưởng rằng client đã kiểm tra rồi.
// Nhận bất cứ gì client gửi lên -> nếu client bị bypass, dữ liệu sai vẫn "lọt".
app.post('/api/login-insecure', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  // Không hề kiểm tra lại -> đây chính là điểm yếu bài tập muốn minh hoạ
  console.log('[INSECURE] nhận được:', JSON.stringify({ username, passwordLength: password.length, password }));
  res.json({
    success: true,
    endpoint: 'insecure',
    message: `Server ĐÃ CHẤP NHẬN dữ liệu. username="${username}", độ dài password=${password.length}.`,
    received: { username, passwordLength: password.length },
  });
});

// ✅ AN TOÀN: server kiểm tra lại đúng bộ quy tắc, không tin client.
app.post('/api/login-secure', (req, res) => {
  const errors = validate(req.body);
  const { username = '', password = '' } = req.body || {};
  console.log('[SECURE] nhận được:', JSON.stringify({ username, passwordLength: password.length }), '| lỗi:', errors);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      endpoint: 'secure',
      message: 'Server TỪ CHỐI: ' + errors.join(' '),
      errors,
    });
  }
  res.json({
    success: true,
    endpoint: 'secure',
    message: `Server chấp nhận (dữ liệu hợp lệ). username="${username}", độ dài password=${password.length}.`,
    received: { username, passwordLength: password.length },
  });
});

app.get('/api/rules', (req, res) => res.json(RULES));

app.listen(PORT, () => console.log(`Demo Lab 4 chạy tại http://localhost:${PORT}`));
