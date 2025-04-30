import React, { useEffect, useRef, useState } from 'react';

const ProgressBar = ({ countdown, totalTime, scheduledTime, finishTime }) => {
  // Add a local state for the current time that updates every second.
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

const CarCard = ({ car }) => {
  const cardStyle = {
    background: 'linear-gradient(45deg, #74ebd5, #acb6e5)',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px',
    width: '250px',
    position: 'relative',
    boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9)',
    overflow: 'hidden',
    border: '1px solid white'
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 'bold', fontSize: '48px', marginBottom: '5px' }}>
        {car.brand || ""}
      </div>
      <div style={{ fontSize: '36px', marginBottom: '5px' }}>
        {car.carType || ""}
      </div>
      <div style={{ marginBottom: '10px', fontSize: '18px', fontStyle: 'italic' }}>
        {car.washType || ""}
      </div>
      { car.countdown !== undefined && (
        <ProgressBar 
          countdown={car.countdown} 
          totalTime={car.totalTime}
          scheduledTime={car.scheduledTime}
          finishTime={car.finishTime}
        />
      )}
      <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#555' }}>
        Notes: {car.notes || "No notes"}
      </div>
    </div>
  );
};

const ClientDisplay = () => {
  const [cars, setCars] = useState([]);

  // Function to fetch the list of cars from the backend.
  const fetchCars = async () => {
    try {
      // Build the backend URL using the hostname
      const host = window.location.hostname;
      const response = await fetch(`http://${host}:3001/cars`);
      if (!response.ok) {
        throw new Error('Failed to fetch cars');
      }
      const data = await response.json();
      setCars(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch cars on mount and every minute.
  useEffect(() => {
    fetchCars();
    const interval = setInterval(() => {
      fetchCars();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // BroadcastChannel listener to refresh the display.
  useEffect(() => {
    const bc = new BroadcastChannel('dashboard-updates');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'refresh') {
        fetchCars();
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDisplay;
