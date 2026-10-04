// script.js - Kiểm soát PHÍA CLIENT (cố ý để đây là lớp bảo vệ duy nhất với endpoint insecure)
const form = document.getElementById('login-form');
const u = document.getElementById('username');
const p = document.getElementById('password');
const msg = document.getElementById('message');
const raw = document.getElementById('raw');
const MIN = 6;

function showMessage(text, ok) {
  msg.textContent = text;
  msg.className = 'message ' + (ok ? 'success' : 'fail');
  msg.hidden = false;
}
function setError(input, text) {
  document.getElementById(input.id + '-error').textContent = text;
  input.classList.toggle('invalid', Boolean(text));
}

// Kiểm tra phía client: username không trống, password >= 6 ký tự
function validateClient() {
  let ok = true;
  setError(u, ''); setError(p, '');
  if (u.value.trim() === '') { setError(u, 'Username không được để trống.'); ok = false; }
  if (p.value.length < MIN) { setError(p, `Password phải có ít nhất ${MIN} ký tự.`); ok = false; }
  return ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.hidden = true; raw.hidden = true;

  // ĐÂY là chốt chặn phía client. Nếu bị bypass (sửa trong DevTools / gọi thẳng API),
  // đoạn này sẽ không còn tác dụng bảo vệ server.
  if (!validateClient()) {
    showMessage('Client chặn: dữ liệu chưa đạt yêu cầu, không gửi lên server.', false);
    return;
  }

  const endpoint = document.querySelector('input[name=endpoint]:checked').value;
  const res = await fetch('/api/login-' + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u.value, password: p.value }),
  });
  const data = await res.json();
  showMessage(data.message, data.success);
  raw.hidden = false;
  raw.textContent = 'POST /api/login-' + endpoint + '\n' + JSON.stringify(data, null, 2);
});

[u, p].forEach((input) => input.addEventListener('input', () => setError(input, '')));
