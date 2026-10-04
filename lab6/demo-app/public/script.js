const form = document.getElementById('login-form');
const u = document.getElementById('username');
const p = document.getElementById('password');
const msg = document.getElementById('message');
const raw = document.getElementById('raw');

function fill(el) { u.value = el.textContent; p.value = ''; u.focus(); }

function show(text, ok) {
  msg.textContent = text;
  msg.className = 'message ' + (ok ? 'success' : 'fail');
  msg.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.hidden = true; raw.hidden = true;
  const endpoint = document.querySelector('input[name=endpoint]:checked').value;
  const res = await fetch('/api/login-' + endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u.value, password: p.value }),
  });
  const data = await res.json();
  show(data.message, data.success);
  raw.hidden = false;
  let t = 'SQL thực thi:\n' + (data.sql || '') ;
  if (data.rows) t += '\n\nSố dòng trả về: ' + data.rows.length + '\n' + JSON.stringify(data.rows, null, 2);
  raw.textContent = t;
});
