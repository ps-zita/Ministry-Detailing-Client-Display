const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001; // Backend port
const HOST = '192.168.1.109'; // IP address for backend

// Define the path to booking.json
const filePath = path.join(__dirname, 'booking.json');

// Ensure the booking.json exists
if (!fs.existsSync(filePath)) {
  console.log("booking.json not found. Creating new file.");
  fs.writeFileSync(filePath, JSON.stringify({ bookings: [] }, null, 2));
}

const adapter = new JSONFile(filePath);
const db = new Low(adapter);

// Initialize database
async function initDB() {
  await db.read();
  db.data = db.data || { bookings: [] };
  await db.write();
  console.log("Database initialized.");
}
initDB();

// Middleware
app.use(express.json());
app.use(cors());

// GET /bookings endpoint
app.get('/bookings', async (req, res) => {
  try {
    await db.read();
    res.json(db.data.bookings);
  } catch (error) {
    console.error("Error in GET /bookings:", error);
    res.status(500).json({ error: "Unable to fetch bookings" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
