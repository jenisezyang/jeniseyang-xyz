const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

const getAccessToken = async () => {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`,
  });
  return res.json();
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { access_token } = await getAccessToken();

    const [recentRes, topTracksRes, topArtistsRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
      fetch('https://api.spotify.com/v1/me/top/tracks?limit=3&time_range=short_term', {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
      fetch('https://api.spotify.com/v1/me/top/artists?limit=4&time_range=short_term', {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
    ]);

    const [recent, topTracks, topArtists] = await Promise.all([
      recentRes.json(),
      topTracksRes.json(),
      topArtistsRes.json(),
    ]);

    const lastPlayed = recent.items?.[0]?.track;

    res.status(200).json({
      recent: lastPlayed ? {
        name: lastPlayed.name,
        artist: lastPlayed.artists.map(a => a.name).join(', '),
        image: lastPlayed.album.images[1]?.url,
        url: lastPlayed.external_urls.spotify,
      } : null,
      topTracks: (topTracks.items || []).map(t => ({
        name: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        image: t.album.images[2]?.url,
        url: t.external_urls.spotify,
      })),
      topArtists: (topArtists.items || []).map(a => ({
        name: a.name,
        url: a.external_urls.spotify,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Spotify data' });
  }
}
