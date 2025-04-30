const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');

const app = express();
const PORT = 3001;

// Use cars.json for storage. This file will be located
// in the same directory as server.js.
const file = path.join(__dirname, 'cars.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
  try {
    await db.read();
  } catch (err) {
    console.error("Error reading file:", err);
  }
  // Initialize db.data if file is empty
  db.data = db.data || { cars: [] };
  try {
    await db.write();
    console.log("Database initialized in cars.json:", db.data);
  } catch (err) {
    console.error("Error writing file during initialization:", err);
  }
}
initDB();

app.use(express.json());
app.use(cors());

// GET all cars.
app.get('/cars', async (req, res) => {
  await db.read();
  console.log("GET /cars request received. Current bookings:", db.data.cars);
  res.json(db.data.cars);
});

// POST a new car booking.
app.post('/cars', async (req, res) => {
  await db.read();
  const newCar = req.body;
  console.log("POST /cars: Received new booking:", newCar);
  db.data.cars.push(newCar);
  try {
    await db.write();
    console.log("Booking successfully written to cars.json:", db.data.cars);
  } catch (err) {
    console.error("Error writing booking to cars.json:", err);
  }
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
    try {
      await db.write();
      console.log(`PUT /cars/${id} updated booking:`, db.data.cars[index]);
    } catch (err) {
      console.error("Error updating booking in cars.json:", err);
    }
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
  try {
    await db.write();
    console.log("Booking removed. Updated cars.json:", db.data.cars);
  } catch (err) {
    console.error("Error deleting booking from cars.json:", err);
  }
  res.sendStatus(200);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
