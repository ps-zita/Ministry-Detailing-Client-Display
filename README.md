# Ministry of Detailing Booking Manager

The CarWash Display Dashboard is a full-stack application designed to manage and visualize the scheduling and progress of car wash services. The project integrates an Express backend with a React frontend to provide a dynamic, real-time dashboard for both clients and business operators.

## Features

### Express Server
- **RESTful API for Car Management:**  
  - **GET /cars:** Retrieve the list of cars scheduled for a wash.
  - **POST /cars:** Add a new car to the schedule.
  - **PUT /cars/:id:** Update car details (including countdown, scheduled time, ETA, etc.).
  - **DELETE /cars/:id:** Remove a car from the schedule.
- **File-based Data Persistence:**  
  Stores cars data in a JSON file (`cars.json`) ensuring a simple persistence mechanism without the need for an external database.
- **CORS Enabled:**  
  Allows incoming requests from different origins to support frontend and backend separation.

### React Frontend
- **Dynamic Dashboard Views:**  
  - **Client Display:** Show ongoing and completed car washes in separate views.
  - **Business Dashboard:** Provides a timeline view that visualizes the washes booked throughout the day with real-time progress updates.
- **Timeline Visualization:**  
  - Displays scheduled times, countdowns, and durations, laid out on a timeline corresponding to business hours.
  - Stacked timeline to handle overlapping car wash schedules.
- **Real-time Countdown Updates:**  
  Cars have a countdown timer that decreases in real time and updates the progress bar dynamically.
- **Forms for Car Management:**  
  - **Add Car Form:** Capture details such as license plate, brand, type, color, year, ETA, and scheduled time.
  - **Edit Car Details:** Modify details of an existing car entry.
- **Automatic Time Adjustments:**  
  Features buttons to adjust the wash time (+5 and -5 minutes) for on-the-fly scheduling changes.
  
### Additional Functionality
- **Access Code Mechanism:**  
  A hidden access code (triggered by pressing the space bar) allows switching between client and business views. The code is verified by decoding a hexadecimal string.
- **Progress Bar Display:**  
  - Shows a "wash booked" message if the scheduled start time is in the future.
  - Displays an animated progress bar once the car wash has started, along with a dynamic time countdown.

### Customization
- **Change Server File Name:**  
  If your Express server entry file is not named `server.js`, update the batch file accordingly.
- **Port Configuration:**  
  The Express server is set to run on port `3001` by default and the React app on port `3000`. Adjust these settings in your code if necessary.

## License
[MIT License](LICENSE)
