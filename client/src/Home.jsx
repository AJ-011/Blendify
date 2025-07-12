// client/src/Home.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Import Link

function Home() {
  const [token, setToken] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const accessToken = urlParams.get('access_token');
    if (accessToken) {
      setToken(accessToken);
    }
  }, []);

  const createBlend = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8888/create-blend', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessionId(response.data.sessionId);
    } catch (error) {
      console.error("Error creating blend:", error);
    }
  };

  return (
    <div className="container">
      <h1>Blendify</h1>

      {!token ? (
        <a className="login-button" href="http://127.0.0.1:8888/login">Log in with Spotify</a>
      ) : (
        <div>
          <h2>Welcome!</h2>
          {!sessionId ? (
            <button className="action-button" onClick={createBlend}>Create a Blend</button>
          ) : (
            <div className="session-info">
              <h3>Blend Session Created!</h3>
              <p>Share this link with a friend, or click it to view the blend page:</p>
              {/* This is now a clickable link to the blend page */}
              <Link to={`/blend/${sessionId}`} className="session-link">
                {`${window.location.origin}/blend/${sessionId}`}
              </Link>
              <p style={{fontSize: '0.8rem', marginTop: '1rem'}}>
                (Wait for your friend to log in before saving the playlist.)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;