// script.js - Xử lý phía client: validate + gửi AJAX (fetch) lên backend
const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const messageBox = document.getElementById('message');
const loginView = document.getElementById('login-view');
const welcomeView = document.getElementById('welcome-view');

function showMessage(text, ok) {
  messageBox.textContent = text;
  messageBox.className = 'message ' + (ok ? 'success' : 'fail');
  messageBox.hidden = false;
}

function setFieldError(input, text) {
  document.getElementById(input.id + '-error').textContent = text;
  input.classList.toggle('invalid', Boolean(text));
}

// Validate cơ bản: không để trống
function validate() {
  let ok = true;
  setFieldError(usernameInput, '');
  setFieldError(passwordInput, '');

  if (usernameInput.value.trim() === '') {
    setFieldError(usernameInput, 'Vui lòng nhập username.');
    ok = false;
  }
  if (passwordInput.value === '') {
    setFieldError(passwordInput, 'Vui lòng nhập password.');
    ok = false;
  }
  return ok;
}

function showWelcome(user) {
  document.getElementById('welcome-name').textContent = user.username;
  document.getElementById('login-time').textContent = new Date(user.loginAt).toLocaleString('vi-VN');
  loginView.hidden = true;
  welcomeView.hidden = false;
}

function showLogin() {
  welcomeView.hidden = true;
  loginView.hidden = false;
  form.reset();
}

// Gửi form bằng fetch, không reload trang
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageBox.hidden = true;
  if (!validate()) {
    showMessage('Vui lòng điền đầy đủ thông tin.', false);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang xử lý...';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      })
    });
    const data = await res.json();
    showMessage(data.message, data.success);

    if (data.success) {
      const me = await (await fetch('/api/me')).json();
      if (me.loggedIn) showWelcome(me.user);
    }
  } catch (err) {
    showMessage('Không kết nối được tới server.', false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Đăng nhập';
  }
});

// Xoá lỗi khi người dùng gõ lại
[usernameInput, passwordInput].forEach((input) =>
  input.addEventListener('input', () => setFieldError(input, ''))
);

// Đăng xuất
document.getElementById('logout-btn').addEventListener('click', async () => {
  const data = await (await fetch('/api/logout', { method: 'POST' })).json();
  showLogin();
  showMessage(data.message, true);
});

// Khi tải trang: kiểm tra session còn hiệu lực không
(async () => {
  try {
    const me = await (await fetch('/api/me')).json();
    if (me.loggedIn) showWelcome(me.user);
  } catch (_) { /* server chưa chạy */ }
})();
