# Ministry Detailing Client Display

This project is created for Ministry of Detailing to enhance the client experience by providing a real-time booking display system and a simple API server to manage booking data. The system is designed to run on a monitor at the front of the store, allowing clients to view the progress of their bookings in real-time. It also includes an API server that uses a JSON file for storage, enabling easy integration with webhooks and other systems to manage booking data.

The dashboard shows scheduled, in-progress, and recently finished bookings, letting clients easily track their appointments. In addition, the client display now features a dynamic horizontal marquee at the bottom of the screen. This marquee continuously scrolls live news headlines fetched from various New York Times RSS feeds (MiddleEast, World, Soccer, Business) and live stock ticker elements. The stock tickers are retrieved via the Alpha Vantage API using the provided API key and display key financial instruments and indices with Unicode triangle indicators (▲ for up in green, ▼ for down in red). A fixed rewards message ("ASK US ABOUT OUR REWARDS PROGRAM") is also interleaved periodically, ensuring that the marquee adds an extra layer of engaging real-time information.

The API server handles incoming webhook data for storage and provides an endpoint to serve the current list of bookings to the client display.

---

## Project Overview

### Purpose
To provide a live client display system for Ministry of Detailing that shows booking information on a storefront monitor while offering a simple API server to manage booking data. The marquee, integrating live news headlines and stock tickers, further enhances the client experience with engaging, real-time information.

### Server Implementation
- **API Server:**  
  - **Framework:** Node.js with Express.
  - **Port:** The server listens on port 3001.
  - **Endpoints:**  
    - `POST /webhook`: Receives booking data as JSON, appends it to a local JSON file (`bookings.json`), and returns the newly stored booking.
    - `GET /bookings`: Serves the current list of bookings from the JSON file.

### Dependencies
- **Express:** For handling HTTP requests.
- **CORS:** To enable cross-origin resource sharing.
- **Node Modules:** Built-in `fs` and `path` for local file system operations.

---

## Getting Started

### Prerequisites
- Node.js installed on your server.
- npm (Node Package Manager) to install dependencies.
- Localtunnel (or a similar service) for exposing your local server to the internet.

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/ps-zita/Ministry-Detailing-Client-Display.git
   cd Ministry-Detailing-Client-Display
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Server:**
   ```bash
   node server.js
   ```
   The server runs on port 3001.

### Exposing Your Server with Localtunnel

- **Tunnel Your Local Server:**
  ```bash
  npx localtunnel --port 3001 --subdomain your-custom-subdomain
  ```
  This will create a public URL, such as `https://your-custom-subdomain.loca.lt`.

- **Update Client-Side HTML:**
  In your client-side HTML, change the API URL from:
  ```js
  fetch('https://localhost:3001/bookings')
  ```
  to:
  ```js
  fetch('https://your-custom-subdomain.loca.lt/bookings')
  ```

### Configuring Your Webhook

- **Webhook Endpoint:**
  Configure your CRM webhook to point to:
  ```
  https://your-custom-subdomain.loca.lt/webhook
  ```

- **Authentication:**  
  If prompted, provide the necessary client-side device password.

---

## Project Structure

```
├── server.js                   # Main API server file handling webhook and bookings endpoints
├── bookings.json               # JSON file storing booking data (auto-created if not present)
├── monitor_localtunnel.sh      # Script to tunnel port 3001 for webhook reception
└── README.md                   # Project documentation (this file)
```

---

## Customization

- **Endpoint URLs:**  
  Modify endpoints in `server.js` as needed (e.g., adjust the `/webhook` route).

- **Data Storage:**  
  Uses a local JSON file; for production, consider integrating a proper database.

- **Localtunnel Configuration:**  
  Adjust the Localtunnel parameters (e.g., subdomain) as needed and update your client-side links accordingly.

---

## Noncommercial Use Notice

This project is provided for noncommercial, educational, and personal use only. For any other use, please contact the author for appropriate licensing or permissions.

---

## Troubleshooting

- **CORS Issues:**  
  The server has CORS enabled. If you encounter cross-origin errors, check your browser console.

- **File Read/Write Errors:**  
  Ensure the server has the necessary permissions to access and modify `bookings.json`.

- **Localtunnel Issues:**  
  Verify that Localtunnel is running properly and that your firewall settings allow external connections.

---

## Conclusion

This project serves as a foundational template for an API server which collects and serves booking data, powering a dynamic client display system. With the integrated marquee that provides live news headlines and real-time stock tickers, Ministry of Detailing offers an engaging and informative experience for its customers. Customize the solution to meet your specific needs and integrate it with your CRM or webhook provider for a seamless booking experience.

Happy Detailing!
