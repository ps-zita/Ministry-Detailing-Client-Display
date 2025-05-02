const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Enable CORS so that requests from 192.168.1.109:3000 are accepted.
app.use(cors({
  origin: 'http://192.168.1.109:3000'
}));

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
  db.data = db.data || { bookings: [] };
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
    if (booking.booking_status === 'Cancelled') return false;
    if (booking.finishTime) {
      const finish = new Date(booking.finishTime);
      if (now - finish > 3600000) return false;
    }
    return true;
  });
  if (db.data.bookings.length !== originalCount) {
    await db.write();
  }
}

// Middleware
app.use(express.json());

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
  return {scheduled, finish, durationInSeconds};
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

    // Update top-level keys
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

    db.data.bookings[index] = { ...db.data.bookings[index], ...updates };
    await db.write();
    console.log(`Booking ${id} updated:`, db.data.bookings[index]);
    res.json(db.data.bookings[index]);
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
    db.data.bookings = db.data.bookings.filter(b => String(b.id) !== id);
    await db.write();
    console.log(`Booking ${id} deleted`);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in DELETE /bookings/:id", error);
    res.status(500).json({ error: "Unable to delete booking" });
  }
});

// Webhook endpoint to handle incoming bookings (including cancellations and updates)
// If the incoming webhook indicates a booking is cancelled and contains a booking_hash_id,
// remove every prior booking with that same booking_hash_id.
// If not cancelled and its service_id is duplicated, update (replace) the existing booking.
app.post('/webhook', async (req, res) => {
  try {
    await db.read();
    const bookingInfo = req.body;
    console.log("Received webhook:", bookingInfo);

    const { scheduled, finish, durationInSeconds } = determineTimes(bookingInfo);

    const bookingFromWebhook = {
      id: Date.now().toString(),
      customer_first_name: (bookingInfo.customer_first_name !== undefined) ? bookingInfo.customer_first_name : "",
      customer_last_name: (bookingInfo.customer_last_name !== undefined) ? bookingInfo.customer_last_name : "",
      booking_description: (bookingInfo.booking_description !== undefined) ? bookingInfo.booking_description : "",
      service_name: bookingInfo.service_name || "",
      service_id: (bookingInfo.service_id !== undefined) ? bookingInfo.service_id : "",
      booking_hash_id: bookingInfo.booking_hash_id || "",
      booking_status: bookingInfo.booking_status || "Active",
      countdown: ("countdown" in bookingInfo) ? bookingInfo.countdown : durationInSeconds,
      totalTime: ("totalTime" in bookingInfo) ? bookingInfo.totalTime : durationInSeconds,
      scheduledTime: scheduled.toISOString(),
      finishTime: finish.toISOString()
    };

    // Process cancellation: remove all bookings with the same booking_hash_id.
    if (bookingFromWebhook.booking_status === 'Cancelled' && bookingFromWebhook.booking_hash_id) {
      const initialCount = db.data.bookings.length;
      db.data.bookings = db.data.bookings.filter(
        b => b.booking_hash_id !== bookingFromWebhook.booking_hash_id
      );
      if (db.data.bookings.length < initialCount) {
        await db.write();
        console.log(`Removed booking(s) with booking_hash_id ${bookingFromWebhook.booking_hash_id} due to cancellation.`);
        return res.json({ message: "Booking(s) removed due to cancellation." });
      }
      return res.json({ message: "No booking found matching the cancellation criteria." });
    } else {
      // If not cancelled, check for duplicate service_id to update existing booking.
      if (bookingFromWebhook.service_id && bookingFromWebhook.service_id !== "") {
        const existingIndex = db.data.bookings.findIndex(b => b.service_id === bookingFromWebhook.service_id);
        if (existingIndex !== -1) {
          db.data.bookings[existingIndex] = bookingFromWebhook;
          await db.write();
          console.log(`Updated booking with duplicate service_id ${bookingFromWebhook.service_id}.`);
          return res.json(bookingFromWebhook);
        }
      }
      // Otherwise, add as new booking.
      db.data.bookings.push(bookingFromWebhook);
      await db.write();
      console.log("Webhook booking added:", bookingFromWebhook);
      return res.json(bookingFromWebhook);
    }
  } catch (error) {
    console.error("Error in webhook endpoint:", error);
    res.status(500).json({ error: "Unable to process webhook" });
  }
});

app.listen(PORT, '192.168.1.109', () => {
  console.log(`Server is running on http://192.168.1.109:${PORT}`);
});
