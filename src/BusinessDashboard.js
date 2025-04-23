import React, { useState } from 'react';

const BUSINESS_START = 8 * 60; // 8:00 AM in minutes
const BUSINESS_END = 18 * 60;  // 6:00 PM in minutes
const TOTAL_BUSINESS_MINUTES = BUSINESS_END - BUSINESS_START; // total minutes in business day
// Timeline container now is 99% of viewport width.
const TIMELINE_WIDTH = window.innerWidth * 0.99;

const popularBrands = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes-Benz",
  "Volkswagen", "Audi", "Hyundai", "Kia", "Mazda", "Subaru", "Lexus",
  "Dodge", "Jeep", "GMC", "Cadillac", "Acura", "Infiniti", "Volvo", "Suzuki"
];

const BusinessDashboard = ({ cars, queryAddCar, adjustTime, removeCar, updateCar, clearCars }) => {
  // Helper function to get current time as HH:MM.
  const getCurrentTimeString = () => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [formValues, setFormValues] = useState({
    plate: '',
    brand: '',
    type: '',
    color: '',
    year: '',
    eta: '',
    notes: '',
    scheduledTime: getCurrentTimeString() // default to current time
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { plate, brand, type, color, year, eta, notes, scheduledTime } = formValues;
    if (!plate || !brand || !type || !color || !year || !eta || !scheduledTime) {
      alert("Please provide plate, brand, type, color, year, ETA, and scheduled time.");
      return;
    }
    const etaMinutes = parseInt(eta, 10);
    if (isNaN(etaMinutes)) {
      alert("ETA must be a number");
      return;
    }
    const countdown = etaMinutes * 60;
    const totalTime = countdown;

    // Combine today's date with the scheduledTime (HH:MM)
    const today = new Date();
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    today.setHours(hours);
    today.setMinutes(minutes);
    today.setSeconds(0);
    today.setMilliseconds(0);
    const scheduledISO = today.toISOString();
    const finishTime = new Date(today.getTime() + etaMinutes * 60000);

    const newCar = {
      id: Date.now(),
      plate,
      brand,
      type,
      color,
      year,
      countdown,
      totalTime,
      notes: notes || '',
      scheduledTime: scheduledISO,
      finishTime: finishTime.toISOString(),
    };
    queryAddCar(newCar);
    setFormValues({
      plate: '',
      brand: '',
      type: '',
      color: '',
      year: '',
      eta: '',
      notes: '',
      scheduledTime: getCurrentTimeString() // reset to current time
    });
    setShowForm(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const { plate, brand, type, color, year, eta, notes, scheduledTime } = editValues;
    if (!plate || !brand || !type || !color || !year || !eta || !scheduledTime) {
      alert("Please provide plate, brand, type, color, year, ETA and scheduled time");
      return;
    }
    const etaMinutes = parseInt(eta, 10);
    if (isNaN(etaMinutes)) {
      alert("ETA must be a number");
      return;
    }
    const countdown = etaMinutes * 60;
    const totalTime = countdown;
    const today = new Date();
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    today.setHours(hours);
    today.setMinutes(minutes);
    today.setSeconds(0);
    today.setMilliseconds(0);
    const scheduledISO = today.toISOString();
    const finishTime = new Date(today.getTime() + etaMinutes * 60000);

    const updatedCar = {
      ...editingCar,
      plate,
      brand,
      type,
      color,
      year,
      countdown,
      totalTime,
      notes: notes || '',
      scheduledTime: scheduledISO,
      finishTime: finishTime.toISOString(),
    };
    updateCar(updatedCar);
    setEditingCar(null);
    setEditValues({});
  };

  // Calculate timeline position and vertical stacking.
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
    // Determine stacking if multiple cars in same minute slot.
    const slotKey = scheduled.getHours() * 60 + scheduled.getMinutes();
    const sameSlotCars = cars.filter(c => {
      const dt = new Date(c.scheduledTime);
      return dt.getHours() * 60 + dt.getMinutes() === slotKey;
    });
    const index = sameSlotCars.findIndex(c => c.id === car.id);
    const topOffset = index * 50; // stack vertically (50px offset per overlapping car)
    return { left, width, topOffset };
  };

  // Calculate progress for a car's wash. It is 0% if current time is before scheduled time.
  // Otherwise, it's the fraction of time elapsed between scheduled and finish times.
  const getProgress = (car) => {
    const now = new Date();
    const scheduled = new Date(car.scheduledTime);
    const finish = new Date(car.finishTime);
    if (now < scheduled) return 0;
    const elapsed = now - scheduled;
    const total = finish - scheduled;
    const progress = Math.min(1, elapsed / total);
    return progress;
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all cars?")) {
      clearCars();
    }
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
          Add Car
        </button>
        <button
          onClick={handleClearAll}
          style={{ fontSize: '14px', padding: '5px 10px', backgroundColor: 'red', color: 'white' }}
        >
          Clear All
        </button>
      </div>

      {/* Add Car Form */}
      {showForm && (
        <form onSubmit={handleFormSubmit} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <input 
              type="text" 
              name="plate" 
              value={formValues.plate} 
              onChange={handleInputChange} 
              placeholder="License Plate" 
              style={{ flex: '1 1 150px', padding: '5px' }} 
            />
            <input 
              list="brands" 
              type="text" 
              name="brand" 
              value={formValues.brand} 
              onChange={handleInputChange} 
              placeholder="Brand" 
              style={{ flex: '1 1 150px', padding: '5px' }}  
            />
            <datalist id="brands">
              {popularBrands.map((b, index) => (
                <option key={index} value={b} />
              ))}
            </datalist>
            <input 
              type="text" 
              name="type" 
              value={formValues.type} 
              onChange={handleInputChange} 
              placeholder="Type" 
              style={{ flex: '1 1 150px', padding: '5px' }} 
            />
            <input 
              type="text" 
              name="color" 
              value={formValues.color} 
              onChange={handleInputChange} 
              placeholder="Color" 
              style={{ flex: '1 1 150px', padding: '5px' }} 
            />
            <input 
              type="text" 
              name="year" 
              value={formValues.year} 
              onChange={handleInputChange} 
              placeholder="Year" 
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

      {/* Timeline Container */}
      <div style={{ position: 'relative', border: '1px solid #ccc', minHeight: '300px', width: '99vw', overflowX: 'auto', paddingTop: '40px' }}>
        {/* Time markers on x-axis */}
        {Array.from({ length: TOTAL_BUSINESS_MINUTES + 1 }, (_, i) => {
          if (i % 60 === 0) {
            const timeInMinutes = BUSINESS_START + i;
            const hr = Math.floor(timeInMinutes / 60);
            const min = (timeInMinutes % 60).toString().padStart(2, '0');
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
        {/* Render each car block */}
        {cars.map(car => {
          const { left, width, topOffset } = getTimelinePosition(car);
          const progress = getProgress(car);
          return (
            <div
              key={car.id}
              onClick={() => {
                setEditingCar(car);
                const scheduledDate = new Date(car.scheduledTime);
                const hh = scheduledDate.getHours().toString().padStart(2, '0');
                const mm = scheduledDate.getMinutes().toString().padStart(2, '0');
                setEditValues({
                  plate: car.plate,
                  brand: car.brand,
                  type: car.type,
                  color: car.color,
                  year: car.year,
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
              title={`${car.plate} - ${car.brand}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span>{car.plate} - {car.brand}</span>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removeCar(car.id); 
                  }} 
                  style={{ background: 'red', color: 'white', border: 'none', borderRadius: '2px', fontSize: '10px', padding: '2px 4px', cursor: 'pointer' }}
                  title="Delete this car"
                >
                  X
                </button>
              </div>
              {/* Progress Bar or message */}
              <div style={{ marginTop: '4px', height: '6px', backgroundColor: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                {new Date() < new Date(car.scheduledTime) ? (
                  <div style={{ fontSize: '8px', textAlign: 'center', color: '#888' }}>
                    Wash booked for {new Date(car.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : (
                  <div style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: '#4caf50' }} />
                )}
              </div>
              {/* +5 / -5 Buttons */}
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

      {/* Edit Modal */}
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
            <h2>Edit Car Details</h2>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  name="plate" 
                  value={editValues.plate || ''} 
                  onChange={handleEditChange} 
                  placeholder="License Plate" 
                />
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
                  placeholder="Type" 
                />
                <input 
                  type="text" 
                  name="color" 
                  value={editValues.color || ''} 
                  onChange={handleEditChange} 
                  placeholder="Color" 
                />
                <input 
                  type="text" 
                  name="year" 
                  value={editValues.year || ''} 
                  onChange={handleEditChange} 
                  placeholder="Year" 
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
                <button type="button" onClick={() => setEditingCar(null)} style={{ padding: '5px 10px' }}>
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