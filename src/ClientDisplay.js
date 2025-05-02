import React, { useState, useEffect, useRef } from 'react';

const ClientDisplay = () => {
  const [bookings, setBookings] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('http://192.168.1.109:3001/bookings'); // Updated URL
        if (response.ok) {
          const data = await response.json();
          setBookings(data);
        } else {
          console.error("Failed to fetch bookings:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    // Fetch bookings immediately and every 2 seconds
    fetchBookings();
    intervalRef.current = setInterval(fetchBookings, 2000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div>
      <h1>Bookings</h1>
      {bookings.map((booking) => (
        <div key={booking.id}>
          <p>{booking.customer_first_name} {booking.customer_last_name}</p>
          <p>{booking.service_name}</p>
          <p>{booking.booking_description}</p>
        </div>
      ))}
    </div>
  );
};

export default ClientDisplay;
