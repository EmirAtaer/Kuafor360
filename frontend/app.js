const API_URL = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:5050';

const serviceSelect = document.getElementById('service-select');
const slotSelect = document.getElementById('slot-select');
const packageContainer = document.getElementById('package-list');
const extraContainer = document.getElementById('extra-list');
const bookingForm = document.getElementById('booking-form');
const bookingFeedback = document.getElementById('booking-feedback');
const productList = document.getElementById('product-list');
const addProductBtn = document.getElementById('add-product');

const stats = {
  bookings: document.getElementById('stat-bookings'),
  income: document.getElementById('stat-income'),
  packages: document.getElementById('stat-packages'),
};

const analyticsLists = {
  services: document.getElementById('popular-services'),
  products: document.getElementById('popular-products'),
  peaks: document.getElementById('peak-times'),
};
const revenueBody = document.querySelector('#revenue-table tbody');

const customerLogin = document.getElementById('customer-login');
const adminLogin = document.getElementById('admin-login');

const state = {
  selectedDate: null,
  products: [],
};

const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);

async function safeFetch(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('İstek başarısız: ' + response.status);
    return await response.json();
  } catch (error) {
    console.warn('API isteği başarısız', error);
    return null;
  }
}

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

async function loadServices() {
  const services = await safeFetch(`${API_URL}/services`);
  serviceSelect.innerHTML = '';
  if (!services?.length) {
    serviceSelect.appendChild(createOption('', 'Hizmet bulunamadı'));
    return;
  }
  serviceSelect.appendChild(createOption('', 'Hizmet seçiniz'));
  services.forEach((service) => {
    serviceSelect.appendChild(createOption(service.id, `${service.name} — ${formatCurrency(service.price)}`));
  });
}

async function loadPackages() {
  const data = await safeFetch(`${API_URL}/services/packages`);
  packageContainer.innerHTML = '';
  const packages = data?.packages ?? [];
  stats.packages.textContent = packages.length;
  packages.forEach((pkg) => {
    const card = document.createElement('article');
    card.className = 'package-card';
    card.innerHTML = `
      <h3>${pkg.name}</h3>
      <p>${pkg.description}</p>
      <small>${pkg.duration_minutes} dk · ${pkg.price_hint}</small>
      <ul>${pkg.services.map((s) => `<li>${s}</li>`).join('')}</ul>
    `;
    packageContainer.appendChild(card);
  });
}

async function loadExtras() {
  const data = await safeFetch(`${API_URL}/products/featured`);
  extraContainer.innerHTML = '';
  const extras = data?.extras ?? [];
  extras.forEach((extra) => {
    const card = document.createElement('article');
    card.className = 'extra-card';
    card.innerHTML = `
      <h3>${extra.category}</h3>
      <p>${extra.note}</p>
      <ul>${extra.items.map((item) => `<li>${item}</li>`).join('')}</ul>
    `;
    extraContainer.appendChild(card);
  });
}

async function loadStats() {
  const today = new Date().toISOString().split('T')[0];
  const daily = await safeFetch(`${API_URL}/appointments/day/${today}`);
  stats.bookings.textContent = daily?.length ?? 0;

  const income = await safeFetch(`${API_URL}/reports/revenue-summary`);
  if (income?.length) {
    const todayIncome = income.find((row) => row.date?.startsWith(today));
    if (todayIncome) {
      stats.income.textContent = formatCurrency(todayIncome.total_income || 0);
    }
  }
}

