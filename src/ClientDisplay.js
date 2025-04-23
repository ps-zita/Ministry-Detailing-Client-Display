import React from 'react';

const ProgressBar = ({ countdown, totalTime, scheduledTime, finishTime }) => {
  const now = new Date();
  
  // If scheduledTime and finishTime are provided, use the "wash booked" logic.
  if (scheduledTime && finishTime) {
    const scheduled = new Date(scheduledTime);
    const finish = new Date(finishTime);
    if (now < scheduled) {
      // Before the wash starts, show a message indicating the booked time.
      return (
        <div style={{
          background: '#eee',
          borderRadius: '4px',
          width: '100%',
          height: '30px',
          position: 'relative',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '16px'
        }}>
          Wash booked for {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      );
    } else {
      // Once the scheduled time has passed, calculate progress from scheduled to finish.
      const elapsed = now - scheduled;
      const totalDuration = finish - scheduled;
      let progressPercentage = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
      progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);
      return (
        <div style={{
          background: '#eee',
          borderRadius: '4px',
          width: '100%',
          height: '30px',
          position: 'relative',
          marginTop: '10px'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercentage}%`,
            background: 'green',
            borderRadius: '4px'
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            textAlign: 'center',
            lineHeight: '30px',
            fontSize: '22px',
            color: '#333'
          }}>
            ETA: {Math.max(0, Math.floor((finish - now) / 60000))}m {('0' + (Math.floor(((finish - now) % 60000) / 1000))).slice(-2)}s
          </div>
        </div>
      );
    }
  }

  // Fallback to existing countdown/totalTime logic if scheduledTime/finishTime are not available.
  let progressPercentage = totalTime > 0 ? ((totalTime - countdown) / totalTime) * 100 : 0;
  progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);
  return (
    <div style={{
      background: '#eee',
      borderRadius: '4px',
      width: '100%',
      height: '30px',
      position: 'relative',
      marginTop: '10px'
    }}>
      <div style={{
        height: '100%',
        width: `${progressPercentage}%`,
        background: 'green',
        borderRadius: '4px'
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        textAlign: 'center',
        lineHeight: '30px',
        fontSize: '22px',
        color: '#333'
      }}>
        ETA: {Math.floor(countdown / 60)}m {('0' + (countdown % 60)).slice(-2)}s
      </div>
    </div>
  );
};

const CarCard = ({ car }) => (
  <div style={{
    border: '1px solid #ccc',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px',
    width: '250px',
    fontSize: '22px'
  }}>
    <div style={{ fontWeight: 'bold', fontSize: '48px', marginBottom: '10px' }}>
      {car.plate}
    </div>
    <div style={{ marginBottom: '10px' }}>
      {`${car.color} ${car.brand} ${car.type} ${car.year}`}
    </div>
    { car.countdown !== undefined && car.totalTime !== undefined &&
      // Pass scheduledTime and finishTime if available so that the ProgressBar
      // can determine whether to show a "wash booked" message or the progress bar.
      <ProgressBar 
        countdown={car.countdown} 
        totalTime={car.totalTime} 
        scheduledTime={car.scheduledTime} 
        finishTime={car.finishTime} 
      />
    }
    <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#555' }}>
      Notes: {car.notes || 'No notes'}
    </div>
  </div>
);

const ClientDisplay = ({ cars }) => {
  // Split cars into in-progress and finished based on countdown.
  // For this example, assume that if countdown is 0 the wash has finished.
  const inProgressCars = cars.filter(car => car.countdown > 0);
  const finishedCars = cars.filter(car => car.countdown === 0);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ flex: 2, padding: '20px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '20px' }}>Cars In Progress</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {inProgressCars.map(car => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '20px', borderLeft: '2px solid #ccc' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '20px' }}>Finished Cars</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {finishedCars.map(car => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientDisplay;