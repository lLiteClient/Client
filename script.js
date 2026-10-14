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

  // DOM elements for live status
  const navBadgeDot = document.getElementById('navBadgeDot');
  const navSubPill = document.getElementById('navSubPill');
  const userSubBanner = document.getElementById('userSubBanner');
  const subBannerDot = document.getElementById('subBannerDot');
  const subBannerTitle = document.getElementById('subBannerTitle');
  const subBannerCountdown = document.getElementById('subBannerCountdown');
  const profRoleBadge = document.getElementById('profRoleBadge');
  const profTimeRemaining = document.getElementById('profTimeRemaining');
  const profExpiryHint = document.getElementById('profExpiryHint');
  const profExpiryDate = document.getElementById('profExpiryDate');

  let liveStatusEventSource = null;
  let liveStatusPollInterval = null;
  let countdownTimer = null;

  // --- Check existing user session ---
  function getSavedUser() {
    try {
      const data = localStorage.getItem('liteclient_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function renderSubscriptionStatus(user) {
    if (!user || !user.tg_id) {
      if (userSubBanner) userSubBanner.style.display = 'none';
      if (navSubPill) navSubPill.style.display = 'none';
      return;
    }

    const isAdmin = (user.role === 'ADMIN');
    const isLifetime = (user.isLifetime || user.expires_at === 'LIFETIME');
    const isBanned = !!user.banned;

    let statusText = "Не активирована";
    let pillText = "Не активна";
    let pillClass = "pill-inactive";
    let dotClass = "dot-inactive";
    let formattedCountdown = "—";
    let expiryStr = "—";
    let isSubActive = false;

    if (isBanned) {
      statusText = "⛔ Заблокирован";
      pillText = "Бан";
      pillClass = "pill-inactive";
      dotClass = "dot-inactive";
      formattedCountdown = "Доступ заблокирован";
      expiryStr = "Блокировка администратором";
    } else if (isAdmin) {
      statusText = "👑 [ADMIN] Вечный доступ";
      pillText = "👑 ADMIN";
      pillClass = "pill-admin";
      dotClass = "dot-admin";
      formattedCountdown = "Бессрочно (Навсегда)";
      expiryStr = "Бессрочно";
      isSubActive = true;
    } else if (isLifetime) {
      statusText = "⚡ Навсегда (Lifetime)";
      pillText = "⚡ Lifetime";
      pillClass = "pill-active";
      dotClass = "";
      formattedCountdown = "Бессрочно (Навсегда)";
      expiryStr = "Бессрочно";
      isSubActive = true;
    } else if (user.expires_at) {
      const expTime = new Date(user.expires_at).getTime();
      const now = Date.now();
      const diff = expTime - now;

      if (diff > 0) {
        isSubActive = true;
        dotClass = "";
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        statusText = `Активна: ${days > 0 ? `${days} дн. ${hours} ч.` : `${hours} ч. ${mins} мин.`}`;
        pillText = `⏳ ${days > 0 ? `${days}д ${hours}ч` : `${hours}ч ${mins}м`}`;
        pillClass = "pill-active";

        const parts = [];
        if (days > 0) parts.push(`${days} дн.`);
        if (hours > 0 || days > 0) parts.push(`${hours} ч.`);
        parts.push(`${mins} мин.`);
        parts.push(`${secs} сек.`);
        formattedCountdown = parts.join(' ');

        const expDate = new Date(user.expires_at);
        expiryStr = expDate.toLocaleString('ru-RU', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      } else {
        statusText = "Подписка истекла";
        pillText = "Истекла";
        pillClass = "pill-inactive";
        dotClass = "dot-inactive";
        formattedCountdown = "Срок действия истёк";
        expiryStr = "Истекла: " + new Date(user.expires_at).toLocaleDateString('ru-RU');
      }
    }

    // 1. Top Nav Pill
    if (navSubPill) {
      navSubPill.textContent = pillText;
      navSubPill.className = `badge-sub-pill ${pillClass}`;
      navSubPill.style.display = 'inline-block';
    }
    if (navBadgeDot) {
      navBadgeDot.className = `badge-dot ${dotClass}`;
    }

    // 2. Hero Center Banner
    if (userSubBanner) {
      userSubBanner.style.display = 'inline-flex';
      if (subBannerDot) subBannerDot.className = `sub-banner-dot ${dotClass}`;
      if (subBannerTitle) subBannerTitle.textContent = statusText;
      if (subBannerCountdown) subBannerCountdown.textContent = formattedCountdown;
    }

    // 3. Profile Modal Elements
    const profSubStatus = document.getElementById('profSubStatus');
    if (profSubStatus) {
      profSubStatus.textContent = statusText;
      profSubStatus.className = isSubActive ? "stat-value text-accent" : "stat-value text-muted";
    }
    if (profRoleBadge) {
      profRoleBadge.textContent = isAdmin ? "👑 [ADMIN]" : "USER";
      profRoleBadge.style.color = isAdmin ? "#fbbf24" : "#f8fafc";
    }
    if (profTimeRemaining) {
      profTimeRemaining.textContent = formattedCountdown;
      profTimeRemaining.className = isSubActive ? "stat-value text-time font-mono" : "stat-value text-muted font-mono";
    }
    if (profExpiryHint && profExpiryDate) {
      if (user.expires_at || isLifetime || isAdmin) {
        profExpiryHint.style.display = 'block';
        profExpiryDate.textContent = expiryStr;
      } else {
        profExpiryHint.style.display = 'none';
      }
    }
  }

  function startLiveStatusSync(tgId) {
    if (!tgId) return;
    if (liveStatusEventSource) {
      liveStatusEventSource.close();
      liveStatusEventSource = null;
    }
    if (liveStatusPollInterval) {
      clearInterval(liveStatusPollInterval);
      liveStatusPollInterval = null;
    }

    // Initial instant fetch from ntfy topic cache
    const topic = `lc_user_${tgId}`;
    fetch(`https://ntfy.sh/${topic}/raw?poll=1`)
      .then(r => r.text())
      .then(text => {
        if (text && text.trim().length > 0) {
          const lines = text.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          try {
            const data = JSON.parse(lastLine);
            if (data && data.tg_id) {
              const cur = getSavedUser() || {};
              const merged = { ...cur, ...data };
              localStorage.setItem('liteclient_user', JSON.stringify(merged));
              renderSubscriptionStatus(merged);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});

    // SSE Real-time stream
    try {
      liveStatusEventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);
      liveStatusEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.message) {
            const subData = JSON.parse(data.message);
            const cur = getSavedUser() || {};
            const merged = { ...cur, ...subData };
            localStorage.setItem('liteclient_user', JSON.stringify(merged));
            renderSubscriptionStatus(merged);
          }
        } catch (e) {}
      };
      liveStatusEventSource.onerror = () => {
        if (!liveStatusPollInterval) {
          liveStatusPollInterval = setInterval(() => {
            fetch(`https://ntfy.sh/${topic}/raw?poll=1`)
              .then(r => r.text())
              .then(txt => {
                if (txt && txt.trim().length > 0) {
                  const arr = txt.trim().split('\n');
                  const d = JSON.parse(arr[arr.length - 1]);
                  if (d && d.tg_id) {
                    const c = getSavedUser() || {};
                    const m = { ...c, ...d };
                    localStorage.setItem('liteclient_user', JSON.stringify(m));
                    renderSubscriptionStatus(m);
                  }
                }
              }).catch(() => {});
          }, 8000);
        }
      };
    } catch (e) {}
  }

  function updateNavUser(user) {
    if (user && user.tg_id) {
      if (openAuthBtn) openAuthBtn.style.display = 'none';
      if (userProfileBtn) {
        userProfileBtn.style.display = 'inline-flex';
        const displayTag = user.username ? `@${user.username}` : (user.first_name || `ID:${user.tg_id}`);
        navUsername.textContent = displayTag;
      }
      renderSubscriptionStatus(user);
      startLiveStatusSync(user.tg_id);
    } else {
      if (openAuthBtn) openAuthBtn.style.display = 'inline-flex';
      if (userProfileBtn) userProfileBtn.style.display = 'none';
      if (userSubBanner) userSubBanner.style.display = 'none';
      if (liveStatusEventSource) {
        liveStatusEventSource.close();
        liveStatusEventSource = null;
      }
      if (liveStatusPollInterval) {
        clearInterval(liveStatusPollInterval);
        liveStatusPollInterval = null;
      }
    }
  }

  // Live 1-second countdown ticker
  if (!countdownTimer) {
    countdownTimer = setInterval(() => {
      const u = getSavedUser();
      if (u) {
        renderSubscriptionStatus(u);
      }
    }, 1000);
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

    renderSubscriptionStatus(user);

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

  // FAQ Modal Elements
  const faqModal = document.getElementById('faqModal');
  const openFaqBtn = document.getElementById('openFaqBtn');
  const footerFaqBtn = document.getElementById('footerFaqBtn');
  const closeFaqBtn = document.getElementById('closeFaqBtn');

  function openFaq() {
    if (faqModal) {
      faqModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeFaq() {
    if (faqModal) {
      faqModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (openFaqBtn) openFaqBtn.addEventListener('click', openFaq);
  if (footerFaqBtn) footerFaqBtn.addEventListener('click', openFaq);
  if (closeFaqBtn) closeFaqBtn.addEventListener('click', closeFaq);

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === tariffsModal) closeTariffs();
    if (e.target === legalModal) closeLegal();
    if (e.target === authModal) closeAuthModal();
    if (e.target === profileModal) closeProfileModal();
    if (e.target === faqModal) closeFaq();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tariffsModal.classList.contains('active')) closeTariffs();
      if (legalModal.classList.contains('active')) closeLegal();
      if (authModal.classList.contains('active')) closeAuthModal();
      if (profileModal.classList.contains('active')) closeProfileModal();
      if (faqModal && faqModal.classList.contains('active')) closeFaq();
    }
  });

  // --- AnyPay Payment Configuration & Integration ---
  const ANYPAY_CONFIG = {
    merchantId: '18534',
    secretKey: '9IwHqAOV0Tcf810vYgbohf5eMebPpkH9tgYFliy',
    currency: 'RUB',
    successUrl: 'https://lliteclient.github.io/success',
    failUrl: 'https://lliteclient.github.io/fail'
  };

  // Pure JavaScript MD5 Implementation (RFC 1321)
  function computeMD5(string) {
    function rotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX, lY) {
      var lX4 = (lX & 0x40000000);
      var lY4 = (lY & 0x40000000);
      var lX8 = (lX & 0x80000000);
      var lY8 = (lY & 0x80000000);
      var lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ lX8 ^ lY8);
      }
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function convertToWordArray(str) {
      var lWordCount;
      var lMessageLength = str.length;
      var lNumberOfWords_temp1 = lMessageLength + 8;
      var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      var lWordArray = Array(lNumberOfWords - 1);
      var lBytePosition = 0;
      var lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }
    function wordToHex(lValue) {
      var WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        WordToHexValue_temp = '0' + lByte.toString(16);
        WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
      }
      return WordToHexValue;
    }
    function utf8Encode(str) {
      str = str.replace(/\r\n/g, '\n');
      var utftext = '';
      for (var n = 0; n < str.length; n++) {
        var c = str.charCodeAt(n);
        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }
      }
      return utftext;
    }
    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    str = utf8Encode(string);
    x = convertToWordArray(str);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
      AA = a; BB = b; CC = c; DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  function redirectToAnyPay(plan, amountRaw, user) {
    const merchantId = ANYPAY_CONFIG.merchantId;
    const secretKey = ANYPAY_CONFIG.secretKey;
    const currency = ANYPAY_CONFIG.currency;

    // Determine duration / days based on plan or amount
    let days = '30';
    const planLower = String(plan).toLowerCase();
    const amtNum = Math.round(Number(amountRaw));
    if (planLower.includes('1 ') || amtNum === 39) {
      days = '1';
    } else if (planLower.includes('7 ') || amtNum === 129) {
      days = '7';
    } else if (planLower.includes('30') || amtNum === 300) {
      days = '30';
    } else if (planLower.includes('90') || amtNum === 890) {
      days = '90';
    } else if (planLower.includes('навсегда') || planLower.includes('life') || amtNum === 1290) {
      days = 'lifetime';
    }

    // pay_id: Unique numeric order ID up to 15 digits (0-9)
    const payId = String(Date.now());
    const amount = Number(amountRaw).toFixed(2);
    const userRef = user && user.username ? `@${user.username}` : (user ? `id_${user.tg_id}` : 'Guest');
    const desc = `LiteClient - ${plan} (${userRef})`;

    // Save order data for automated subscription activation upon return
    const orderData = {
      payId: payId,
      plan: plan,
      amount: amount,
      currency: currency,
      days: days,
      tg_id: user ? String(user.tg_id) : null,
      username: user ? (user.username || '') : '',
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('lc_pending_order', JSON.stringify(orderData));
      localStorage.setItem('lc_order_' + payId, JSON.stringify(orderData));
    } catch (e) {
      console.warn('Unable to cache pending order in localStorage:', e);
    }

    // AnyPay MD5 signature calculation:
    // currency:amount:secret_key:merchant_id:pay_id
    const signString = `${currency}:${amount}:${secretKey}:${merchantId}:${payId}`;
    const sign = computeMD5(signString);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://anypay.io/merchant';
    form.acceptCharset = 'utf-8';
    form.style.display = 'none';

    const fields = {
      merchant_id: merchantId,
      pay_id: payId,
      amount: amount,
      currency: currency,
      desc: desc,
      sign: sign
    };

    for (const [name, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
    }

    document.body.appendChild(form);
    form.submit();
  }

  // Buy buttons -> Require Telegram auth & Redirect to AnyPay
  const buyButtons = document.querySelectorAll('.buy-btn');
  buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const user = getSavedUser();
      if (!user || !user.tg_id) {
        alert('⚠️ Для покупки тарифа необходимо сначала привязать Telegram-аккаунт!');
        closeTariffs();
        startAuthSession();
        return;
      }

      if (user.role === 'ADMIN' || user.isLifetime || user.expires_at === 'LIFETIME') {
        alert('🎉 У вас уже активирована вечная подписка (Lifetime)! Покупка дополнительных тарифов не требуется.');
        return;
      }

      const plan = btn.getAttribute('data-plan') || 'Подписка';
      const amount = btn.getAttribute('data-amount') || (plan.includes('1 ') ? '39' : plan.includes('7 ') ? '129' : plan.includes('30 ') ? '300' : plan.includes('90 ') ? '890' : '1290');

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Переход к оплате...';

      try {
        redirectToAnyPay(plan, amount, user);
      } catch (err) {
        console.error('AnyPay redirect error:', err);
        btn.disabled = false;
        btn.textContent = originalText;
        alert('Произошла ошибка при формировании платежа. Попробуйте еще раз.');
      }
    });
  });

  // Handle URL query parameters (e.g. ?tariffs=open)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tariffs') === 'open' || urlParams.get('tariffs') === '1') {
      openTariffs();
    }
  } catch (e) {}

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
