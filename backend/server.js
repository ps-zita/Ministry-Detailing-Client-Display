const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'cars.json');

app.use(express.json());
app.use(cors());

// Helper function: Read cars data from file.
function readCars() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data file:', err);
    return [];
  }
}

// Helper function: Write cars data to file.
function writeCars(cars) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cars, null, 2));
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

// GET all cars.
app.get('/cars', (req, res) => {
  console.log('GET /cars called');
  const cars = readCars();
  res.json(cars);
});

// POST a new car.
app.post('/cars', (req, res) => {
  const cars = readCars();
  const newCar = req.body;
  console.log('POST /cars called with:', newCar);
  cars.push(newCar);
  writeCars(cars);
  res.json(newCar);
});

// PUT update a car (for updating countdown or other fields).
app.put('/cars/:id', (req, res) => {
  const cars = readCars();
  const { id } = req.params;
  const updates = req.body;
  const index = cars.findIndex(car => String(car.id) === id);
  if (index !== -1) {
    cars[index] = { ...cars[index], ...updates };
    writeCars(cars);
    console.log(`PUT /cars/${id} called. Updated car:`, cars[index]);
    res.json(cars[index]);
  } else {
    res.status(404).send("Car not found");
  }
});

// DELETE a car.
app.delete('/cars/:id', (req, res) => {
  let cars = readCars();
  const { id } = req.params;
  console.log(`DELETE /cars/${id} called`);
  cars = cars.filter(car => String(car.id) !== id);
  writeCars(cars);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});