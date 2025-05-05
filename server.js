const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS so that GitHub Pages (or any other origin) can fetch data from this API.
app.use(cors());

// Parse incoming JSON requests.
app.use(express.json());

// Define the path for the JSON file that stores booking info.
const filePath = path.join(__dirname, 'bookings.json');

// Ensure the JSON file exists; if not, create an empty array.
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
}

// POST endpoint to receive webhook events and update the JSON file.
app.post('/webhook', (req, res) => {
  const booking = req.body;
  let bookings = [];
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    bookings = JSON.parse(data);
  } catch (error) {
    console.error("Error reading bookings file:", error);
  }

  // Append the new booking.
  bookings.push(booking);

  try {
    fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2), 'utf8');
    console.log('New booking added:', booking);
    res.json({ message: "Booking stored successfully", booking });
  } catch (error) {
    console.error("Error writing bookings file:", error);
    res.status(500).json({ error: "Error storing booking" });
  }
});

// GET endpoint to serve the current contents of the JSON file.
app.get('/bookings', (req, res) => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading bookings file:", err);
      return res.status(500).json({ error: "Error fetching bookings" });
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});