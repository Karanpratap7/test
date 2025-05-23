require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

function validateSchool(data) {
  const { name, address, latitude, longitude } = data;
  return (
    typeof name === 'string' && name.trim() &&
    typeof address === 'string' && address.trim() &&
    typeof latitude === 'number' && latitude >= -90 && latitude <= 90 &&
    typeof longitude === 'number' && longitude >= -180 && longitude <= 180
  );
}

app.post('/addSchool', (req, res) => {
  const school = req.body;
  console.log('Received school data:', school);

  if (!validateSchool(school)) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  const sql = `INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`;
  const params = [school.name.trim(), school.address.trim(), school.latitude, school.longitude];

  console.log('Executing SQL:', sql);
  console.log('With params:', params);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('Insert successful:', results);
    res.json({ message: 'School added', id: results.insertId });
  });

});

function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/listSchools', (req, res) => {
  const userLat = parseFloat(req.query.latitude);
  const userLon = parseFloat(req.query.longitude);

  if (
    isNaN(userLat) || userLat < -90 || userLat > 90 ||
    isNaN(userLon) || userLon < -180 || userLon > 180
  ) {
    return res.status(400).json({ error: 'Invalid or missing coordinates' });
  }

  db.query('SELECT * FROM schools', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const sorted = results.map(school => ({
      ...school,
      distance: getDistance(userLat, userLon, school.latitude, school.longitude)
    })).sort((a, b) => a.distance - b.distance);

    res.json(sorted);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});