// server.js - App demo Lab 7: Cross-Site Scripting (XSS) và phòng chống
// Hai trang tìm kiếm để SO SÁNH:
//   /search-vulnerable : phản chiếu dữ liệu KHÔNG mã hoá  -> DÍNH Reflected XSS
//   /search-secure     : mã hoá (escape) đầu ra           -> AN TOÀN
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 7070;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Hàm mã hoá HTML (tương đương htmlspecialchars của PHP)
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(bodyHtml) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kết quả tìm kiếm</title><link rel="stylesheet" href="/style.css"></head>
  <body><main class="card">${bodyHtml}
  <p style="margin-top:18px"><a href="/">&larr; Quay lại</a></p></main></body></html>`;
}

// ❌ KHÔNG AN TOÀN: chèn thẳng q vào HTML -> script trong q sẽ chạy
app.get('/search-vulnerable', (req, res) => {
  const q = req.query.q || '';
  res.send(page(`
    <h1>Tìm kiếm (KHÔNG an toàn)</h1>
    <p class="tag fail">/search-vulnerable</p>
    <p>Bạn đã tìm: <b>${q}</b></p>
    <p class="muted">Không tìm thấy kết quả nào cho "${q}".</p>`));
});

// ✅ AN TOÀN: mã hoá q trước khi đưa ra HTML -> script bị hiển thị dạng chữ
app.get('/search-secure', (req, res) => {
  const q = escapeHtml(req.query.q || '');
  res.send(page(`
    <h1>Tìm kiếm (AN TOÀN)</h1>
    <p class="tag ok">/search-secure</p>
    <p>Bạn đã tìm: <b>${q}</b></p>
    <p class="muted">Không tìm thấy kết quả nào cho "${q}".</p>`));
});

app.listen(PORT, () => console.log(`Demo Lab 7 chạy tại http://localhost:${PORT}`));
