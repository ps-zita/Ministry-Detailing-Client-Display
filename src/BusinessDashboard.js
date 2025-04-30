import React, { useState, useEffect } from 'react';

const BUSINESS_START = 8 * 60; // 8:00 AM in minutes
const BUSINESS_END = 18 * 60;  // 6:00 PM in minutes
const TOTAL_BUSINESS_MINUTES = BUSINESS_END - BUSINESS_START;
const TIMELINE_WIDTH = window.innerWidth * 0.99;

const popularBrands = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes-Benz",
  "Volkswagen", "Audi", "Hyundai", "Kia", "Mazda", "Subaru", "Lexus",
  "Dodge", "Jeep", "GMC", "Cadillac", "Acura", "Infiniti", "Volvo", "Suzuki"
];

const BusinessDashboard = ({ cars, queryAddCar, adjustTime, clearCars }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const getCurrentTimeString = () => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Broadcast channel listener to refresh on changes.
  useEffect(() => {
    const bc = new BroadcastChannel('dashboard-updates');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'refresh') {
        window.location.reload();
      }
    };
    return () => bc.close();
  }, []);

  const [showForm, setShowForm] = useState(false);
  // Removed field "plate" along with color and year.
  // Now form has: brand, type, typeOfWash, eta, scheduledTime, notes.
  const [formValues, setFormValues] = useState({
    brand: '',
    type: '',
    typeOfWash: '', // Unpopulated by default
    eta: '',
    notes: '',
    scheduledTime: getCurrentTimeString()
  });

  const handleInputChange = (e) => {
    setFormValues({
      ...formValues,
      [e.target.name]: e.target.value,
    });
  };

  // In business dashboard, we now do NOT trigger any onClick popup.
  // (Thus, we do not include editing functionality.)
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { brand, type, typeOfWash, eta, notes, scheduledTime } = formValues;
    if (!brand || !type || !eta || !scheduledTime) {
      alert("Please provide Car Brand, Type, ETA, and Scheduled Time.");
      return;
    }
    const etaMinutes = parseInt(eta, 10);
    if (isNaN(etaMinutes)) {
      alert("ETA must be a number");
      return;
    }
    const countdown = etaMinutes * 60;
    const totalTime = countdown;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduled = new Date(selectedDate);
    scheduled.setHours(hours, minutes, 0, 0);
    const scheduledISO = scheduled.toISOString();
    const finishTime = new Date(scheduled.getTime() + etaMinutes * 60000);
    const newBooking = {
      id: Date.now(),
      brand,
      type,
      typeOfWash,  // could be empty
      countdown,
      totalTime,
      notes: notes || '',
      scheduledTime: scheduledISO,
      finishTime: finishTime.toISOString(),
    };
    queryAddCar(newBooking);

    // Broadcast refresh so all devices update.
    const bc = new BroadcastChannel('dashboard-updates');
    bc.postMessage({ type: 'refresh' });
    bc.close();

    setFormValues({
      brand: '',
      type: '',
      typeOfWash: '',
      eta: '',
      notes: '',
      scheduledTime: getCurrentTimeString()
    });
    setShowForm(false);
  };

  const handleClearAll = () => {
    if(window.confirm("Are you sure you want to clear all bookings?")){
      clearCars();
      const bc = new BroadcastChannel('dashboard-updates');
      bc.postMessage({ type: 'refresh' });
      bc.close();
    }
  };

  const handleTomorrow = () => {
    setSelectedDate(prev => new Date(prev.getTime() + 86400 * 1000));
  };

  // Filter bookings for selected date.
  const filteredBookings = cars.filter(car => {
    const scheduled = new Date(car.scheduledTime);
    return scheduled.getFullYear() === selectedDate.getFullYear() &&
           scheduled.getMonth() === selectedDate.getMonth() &&
           scheduled.getDate() === selectedDate.getDate();
  });

  // Calculate timeline positions.
  const getTimelinePosition = (booking) => {
    if (!booking.scheduledTime || !booking.finishTime) return { left: 0, width: 0, topOffset: 0 };
    const scheduled = new Date(booking.scheduledTime);
    const finish = new Date(booking.finishTime);
    const scheduledMinutes = scheduled.getHours() * 60 + scheduled.getMinutes();
    const finishMinutes = finish.getHours() * 60 + finish.getMinutes();
    const offset = Math.max(0, scheduledMinutes - BUSINESS_START);
    const duration = Math.max(0, finishMinutes - scheduledMinutes);
    const left = (offset / TOTAL_BUSINESS_MINUTES) * TIMELINE_WIDTH;
    const width = (duration / TOTAL_BUSINESS_MINUTES) * TIMELINE_WIDTH;
    const overlappingCount = filteredBookings.filter(b => {
      if (b.id === booking.id) return false;
      const bStart = new Date(b.scheduledTime).getTime();
      const bEnd = new Date(b.finishTime).getTime();
      return (bStart < new Date(booking.finishTime).getTime() && new Date(booking.scheduledTime).getTime() < bEnd) && (b.id < booking.id);
    }).length;
    const topOffset = overlappingCount * 50;
    return { left, width, topOffset };
  };

  const getProgress = (booking) => {
    const now = new Date();
    const scheduled = new Date(booking.scheduledTime);
    const finish = new Date(booking.finishTime);
    if (now < scheduled) {
      return { progress: 0, etaMs: finish - scheduled, finished: false };
    }
    if (now >= finish) {
      return { progress: 1, etaMs: 0, finished: true };
    }
    const elapsed = now - scheduled;
    const total = finish - scheduled;
    return { progress: elapsed / total, etaMs: finish - now, finished: false };
  };

  return (
    <div style={{ padding: '10px 15px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>
        Car Wash Business Dashboard - Timeline View
      </h1>
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => setShowForm(true)}
          style={{ fontSize: '14px', padding: '5px 10px', marginRight: '10px' }}
        >
          Add Booking
        </button>
        <button 
          onClick={handleClearAll} 
          style={{ fontSize: '14px', padding: '5px 10px', backgroundColor: 'red', color: 'white', marginRight: '10px' }}
        >
          Clear All
        </button>
        <button 
          onClick={handleTomorrow} 
          style={{ fontSize: '14px', padding: '5px 10px' }}
        >
          Tomorrow
        </button>
      </div>
      <div style={{ marginBottom: '20px', fontSize: '16px' }}>
        Showing bookings for: {selectedDate.toLocaleDateString()}
      </div>
      {showForm && (
        <form 
          onSubmit={handleFormSubmit} 
          style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <input 
              type="text" 
              name="brand" 
              value={formValues.brand} 
              onChange={handleInputChange} 
              placeholder="Car Brand (e.g., SKODA)" 
              style={{ flex: '1 1 150px', padding: '5px' }}
            />
            <input 
              type="text" 
              name="type" 
              value={formValues.type} 
              onChange={handleInputChange} 
              placeholder="Type (e.g., SUV or Coupe)" 
              style={{ flex: '1 1 150px', padding: '5px' }}
            />
            <input 
              type="text" 
              name="typeOfWash" 
              value={formValues.typeOfWash} 
              onChange={handleInputChange} 
              placeholder="Type of Wash" 
              style={{ flex: '1 1 150px', padding: '5px' }}
            />
            <input 
              type="text" 
              name="eta" 
              value={formValues.eta} 
              onChange={handleInputChange} 
              placeholder="ETA (minutes)" 
              style={{ flex: '1 1 150px', padding: '5px' }}
            />
            <input 
              type="time" 
              name="scheduledTime" 
              value={formValues.scheduledTime} 
              onChange={handleInputChange} 
              placeholder="Scheduled Time" 
              style={{ flex: '1 1 150px', padding: '5px' }}
            />
            <input 
              type="text" 
              name="notes" 
              value={formValues.notes} 
              onChange={handleInputChange} 
              placeholder="Notes" 
              style={{ flex: '1 1 150px', padding: '5px' }}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <button type="submit" style={{ padding: '5px 10px', marginRight: '10px' }}>
              Submit
            </button>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              style={{ padding: '5px 10px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {/* Timeline display */}
      <div style={{ position: 'relative', border: '1px solid #ccc', minHeight: '300px', width: '99vw', overflowX: 'auto', paddingTop: '40px' }}>
        {Array.from({ length: TOTAL_BUSINESS_MINUTES + 1 }, (_, i) => {
          if (i % 60 === 0) {
            const timeInMinutes = BUSINESS_START + i;
            const hr = Math.floor(timeInMinutes / 60);
            const min = String(timeInMinutes % 60).padStart(2, '0');
            return (
              <div 
                key={i}
                style={{
                  position: 'absolute',
                  left: (i / TOTAL_BUSINESS_MINUTES) * TIMELINE_WIDTH - 10,
                  top: 0,
                  fontSize: '10px'
                }}
              >
                {hr}:{min}
              </div>
            );
          }
          return null;
        })}
        {filteredCars.map(car => {
          const { left, width, topOffset } = getTimelinePosition(car);
          const { progress, etaMs, finished } = getProgress(car);
          let progressBarContent;
          if (finished) {
            progressBarContent = (
              <div style={{ 
                height: '100%', 
                width: '100%', 
                backgroundColor: '#ccc',
                textAlign: 'center',
                lineHeight: '50px',
                fontSize: '12px'
              }}>
                Finished
              </div>
            );
          } else if(new Date() < new Date(car.scheduledTime)){
            progressBarContent = (
              <div style={{ fontSize: '8px', textAlign: 'center', color: '#888' }}>
                Wash booked for {new Date(car.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            );
          } else {
            const remainingMinutes = Math.floor(etaMs / 60000);
            const remainingSeconds = ('0' + Math.floor((etaMs % 60000) / 1000)).slice(-2);
            progressBarContent = (
              <div style={{ 
                height: '100%', 
                width: `${progress * 100}%`, 
                backgroundColor: '#4caf50',
                textAlign: 'center',
                lineHeight: '50px',
                fontSize: '12px',
                color: '#fff'
              }}>
                ETA: {remainingMinutes}m {remainingSeconds}s
              </div>
            );
          }
          
          return (
            <div
              key={car.id}
              // Disabled click popup in business dashboard.
              style={{
                position: 'absolute',
                left: left,
                top: 40 + topOffset,
                width: Math.max(width, 30),
                height: '50px',
                backgroundColor: '#87CEFA',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'default',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
              title={`${car.brand} ${car.type}`}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '12px'
              }}>
                {car.brand || ""} {car.type || ""}
              </div>
              <div style={{
                marginTop: '4px',
                height: '6px',
                backgroundColor: '#eee',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                {progressBarContent}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BusinessDashboard;
