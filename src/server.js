const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');

const app = express();
const PORT = 3001;

// Set up lowdb to use a JSON file for storage.
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Default data will be set when file is empty.
async function initDB() {
  await db.read();
  db.data = db.data || { cars: [] };
  await db.write();
}
initDB();

app.use(express.json());
app.use(cors());

// GET all cars.
app.get('/cars', async (req, res) => {
  await db.read();
  console.log("GET /cars request received.");
  res.json(db.data.cars);
});

// POST a new car booking.
app.post('/cars', async (req, res) => {
  await db.read();
  const newCar = req.body;
  console.log("POST /cars: Received new booking:", newCar);
  db.data.cars.push(newCar);
  await db.write();
  res.json(newCar);
});

// PUT to update an existing car booking.
app.put('/cars/:id', async (req, res) => {
  await db.read();
  const { id } = req.params;
  const updates = req.body;
  const index = db.data.cars.findIndex(car => String(car.id) === id);
  if (index !== -1) {
    db.data.cars[index] = { ...db.data.cars[index], ...updates };
    await db.write();
    console.log(`PUT /cars/${id} updated booking:`, db.data.cars[index]);
    res.json(db.data.cars[index]);
  } else {
    res.status(404).send("Booking not found");
  }
});

// DELETE a car booking.
app.delete('/cars/:id', async (req, res) => {
  await db.read();
  const { id } = req.params;
  console.log(`DELETE /cars/${id}: Removing booking.`);
  db.data.cars = db.data.cars.filter(car => String(car.id) !== id);
  await db.write();
  res.sendStatus(200);
});

// Bind the server to all network interfaces.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});