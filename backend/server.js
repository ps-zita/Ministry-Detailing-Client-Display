const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001; // Backend port
const HOST = process.env.HOST || '192.168.1.109'; // IP address for backend

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
app.use(
  cors({
    origin: ['http://192.168.1.109:3000', 'http://localhost:3000'], // Allow specific origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

// Utility function to prune cancelled and expired bookings
async function pruneBookings() {
  await db.read();
  const now = new Date();
  const originalCount = db.data.bookings.length;
  db.data.bookings = db.data.bookings.filter((booking) => {
    // Remove cancelled bookings
    if (booking.booking_status === 'Cancelled') return false;
    if (booking.finishTime) {
      const finish = new Date(booking.finishTime);
      // Remove bookings where finishTime is over an hour ago
      if (now - finish > 3600000) return false;
    }
    return true;
  });
  if (db.data.bookings.length !== originalCount) {
    console.log(`Pruned ${originalCount - db.data.bookings.length} bookings.`);
    await db.write();
  }
}

// Automatically prune bookings every 2 minutes
setInterval(pruneBookings, 2 * 60 * 1000);

// Helper function to determine scheduled and finish times with duration
function determineTimes(data) {
  let scheduled, finish;
  if (data.booking_date_start_formatted && data.booking_date_end) {
    scheduled = new Date(data.booking_date_start_formatted);
    finish = new Date(data.booking_date_end);
  } else {
    scheduled = data.scheduledTime ? new Date(data.scheduledTime) : new Date(Date.now() + 5000);
    finish = data.finishTime ? new Date(data.finishTime) : new Date(Date.now() + 1800000);
  }
  const durationInSeconds = Math.floor((finish - scheduled) / 1000);
  return { scheduled, finish, durationInSeconds };
}

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// GET /bookings endpoint (after pruning)
app.get('/bookings', async (req, res) => {
  try {
    await pruneBookings();
    await db.read();
    console.log(`[GET] /bookings: Returning ${db.data.bookings.length} bookings.`);
    res.json(db.data.bookings);
  } catch (error) {
    console.error("Error in GET /bookings:", error);
    res.status(500).json({ error: "Unable to fetch bookings" });
  }
});

// POST /bookings endpoint to create new booking
app.post('/bookings', async (req, res) => {
  try {
    await db.read();
    const data = req.body;
    const { scheduled, finish, durationInSeconds } = determineTimes(data);

    const newBooking = {
      id: Date.now().toString(),
      customer_first_name: data.customer_first_name || "",
      customer_last_name: data.customer_last_name || "",
      booking_description: data.booking_description || "",
      service_name: data.service_name || "",
      service_id: data.service_id !== undefined ? data.service_id : "",
      booking_hash_id: data.booking_hash_id || "",
      booking_status: data.booking_status || "Active",
      countdown: "countdown" in data ? data.countdown : durationInSeconds,
      totalTime: "totalTime" in data ? data.totalTime : durationInSeconds,
      scheduledTime: scheduled.toISOString(),
      finishTime: finish.toISOString(),
    };

    db.data.bookings.push(newBooking);
    await db.write();
    console.log("[POST] New booking added:", newBooking);
    res.json(newBooking);
  } catch (error) {
    console.error("Error in POST /bookings:", error);
    res.status(500).json({ error: "Unable to create a new booking" });
  }
});

// PUT /bookings/:id endpoint to update booking
app.put('/bookings/:id', async (req, res) => {
  try {
    await db.read();
    const { id } = req.params;
    const updates = req.body;
    const index = db.data.bookings.findIndex((b) => String(b.id) === id);

    if (index === -1) {
      console.warn(`PUT /bookings/${id}: Booking not found`);
      return res.status(404).json({ error: "Booking not found" });
    }

    // Merge updates into existing booking
    db.data.bookings[index] = { ...db.data.bookings[index], ...updates };
    await db.write();
    console.log(`[PUT] Booking ${id} updated.`);
    res.json(db.data.bookings[index]);
  } catch (error) {
    console.error("Error in PUT /bookings/:id:", error);
    res.status(500).json({ error: "Unable to update booking" });
  }
});

// DELETE /bookings/:id endpoint to remove booking
app.delete('/bookings/:id', async (req, res) => {
  try {
    await db.read();
    const { id } = req.params;
    const originalLength = db.data.bookings.length;
    db.data.bookings = db.data.bookings.filter((b) => String(b.id) !== id);
    if (db.data.bookings.length < originalLength) {
      await db.write();
      console.log(`[DELETE] Booking ${id} deleted.`);
      res.sendStatus(200);
    } else {
      console.warn(`[DELETE] Booking ${id} not found.`);
      res.status(404).json({ error: "Booking not found" });
    }
  } catch (error) {
    console.error("Error in DELETE /bookings/:id:", error);
    res.status(500).json({ error: "Unable to delete booking" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
