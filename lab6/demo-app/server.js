// server.js - App demo Lab 6: SQL Injection và phòng chống
// Yêu cầu: Node.js >= 22.5 (có sẵn module node:sqlite). Máy bạn Node 24 -> chạy được.
// Hai endpoint để SO SÁNH:
//   /api/login-vulnerable : nối chuỗi SQL  -> DÍNH SQL Injection
//   /api/login-secure     : truy vấn tham số (prepared statement) -> AN TOÀN
const express = require('express');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 6060;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Tạo CSDL trong bộ nhớ và nạp dữ liệu mẫu ---
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT);`);
const seed = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
seed.run('user1', 'Pass123', 'user');
seed.run('alice', 'Alice@456', 'user');
seed.run('admin', 'S3cret!Admin', 'admin');

// ❌ KHÔNG AN TOÀN: ghép trực tiếp dữ liệu người dùng vào câu SQL
app.post('/api/login-vulnerable', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  // Đây chính là lỗ hổng: username/password được nối thẳng vào chuỗi SQL
  const sql = `SELECT id, username, role FROM users
               WHERE username = '${username}' AND password = '${password}'`;
  try {
    const rows = db.prepare(sql).all(); // thực thi câu SQL đã bị chèn
    if (rows.length > 0) {
      return res.json({ success: true, message: `Đăng nhập thành công! Chào ${rows[0].username} (${rows[0].role}).`,
        sql, rows });
    }
    res.status(401).json({ success: false, message: 'Sai username hoặc mật khẩu.', sql });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Lỗi SQL: ' + e.message, sql });
  }
});

// ✅ AN TOÀN: dùng dấu ? (tham số hoá). Dữ liệu người dùng KHÔNG trộn vào cú pháp SQL
app.post('/api/login-secure', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const sql = `SELECT id, username, role FROM users WHERE username = ? AND password = ?`;
  const rows = db.prepare(sql).all(username, password); // ? được bind an toàn
  if (rows.length > 0) {
    return res.json({ success: true, message: `Đăng nhập thành công! Chào ${rows[0].username} (${rows[0].role}).`,
      sql: sql + `  [params: '${username}', '${password}']`, rows });
  }
  res.status(401).json({ success: false, message: 'Sai username hoặc mật khẩu.',
    sql: sql + `  [params: '${username}', '${password}']` });
});

app.listen(PORT, () => console.log(`Demo Lab 6 chạy tại http://localhost:${PORT}`));
