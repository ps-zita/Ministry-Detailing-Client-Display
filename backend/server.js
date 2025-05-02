const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Define the path to booking.json in a way that works from any working directory.
const filePath = path.join(__dirname, 'booking.json');

// Ensure the booking.json exists.
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

// Utility function to prune cancelled and expired bookings
async function pruneBookings() {
  await db.read();
  const now = new Date();
  const originalCount = db.data.bookings.length;
  db.data.bookings = db.data.bookings.filter(booking => {
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

// Middleware
app.use(express.json());
app.use(cors());

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
      countdown: ("countdown" in data) ? data.countdown : durationInSeconds,
      totalTime: ("totalTime" in data) ? data.totalTime : durationInSeconds,
      scheduledTime: scheduled.toISOString(),
      finishTime: finish.toISOString()
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
    const index = db.data.bookings.findIndex(b => String(b.id) === id);

    if (index === -1) {
      console.warn(`PUT /bookings/${id}: Booking not found`);
      return res.status(404).json({ error: "Booking not found" });
    }

    // Process the times if provided.
    if (updates.booking_date_start_formatted || updates.booking_date_end || updates.scheduledTime || updates.finishTime) {
      const current = db.data.bookings[index];
      let scheduled, finish;
      if (updates.booking_date_start_formatted && updates.booking_date_end) {
        scheduled = new Date(updates.booking_date_start_formatted);
        finish = new Date(updates.booking_date_end);
      } else {
        scheduled = updates.scheduledTime ? new Date(updates.scheduledTime) : new Date(current.scheduledTime);
        finish = updates.finishTime ? new Date(updates.finishTime) : new Date(current.finishTime);
      }
      const durationInSeconds = Math.floor((finish - scheduled) / 1000);
      updates.countdown = ("countdown" in updates) ? updates.countdown : durationInSeconds;
      updates.totalTime = ("totalTime" in updates) ? updates.totalTime : durationInSeconds;
      updates.scheduledTime = scheduled.toISOString();
      updates.finishTime = finish.toISOString();
    }

    // Update top-level properties.
    if (updates.customer_first_name !== undefined) {
      db.data.bookings[index].customer_first_name = updates.customer_first_name;
      delete updates.customer_first_name;
    }
    if (updates.customer_last_name !== undefined) {
      db.data.bookings[index].customer_last_name = updates.customer_last_name;
      delete updates.customer_last_name;
    }
    if (updates.booking_description !== undefined) {
      db.data.bookings[index].booking_description = updates.booking_description;
      delete updates.booking_description;
    }
    if (updates.service_name !== undefined) {
      db.data.bookings[index].service_name = updates.service_name;
      delete updates.service_name;
    }
    if (updates.service_id !== undefined) {
      db.data.bookings[index].service_id = updates.service_id;
      delete updates.service_id;
    }
    if (updates.booking_hash_id !== undefined) {
      db.data.bookings[index].booking_hash_id = updates.booking_hash_id;
      delete updates.booking_hash_id;
    }

    // Merge remaining updates
    db.data.bookings[index] = { ...db.data.bookings[index], ...updates };
    await db.write();
    console.log(`[PUT] Booking ${id} updated:`, db.data.bookings[index]);
    res.json(db.data.bookings[index]);
  } catch (error) {
    console.error("Error in PUT /bookings/:id", error);
    res.status(500).json({ error: "Unable to update booking" });
  }
});

// DELETE /bookings/:id endpoint to remove booking
app.delete('/bookings/:id', async (req, res) => {
  try {
    await db.read();
    const { id } = req.params;
    const originalLength = db.data.bookings.length;
    db.data.bookings = db.data.bookings.filter(b => String(b.id) !== id);
    if(db.data.bookings.length < originalLength) {
      await db.write();
      console.log(`[DELETE] Booking ${id} deleted.`);
      res.sendStatus(200);
    } else {
      console.warn(`[DELETE] Booking ${id} not found.`);
      res.status(404).json({ error: "Booking not found" });
    }
  } catch (error) {
    console.error("Error in DELETE /bookings/:id", error);
    res.status(500).json({ error: "Unable to delete booking" });
  }
});

// Webhook endpoint to handle incoming bookings (cancellations or updates)
app.post('/webhook', async (req, res) => {
  try {
    await db.read();
    const data = req.body;
    console.log("[WEBHOOK] Received data:", data);

    const { scheduled, finish, durationInSeconds } = determineTimes(data);
    
    const bookingFromWebhook = {
      id: Date.now().toString(),
      customer_first_name: data.customer_first_name !== undefined ? data.customer_first_name : "",
      customer_last_name: data.customer_last_name !== undefined ? data.customer_last_name : "",
      booking_description: data.booking_description !== undefined ? data.booking_description : "",
      service_name: data.service_name || "",
      service_id: data.service_id !== undefined ? data.service_id : "",
      booking_hash_id: data.booking_hash_id || "",
      booking_status: data.booking_status || "Active",
      countdown: ("countdown" in data) ? data.countdown : durationInSeconds,
      totalTime: ("totalTime" in data) ? data.totalTime : durationInSeconds,
      scheduledTime: scheduled.toISOString(),
      finishTime: finish.toISOString()
    };

    // If a cancellation webhook, remove all bookings with matching booking_hash_id.
    if (bookingFromWebhook.booking_status === 'Cancelled' && bookingFromWebhook.booking_hash_id) {
      const originalLength = db.data.bookings.length;
      db.data.bookings = db.data.bookings.filter(b => b.booking_hash_id !== bookingFromWebhook.booking_hash_id);
      if (db.data.bookings.length < originalLength) {
        await db.write();
        console.log(`[WEBHOOK] Cancelled bookings with booking_hash_id ${bookingFromWebhook.booking_hash_id} removed.`);
        return res.json({ message: "Booking(s) removed due to cancellation." });
      }
      return res.json({ message: "No matching booking for cancellation found." });
    } else {
      // Check for duplicate service_id. If found, update the existing booking.
      if (bookingFromWebhook.service_id && bookingFromWebhook.service_id !== "") {
        const duplicateIndex = db.data.bookings.findIndex(b => b.service_id === bookingFromWebhook.service_id);
        if (duplicateIndex !== -1) {
          db.data.bookings[duplicateIndex] = bookingFromWebhook;
          await db.write();
          console.log(`[WEBHOOK] Booking with service_id ${bookingFromWebhook.service_id} updated.`);
          return res.json(bookingFromWebhook);
        }
      }
      // Otherwise, push new booking.
      db.data.bookings.push(bookingFromWebhook);
      await db.write();
      console.log("[WEBHOOK] New booking added:", bookingFromWebhook);
      return res.json(bookingFromWebhook);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Unable to process webhook" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
