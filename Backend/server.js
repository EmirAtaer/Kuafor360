const express = require('express');
const cors = require('cors');

const appointmentsRoute = require('./routes/appointments');
const servicesRoute = require('./routes/services');
const productsRoute = require('./routes/products');
const reportsRoute = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Kuaför360 Backend Çalışıyor 💈🔥');
});

app.use('/appointments', appointmentsRoute);
app.use('/services', servicesRoute);
app.use('/products', productsRoute);
app.use('/reports', reportsRoute);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor 🚀`);
});
