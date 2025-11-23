const API_URL = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:5050';

const HOURS = Array.from({ length: 12 }, (_, index) => 10 + index);
const FALLBACK_SERVICES = [
  { name: 'Saç', price: 0 },
  { name: 'Sakal', price: 0 },
  { name: 'Saç + Sakal', price: 0 },
];

const dom = {
  hero: {
    bookings: document.getElementById('stat-bookings'),
    availability: document.getElementById('stat-availability'),
    packages: document.getElementById('stat-packages'),
  },
  customer: {
    loginForm: document.getElementById('customer-login'),
    exit: document.getElementById('customer-exit'),
    greeting: document.getElementById('customer-greeting'),
    date: document.getElementById('customer-date'),
    slotGrid: document.getElementById('customer-slot-grid'),
    closedAlert: document.getElementById('customer-closed-alert'),
    selectedSlot: document.getElementById('customer-selected-slot'),
    bookingForm: document.getElementById('customer-booking'),
    serviceSelect: document.getElementById('customer-service'),
    notes: document.getElementById('customer-notes'),
    productSelector: document.getElementById('product-selector'),
    feedback: document.getElementById('customer-feedback'),
  },
  admin: {
    loginForm: document.getElementById('admin-login'),
    exit: document.getElementById('admin-exit'),
    date: document.getElementById('admin-date'),
    slotGrid: document.getElementById('admin-slot-grid'),
    closedAlert: document.getElementById('admin-closed-note'),
    closeDay: document.getElementById('admin-close-day'),
    openDay: document.getElementById('admin-open-day'),
    feedback: document.getElementById('admin-feedback'),
    appointments: document.getElementById('admin-appointments'),
    closedDays: document.getElementById('closed-days-list'),
    pricingList: document.getElementById('admin-pricing'),
    notificationToggle: document.getElementById('admin-notifications-toggle'),
    notificationPanel: document.getElementById('admin-notification-panel'),
    notificationCount: document.getElementById('admin-notification-count'),
    notificationList: document.getElementById('notification-list'),
    markNotificationsRead: document.getElementById('mark-notifications-read'),
  },
  analytics: {
    services: document.getElementById('popular-services'),
    products: document.getElementById('popular-products'),
    peakDays: document.getElementById('peak-days'),
    revenueBody: document.querySelector('#revenue-table tbody'),
  },
  extras: {
    packages: document.getElementById('package-list'),
    featured: document.getElementById('extra-list'),
  },
};

const state = {
  screen: 'landing',
  customer: null,
  adminLoggedIn: false,
  selectedSlot: null,
  customerDate: new Date().toISOString().split('T')[0],
  adminDate: new Date().toISOString().split('T')[0],
  services: [],
  products: [],
  selectedProducts: {},
  customerSchedule: null,
  adminSchedule: null,
  notifications: [],
};

dom.customer.date.value = state.customerDate;
dom.admin.date.value = state.adminDate;

setAnalyticsPlaceholder();
loadStoredNotifications();
renderNotifications();

const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

function loadStoredNotifications() {
  try {
    const stored = localStorage.getItem('adminNotifications');
    state.notifications = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Bildirimler yüklenemedi', error);
    state.notifications = [];
  }
}

function persistNotifications() {
  localStorage.setItem('adminNotifications', JSON.stringify(state.notifications));
}

function addNotification(entry) {
  state.notifications = [{ ...entry, id: Date.now() }, ...state.notifications];
  persistNotifications();
  renderNotifications();
}

function renderNotifications() {
  if (!dom.admin.notificationCount || !dom.admin.notificationList) return;

  dom.admin.notificationCount.textContent = state.notifications.length;
  dom.admin.notificationList.innerHTML = '';

  if (!state.notifications.length) {
    dom.admin.notificationList.innerHTML = '<li class="muted">Yeni bildirim yok.</li>';
    return;
  }

  state.notifications.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.date} ${item.start_time} • ${item.customer_name} (${item.customer_phone || '-'}) • ${item.service_name}`;
    dom.admin.notificationList.appendChild(li);
  });
}

function setAnalyticsPlaceholder() {
  const message = '<li class="muted">Veriler sadece yönetici girişinden sonra görünür.</li>';
  dom.analytics.services.innerHTML = message;
  dom.analytics.products.innerHTML = message;
  dom.analytics.peakDays.innerHTML = message;
  dom.analytics.revenueBody.innerHTML =
    '<tr><td class="muted" colspan="4">Gelir tablosu sadece yönetici girişinden sonra dolar.</td></tr>';
}

async function safeFetch(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`İstek başarısız: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('API isteği başarısız', error);
    return null;
  }
}

