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

const BusinessDashboard = ({ cars, queryAddCar, adjustTime, removeCar, updateCar, clearCars }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const getCurrentTimeString = () => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Broadcast channel listener to refresh all devices on changes.
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
  const [editingCar, setEditingCar] = useState(null);
  // Remove plate, color, and year. The form now has only brand and type. 
  // The "type" field is preset to "GOLD WASH" but can be cleared.
  const [formValues, setFormValues] = useState({
    brand: '',
    type: 'GOLD WASH',
    eta: '',
    notes: '',
    scheduledTime: getCurrentTimeString()
  });
  const [editValues, setEditValues] = useState({});

  const handleInputChange = (e) => {
    setFormValues({
      ...formValues,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditChange = (e) => {
    setEditValues({
      ...editValues,
      [e.target.name]: e.target.value,
    });
  };

  // Validate required fields: brand, type, eta, and scheduledTime.
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { brand, type, eta, notes, scheduledTime } = formValues;
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
    // Create new car booking without license plate, color, or year.
    const newCar = {
      id: Date.now(),
      brand,
      type,
      countdown,
      totalTime,
      notes: notes || '',
      scheduledTime: scheduledISO,
      finishTime: finishTime.toISOString(),
    };
    queryAddCar(newCar);

    // Broadcast refresh to update views.
    const bc = new BroadcastChannel('dashboard-updates');
    bc.postMessage({ type: 'refresh' });
    bc.close();

    setFormValues({
      brand: '',
      type: 'GOLD WASH',
      eta: '',
      notes: '',
      scheduledTime: getCurrentTimeString()
    });
    setShowForm(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const { brand, type, eta, notes, scheduledTime } = editValues;
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
    const updatedCar = {
      ...editingCar,
      brand,
      type,
      countdown,
      totalTime,
      notes: notes || '',
      scheduledTime: scheduledISO,
      finishTime: finishTime.toISOString(),
    };
    updateCar(updatedCar);

    // Broadcast refresh.
    const bc = new BroadcastChannel('dashboard-updates');
    bc.postMessage({ type: 'refresh' });
    bc.close();

    setEditingCar(null);
    setEditValues({});
  };

  const handleRemove = (id) => {
    removeCar(id);
    const bc = new BroadcastChannel('dashboard-updates');
    bc.postMessage({ type: 'refresh' });
    bc.close();
  };

  // Filter bookings for the selected day.
  const filteredCars = cars.filter(car => {
    const scheduled = new Date(car.scheduledTime);
    return scheduled.getFullYear() === selectedDate.getFullYear() &&
           scheduled.getMonth() === selectedDate.getMonth() &&
           scheduled.getDate() === selectedDate.getDate();
  });

  // Calculate timeline positions.
  const getTimelinePosition = (car) => {
    if (!car.scheduledTime || !car.finishTime) return { left: 0, width: 0, topOffset: 0 };
    const scheduled = new Date(car.scheduledTime);
    const finish = new Date(car.finishTime);
    const scheduledMinutes = scheduled.getHours() * 60 + scheduled.getMinutes();
    const finishMinutes = finish.getHours() * 60 + finish.getMinutes();
    const offset = Math.max(0, scheduledMinutes - BUSINESS_START);
    const duration = Math.max(0, finishMinutes - scheduledMinutes);
    const left = (offset / TOTAL_BUSINESS_MINUTES) * TIMELINE_WIDTH;
    const width = (duration / TOTAL_BUSINESS_MINUTES) * TIMELINE_WIDTH;
    const currentStart = scheduled.getTime();
    const currentFinish = finish.getTime();
    const overlappingCount = filteredCars.filter(c => {
      if (c.id === car.id) return false;
      const start = new Date(c.scheduledTime).getTime();
      const end = new Date(c.finishTime).getTime();
      return (start < currentFinish && currentStart < end) && (c.id < car.id);
    }).length;
    const topOffset = overlappingCount * 50;
    return { left, width, topOffset };
  };

  const getProgress = (car) => {
    const now = new Date();
    const scheduled = new Date(car.scheduledTime);
    const finish = new Date(car.finishTime);
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
              placeholder="Type (e.g., SUV)" 
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
              onClick={() => {
                setEditingCar(car);
                const scheduledDate = new Date(car.scheduledTime);
                const hh = scheduledDate.getHours().toString().padStart(2, '0');
                const mm = scheduledDate.getMinutes().toString().padStart(2, '0');
                setEditValues({
                  brand: car.brand,
                  type: car.type,
                  eta: Math.round(car.totalTime / 60).toString(),
                  notes: car.notes,
                  scheduledTime: `${hh}:${mm}`
                });
              }}
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
                cursor: 'pointer',
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
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    adjustTime(car.id, 5);
                  }}
                  style={{ fontSize: '10px', padding: '2px 4px', marginRight: '2px' }}
                  title="Add 5 minutes"
                >
                  +5
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    adjustTime(car.id, -5);
                  }}
                  style={{ fontSize: '10px', padding: '2px 4px' }}
                  title="Subtract 5 minutes"
                >
                  -5
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {editingCar && (
        <div 
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setEditingCar(null)}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '4px',
              minWidth: '300px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2>Edit Booking</h2>
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => handleRemove(editingCar.id)}
                style={{
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '12px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >
                X Remove
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Editing no longer includes License Plate */}
                <input 
                  list="brands" 
                  type="text" 
                  name="brand" 
                  value={editValues.brand || ''} 
                  onChange={handleEditChange} 
                  placeholder="Brand" 
                />
                <datalist id="brands">
                  {popularBrands.map((b, index) => (
                    <option key={index} value={b} />
                  ))}
                </datalist>
                <input 
                  type="text" 
                  name="type" 
                  value={editValues.type || ''} 
                  onChange={handleEditChange} 
                  placeholder="Type (e.g., SUV)" 
                />
                <input 
                  type="text" 
                  name="eta" 
                  value={editValues.eta || ''} 
                  onChange={handleEditChange} 
                  placeholder="ETA (minutes)" 
                />
                <input 
                  type="time" 
                  name="scheduledTime" 
                  value={editValues.scheduledTime || ''} 
                  onChange={handleEditChange} 
                  placeholder="Scheduled Time" 
                />
                <input 
                  type="text" 
                  name="notes" 
                  value={editValues.notes || ''} 
                  onChange={handleEditChange} 
                  placeholder="Notes" 
                />
              </div>
              <div style={{ marginTop: '10px' }}>
                <button type="submit" style={{ padding: '5px 10px', marginRight: '10px' }}>
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingCar(null)} 
                  style={{ padding: '5px 10px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;
