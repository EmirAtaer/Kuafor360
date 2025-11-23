const API_URL = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:5050';

const HOURS = Array.from({ length: 12 }, (_, index) => 10 + index);
const FALLBACK_SERVICES = [
  { name: 'Saç', price: 0 },
  { name: 'Sakal', price: 0 },
  { name: 'Saç + Sakal', price: 0 },
  { name: 'Saç + Sakal Paketi', price: 0 },
  { name: 'Saç Bakım Paketi', price: 0 },
  { name: 'Boyama + Şekillendirme', price: 0 },
  { name: 'Cilt Bakımı', price: 0 },
  { name: 'Çocuk Kesimi', price: 0 },
];
const FALLBACK_PRODUCTS = [
  { name: 'Sakal Yağı', price: 0 },
  { name: 'Saç Şekillendirici', price: 0 },
  { name: 'Traş Köpüğü', price: 0 },
  { name: 'After Shave', price: 0 },
  { name: 'Keratin Bakım Seti', price: 0 },
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
    productToggle: document.getElementById('toggle-products'),
    popularServices: document.getElementById('popular-service-pills'),
    popularPackages: document.getElementById('popular-package-pills'),
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
    productPricingList: document.getElementById('product-pricing'),
    refreshIncome: document.getElementById('refresh-income'),
  },
  analytics: {
    services: document.getElementById('popular-services'),
    products: document.getElementById('popular-products'),
    peakDays: document.getElementById('peak-days'),
    revenueBody: document.querySelector('#revenue-table tbody'),
    incomeCards: document.getElementById('income-cards'),
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
  packages: [],
  popularServices: [],
  selectedProducts: {},
  customerSchedule: null,
  adminSchedule: null,
  notifications: [],
};

const fallbackAvailability = (date) => ({
  date,
  closed: false,
  note: null,
  available_slots: HOURS.map((hour) => {
    const { start, end } = createSlotLabel(hour);
    return { start_time: start, end_time: end };
  }),
  blocked_slots: [],
});

dom.customer.date.value = state.customerDate;
dom.admin.date.value = state.adminDate;

setAnalyticsPlaceholder();
loadStoredNotifications();
renderNotifications();

const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

function loadStoredNotifications() {
  try {
    const stored = localStorage.getItem('adminNotifications');
    state.notifications = stored
      ? JSON.parse(stored).map((item) => ({
          ...item,
          key:
            item.key || `${item.date}-${item.start_time}-${item.customer_name || ''}-${item.customer_phone || ''}`,
        }))
      : [];
  } catch (error) {
    console.warn('Bildirimler yüklenemedi', error);
    state.notifications = [];
  }
}

function persistNotifications() {
  localStorage.setItem('adminNotifications', JSON.stringify(state.notifications));
}

function addNotification(entry) {
  const key =
    entry.key || `${entry.date}-${entry.start_time}-${entry.customer_name || ''}-${entry.customer_phone || ''}`;
  if (state.notifications.some((item) => item.key === key)) {
    return;
  }
  state.notifications = [{ ...entry, key, id: Date.now() }, ...state.notifications];
  persistNotifications();
  renderNotifications();
}

function syncNotificationsFromBookings(bookings, date) {
  if (!bookings?.length) return;

  const existingKeys = new Set(state.notifications.map((item) => item.key));
  const newEntries = [];

  bookings.forEach((booking) => {
    const bookingDate = booking.date?.split('T')?.[0] || date;
    const key = `${bookingDate}-${booking.start_time}-${booking.customer_name || ''}-${booking.customer_phone || ''}`;
    if (existingKeys.has(key)) return;
    newEntries.push({
      date: bookingDate,
      start_time: booking.start_time,
      customer_name: booking.customer_name || 'Müşteri',
      customer_phone: booking.customer_phone,
      service_name: booking.service_name,
      key,
    });
  });

  if (newEntries.length) {
    const stamped = newEntries.map((entry, index) => ({ ...entry, id: Date.now() + index }));
    state.notifications = [...stamped, ...state.notifications];
    persistNotifications();
    renderNotifications();
  }
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
    const serviceLabel = item.service_name || 'Hizmet';
    li.textContent = `${item.date} ${item.start_time} • ${item.customer_name} (${item.customer_phone || '-'}) • ${serviceLabel}`;
    dom.admin.notificationList.appendChild(li);
  });
}