function setScreen(screen) {
  state.screen = screen;
  document.body.dataset.screen = screen;
}

function createSlotLabel(hour) {
  const start = `${String(hour).padStart(2, '0')}:00`;
  const end = `${String(hour + 1).padStart(2, '0')}:00`;
  return { start, end };
}

function renderServiceOptions() {
  const select = dom.customer.serviceSelect;
  select.innerHTML = '';
  if (!state.services.length) {
    const fallback = [
      { id: 'placeholder-hair', name: 'Saç' },
      { id: 'placeholder-beard', name: 'Sakal' },
      { id: 'placeholder-hairbeard', name: 'Saç + Sakal' },
    ];

    select.innerHTML = '<option value="" disabled selected>Hizmet bulunamadı — örnek seçenekleri ekleyin</option>';
    fallback.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.name} (örnek)`;
      option.disabled = true;
      select.appendChild(option);
    });
    return;
  }
  select.innerHTML = '<option value="">Hizmet seçiniz</option>';
  state.services.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} — ${formatCurrency(service.price)}`;
    select.appendChild(option);
  });
}

function renderAdminPricing() {
  if (!dom.admin.pricingList) return;
  dom.admin.pricingList.innerHTML = '';

  if (!state.services.length) {
    dom.admin.pricingList.innerHTML = '<p class="muted">Henüz hizmet eklenmedi.</p>';
    return;
  }

  state.services.forEach((service) => {
    const row = document.createElement('div');
    row.className = 'pricing-row';
    const disabledAttr = service.id ? '' : 'disabled';
    row.innerHTML = `
      <div>
        <strong>${service.name}</strong>
        <p class="muted">Müşteri listesinde görünecek.</p>
      </div>
      <input type="number" min="0" step="10" value="${service.price || 0}" data-price="${service.id}" aria-label="${service.name} fiyatı" />
      <button class="btn primary small" data-save-price="${service.id}" ${disabledAttr}>Kaydet</button>
    `;

    const priceInput = row.querySelector('[data-price]');
    const saveButton = row.querySelector('[data-save-price]');

    saveButton.addEventListener('click', async () => {
      const newPrice = Number(priceInput.value) || 0;
      await updateServicePrice(service.id, newPrice);
    });

    dom.admin.pricingList.appendChild(row);
  });
}

function renderProductSelector() {
  const container = dom.customer.productSelector;
  container.innerHTML = '';
  state.selectedProducts = {};

  if (!state.products.length) {
    container.innerHTML = '<p class="muted">Henüz ekstra ürün tanımlı değil.</p>';
    return;
  }

  state.products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <header>
        <div>
          <strong>${product.name}</strong>
          <p class="price">${formatCurrency(product.price)}</p>
        </div>
        <input type="checkbox" data-product="${product.id}" aria-label="${product.name} ekle" />
      </header>
      <label>Adet
        <input type="number" min="1" value="1" data-qty="${product.id}" disabled />
      </label>
    `;

    const checkbox = card.querySelector('[data-product]');
    const qtyInput = card.querySelector('[data-qty]');

    checkbox.addEventListener('change', () => {
      qtyInput.disabled = !checkbox.checked;
      if (checkbox.checked) {
        state.selectedProducts[product.id] = Number(qtyInput.value) || 1;
      } else {
        delete state.selectedProducts[product.id];
      }
    });

    qtyInput.addEventListener('input', () => {
      if (checkbox.checked) {
        state.selectedProducts[product.id] = Math.max(1, Number(qtyInput.value) || 1);
      }
    });

    container.appendChild(card);
  });
}

function buildSlotGrid(target, scheduleData, bookings, role) {
  target.innerHTML = '';
  const closed = scheduleData?.closed;
  const note = scheduleData?.note;
  const availableSlots = scheduleData?.available_slots ?? [];
  const blockedSlots = scheduleData?.blocked_slots ?? [];

  const bookedSet = new Set((bookings || []).map((item) => item.start_time));
  const availableSet = new Set(availableSlots.map((slot) => slot.start_time));
  const blockedSet = new Set(blockedSlots.map((slot) => slot.start_time));

  HOURS.forEach((hour) => {
    const { start, end } = createSlotLabel(hour);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot';
    button.textContent = `${start} - ${end}`;

    let status = 'booked';
    if (blockedSet.has(start)) status = 'blocked';
    else if (bookedSet.has(start)) status = 'booked';
    else if (availableSet.has(start)) status = 'available';

    if (state.selectedSlot?.start === start && role === 'customer') {
      status = 'selected';
    }

    button.classList.add(`slot--${status}`);

    if (status === 'booked') {
      const info = bookings?.find((item) => item.start_time === start);
      button.title = info ? `${info.service_name || ''} • ${info.customer_name || ''}` : 'Dolu';
      button.disabled = true;
    }

    if (status === 'blocked') {
      button.title = 'Admin tarafından bloke edildi';
      if (role === 'customer') button.disabled = true;
    }

    if (closed) {
      button.classList.add('slot--closed');
      button.disabled = true;
    }

    if (role === 'customer' && status === 'available' && !closed) {
      button.addEventListener('click', () => {
        state.selectedSlot = { start, end };
        dom.customer.selectedSlot.textContent = `${start} - ${end} saatini seçtiniz.`;
        buildSlotGrid(target, scheduleData, bookings, role);
      });
    }

    if (role === 'admin' && !bookedSet.has(start) && !closed) {
      button.addEventListener('click', () => handleAdminSlotClick(start, status));
    }

    target.appendChild(button);
  });

  const alertEl = role === 'customer' ? dom.customer.closedAlert : dom.admin.closedAlert;
  if (closed) {
    alertEl.textContent = note ? `Kapalı gün: ${note}` : 'Bu gün kapalı olarak işaretlendi.';
    alertEl.classList.remove('hidden');
  } else {
    alertEl.classList.add('hidden');
  }
}

async function loadServices() {
  let services = await safeFetch(`${API_URL}/services`);

  if (!services?.length) {
    await Promise.all(
      FALLBACK_SERVICES.map((service) =>
        safeFetch(`${API_URL}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(service),
        })
      )
    );
    services = await safeFetch(`${API_URL}/services`);
  }

  state.services = services?.length ? services : FALLBACK_SERVICES;
  renderServiceOptions();
  renderAdminPricing();
}

