const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const appointmentsRoute = require('./routes/appointments');
const servicesRoute = require('./routes/services');
const productsRoute = require('./routes/products');
const reportsRoute = require('./routes/reports');

app.use('/appointments', appointmentsRoute);
app.use('/services', servicesRoute);
app.use('/products', productsRoute);
app.use('/reports', reportsRoute);

app.listen(3000, () => console.log('✅ Backend çalışıyor: http://localhost:3000'));
