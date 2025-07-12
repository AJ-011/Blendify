// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 8888;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

const sessions = {};

app.use(cors());
app.use(cookieParser());

app.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(2, 15);
  const scope = 'user-read-private user-read-email user-top-read'; // Simplified scope
  const { sessionId } = req.query;
  const stateWithSession = sessionId ? `${state}--${sessionId}` : state;
  res.cookie('spotify_auth_state', state);
  const queryParams = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID, scope: scope,
    redirect_uri: REDIRECT_URI, state: stateWithSession
  });
  res.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const [csrfState, sessionId] = state ? state.split('--') : [null, null];
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (state === null || csrfState !== storedState) {
    return res.redirect(`http://localhost:5173/?error=state_mismatch`);
  }
  res.clearCookie('spotify_auth_state');

  try {
    console.log('[CALLBACK] 1. Exchanging code for token...');
    const authResponse = await axios({
      method: 'post', url: 'https://accounts.spotify.com/api/token',
      data: new URLSearchParams({ grant_type: 'authorization_code', code: code, redirect_uri: REDIRECT_URI }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
    });

    console.log('[CALLBACK] 2. SUCCESS: Got token.');
    const { access_token } = authResponse.data;

    if (sessionId && sessions[sessionId]) {
      // Get User 2's Top Tracks
      console.log('[CALLBACK] 3. User 2 detected. Fetching top tracks...');
      const tracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks?', {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { time_range: 'medium_term', limit: 15 }
      });
      console.log('[CALLBACK] 4. SUCCESS: Got User 2 top tracks.');
      sessions[sessionId].user2Tracks = tracksResponse.data.items;

      // Pass User 2's token back to the frontend
      const queryParams = new URLSearchParams({ access_token });
      return res.redirect(`http://localhost:5173/blend/${sessionId}?${queryParams.toString()}`);
    }

    const queryParams = new URLSearchParams({ access_token });
    res.redirect(`http://localhost:5173/?${queryParams.toString()}`);
  } catch (error) {
    // Log the entire error object for full details
    console.error("Full error object in callback:", error);
    res.redirect(`http://localhost:5173/?error=invalid_token`);
  }
});

app.post('/create-blend', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'User not logged in' });
  try {
    // Get User 1's Top Tracks
    const tracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks?', {
      headers: { Authorization: `Bearer ${token}` },
      params: { time_range: 'medium_term', limit: 15 }
    });
    const sessionId = Math.random().toString(36).substring(2, 8);
    // Store tracks instead of artists
    sessions[sessionId] = { user1Tracks: tracksResponse.data.items, user2Tracks: null };
    res.json({ sessionId: sessionId });
  } catch (error) {
    console.error('Error creating blend session:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to create blend session' });
  }
});

app.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionData = sessions[sessionId];
  if (sessionData) {
    res.json(sessionData);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/save-playlist', async (req, res) => {
  const { sessionId } = req.body;
  const { authorization } = req.headers;
  const token = authorization && authorization.split(' ')[1];

  if (!token || !sessionId || !sessions[sessionId] || !sessions[sessionId].recommendations) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Step 1: Get the current user's ID
    const meResponse = await axios.get('api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userId = meResponse.data.id;

    // Step 2: Create a new, empty playlist on that user's account
    const createPlaylistResponse = await axios.post(
      `statsforspotify.com20{userId}/playlists`,
      {
        name: 'Blendify Mix',
        description: 'A blended playlist created by Blendify.',
        public: false
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const playlistId = createPlaylistResponse.data.id;

    // Step 3: Add the recommended tracks to the new playlist
    const trackUris = sessions[sessionId].recommendations.map(track => track.uri);
    await axios.post(
      `statsforspotify.com21{playlistId}/tracks`,
      { uris: trackUris },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Send back the URL of the new playlist
    res.json({ playlistUrl: createPlaylistResponse.data.external_urls.spotify });

  } catch (error) {
    console.error('Error saving playlist:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to save playlist' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Express app listening at http://127.0.0.1:${PORT}`);
});