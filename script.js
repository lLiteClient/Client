// LiteClient UI, Modals, Telegram Verification & Legal Suite
document.addEventListener('DOMContentLoaded', () => {
  // --- Modals Elements ---
  const tariffsModal = document.getElementById('tariffsModal');
  const openTariffsBtn = document.getElementById('openTariffsBtn');
  const heroOpenTariffsBtn = document.getElementById('heroOpenTariffsBtn');
  const closeTariffsBtn = document.getElementById('closeTariffsBtn');

  const legalModal = document.getElementById('legalModal');
  const closeLegalBtn = document.getElementById('closeLegalBtn');
  const legalModalTitle = document.getElementById('legalModalTitle');
  const legalContentBody = document.getElementById('legalContentBody');
  const legalTabBtns = document.querySelectorAll('.legal-tab-btn');
  const footerLegalBtns = document.querySelectorAll('.footer-link-btn');

  // --- Auth & Profile Elements ---
  const openAuthBtn = document.getElementById('openAuthBtn');
  const authModal = document.getElementById('authModal');
  const closeAuthBtn = document.getElementById('closeAuthBtn');
  const authFlowBody = document.getElementById('authFlowBody');
  const authSuccessFlow = document.getElementById('authSuccessFlow');
  const authCodeDigits = document.getElementById('authCodeDigits');
  const copyAuthCodeBtn = document.getElementById('copyAuthCodeBtn');
  const authTgDeepLinkBtn = document.getElementById('authTgDeepLinkBtn');
  const pillCodeValue = document.getElementById('pillCodeValue');
  const authStatusLabel = document.getElementById('authStatusLabel');
  const finishAuthBtn = document.getElementById('finishAuthBtn');
  const sucUserName = document.getElementById('sucUserName');
  const sucUserId = document.getElementById('sucUserId');

  const userProfileBtn = document.getElementById('userProfileBtn');
  const navUsername = document.getElementById('navUsername');
  const profileModal = document.getElementById('profileModal');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const profUname = document.getElementById('profUname');
  const profUid = document.getElementById('profUid');
  const profTgHandle = document.getElementById('profTgHandle');
  const logoutBtn = document.getElementById('logoutBtn');
  const profBuyBtn = document.getElementById('profBuyBtn');

  const AUTH_BOT_USERNAME = 'lLiteClientverifybot';
  let currentAuthCode = null;
  let authPollInterval = null;
  let authEventSource = null;

  // --- Check existing user session ---
  function getSavedUser() {
    try {
      const data = localStorage.getItem('liteclient_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function updateNavUser(user) {
    if (user && user.tg_id) {
      if (openAuthBtn) openAuthBtn.style.display = 'none';
      if (userProfileBtn) {
        userProfileBtn.style.display = 'inline-flex';
        const displayTag = user.username ? `@${user.username}` : (user.first_name || `ID:${user.tg_id}`);
        navUsername.textContent = displayTag;
      }
    } else {
      if (openAuthBtn) openAuthBtn.style.display = 'inline-flex';
      if (userProfileBtn) userProfileBtn.style.display = 'none';
    }
  }

  updateNavUser(getSavedUser());

  // --- Auth Flow Logic ---
  function generateAuthCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function startAuthSession() {
    currentAuthCode = generateAuthCode();
    authCodeDigits.textContent = currentAuthCode;
    pillCodeValue.textContent = currentAuthCode;

    // Direct deep-link
    authTgDeepLinkBtn.href = `https://t.me/${AUTH_BOT_USERNAME}?start=${currentAuthCode}`;

    authFlowBody.style.display = 'block';
    authSuccessFlow.style.display = 'none';
    authStatusLabel.textContent = 'Ожидание привязки в боте...';

    // Stop any previous listener
    stopAuthListening();

    // Listen to real-time verification via SSE on ntfy.sh
    listenForAuth(currentAuthCode);

    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function stopAuthListening() {
    if (authEventSource) {
      authEventSource.close();
      authEventSource = null;
    }
    if (authPollInterval) {
      clearInterval(authPollInterval);
      authPollInterval = null;
    }
  }

  function listenForAuth(code) {
    const topic = `lc_auth_${code}`;
    const sseUrl = `https://ntfy.sh/${topic}/sse`;

    try {
      authEventSource = new EventSource(sseUrl);
      authEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.message) {
            const userData = JSON.parse(data.message);
            onAuthSuccess(userData);
          }
        } catch (err) {}
      };

      authEventSource.onerror = () => {
        // Fallback to HTTP polling if SSE has any connection issue
        startPollFallback(topic);
      };
    } catch (e) {
      startPollFallback(topic);
    }
  }

  function startPollFallback(topic) {
    if (authPollInterval) return;
    authPollInterval = setInterval(async () => {
      try {
        const res = await fetch(`https://ntfy.sh/${topic}/raw?poll=1`);
        const text = await res.text();
        if (text && text.trim().length > 0) {
          const lines = text.trim().split('\n');
          for (const line of lines) {
            try {
              const userData = JSON.parse(line);
              if (userData && userData.tg_id) {
                onAuthSuccess(userData);
                return;
              }
            } catch (err) {}
          }
        }
      } catch (e) {}
    }, 2500);
  }

  function onAuthSuccess(userData) {
    stopAuthListening();

    // Persist session
    localStorage.setItem('liteclient_user', JSON.stringify(userData));
    updateNavUser(userData);

    // Show success view
    const displayTag = userData.username ? `@${userData.username}` : (userData.first_name || `ID:${userData.tg_id}`);
    sucUserName.textContent = displayTag;
    sucUserId.textContent = userData.tg_id;

    authFlowBody.style.display = 'none';
    authSuccessFlow.style.display = 'block';
  }

  function closeAuthModal() {
    stopAuthListening();
    authModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (openAuthBtn) openAuthBtn.addEventListener('click', startAuthSession);
  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
  if (finishAuthBtn) {
    finishAuthBtn.addEventListener('click', () => {
      closeAuthModal();
      openProfileModal();
    });
  }

  // Copy auth code button
  if (copyAuthCodeBtn) {
    copyAuthCodeBtn.addEventListener('click', () => {
      if (!currentAuthCode) return;
      navigator.clipboard.writeText(currentAuthCode).then(() => {
        const btnText = copyAuthCodeBtn.querySelector('span');
        const oldText = btnText.textContent;
        btnText.textContent = 'Скопировано!';
        setTimeout(() => { btnText.textContent = oldText; }, 1800);
      });
    });
  }

  // --- Profile Dashboard Modal ---
  function openProfileModal() {
    const user = getSavedUser();
    if (!user) {
      startAuthSession();
      return;
    }

    const displayTag = user.username ? `@${user.username}` : (user.first_name || `Пользователь`);
    profUname.textContent = displayTag;
    profUid.textContent = user.tg_id;
    profTgHandle.textContent = user.username ? `@${user.username}` : `ID: ${user.tg_id}`;

    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProfileModal() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (userProfileBtn) userProfileBtn.addEventListener('click', openProfileModal);
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModal);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('liteclient_user');
      updateNavUser(null);
      closeProfileModal();
    });
  }

  if (profBuyBtn) {
    profBuyBtn.addEventListener('click', () => {
      closeProfileModal();
      openTariffs();
    });
  }

  // --- Legal Documents Content ---
  const legalDocs = {
    terms: {
      title: 'Публичная оферта (Пользовательское соглашение)',
      html: `
        <h3 class="legal-section-title">1. Общие положения</h3>
        <p class="legal-text-p">
          Настоящий документ является официальным предложением (публичной офертой) администрации проекта <b>LiteClient</b> (далее — «Исполнитель») о заключении договора купли-продажи неисключительной лицензии на программное обеспечение для ЭВМ (электронных ключей активации) с любым дееспособным физическим лицом (далее — «Пользователь»).
        </p>
        <p class="legal-text-p">
          В соответствии со ст. 437 Гражданского кодекса РФ, совершение Пользователем оплаты на сайте является полным и безоговорочным акцептом условий настоящей Оферты.
        </p>

        <h3 class="legal-section-title">2. Предмет соглашения</h3>
        <p class="legal-text-p">
          2.1. Исполнитель обязуется предоставить Пользователю неисключительное право использования (лицензию) на программный комплекс <b>LiteClient</b> (модификация клиента и автономный лаунчер для кастомизации интерфейса и оптимизации производительности Minecraft 1.21.4 Fabric) посредством генерации и передачи уникального цифрового лицензионного ключа.
        </p>
        <p class="legal-text-p">
          2.2. Срок действия предоставляемой лицензии определяется выбранным тарифным планом: 1 День, 7 Дней, 30 Дней, 90 Дней или Бессрочно (Lifetime).
        </p>

        <h3 class="legal-section-title">3. Порядок активации и использования</h3>
        <p class="legal-text-p">
          3.1. Лицензионный ключ генерируется в автоматическом режиме и предоставляется Пользователю непосредственно после подтверждения факта оплаты.
        </p>
        <p class="legal-text-p">
          3.2. Активация ключа осуществляется в официальном лаунчере LiteClient. Один лицензионный ключ привязывается к одному аппаратному комплексу (HWID) Пользователя.
        </p>
        <p class="legal-text-p">
          3.3. Пользователю запрещается декомпиляция, взлом, перепродажа или передача третьим лицам выданных лицензионных ключей и исполняемых файлов программы.
        </p>

        <h3 class="legal-section-title">4. Ограничение ответственности</h3>
        <p class="legal-text-p">
          Программное обеспечение предоставляется по принципу «как есть» (AS IS). Исполнитель не несет ответственности за возможную несовместимость с индивидуальной конфигурацией операционной системы Пользователя либо сторонними модификациями игры.
        </p>
      `
    },
    privacy: {
      title: 'Политика конфиденциальности',
      html: `
        <h3 class="legal-section-title">1. Сбор информации</h3>
        <p class="legal-text-p">
          Администрация проекта LiteClient со всей ответственностью относится к конфиденциальности данных пользователей. Мы не собираем и не храним конфиденциальные персональные данные (паспортные данные, адреса проживания и полные реквизиты банковских карт).
        </p>
        <p class="legal-text-p">
          Для целей обеспечения технической работоспособности и лицензирования обрабатываются исключительно:
        </p>
        <ul style="padding-left: 20px; margin-bottom: 12px;">
          <li>Анонимный аппаратный хэш устройства (HWID) для проверки лицензии;</li>
          <li>Идентификатор Telegram (ID и username) для привязки личного кабинета;</li>
          <li>Идентификатор платежа в платежном шлюзе.</li>
        </ul>

        <h3 class="legal-section-title">2. Цели обработки данных</h3>
        <p class="legal-text-p">
          Технические данные используются исключительно для:
        </p>
        <ul style="padding-left: 20px; margin-bottom: 12px;">
          <li>Автоматической доставки и валидации ключа активации;</li>
          <li>Предотвращения несанкционированного доступа и дублирования лицензий;</li>
          <li>Оказания квалифицированной оперативной технической поддержки.</li>
        </ul>

        <h3 class="legal-section-title">3. Безопасность платежей</h3>
        <p class="legal-text-p">
          Все платежные операции осуществляются через защищенные протоколы процессинговых центров и лицензированных платежных агрегаторов. Сайт LiteClient не сохраняет и не имеет доступа к данным банковских карт Пользователя.
        </p>
      `
    },
    refund: {
      title: 'Условия возврата и доставки',
      html: `
        <h3 class="legal-section-title">1. Порядок доставки цифрового товара</h3>
        <p class="legal-text-p">
          1.1. Продукция проекта LiteClient является нематериальным цифровым товаром (электронным ключом активации программного обеспечения).
        </p>
        <p class="legal-text-p">
          1.2. Доставка осуществляется <b>моментально и бесплатно</b> сразу после успешной обработки платежа:
        </p>
        <ul style="padding-left: 20px; margin-bottom: 12px;">
          <li>Отображением ключа на финальной странице успешной оплаты;</li>
          <li>Либо мгновенной выдачей через Telegram-бота поддержки при прямой оплате.</li>
        </ul>

        <h3 class="legal-section-title">2. Политика возврата денежных средств</h3>
        <p class="legal-text-p">
          2.1. В соответствии со ст. 26.1 Закона РФ «О защите прав потребителей», цифровые лицензионные ключи надлежащего качества, доставленные и активированные Пользователем, обмену и возврату не подлежат ввиду их индивидуально-определенных свойств.
        </p>
        <p class="legal-text-p">
          2.2. <b>Гарантийный возврат средств возможен</b> в следующих исключительных случаях:
        </p>
        <ul style="padding-left: 20px; margin-bottom: 12px;">
          <li>Лицензионный ключ оказался невалидным на момент выдачи, и служба поддержки не смогла произвести замену в течение 24 часов;</li>
          <li>Программное обеспечение технически не запускается на поддерживаемой версии ОС Windows 10/11 при содействии службы поддержки;</li>
          <li>Произошло двойное списание средств по вине технического сбоя шлюза.</li>
        </ul>
        <p class="legal-text-p">
          2.3. Запрос на возврат средств принимается через официального Telegram-бота поддержки <b>@lLiteClientBot</b> в течение 24 часов с момента покупки с предоставлением чека оплаты. Возврат производится тем же способом, которым была совершена оплата, в срок от 1 до 5 рабочих дней.
        </p>
      `
    },
    contacts: {
      title: 'Контакты службы поддержки',
      html: `
        <p class="legal-text-p">
          По всем вопросам приобретения лицензий, технической помощи, активации ключей и сотрудничества обращайтесь по официальным каналам связи проекта LiteClient:
        </p>

        <div class="legal-contacts-grid">
          <div class="contact-card">
            <div class="contact-card-label">Telegram поддержка</div>
            <div class="contact-card-val">
              <a href="https://t.me/lLiteClientBot" target="_blank" rel="noopener noreferrer" class="contact-card-link">
                @lLiteClientBot
              </a>
            </div>
            <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 6px;">
              Круглосуточный бот обратной связи и прямой связи с оператором.
            </p>
          </div>

          <div class="contact-card">
            <div class="contact-card-label">Режим работы</div>
            <div class="contact-card-val">
              24 / 7 (Без выходных)
            </div>
            <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 6px;">
              Автоматическая выдача ключей и поддержка в реальном времени.
            </p>
          </div>
        </div>
      `
    }
  };

  // --- Tariffs & Legal Modal Helpers ---
  function openTariffs() {
    tariffsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeTariffs() {
    tariffsModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openLegal(tabKey = 'terms') {
    switchLegalTab(tabKey);
    legalModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLegal() {
    legalModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function switchLegalTab(tabKey) {
    const doc = legalDocs[tabKey] || legalDocs.terms;
    legalModalTitle.textContent = doc.title;
    legalContentBody.innerHTML = doc.html;

    legalTabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // --- Event Listeners ---
  if (openTariffsBtn) openTariffsBtn.addEventListener('click', openTariffs);
  if (heroOpenTariffsBtn) heroOpenTariffsBtn.addEventListener('click', openTariffs);
  if (closeTariffsBtn) closeTariffsBtn.addEventListener('click', closeTariffs);

  if (closeLegalBtn) closeLegalBtn.addEventListener('click', closeLegal);

  legalTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchLegalTab(tab);
    });
  });

  footerLegalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const legalKey = btn.getAttribute('data-legal');
      openLegal(legalKey);
    });
  });

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === tariffsModal) closeTariffs();
    if (e.target === legalModal) closeLegal();
    if (e.target === authModal) closeAuthModal();
    if (e.target === profileModal) closeProfileModal();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tariffsModal.classList.contains('active')) closeTariffs();
      if (legalModal.classList.contains('active')) closeLegal();
      if (authModal.classList.contains('active')) closeAuthModal();
      if (profileModal.classList.contains('active')) closeProfileModal();
    }
  });

  // Buy buttons -> Redirect to Support Telegram Bot
  const buyButtons = document.querySelectorAll('.buy-btn');
  buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const plan = btn.getAttribute('data-plan');
      window.open(`https://t.me/lLiteClientBot?start=buy_${encodeURIComponent(plan)}`, '_blank');
    });
  });

  // --- Particle Canvas ---
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const count = Math.min(width > 768 ? 45 : 20, 60);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.6 + 0.8
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.18 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
});