async function loadProducts() {
  const products = await safeFetch(`${API_URL}/products`);
  state.products = products || [];
  renderProductSelector();
}

async function updateServicePrice(id, price) {
  dom.admin.feedback.textContent = 'Fiyat güncelleniyor...';
  const result = await safeFetch(`${API_URL}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price }),
  });

  if (result) {
    dom.admin.feedback.textContent = 'Fiyat güncellendi.';
    await loadServices();
  } else {
    dom.admin.feedback.textContent = 'Fiyat güncellenemedi.';
  }
}

async function loadPackages() {
  const data = await safeFetch(`${API_URL}/services/packages`);
  const packages = data?.packages ?? [];
  dom.hero.packages.textContent = packages.length;
  dom.extras.packages.innerHTML = '';

  packages.forEach((pkg) => {
    const card = document.createElement('article');
    card.className = 'package-card';
    card.innerHTML = `
      <strong>${pkg.name}</strong>
      <p>${pkg.description}</p>
      <small>${pkg.duration_minutes} dk • ${pkg.price_hint}</small>
      <ul>${pkg.services.map((s) => `<li>${s}</li>`).join('')}</ul>
    `;
    dom.extras.packages.appendChild(card);
  });
}

async function loadExtras() {
  const data = await safeFetch(`${API_URL}/products/featured`);
  dom.extras.featured.innerHTML = '';
  (data?.extras ?? []).forEach((extra) => {
    const card = document.createElement('article');
    card.className = 'extra-card';
    card.innerHTML = `
      <strong>${extra.category}</strong>
      <p>${extra.note}</p>
      <ul>${extra.items.map((item) => `<li>${item}</li>`).join('')}</ul>
    `;
    dom.extras.featured.appendChild(card);
  });
}

async function loadStats() {
  const today = new Date().toISOString().split('T')[0];
  const [dailyAppointments, availability] = await Promise.all([
    safeFetch(`${API_URL}/appointments/day/${today}`),
    safeFetch(`${API_URL}/appointments/available?date=${today}`),
  ]);

  dom.hero.bookings.textContent = dailyAppointments?.length ?? 0;
  const freeSlots = availability?.available_slots?.length ?? 0;
  dom.hero.availability.textContent = freeSlots;
}

async function loadAnalytics() {
  if (!state.adminLoggedIn) {
    setAnalyticsPlaceholder();
    return;
  }
  const [popularServices, popularProducts, peakDays, revenue] = await Promise.all([
    safeFetch(`${API_URL}/reports/popular-services`),
    safeFetch(`${API_URL}/reports/popular-products`),
    safeFetch(`${API_URL}/reports/peak-days`),
    safeFetch(`${API_URL}/reports/revenue-summary`),
  ]);

  const buildList = (target, list) => {
    target.innerHTML = '';
    (list ?? []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = Object.values(item).join(' • ');
      target.appendChild(li);
    });
  };

  buildList(dom.analytics.services, popularServices);
  buildList(dom.analytics.products, popularProducts);
  buildList(dom.analytics.peakDays, peakDays);

  dom.analytics.revenueBody.innerHTML = '';
  (revenue ?? []).forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date?.split('T')[0] ?? '-'}</td>
      <td>${formatCurrency(row.service_income || 0)}</td>
      <td>${formatCurrency(row.product_income || 0)}</td>
      <td>${formatCurrency(row.total_income || 0)}</td>
    `;
    dom.analytics.revenueBody.appendChild(tr);
  });
}

