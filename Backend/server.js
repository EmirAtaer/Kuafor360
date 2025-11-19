const path = require('path');
const express = require('express');
const cors = require('cors');

const appointmentsRoute = require('./routes/appointments');
const servicesRoute = require('./routes/services');
const productsRoute = require('./routes/products');
const reportsRoute = require('./routes/reports');
const customersRoute = require('./routes/customers');
const scheduleRoute = require('./routes/schedule');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/appointments', appointmentsRoute);
app.use('/services', servicesRoute);
app.use('/products', productsRoute);
app.use('/reports', reportsRoute);
app.use('/customers', customersRoute);
app.use('/schedule', scheduleRoute);

const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor 🚀`);
});
