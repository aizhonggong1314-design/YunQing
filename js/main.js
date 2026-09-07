/* =========================================================
   仿 mail.163.com 登录页 —— 前端交互(纯演示)
   功能:tab 切换 / 明文切换 / 清空按钮 / 30天免登录 /
         伪验证码(点击刷新) / 模拟登录流程 / 伪二维码
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- 元素 ---------------- */
  var tabs = $$('.tab');
  var panels = $$('.panel');
  var card = $('#loginCard');
  var form = $('#loginForm');
  var inputAcct = $('#account');
  var inputPwd = $('#pwd');
  var inputCap = $('#captcha');
  var btnClear = $('#clearAcct');
  var btnEye = $('#eye');
  var captchaCanvas = $('#captchaImg');
  var captchaRow = $('#fieldCaptcha');
  var formAlert = $('#formAlert');
  var checkRemember = $('#checkRemember');
  var loginBtn = $('#loginBtn');
  var resultBox = $('#result');
  var resultAcct = $('#resultAcct');
  var btnBack = $('#resultBack');
  var toastEl = $('#toast');
  var qrApp = $('#qrApp');
  var qrLogin = $('#qrLogin');
  var btnQrRefresh = $('#qrRefresh');
  var btnQrToPwd = $('#qrToPwd');
  var brandLogo = $('#brandLogo');

  /* ---------------- 状态 ---------------- */
  var state = {
    needCaptcha: false,   // 首次“登录失败”后才开启
    captchaText: '',
    toastTimer: null
  };

  /* ============ 伪随机数(带种子,可复现) ============ */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFrom(str) {
    var s = 0;
    for (var i = 0; i < str.length; i++) { s = (s * 31 + str.charCodeAt(i)) >>> 0; }
    return s || 1;
  }

  /* ============ 伪二维码 ============ */
  // 在 25x25 网格上画带三个定位角的仿二维码(N 取可整除的 25,保证像素清晰)
  function drawQR(canvas, seed) {
    var ctx = canvas.getContext('2d');
    var N = 25, mod = canvas.width / N;
    var rand = mulberry32(seed);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function isFinder(x, y) {
      return (x <= 8 && y <= 8) || (x >= N - 9 && y <= 8) || (x <= 8 && y >= N - 9);
    }
    function finderColor(x, y) {
      // 以定位角左上角为基准
      var fx = x >= N - 9 ? x - (N - 9) : x;
      var fy = y >= N - 9 ? y - (N - 9) : y;
      if (fx < 0 || fy < 0 || fx >= 7 || fy >= 7) return false;
      // 外圈7x7黑 -> 内5x5白 -> 中心3x3黑
      if (fx === 0 || fx === 6 || fy === 0 || fy === 6) return true;
      if (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4) return true;
      return false;
    }

    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var dark = false;
        if (isFinder(x, y)) {
          dark = finderColor(x, y);
        } else if (x === 10 || y === 10) {          // 模拟同步线
          dark = ((x + y) & 1) === 0;
        } else {
          dark = rand() < 0.44;
        }
        if (dark) {
          ctx.fillStyle = '#15213a';
          ctx.fillRect(x * mod, y * mod, mod, mod);
        }
      }
    }
  }

  /* ============ 伪验证码 ============ */
  var CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function randChar() { return CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function drawCaptcha() {
    var ctx = captchaCanvas.getContext('2d');
    var w = captchaCanvas.width, h = captchaCanvas.height;

    // 生成 4 位随机码
    var code = '';
    for (var i = 0; i < 4; i++) { code += randChar(); }
    state.captchaText = code;

    // 背景
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f6f8fd');
    grad.addColorStop(1, '#eef2fb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 干扰线
    ctx.lineWidth = 1;
    for (var l = 0; l < 5; l++) {
      ctx.strokeStyle = 'rgba(59,120,221,' + (0.12 + Math.random() * 0.2).toFixed(2) + ')';
      ctx.beginPath();
      ctx.moveTo(randInt(0, w / 3), randInt(0, h));
      ctx.lineTo(randInt(w * 2 / 3, w), randInt(0, h));
      ctx.stroke();
    }

    // 字符
    var palette = ['#2E65E6', '#1f7a3d', '#c0392b', '#7d4dc3', '#b5732a'];
    for (var c = 0; c < 4; c++) {
      var cx = 13 + c * 26 + randInt(-2, 2);
      var cy = h / 2 + randInt(-4, 4);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((Math.random() - 0.5) * 0.7);
      ctx.font = 'bold ' + randInt(22, 25) + 'px "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = palette[randInt(0, palette.length - 1)];
      ctx.fillText(code.charAt(c), 0, 0);
      ctx.restore();
    }

    // 噪点
    for (var d = 0; d < 40; d++) {
      ctx.fillStyle = 'rgba(60,80,120,' + (Math.random() * 0.25).toFixed(2) + ')';
      ctx.fillRect(randInt(0, w), randInt(0, h), 1.2, 1.2);
    }
  }

  function refreshCaptcha() {
    drawCaptcha();
    captchaCanvas.style.animation = 'none';
    void captchaCanvas.offsetWidth;          // 触发重排以重启动画
  }
  function showCaptcha() {
    captchaRow.classList.add('show');
    refreshCaptcha();
  }
  function hideCaptcha() {
    captchaRow.classList.remove('show');
    state.needCaptcha = false;
  }

  /* ============ 字段错误提示 ============ */
  function fieldNode(fieldId) { return $('#' + fieldId); }
  function fieldError(fieldId, msg) {
    var wrap = fieldNode(fieldId);
    var box = wrap.querySelector('.inputbox');
    var err = wrap.querySelector('.err');
    if (box) box.classList.add('input-error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }
  function clearFieldErrors() {
    $$('.field').forEach(function (f) {
      var box = f.querySelector('.inputbox');
      var err = f.querySelector('.err');
      if (box) box.classList.remove('input-error');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    });
    formAlert.hidden = true;
  }
  function showFormAlert(msg) {
    formAlert.textContent = msg;
    formAlert.hidden = false;
  }

  /* ============ 顶部/页脚链接 ============ */
  $$('[data-demo]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      toast('仿制演示：该入口未接入真实服务');
    });
  });
  brandLogo.addEventListener('click', function (e) {
    e.preventDefault();
    toast('仿制演示：该入口未接入真实服务');
  });

  /* ============ Tab 切换 ============ */
  function switchTab(name) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute('data-panel') !== name;
    });
    if (name === 'account') {
      setTimeout(function () { inputAcct.focus(); }, 50);
    }
    clearFieldErrors();
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      switchTab(t.getAttribute('data-tab'));
    });
  });
  btnQrToPwd.addEventListener('click', function (e) {
    e.preventDefault();
    switchTab('account');
  });

  /* ============ 账号输入框 ============ */
  function syncClearBtn() {
    btnClear.hidden = inputAcct.value.length === 0;
  }
  inputAcct.addEventListener('input', syncClearBtn);
  btnClear.addEventListener('click', function () {
    inputAcct.value = '';
    syncClearBtn();
    inputAcct.focus();
  });

  /* ============ 密码明文切换 ============ */
  var svgEyeOpen = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  var svgEyeOff = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  btnEye.addEventListener('click', function () {
    var show = inputPwd.type === 'password';
    inputPwd.type = show ? 'text' : 'password';
    btnEye.classList.toggle('eye-on', show);
    btnEye.innerHTML = show ? svgEyeOff : svgEyeOpen;
    btnEye.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
    inputPwd.focus();
  });

  /* ============ 30 天内免登录 ============ */
  checkRemember.addEventListener('click', function () {
    var on = checkRemember.classList.toggle('on');
    checkRemember.setAttribute('aria-checked', on ? 'true' : 'false');
  });

  /* ============ 模拟登录 ============ */
  function setLoading(on) {
    loginBtn.disabled = on;
    loginBtn.innerHTML = on ? '登&ensp;录中…' : '登&ensp;录';
  }
  function fullAccount(raw) {
    var v = raw.trim();
    if (v.indexOf('@') >= 0) return v;
    return v + '@163.com';
  }
  function showResult(account) {
    resultAcct.textContent = fullAccount(account);
    resultBox.hidden = false;
    card.setAttribute('aria-busy', 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (loginBtn.disabled) return;   // 防重复提交
    clearFieldErrors();

    var account = inputAcct.value.trim();
    var pwd = inputPwd.value;
    var bad = false;

    if (!account) {
      fieldError('fieldAccount', '请输入邮箱账号或手机号码');
      inputAcct.focus();
      bad = true;
    }
    if (!pwd) {
      fieldError('fieldPwd', '请输入密码');
      inputPwd.focus();
      bad = true;
    }
    if (bad) return;

    // 验证码阶段校验
    if (state.needCaptcha) {
      var cap = inputCap.value.trim();
      if (!cap) {
        fieldError('fieldCaptcha', '请输入验证码');
        inputCap.focus();
        return;
      }
      if (cap.toLowerCase() !== state.captchaText.toLowerCase()) {
        fieldError('fieldCaptcha', '验证码不正确，请重新输入');
        refreshCaptcha();
        inputCap.focus();
        return;
      }
    }

    // 模拟网络请求
    setLoading(true);
    setTimeout(function () {
      setLoading(false);
      if (!state.needCaptcha) {
        // 第一次:模拟“账号或密码错误”,并开启安全验证
        state.needCaptcha = true;
        showCaptcha();
        showFormAlert('账号或密码错误，请重新输入，并输入下方验证码');
        inputCap.focus();
      } else {
        showResult(account);
      }
    }, 900);
  });

  btnBack.addEventListener('click', function () {
    resultBox.hidden = true;
    hideCaptcha();
    formAlert.hidden = true;
    inputCap.value = '';
    if ($('.panel-account').hidden) switchTab('account');
  });

  /* ============ 二维码 ============ */
  drawQR(qrApp, seedFrom('netease-master-app'));
  drawQR(qrLogin, seedFrom('login-session-demo'));
  btnQrRefresh.addEventListener('click', function () {
    drawQR(qrLogin, (Date.now() >>> 0) ^ Math.floor(Math.random() * 1e9));
    toast('二维码已刷新');
  });
  captchaCanvas.addEventListener('click', refreshCaptcha);

  /* ============ 轻提示 ============ */
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }

  /* ============ 初始化 ============ */
  // 输入时即时清除对应字段的错误提示
  $$('.field').forEach(function (f) {
    var inp = f.querySelector('input');
    if (!inp) return;
    inp.addEventListener('input', function () {
      var box = f.querySelector('.inputbox');
      var err = f.querySelector('.err');
      if (box) box.classList.remove('input-error');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
      if (inp === inputAcct || inp === inputPwd) { formAlert.hidden = true; }
    });
  });

  syncClearBtn();
})();