async function fetchCustomerSchedule() {
  if (!state.customerDate) return;
  const [availability, bookings] = await Promise.all([
    safeFetch(`${API_URL}/appointments/available?date=${state.customerDate}`),
    safeFetch(`${API_URL}/appointments/day/${state.customerDate}`),
  ]);
  state.customerSchedule = { availability, bookings };
  state.selectedSlot = null;
  dom.customer.selectedSlot.textContent = 'Henüz saat seçmediniz.';
  buildSlotGrid(dom.customer.slotGrid, availability, bookings, 'customer');
}

async function fetchAdminSchedule() {
  if (!state.adminDate) return;
  const [availability, bookings] = await Promise.all([
    safeFetch(`${API_URL}/appointments/available?date=${state.adminDate}`),
    safeFetch(`${API_URL}/appointments/day/${state.adminDate}`),
  ]);
  state.adminSchedule = { availability, bookings };
  buildSlotGrid(dom.admin.slotGrid, availability, bookings, 'admin');
  renderAdminAppointments(bookings || []);
  syncNotificationsFromBookings(bookings || [], state.adminDate);
}

function renderAdminAppointments(list) {
  dom.admin.appointments.innerHTML = '';
  if (!list.length) {
    dom.admin.appointments.innerHTML = '<li>Bu güne ait randevu yok.</li>';
    return;
  }

  list.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.start_time} • ${item.service_name} • ${item.customer_name || 'Müşteri'} (${item.customer_phone || '-'})`;
    dom.admin.appointments.appendChild(li);
  });
}

async function loadClosedDays() {
  const days = await safeFetch(`${API_URL}/schedule/closed-days`);
  dom.admin.closedDays.innerHTML = '';
  (days ?? []).forEach((day) => {
    const li = document.createElement('li');
    li.textContent = `${day.date} ${day.note ? '• ' + day.note : ''}`;
    dom.admin.closedDays.appendChild(li);
  });
}

async function handleAdminSlotClick(startTime, status) {
  if (!state.adminLoggedIn) return;
  if (!state.adminDate) return;

  let result;
  if (status === 'blocked') {
    result = await safeFetch(`${API_URL}/schedule/blocked-slots/${state.adminDate}/${startTime}`, {
      method: 'DELETE',
    });
  } else if (status === 'available') {
    result = await safeFetch(`${API_URL}/schedule/blocked-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: state.adminDate, start_time: startTime }),
    });
  }

  if (result) {
    dom.admin.feedback.textContent = result.message || 'Takvim güncellendi.';
    await Promise.all([fetchAdminSchedule(), loadClosedDays()]);
    if (state.customerDate === state.adminDate) {
      await fetchCustomerSchedule();
    }
  }
}

