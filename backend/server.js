const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Define the JSON file path
const file = path.join(__dirname, 'booking.json');

// Ensure the JSON file exists; if not, create it with default structure.
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({ bookings: [] }, null, 2));
}

const adapter = new JSONFile(file);
const db = new Low(adapter);

// Initialize database
async function initDB() {
  await db.read();
  if (!db.data) {
    db.data = { bookings: [] };
  }
  await db.write();
}
initDB();

// Utility function to prune cancelled and expired bookings
// A booking is considered expired if finishTime is more than 1 hour ago.
async function pruneBookings() {
  await db.read();
  const now = new Date();
  const originalCount = db.data.bookings.length;

  db.data.bookings = db.data.bookings.filter(booking => {
    // Remove bookings that are cancelled.
    if (booking.booking_status === 'Cancelled') {
      return false;
    }
    // Remove expired bookings, defined as finishTime more than 1 hour ago.
    if (booking.finishTime) {
      const finish = new Date(booking.finishTime);
      return (now - finish) <= 3600000;
    }
    return true;
  });

  if (db.data.bookings.length !== originalCount) {
    await db.write();
  }
}

// Middleware
app.use(express.json());
app.use(cors());

// GET endpoint to fetch all bookings (pruning cancelled and expired bookings first)
app.get('/bookings', async (req, res) => {
  try {
    await pruneBookings();
    await db.read();
    console.log("GET /bookings called");
    res.json(db.data.bookings);
  } catch (error) {
    console.error("Error in GET /bookings:", error);
    res.status(500).json({ error: "Unable to fetch bookings" });
  }
});

// Helper function to determine scheduled and finish times and calculate duration
function determineTimes(bookingData) {
  let scheduled, finish;
  if ("booking_date_start_formatted" in bookingData && "booking_date_end" in bookingData) {
    scheduled = new Date(bookingData.booking_date_start_formatted);
    finish = new Date(bookingData.booking_date_end);
  } else {
    scheduled = ("scheduledTime" in bookingData)
      ? new Date(bookingData.scheduledTime)
      : new Date(Date.now() + 5000);
    finish = ("finishTime" in bookingData)
      ? new Date(bookingData.finishTime)
      : new Date(Date.now() + 1800000);
  }
  const durationInSeconds = Math.floor((finish - scheduled) / 1000);
  return { scheduled, finish, durationInSeconds };
}

// POST endpoint to create a new booking
app.post('/bookings', async (req, res) => {
  try {
    await db.read();
    const bookingData = req.body;
    const { scheduled, finish, durationInSeconds } = determineTimes(bookingData);

    const newBooking = {
      id: Date.now().toString(),
      customer_first_name: bookingData.customer_first_name || "",
      customer_last_name: bookingData.customer_last_name || "",
      booking_description: bookingData.booking_description || "",
      service_name: bookingData.service_name || "",
      service_id: (bookingData.service_id !== undefined) ? bookingData.service_id : "",
      booking_hash_id: bookingData.booking_hash_id || "",
      booking_status: bookingData.booking_status || "Active",
      countdown: ("countdown" in bookingData) ? bookingData.countdown : durationInSeconds,
      totalTime: ("totalTime" in bookingData) ? bookingData.totalTime : durationInSeconds,
      scheduledTime: scheduled.toISOString(),
      finishTime: finish.toISOString()
    };

    // Append new booking rather than replacing the array
    db.data.bookings.push(newBooking);
    await db.write();
    console.log("New booking added:", newBooking);
    res.json(newBooking);
  } catch (error) {
    console.error("Error in POST /bookings:", error);
    res.status(500).json({ error: "Unable to create a new booking" });
  }
});

