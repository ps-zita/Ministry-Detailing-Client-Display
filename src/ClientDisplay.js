import React, { useEffect, useRef, useState } from 'react';
import BookingCard from './BookingCard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.109:3001';

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
          Booked for {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

const BookingCardWrapper = ({ booking }) => {
  if (booking.booking_status === 'Cancelled') return null;

  // Adjusted to use top-level keys directly instead of nested objects.
  const firstName = booking.customer_first_name && booking.customer_first_name.trim() ? booking.customer_first_name : "NIL";
  const lastInitial = booking.customer_last_name && booking.customer_last_name.trim() ? booking.customer_last_name.charAt(0) + '.' : "NIL";
  const serviceName = booking.service_name && booking.service_name.trim() ? booking.service_name : "NIL";
  const bookingDescription = booking.booking_description && booking.booking_description.trim() ? booking.booking_description : "NIL";

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
      <div style={{ fontWeight: 'bold', fontSize: '48px', marginBottom: '10px', position: 'relative' }}>
        {firstName} {lastInitial}
      </div>
      <div style={{ marginBottom: '10px', position: 'relative' }}>
        {serviceName}
      </div>
      <div style={{ marginBottom: '10px', position: 'relative' }}>
        {bookingDescription}
      </div>
      { booking.countdown !== undefined &&
        <ProgressBar 
          countdown={booking.countdown} 
          totalTime={booking.totalTime} 
          scheduledTime={booking.scheduledTime} 
          finishTime={booking.finishTime} 
        />
      }
    </div>
  );
};

const ClientDisplay = () => {
  const [bookings, setBookings] = useState([]);
  const finishedOuterRef = useRef(null);
  const finishedContentRef = useRef(null);

  // Function to fetch bookings.
  const fetchBookings = () => {
    fetch(`${API_BASE_URL}/bookings`)
      .then(response => response.json())
      .then(data => {
        console.log('Fetched bookings:', data);
        setBookings(data);
      })
      .catch(error => {
        console.error('Error fetching bookings:', error);
      });
  };

  // Poll for updates every 10 seconds.
  useEffect(() => {
    fetchBookings(); // Initial fetch.
    const interval = setInterval(fetchBookings, 10000);
    return () => clearInterval(interval);
  }, []);

  // Setup BroadcastChannel for refresh events.
  useEffect(() => {
    const bc = new BroadcastChannel('dashboard-updates');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'refresh') {
        fetchBookings();
      }
    };
    return () => bc.close();
  }, []);

  const now = new Date();

  // Determine in-progress bookings based on times or countdown.
  const inProgressBookings = bookings.filter(booking => {
    if (booking.scheduledTime && booking.finishTime) {
      const finish = new Date(booking.finishTime);
      return now < finish;
    }
    return booking.countdown > 0;
  });

  // Determine finished bookings (only those not older than 1 hour past finishTime).
  const finishedBookings = bookings.filter(booking => {
    if (booking.scheduledTime && booking.finishTime) {
      const finish = new Date(booking.finishTime);
      return now >= finish && now - finish < 3600000;
    }
    return booking.countdown === 0;
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

  // Set up vertical marquee animation for finished bookings if applicable.
  useEffect(() => {
    if (finishedBookings.length >= 4 && finishedContentRef.current) {
      const content = finishedContentRef.current;
      const originalHeight = content.offsetHeight / 2;
      const speed = 30;
      const duration = originalHeight / speed;
      content.style.animation = `verticalMarquee ${duration}s linear infinite`;
    } else if (finishedContentRef.current) {
      finishedContentRef.current.style.animation = 'none';
    }
  }, [finishedBookings]);

  return (
    <div style={containerStyle}>
      <div style={leftSectionStyle}>
        <h2 style={headingStyle}>Bookings In Progress</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {inProgressBookings.map(booking => (
            <BookingCardWrapper key={booking.id} booking={booking} />
          ))}
        </div>
      </div>
      <div style={rightSectionStyle}>
        <h2 style={headingStyle}>Finished Bookings</h2>
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
            {finishedBookings.length ? (
              finishedBookings.map(booking => (
                <BookingCardWrapper key={booking.id} booking={booking} />
              ))
            ) : (
              <p style={{ color: 'white', fontSize: '24px' }}>
                No finished bookings available
              </p>
            )}
            {finishedBookings.length >= 4 &&
              finishedBookings.map(booking => (
                <BookingCardWrapper key={`dup-${booking.id}`} booking={booking} />
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDisplay;
