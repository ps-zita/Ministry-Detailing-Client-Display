import React, { useState, useEffect } from 'react';
import ClientDisplay from './ClientDisplay';
import BusinessDashboard from './BusinessDashboard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.7:3001';

function App() {
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState('client'); // default view is ClientDisplay

  const fetchBookings = () => {
    fetch(`${API_BASE_URL}/bookings`)
      .then(response => response.json())
      .then(data => setBookings(data))
      .catch(err => console.error('Error fetching bookings:', err));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchBookings();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBookings(prevBookings =>
        prevBookings.map(booking => {
          if (booking.countdown > 0) {
            return { ...booking, countdown: booking.countdown - 1 };
          }
          return booking;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const queryAddBooking = (newBooking) => {
    fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking)
    })
      .then(response => response.json())
      .then(addedBooking => setBookings(prev => [...prev, addedBooking]))
      .catch(err => console.error('Error adding booking:', err));
  };

  const adjustTime = (id, deltaMinutes) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    const newCountdown = Math.max(booking.countdown + deltaMinutes * 60, 0);
    fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countdown: newCountdown })
    })
      .then(response => response.json())
      .then(updatedBooking => {
        setBookings(prev => prev.map(b => (b.id === id ? updatedBooking : b)));
      })
      .catch(err => console.error('Error adjusting time:', err));
  };

  const removeBooking = (id) => {
    fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'DELETE'
    })
      .then(() => setBookings(prev => prev.filter(b => b.id !== id)))
      .catch(err => console.error('Error removing booking:', err));
  };

  const clearBookings = () => {
    if (window.confirm("Are you sure you want to clear all bookings?")) {
      Promise.all(bookings.map(booking =>
        fetch(`${API_BASE_URL}/bookings/${booking.id}`, { method: 'DELETE' })
      ))
      .then(() => setBookings([]))
      .catch(err => console.error('Error clearing bookings:', err));
    }
  };

  const updateBooking = (updatedBooking) => {
    fetch(`${API_BASE_URL}/bookings/${updatedBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBooking)
    })
      .then(response => response.json())
      .then(booking => {
        setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
      })
      .catch(err => console.error('Error updating booking:', err));
  };

  const decodeAccessKey = (encoded) => {
    let decoded = "";
    for (let i = 0; i < encoded.length; i += 2) {
      const code = parseInt(encoded.substr(i, 2), 16);
      decoded += String.fromCharCode(code);
    }
    return decoded;
  };

  const encodedAccess = "52333574722163743344";
  const actualAccessCode = decodeAccessKey(encodedAccess);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        const input = window.prompt("Enter access code to switch to Business Dashboard:");
        if (input === actualAccessCode) {
          setView("business");
        } else {
          alert("Incorrect access code!");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actualAccessCode]);

  return (
    <div>
      {view === 'client' ? (
        <ClientDisplay bookings={bookings} />
      ) : (
        <BusinessDashboard
          bookings={bookings}
          queryAddBooking={queryAddBooking}
          adjustTime={adjustTime}
          removeBooking={removeBooking}
          updateBooking={updateBooking}
          clearBookings={clearBookings}
        />
      )}
    </div>
  );
}

export default App;