// PUT endpoint to update a booking by id
app.put('/bookings/:id', async (req, res) => {
  try {
    await db.read();
    const { id } = req.params;
    const updates = req.body;
    const index = db.data.bookings.findIndex(b => String(b.id) === id);

    if (index === -1) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Process times if provided
    if (updates.booking_date_start_formatted || updates.booking_date_end || updates.scheduledTime || updates.finishTime) {
      const currentBooking = db.data.bookings[index];
      let scheduled, finish;
      if ("booking_date_start_formatted" in updates && "booking_date_end" in updates) {
        scheduled = new Date(updates.booking_date_start_formatted);
        finish = new Date(updates.booking_date_end);
      } else {
        scheduled = updates.scheduledTime ? new Date(updates.scheduledTime) : new Date(currentBooking.scheduledTime);
        finish = updates.finishTime ? new Date(updates.finishTime) : new Date(currentBooking.finishTime);
      }
      const durationInSeconds = Math.floor((finish - scheduled) / 1000);
      updates.countdown = ("countdown" in updates) ? updates.countdown : durationInSeconds;
      updates.totalTime = ("totalTime" in updates) ? updates.totalTime : durationInSeconds;
      updates.scheduledTime = scheduled.toISOString();
      updates.finishTime = finish.toISOString();
    }

    // Merge updates into the found booking
    const updatedBooking = { ...db.data.bookings[index], ...updates };

    // If the update sets the booking_status to 'Cancelled', remove the booking.
    if (updatedBooking.booking_status === 'Cancelled') {
      db.data.bookings = db.data.bookings.filter(b => String(b.id) !== id);
      await db.write();
      console.log(`Booking ${id} cancelled and removed via update.`);
      return res.json({ message: `Booking ${id} removed due to cancellation.` });
    }

    db.data.bookings[index] = updatedBooking;
    await db.write();
    console.log(`Booking ${id} updated:`, updatedBooking);
    res.json(updatedBooking);
  } catch (error) {
    console.error("Error in PUT /bookings/:id", error);
    res.status(500).json({ error: "Unable to update booking" });
  }
});

// DELETE endpoint to remove a booking by id
app.delete('/bookings/:id', async (req, res) => {
  try {
    await db.read();
    const { id } = req.params;
    const beforeCount = db.data.bookings.length;

    // Remove booking by ID
    db.data.bookings = db.data.bookings.filter(b => String(b.id) !== id);

    if (beforeCount === db.data.bookings.length) {
      return res.status(404).json({ error: "Booking not found" });
    }

    await db.write();
    console.log(`Booking ${id} deleted`);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in DELETE /bookings/:id", error);
    res.status(500).json({ error: "Unable to delete booking" });
  }
});

// Webhook endpoint to handle incoming bookings (including cancellations and updates)
app.post('/webhook', async (req, res) => {
  try {
    await db.read();
    const bookingInfo = req.body;
    console.log("Received webhook:", bookingInfo);

    const { scheduled, finish, durationInSeconds } = determineTimes(bookingInfo);

    // If the webhook provides an id and status cancelled, remove that booking.
    if (bookingInfo.booking_status === 'Cancelled' && bookingInfo.id) {
      const beforeCount = db.data.bookings.length;
      db.data.bookings = db.data.bookings.filter(b => String(b.id) !== String(bookingInfo.id));
      if (db.data.bookings.length < beforeCount) {
        await db.write();
        console.log(`Booking with ID ${bookingInfo.id} cancelled and removed via webhook.`);
        return res.json({ message: `Booking with ID ${bookingInfo.id} removed due to cancellation.` });
      } else {
        return res.status(404).json({ error: "Booking not found for cancellation." });
      }
    }

    // Add or update booking via webhook (if not cancelled)
    const newBooking = {
      id: Date.now().toString(),
      customer_first_name: bookingInfo.customer_first_name || "",
      customer_last_name: bookingInfo.customer_last_name || "",
      booking_description: bookingInfo.booking_description || "",
      service_name: bookingInfo.service_name || "",
      service_id: bookingInfo.service_id || "",
      booking_hash_id: bookingInfo.booking_hash_id || "",
      booking_status: bookingInfo.booking_status || "Active",
      countdown: ("countdown" in bookingInfo) ? bookingInfo.countdown : durationInSeconds,
      totalTime: ("totalTime" in bookingInfo) ? bookingInfo.totalTime : durationInSeconds,
      scheduledTime: scheduled.toISOString(),
      finishTime: finish.toISOString()
    };

    // Check for update by some unique identifier e.g., service_id or booking_hash_id.
    const index = db.data.bookings.findIndex(
      b => b.service_id === newBooking.service_id && newBooking.service_id !== ""
    );
    if (index !== -1) {
      db.data.bookings[index] = newBooking;
      await db.write();
      console.log(`Booking updated via webhook with service_id ${newBooking.service_id}.`);
      return res.json(newBooking);
    }

    // Otherwise, add as new booking.
    db.data.bookings.push(newBooking);
    await db.write();
    console.log("New booking added via webhook:", newBooking);
    res.json(newBooking);
  } catch (error) {
    console.error("Error in webhook endpoint:", error);
    res.status(500).json({ error: "Unable to process webhook" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
