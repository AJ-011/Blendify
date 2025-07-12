// client/src/Blend.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Blend() {
  const { sessionId } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [playlistUrl, setPlaylistUrl] = useState('');

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const accessToken = urlParams.get('access_token');
    if (accessToken) {
      setToken(accessToken);
    }

    const pollSessionData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`);
        const data = response.data;

        if (data && data.user2Tracks) {
          setSessionData(data);
          setLoading(false);
        } else {
          setTimeout(pollSessionData, 3000);
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        setLoading(false);
      }
    };

    pollSessionData();
  }, [sessionId]);

  const handleJoin = () => {
    window.location.href = `${API_BASE_URL}/login?sessionId=${sessionId}`;
  };

  const savePlaylist = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/save-playlist`, 
        { sessionId: sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaylistUrl(response.data.playlistUrl);
    } catch (error) {
      console.error("Error saving playlist:", error);
    }
  };

  if (loading) return <div className="container"><h1>Analyzing music tastes...</h1></div>;
  if (!sessionData) return <div className="container"><h1>Waiting for friend to join...</h1></div>;

  const finalPlaylist = [...(sessionData.user1Tracks || []), ...(sessionData.user2Tracks || [])];

  return (
    <div className="container">
      <h1>Blendify</h1>
      <div>
        <h2>Blend Complete!</h2>
        <p>Here is a playlist of your combined top tracks:</p>
        <div className="playlist">
          <ol>
            {finalPlaylist.length > 0 ? (
              finalPlaylist.map((track) => (
                <li key={`${track.id}-${Math.random()}`}>
                  {track.name} by {track.artists && track.artists.length > 0 ? track.artists[0].name : 'Unknown Artist'}
                </li>
              ))
            ) : (
              <p>Could not generate playlist.</p>
            )}
          </ol>
        </div>
        {!playlistUrl ? (
          <button className="action-button" onClick={savePlaylist} disabled={!token}>
            Save This Playlist to My Spotify
          </button>
        ) : (
          <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="login-button">
            Playlist Saved! Open Playlist
          </a>
        )}
      </div>
    </div>
  );
}

export default Blend;