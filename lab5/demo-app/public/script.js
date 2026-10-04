const form = document.getElementById('login-form');
const u = document.getElementById('username');
const p = document.getElementById('password');
const cap = document.getElementById('captcha');
const capBox = document.getElementById('captcha-box');
const capQ = document.getElementById('captcha-q');
const msg = document.getElementById('message');

function show(text, type) {
  msg.textContent = text;
  msg.className = 'message ' + type;
  msg.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const endpoint = document.querySelector('input[name=endpoint]:checked').value;
  const body = { username: u.value, password: p.value };
  if (!capBox.hidden) body.captcha = cap.value;

  const res = await fetch('/api/login-' + endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();

  if (data.success) { show(data.message, 'success'); capBox.hidden = true; }
  else if (data.locked) { show(data.message, 'warn'); }
  else { show(data.message, 'fail'); }

  // Hiện CAPTCHA khi server yêu cầu
  if (data.needCaptcha && data.captcha) {
    capBox.hidden = false;
    capQ.textContent = data.captcha.question;
    cap.value = '';
  }
});
