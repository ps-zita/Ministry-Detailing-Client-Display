import React, { useState, useEffect } from 'react';
import ClientDisplay from './ClientDisplay';
import BusinessDashboard from './BusinessDashboard';

function App() {
  const [cars, setCars] = useState([]);
  const [view, setView] = useState('client'); // default view is ClientDisplay

  // Fetch cars from backend
  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = () => {
    fetch('http://localhost:3001/cars')
      .then(response => response.json())
      .then(data => setCars(data))
      .catch(err => console.error('Error fetching cars:', err));
  };

  // Global timer: update car countdown every second.
  useEffect(() => {
    const timer = setInterval(() => {
      cars.forEach(car => {
        if (car.countdown > 0) {
          const newCountdown = car.countdown - 1;
          fetch(`http://localhost:3001/cars/${car.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countdown: newCountdown })
          })
            .then(response => response.json())
            .then(updatedCar => {
              setCars(prevCars =>
                prevCars.map(c => (c.id === updatedCar.id ? updatedCar : c))
              );
            })
            .catch(err => console.error('Error updating car countdown:', err));
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cars]);

  const queryAddCar = (newCar) => {
    fetch('http://localhost:3001/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCar)
    })
      .then(response => response.json())
      .then(addedCar => setCars(prev => [...prev, addedCar]))
      .catch(err => console.error('Error adding car:', err));
  };

  const adjustTime = (id, deltaMinutes) => {
    const car = cars.find(c => c.id === id);
    if (!car) return;
    const newCountdown = Math.max(car.countdown + deltaMinutes * 60, 0);
    fetch(`http://localhost:3001/cars/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countdown: newCountdown })
    })
      .then(response => response.json())
      .then(updatedCar => {
        setCars(prev => prev.map(c => (c.id === id ? updatedCar : c)));
      })
      .catch(err => console.error('Error adjusting time:', err));
  };

  const removeCar = (id) => {
    fetch(`http://localhost:3001/cars/${id}`, {
      method: 'DELETE'
    })
      .then(() => setCars(prev => prev.filter(c => c.id !== id)))
      .catch(err => console.error('Error removing car:', err));
  };

  const clearCars = () => {
    if (window.confirm("Are you sure you want to clear all cars?")) {
      Promise.all(cars.map(car =>
        fetch(`http://localhost:3001/cars/${car.id}`, { method: 'DELETE' })
      ))
      .then(() => setCars([]))
      .catch(err => console.error('Error clearing cars:', err));
    }
  };

  const updateCar = (updatedCar) => {
    fetch(`http://localhost:3001/cars/${updatedCar.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCar)
    })
      .then(response => response.json())
      .then(car => {
        setCars(prev => prev.map(c => c.id === car.id ? car : c));
      })
      .catch(err => console.error('Error updating car:', err));
  };

  // Decode hex string to reveal the access code.
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
        <ClientDisplay cars={cars} />
      ) : (
        <BusinessDashboard
          cars={cars}
          queryAddCar={queryAddCar}
          adjustTime={adjustTime}
          removeCar={removeCar}
          updateCar={updateCar}
          clearCars={clearCars}
        />
      )}
    </div>
  );
}

export default App;