async function loadAnalytics() {
  const [popularServices, popularProducts, peakTimes, revenue] = await Promise.all([
    safeFetch(`${API_URL}/reports/popular-services`),
    safeFetch(`${API_URL}/reports/popular-products`),
    safeFetch(`${API_URL}/reports/peak-times`),
    safeFetch(`${API_URL}/reports/revenue-summary`),
  ]);

  function buildList(list, target) {
    target.innerHTML = '';
    (list ?? []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = Object.values(item).join(' • ');
      target.appendChild(li);
    });
  }

  buildList(popularServices, analyticsLists.services);
  buildList(popularProducts, analyticsLists.products);
  buildList(peakTimes, analyticsLists.peaks);

  revenueBody.innerHTML = '';
  (revenue ?? []).forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date?.split('T')[0] ?? '-'}</td>
      <td>${formatCurrency(row.service_income || 0)}</td>
      <td>${formatCurrency(row.product_income || 0)}</td>
      <td>${formatCurrency(row.total_income || 0)}</td>
    `;
    revenueBody.appendChild(tr);
  });
}

async function loadSlots(date) {
  if (!date) return;
  const data = await safeFetch(`${API_URL}/appointments/available?date=${date}`);
  slotSelect.innerHTML = '';
  if (!data?.available_slots?.length) {
    slotSelect.appendChild(createOption('', 'Müsait saat yok.'));
    return;
  }
  slotSelect.appendChild(createOption('', 'Saat seçiniz'));
  data.available_slots.forEach((slot) => {
    slotSelect.appendChild(createOption(slot.start_time, `${slot.start_time} - ${slot.end_time}`));
  });
}

function addProductRow(product = { product_id: '', quantity: 1 }) {
  const row = document.createElement('div');
  row.className = 'product-row';
  row.innerHTML = `
    <label>
      Ürün ID
      <input type="number" min="1" value="${product.product_id}" data-field="product_id" />
    </label>
    <label>
      Adet
      <input type="number" min="1" value="${product.quantity}" data-field="quantity" />
    </label>
    <button type="button" class="btn ghost" aria-label="Ürünü sil">Sil</button>
  `;

  row.querySelector('button').addEventListener('click', () => {
    row.remove();
    state.products = state.products.filter((item) => item.row !== row);
  });

  ['product_id', 'quantity'].forEach((field) => {
    row.querySelector(`[data-field="${field}"]`).addEventListener('input', (event) => {
      const value = event.target.value;
      const productState = state.products.find((item) => item.row === row);
      if (productState) {
        productState[field] = value;
      }
    });
  });

  state.products.push({ ...product, row });
  productList.appendChild(row);
}

addProductBtn.addEventListener('click', () => addProductRow());

bookingForm.date.addEventListener('change', (event) => {
  state.selectedDate = event.target.value;
  loadSlots(state.selectedDate);
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  bookingFeedback.textContent = 'Kaydediliyor...';

  const formData = new FormData(bookingForm);
  const payload = Object.fromEntries(formData.entries());
  payload.customer_id = Number(payload.customer_id);
  payload.service_id = Number(payload.service_id);
  payload.products = state.products
    .map(({ product_id, quantity }) => ({ product_id: Number(product_id), quantity: Number(quantity) }))
    .filter((p) => p.product_id);

  const response = await safeFetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response) {
    bookingFeedback.textContent = 'Randevu başarıyla oluşturuldu!';
    bookingForm.reset();
    productList.innerHTML = '';
    state.products = [];
    if (state.selectedDate) {
      loadSlots(state.selectedDate);
      loadStats();
      loadAnalytics();
    }
  } else {
    bookingFeedback.textContent = 'Bir hata oluştu, lütfen tekrar deneyin.';
  }
});

customerLogin.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = event.target.customerName.value;
  document.body.dataset.role = 'customer';
  alert(`${name} için müşteri paneli hazır. Randevu bölümünü kullanabilirsiniz.`);
});

adminLogin.addEventListener('submit', (event) => {
  event.preventDefault();
  const password = event.target.adminPass.value;
  if (password !== 'kuafor360') {
    alert('Yanlış şifre.');
    return;
  }
  document.body.dataset.role = 'admin';
  alert('Admin paneline hoş geldiniz. Analitik kartları aktif.');
});

loadServices();
loadPackages();
loadExtras();
loadAnalytics();
loadStats();

const today = new Date().toISOString().split('T')[0];
bookingForm.date.value = today;
state.selectedDate = today;
loadSlots(today);