async function handleCustomerLogin(event) {
  event.preventDefault();
  const formData = new FormData(dom.customer.loginForm);
  const payload = {
    full_name: formData.get('customerName'),
    phone: formData.get('customerPhone'),
  };

  const response = await safeFetch(`${API_URL}/customers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response) return;

  state.customer = response;
  dom.customer.greeting.textContent = `Hoş geldin ${response.full_name}!`;
  setScreen('customer');
  await fetchCustomerSchedule();
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const password = event.target.adminPass.value;
  if (password !== 'kuafor360') {
    alert('Yanlış şifre.');
    return;
  }
  state.adminLoggedIn = true;
  setScreen('admin');
  dom.admin.feedback.textContent = '';
  await Promise.all([fetchAdminSchedule(), loadClosedDays()]);
  await loadAnalytics();
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  if (!state.customer) {
    dom.customer.feedback.textContent = 'Önce müşteri girişi yapmalısınız.';
    return;
  }
  if (!state.selectedSlot) {
    dom.customer.feedback.textContent = 'Lütfen bir saat seçin.';
    return;
  }
  const serviceId = Number(dom.customer.serviceSelect.value);
  if (!serviceId) {
    dom.customer.feedback.textContent = 'Hizmet seçmelisiniz.';
    return;
  }

  dom.customer.feedback.textContent = 'Randevu kaydediliyor...';

  const productsPayload = Object.entries(state.selectedProducts).map(([product_id, quantity]) => ({
    product_id: Number(product_id),
    quantity: Number(quantity),
  }));

  const payload = {
    customer_id: state.customer.id,
    service_id: serviceId,
    date: state.customerDate,
    start_time: state.selectedSlot.start,
    notes: dom.customer.notes.value,
    products: productsPayload,
  };

  const response = await safeFetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response) {
    dom.customer.feedback.textContent = 'Randevu başarıyla oluşturuldu!';
    if (state.adminLoggedIn) {
      const name = state.customer?.full_name || 'Müşteri';
      const phone = state.customer?.phone ? ` (${state.customer.phone})` : '';
      dom.admin.feedback.textContent = `${name}${phone}, ${state.customerDate} ${state.selectedSlot.start} için yeni randevu oluşturdu.`;
    }
    state.selectedSlot = null;
    dom.customer.selectedSlot.textContent = 'Henüz saat seçmediniz.';
    dom.customer.bookingForm.reset();
    dom.customer.serviceSelect.selectedIndex = 0;
    renderProductSelector();
    const refreshTasks = [fetchCustomerSchedule(), loadStats()];
    if (state.adminLoggedIn) refreshTasks.push(loadAnalytics());
    await Promise.all(refreshTasks);
    if (state.adminLoggedIn && state.adminDate === state.customerDate) {
      await fetchAdminSchedule();
    }
  } else {
    dom.customer.feedback.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

async function closeDay() {
  if (!state.adminLoggedIn || !state.adminDate) return;
  const note = prompt('Kapalı gün notu girin (opsiyonel):', 'Bakım & temizlik');
  const result = await safeFetch(`${API_URL}/schedule/closed-days`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: state.adminDate, note }),
  });
  if (result) {
    dom.admin.feedback.textContent = result.message;
    await Promise.all([fetchAdminSchedule(), loadClosedDays()]);
    if (state.customerDate === state.adminDate) {
      await fetchCustomerSchedule();
    }
  }
}

async function openDay() {
  if (!state.adminLoggedIn || !state.adminDate) return;
  const result = await safeFetch(`${API_URL}/schedule/closed-days/${state.adminDate}`, {
    method: 'DELETE',
  });
  if (result) {
    dom.admin.feedback.textContent = result.message;
    await Promise.all([fetchAdminSchedule(), loadClosedDays()]);
    if (state.customerDate === state.adminDate) {
      await fetchCustomerSchedule();
    }
  }
}

function attachEvents() {
  dom.customer.loginForm.addEventListener('submit', handleCustomerLogin);
  dom.admin.loginForm.addEventListener('submit', handleAdminLogin);
  dom.customer.exit.addEventListener('click', () => {
    state.customer = null;
    state.selectedSlot = null;
    dom.customer.selectedSlot.textContent = 'Henüz saat seçmediniz.';
    setScreen('landing');
  });
  dom.admin.exit.addEventListener('click', () => {
    state.adminLoggedIn = false;
    dom.admin.feedback.textContent = '';
    setAnalyticsPlaceholder();
    setScreen('landing');
  });

  dom.customer.date.addEventListener('change', async (event) => {
    state.customerDate = event.target.value;
    await fetchCustomerSchedule();
  });

  dom.admin.date.addEventListener('change', async (event) => {
    state.adminDate = event.target.value;
    await fetchAdminSchedule();
  });

  dom.customer.bookingForm.addEventListener('submit', handleBookingSubmit);
  dom.admin.closeDay.addEventListener('click', (event) => {
    event.preventDefault();
    closeDay();
  });
  dom.admin.openDay.addEventListener('click', (event) => {
    event.preventDefault();
    openDay();
  });

  dom.admin.notificationToggle?.addEventListener('click', () => {
    dom.admin.notificationPanel?.classList.toggle('hidden');
  });

  dom.admin.markNotificationsRead?.addEventListener('click', () => {
    state.notifications = [];
    persistNotifications();
    renderNotifications();
    dom.admin.notificationPanel?.classList.add('hidden');
  });
}

async function init() {
  attachEvents();
  await Promise.all([loadServices(), loadProducts(), loadPackages(), loadExtras(), loadStats()]);
  await fetchCustomerSchedule();
}

init();
