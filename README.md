# Ministry Detailing Client Display

This project provides a simple API server to manage booking data using a JSON file as storage. It supports receiving and storing booking requests via webhooks and exposing the current bookings via an HTTP GET endpoint. This project is licensed under a noncommercial license.

## License

This project is licensed for noncommercial use only. See [LICENSE](LICENSE) for details.

## Project Overview

- **Server Implementation:**  
  The server is implemented using Node.js with the Express framework. It listens on port 3001 and handles two endpoints:
  - `POST /webhook`: Receives booking data as JSON, appends it to a local JSON file (`bookings.json`), and returns the newly stored booking.
  - `GET /bookings`: Serves the current list of bookings from the JSON file.

- **Dependencies:**
  - Express for handling HTTP requests.
  - CORS to enable cross-origin resource sharing.
  - Node's built-in `fs` and `path` modules for file system operations.

## Getting Started

### Prerequisites

- Node.js installed on your server.
- npm (Node Package Manager) to install dependencies.
- [Localtunnel](https://localtunnel.github.io/www/) (or a similar tunneling service) for exposing your local server to the internet.

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/ps-zita/Ministry-Detailing-Client-Display.git
   cd your-repo-name
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Run the Server:**

   Start the server using Node.js:

   ```bash
   node server.js
   ```

   The server will run on port 3001.

### Exposing Your Server with Localtunnel

1. **Tunnel Your Local Server:**

   Use Localtunnel to expose the server running on port 3001. Replace `<subdomain>` with your preferred subdomain if required. If prompted, enter your password on the client side device.

   ```bash
   npx localtunnel --port 3001 --subdomain your-custom-subdomain
   ```

   This command will create a public URL (for example, `https://your-custom-subdomain.loca.lt`) that tunnels to your local server.

2. **Update the Client-Side HTML:**

   In your client-side HTML file, update the API URL to the Localtunnel link. For example, change the fetch URL from:

   ```javascript
   fetch('https://localhost:3001/bookings')
   ```

   to:

   ```javascript
   fetch('https://your-custom-subdomain.loca.lt/bookings')
   ```

### Configuring Your Webhook

- **Webhook Endpoint:**

  Use your EasyWeek CRM webhook setup to point to the Localtunnel URL with the `/webhook` path. For example:

  ```
  https://your-custom-subdomain.loca.lt/webhook
  ```

- **Authentication:**

  If your localtunnel service requests a password on the client side device, make sure to provide the required password for authentication.

## Project Structure

```
├── server.js          # The main API server file handling webhook and bookings endpoints
├── bookings.json      # JSON file storing booking data (created automatically if it doesn't exist)
└── README.md          # This documentation file
```

## Customization

- **Endpoint URLs:**  
  Change the endpoints in `server.js` if needed. For example, modify the `/webhook` route to suit your integration needs.

- **Data Storage:**  
  This example uses a local JSON file for storage. For production, consider integrating a database.

- **Localtunnel Configuration:**  
  Modify the Localtunnel parameters (such as subdomain) as needed. Make sure to update all client-side links accordingly.

## Noncommercial Use Notice

This project and its code are provided for noncommercial, educational, and personal use only. For any other use, please contact me to seek an appropriate license or permission. 

## Troubleshooting

- **CORS Issues:**  
  The server has CORS enabled, but if you encounter cross-origin errors, check your browser console for details.

- **File Read/Write Errors:**  
  Ensure the server has the necessary permissions to read/write `bookings.json`.

- **Localtunnel Issues:**  
  If the public URL is not accessible, verify that Localtunnel is running correctly and that no firewall is blocking the connection.

## Conclusion

This project serves as a basic template for an API server that collects webhook data, stores it locally, and serves it via an endpoint. Customize it to fit your specific requirements and integrate it with your CRM or webhook provider.

Happy coding!