async function refreshNotificationsFromServer() {
  const recent = await safeFetch(`${API_URL}/appointments/recent`);
  if (!recent) return;
  syncNotificationsFromBookings(recent);
}

function setAnalyticsPlaceholder() {
  const message = '<li class="muted">Veriler sadece yönetici girişinden sonra görünür.</li>';
  dom.analytics.services.innerHTML = message;
  dom.analytics.products.innerHTML = message;
  dom.analytics.peakDays.innerHTML = message;
  dom.analytics.revenueBody.innerHTML =
    '<tr><td class="muted" colspan="4">Gelir tablosu sadece yönetici girişinden sonra dolar.</td></tr>';
  if (dom.analytics.incomeCards) {
    dom.analytics.incomeCards.innerHTML = '<p class="muted">Gelir kartları yönetici girişiyle dolacak.</p>';
  }
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

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Hizmet seçiniz';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  select.appendChild(defaultOption);

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
      <button class="btn secondary small" data-save-price="${service.id}" ${disabledAttr}>Kaydet</button>
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

function renderProductPricing() {
  if (!dom.admin.productPricingList) return;
  dom.admin.productPricingList.innerHTML = '';

  if (!state.products.length) {
    dom.admin.productPricingList.innerHTML = '<p class="muted">Henüz ürün eklenmedi.</p>';
    return;
  }

  state.products.forEach((product) => {
    const row = document.createElement('div');
    row.className = 'pricing-row product-row';
    row.innerHTML = `
      <div>
        <strong>${product.name}</strong>
        <p class="muted">Müşteriye ekstra ürün olarak sunulur.</p>
      </div>
      <input type="number" min="0" step="10" value="${product.price || 0}" data-product-price="${product.id}" aria-label="${product.name} fiyatı" />
      <button class="btn secondary small" data-save-product="${product.id}">Kaydet</button>
    `;

    const priceInput = row.querySelector('[data-product-price]');
    const saveButton = row.querySelector('[data-save-product]');
    saveButton.addEventListener('click', async () => {
      const newPrice = Number(priceInput.value) || 0;
      dom.admin.feedback.textContent = `${product.name} fiyatı güncelleniyor...`;
      const result = await safeFetch(`${API_URL}/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice }),
      });
      if (result) {
        dom.admin.feedback.textContent = `${product.name} fiyatı güncellendi.`;
        await loadProducts();
      } else {
        dom.admin.feedback.textContent = `${product.name} fiyatı güncellenemedi.`;
      }
    });

    dom.admin.productPricingList.appendChild(row);
  });
}

async function ensureServiceExistsByName(name) {
  const existing = state.services.find((service) => service.name === name);
  if (existing) return existing;

  const created = await safeFetch(`${API_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price: 0 }),
  });

  if (created?.id) {
    await loadServices();
    return state.services.find((service) => service.id === created.id || service.name === name);
  }
  return null;
}

async function selectServiceByName(name) {
  if (!dom.customer.serviceSelect) return;
  let targetOption = Array.from(dom.customer.serviceSelect.options).find((option) =>
    option.textContent.startsWith(name)
  );

  if (!targetOption) {
    const created = await ensureServiceExistsByName(name);
    targetOption = Array.from(dom.customer.serviceSelect.options).find(
      (option) => Number(option.value) === Number(created?.id)
    );
  }

  if (targetOption) {
    targetOption.selected = true;
    dom.customer.feedback.textContent = '';
  }
}

function renderPopularPills(list = []) {
  if (!dom.customer.popularServices) return;
  dom.customer.popularServices.innerHTML = '';

  list.slice(0, 6).forEach((item) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill';
    pill.textContent = `${item.name} (${item.count || 0})`;
    pill.addEventListener('click', () => selectServiceByName(item.name));
    dom.customer.popularServices.appendChild(pill);
  });
}

function renderPackagePills() {
  if (!dom.customer.popularPackages) return;
  dom.customer.popularPackages.innerHTML = '';

  state.packages.slice(0, 4).forEach((pkg) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill';
    pill.textContent = pkg.name;
    pill.addEventListener('click', async () => {
      await selectServiceByName(pkg.name);
      if (!dom.customer.notes.value) {
        dom.customer.notes.value = pkg.description || pkg.name;
      }
    });
    dom.customer.popularPackages.appendChild(pill);
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

  await Promise.all(FALLBACK_SERVICES.map((service) => ensureServiceExistsByName(service.name)));
  services = await safeFetch(`${API_URL}/services`);

  state.services = services?.length ? services : FALLBACK_SERVICES;
  renderServiceOptions();
  renderAdminPricing();
}

async function loadProducts() {
  let products = await safeFetch(`${API_URL}/products`);

  if (!products?.length) {
    await Promise.all(
      FALLBACK_PRODUCTS.map((product) =>
        safeFetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        })
      )
    );
    products = await safeFetch(`${API_URL}/products`);
  }

  state.products = products || [];
  renderProductSelector();
  renderProductPricing();
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
  state.packages = packages;
  dom.hero.packages.textContent = packages.length;
  dom.extras.packages.innerHTML = '';
  dom.customer.popularPackages && renderPackagePills();

  packages.forEach((pkg) => {
    const card = document.createElement('article');
    card.className = 'package-card';
    card.innerHTML = `
      <header style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
        <div>
          <strong>${pkg.name}</strong>
          <p>${pkg.description}</p>
        </div>
        <button class="btn ghost small" type="button" data-pick-package="${pkg.name}">Seç</button>
      </header>
      <small>${pkg.duration_minutes} dk • ${pkg.price_hint}</small>
      <ul>${pkg.services.map((s) => `<li>${s}</li>`).join('')}</ul>
    `;
    const pickBtn = card.querySelector('[data-pick-package]');
    pickBtn.addEventListener('click', async () => {
      await selectServiceByName(pkg.name);
      if (!dom.customer.notes.value) {
        dom.customer.notes.value = pkg.description || pkg.name;
      }
    });
    dom.extras.packages.appendChild(card);
  });

  const missingPackages = packages.filter((pkg) => !state.services.find((service) => service.name === pkg.name));
  if (missingPackages.length) {
    await Promise.all(missingPackages.map((pkg) => ensureServiceExistsByName(pkg.name)));
    await loadServices();
  }
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

async function loadPopularInsights() {
  const popular = await safeFetch(`${API_URL}/reports/popular-services`);
  state.popularServices = popular || [];
  renderPopularPills(state.popularServices);
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

function renderIncomeCards(periods = []) {
  if (!dom.analytics.incomeCards) return;
  dom.analytics.incomeCards.innerHTML = '';

  if (!periods.length) {
    dom.analytics.incomeCards.innerHTML = '<p class="muted">Gelir kartı bulunamadı.</p>';
    return;
  }

  periods.forEach((row) => {
    const card = document.createElement('div');
    card.className = 'income-card';
    card.innerHTML = `
      <strong>${row.period}</strong>
      <p class="muted">Hizmet: ${formatCurrency(row.service_income)}</p>
      <p class="muted">Ürün: ${formatCurrency(row.product_income)}</p>
      <p><span class="muted">Toplam:</span> ${formatCurrency(row.total_income)}</p>
    `;
    dom.analytics.incomeCards.appendChild(card);
  });
}

async function loadIncomeCards() {
  if (!state.adminLoggedIn) {
    renderIncomeCards([]);
    return;
  }
  const periods = await safeFetch(`${API_URL}/reports/revenue-periods`);
  renderIncomeCards(periods || []);
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

  renderPopularPills(popularServices || []);
  await loadIncomeCards();
}

async function fetchCustomerSchedule() {
  if (!state.customerDate) return;
  const [availability, bookings] = await Promise.all([
    safeFetch(`${API_URL}/appointments/available?date=${state.customerDate}`),
    safeFetch(`${API_URL}/appointments/day/${state.customerDate}`),
  ]);
  const safeAvailability = availability || fallbackAvailability(state.customerDate);
  const safeBookings = bookings || [];
  state.customerSchedule = { availability: safeAvailability, bookings: safeBookings };
  state.selectedSlot = null;
  dom.customer.selectedSlot.textContent = 'Henüz saat seçmediniz.';
  buildSlotGrid(dom.customer.slotGrid, safeAvailability, safeBookings, 'customer');
}

async function fetchAdminSchedule() {
  if (!state.adminDate) return;
  const [availability, bookings] = await Promise.all([
    safeFetch(`${API_URL}/appointments/available?date=${state.adminDate}`),
    safeFetch(`${API_URL}/appointments/day/${state.adminDate}`),
  ]);
  const safeAvailability = availability || fallbackAvailability(state.adminDate);
  const safeBookings = bookings || [];
  state.adminSchedule = { availability: safeAvailability, bookings: safeBookings };
  buildSlotGrid(dom.admin.slotGrid, safeAvailability, safeBookings, 'admin');
  renderAdminAppointments(safeBookings);
  syncNotificationsFromBookings(safeBookings, state.adminDate);
  await refreshNotificationsFromServer();
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

  if (!response) {
    const tempCustomer = { id: `local-${Date.now()}`, full_name: payload.full_name, phone: payload.phone };
    state.customer = tempCustomer;
    dom.customer.feedback.textContent = 'Sunucuya erişilemedi, yerel modda devam ediyorsunuz.';
  } else {
    state.customer = response;
    dom.customer.feedback.textContent = '';
  }

  dom.customer.greeting.textContent = `Hoş geldin ${state.customer.full_name}!`;
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
  await Promise.all([fetchAdminSchedule(), loadClosedDays(), refreshNotificationsFromServer()]);
  startNotificationPolling();
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
    const selectedService = state.services.find((service) => Number(service.id) === serviceId);
    addNotification({
      date: state.customerDate,
      start_time: state.selectedSlot.start,
      customer_name: state.customer?.full_name || 'Müşteri',
      customer_phone: state.customer?.phone,
      service_name: selectedService?.name || 'Hizmet',
    });
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
    if (notificationInterval) clearInterval(notificationInterval);
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

  dom.admin.refreshIncome?.addEventListener('click', async () => {
    dom.admin.feedback.textContent = 'Gelir kartları güncelleniyor...';
    await loadIncomeCards();
    dom.admin.feedback.textContent = 'Gelir kartları güncellendi.';
  });

  dom.customer.productToggle?.addEventListener('click', () => {
    dom.customer.productSelector?.classList.toggle('collapsed');
    dom.customer.productToggle.textContent = dom.customer.productSelector.classList.contains('collapsed')
      ? 'Ürünleri aç'
      : 'Ürünleri gizle';
  });

  dom.admin.markNotificationsRead?.addEventListener('click', () => {
    state.notifications = [];
    persistNotifications();
    renderNotifications();
    dom.admin.notificationPanel?.classList.add('hidden');
  });
}

let notificationInterval;
function startNotificationPolling() {
  if (notificationInterval) clearInterval(notificationInterval);
  notificationInterval = setInterval(async () => {
    if (!state.adminLoggedIn) return;
    await refreshNotificationsFromServer();
    if (state.adminDate) {
      const bookings = await safeFetch(`${API_URL}/appointments/day/${state.adminDate}`);
      renderAdminAppointments(bookings || []);
      syncNotificationsFromBookings(bookings || [], state.adminDate);
    }
  }, 20000);
}

async function init() {
  attachEvents();
  await loadServices();
  await Promise.all([loadProducts(), loadPackages(), loadExtras(), loadStats(), loadPopularInsights()]);
  dom.customer.productSelector?.classList.add('collapsed');
  if (dom.customer.productToggle) dom.customer.productToggle.textContent = 'Ürünleri aç';
  await fetchCustomerSchedule();
}

init();
