import React, { useEffect, useRef } from 'react';

const ProgressBar = ({ countdown, totalTime, scheduledTime, finishTime }) => {
  const now = new Date();
  
  if (scheduledTime && finishTime) {
    const scheduled = new Date(scheduledTime);
    const finish = new Date(finishTime);
    
    if (now < scheduled) {
      return (
        <div style={{
          background: '#eee',
          borderRadius: '4px',
          width: '100%',
          height: '30px',
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
    }
    
    if (now >= finish) {
      return (
        <div style={{
          background: '#ccc',
          borderRadius: '4px',
          width: '100%',
          height: '30px',
          marginTop: '10px',
          position: 'relative'
        }}>
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
            Finished
          </div>
        </div>
      );
    }
    
    const elapsed = now - scheduled;
    const totalDuration = finish - scheduled;
    let progressPercentage = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);
    
    const remainingMS = finish - now;
    const remainingMinutes = Math.floor(remainingMS / 60000);
    const remainingSeconds = ('0' + Math.floor((remainingMS % 60000) / 1000)).slice(-2);
    
    return (
      <div style={{
        background: '#eee',
        borderRadius: '4px',
        width: '100%',
        height: '30px',
        marginTop: '10px',
        position: 'relative'
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
          ETA: {remainingMinutes}m {remainingSeconds}s
        </div>
      </div>
    );
  }
  
  let progressPercentage = totalTime > 0 ? ((totalTime - countdown) / totalTime) * 100 : 0;
  progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);
  
  return (
    <div style={{
      background: '#eee',
      borderRadius: '4px',
      width: '100%',
      height: '30px',
      marginTop: '10px',
      position: 'relative'
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

/*
  Updated CarCard for ClientDisplay:
  - First slot shows Car Brand (e.g., SKODA) in large bold text.
  - Under it, the second slot shows the Type (e.g., SUV).
  - If present, the Type of Wash appears on a new line below the type.
  - Deprecated fields (like license plate) are removed.
*/
const CarCard = ({ car }) => {
  const cardStyle = {
    background: 'linear-gradient(45deg, #74ebd5, #acb6e5)',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px',
    width: '250px',
    fontSize: '22px',
    position: 'relative',
    boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9)',
    overflow: 'hidden',
    border: '1px solid white'
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 'bold', fontSize: '48px', marginBottom: '10px' }}>
        {car.brand || ""}
      </div>
      <div style={{ marginBottom: '10px' }}>
        {car.type || ""}
      </div>
      { car.typeOfWash && (
        <div style={{ marginBottom: '10px', fontSize: '18px' }}>
          {car.typeOfWash}
        </div>
      )}
      { car.countdown !== undefined &&
        <ProgressBar 
          countdown={car.countdown} 
          totalTime={car.totalTime}
          scheduledTime={car.scheduledTime}
          finishTime={car.finishTime}
        />
      }
      <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#555' }}>
        Notes: {car.notes || "No notes"}
      </div>
    </div>
  );
};

const ClientDisplay = ({ cars }) => {
  // Hardcoded refresh every minute.
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // BroadcastChannel listener to refresh the display.
  useEffect(() => {
    const bc = new BroadcastChannel('dashboard-updates');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'refresh') {
        window.location.reload();
      }
    };
    return () => bc.close();
  }, []);

  const now = new Date();
  const inProgressCars = cars.filter(car => {
    if (car.scheduledTime && car.finishTime) {
      const finish = new Date(car.finishTime);
      return now < finish;
    }
    return car.countdown > 0;
  });
  const finishedCars = cars.filter(car => {
    if (car.scheduledTime && car.finishTime) {
      const finish = new Date(car.finishTime);
      return now >= finish;
    }
    return car.countdown === 0;
  });

  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'linear-gradient(90deg, #0f0c29, #302b63, #24243e)'
  };

  const leftSectionStyle = {
    flex: 4,
    padding: '20px',
    overflowY: 'auto'
  };

  const rightSectionStyle = {
    flex: 1,
    padding: '20px',
    borderLeft: '2px solid white',
    overflow: 'hidden',
    position: 'relative'
  };

  const headingStyle = {
    fontSize: '28px',
    marginBottom: '20px',
    color: 'white'
  };

  // Infinite marquee effect for finished cars.
  const finishedOuterRef = useRef(null);
  const finishedContentRef = useRef(null);

  useEffect(() => {
    if (finishedCars.length >= 4 && finishedContentRef.current) {
      const content = finishedContentRef.current;
      const originalHeight = content.offsetHeight / 2;
      const speed = 30;
      const duration = originalHeight / speed;
      content.style.animation = `verticalMarquee ${duration}s linear infinite`;
    } else if (finishedContentRef.current) {
      finishedContentRef.current.style.animation = 'none';
    }
  }, [finishedCars]);

  return (
    <div style={containerStyle}>
      <div style={leftSectionStyle}>
        <h2 style={headingStyle}>Cars In Progress</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {inProgressCars.map(car => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </div>
      <div style={rightSectionStyle}>
        <h2 style={headingStyle}>Finished Cars</h2>
        <style>{`
          @keyframes verticalMarquee {
            from { transform: translateY(0); }
            to { transform: translateY(-50%); }
          }
        `}</style>
        <div ref={finishedOuterRef} style={{ height: '100%', overflow: 'hidden' }}>
          <div
            ref={finishedContentRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {finishedCars.map(car => (
              <CarCard key={car.id} car={car} />
            ))}
            {finishedCars.map(car => (
              <CarCard key={`dup-${car.id}`} car={car} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDisplay;
