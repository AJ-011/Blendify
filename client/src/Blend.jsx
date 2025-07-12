// client/src/Blend.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function Blend() {
  const { sessionId } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [playlistUrl, setPlaylistUrl] = useState('');

  useEffect(() => {
    // First, check for User 2's token in the URL, if it exists
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const accessToken = urlParams.get('access_token');
    if (accessToken) {
      setToken(accessToken);
    }

    // This function will now poll the server for results
    const pollSessionData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8888/session/${sessionId}`);
        const data = response.data;

        // If User 2's data is present, the blend is complete.
        if (data && data.user2Tracks) {
          setSessionData(data);
          setLoading(false);
        } else {
          // If not, wait 3 seconds and try again.
          setTimeout(pollSessionData, 3000);
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        setLoading(false); // Stop loading on error
      }
    };

    pollSessionData();
  }, [sessionId]);

  const savePlaylist = async () => {
    try {
      // This uses the token for whichever user is on the page
      const response = await axios.post('http://127.0.0.1:8888/save-playlist', 
        { sessionId: sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaylistUrl(response.data.playlistUrl);
    } catch (error) {
      console.error("Error saving playlist:", error);
    }
  };

  if (loading) {
    return <div className="container"><h1>Analyzing music tastes...</h1></div>;
  }

  if (!sessionData) {
    // This view is for User 1 checking the page before User 2 joins
    return <div className="container"><h1>Waiting for friend to join...</h1><p>Once they log in, this page will update automatically.</p></div>;
  }

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
              <p>Could not generate playlist. One or both users may not have enough listening history.</p>
            )}
          </ol>
        </div>
        {!playlistUrl ? (
          // This button will only be clickable for a user who has a token
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