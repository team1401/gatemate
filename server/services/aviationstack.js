const fetch = require('node-fetch');
const db = require('../db');

const API_KEY = process.env.AVIATIONSTACK_API_KEY;
const BASE_URL = 'http://api.aviationstack.com/v1';

async function lookupFlight(flightNumber, flightDate) {
  // Normalize
  const normalized = flightNumber.replace(/\s+/g, '').toUpperCase();
  const dateStr = flightDate; // YYYY-MM-DD

  // Check cache (24hr)
  const cached = db.prepare(
    `SELECT response_json, cached_at FROM flight_cache 
     WHERE flight_number = ? AND flight_date = ? 
     AND datetime(cached_at, '+24 hours') > datetime('now')`
  ).get(normalized, dateStr);

  if (cached) {
    console.log(`Cache hit: ${normalized} on ${dateStr}`);
    return JSON.parse(cached.response_json);
  }

  // Check if API key is configured
  if (!API_KEY) {
    throw new Error('AviationStack API key not configured. Set AVIATIONSTACK_API_KEY in .env');
  }

  // Call AviationStack
  const iataCode = normalized.replace(/^([A-Z]{2})(\d+)$/, '$1 $2').split(' ')[0];
  const flightNum = normalized.replace(/^[A-Z]{2,3}/, '');
  
  const url = `${BASE_URL}/flights?access_key=${API_KEY}&flight_iata=${normalized}&flight_date=${dateStr}`;
  console.log(`API call: ${normalized} on ${dateStr}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`AviationStack API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`AviationStack: ${data.error.message || data.error.type || 'Unknown error'}`);
  }

  const flights = data.data || [];
  if (flights.length === 0) {
    // Try without date for schedule lookup
    const schedUrl = `${BASE_URL}/flights?access_key=${API_KEY}&flight_iata=${normalized}`;
    const schedResponse = await fetch(schedUrl);
    const schedData = await schedResponse.json();
    const schedFlights = schedData.data || [];
    
    if (schedFlights.length === 0) {
      throw new Error(`No flight found for ${normalized} on ${dateStr}`);
    }
    
    // Use the first result as template
    const result = formatFlightData(schedFlights[0], dateStr);
    cacheResult(normalized, dateStr, result);
    return result;
  }

  const result = formatFlightData(flights[0], dateStr);
  cacheResult(normalized, dateStr, result);
  return result;
}

function formatFlightData(flight, dateStr) {
  return {
    flight_number: flight.flight?.iata || '',
    flight_date: dateStr,
    airline_name: flight.airline?.name || '',
    departure_airport: flight.departure?.iata || '',
    departure_airport_name: flight.departure?.airport || '',
    departure_time: flight.departure?.scheduled || flight.departure?.estimated || '',
    arrival_airport: flight.arrival?.iata || '',
    arrival_airport_name: flight.arrival?.airport || '',
    arrival_time: flight.arrival?.scheduled || flight.arrival?.estimated || '',
    status: flight.flight_status || 'scheduled'
  };
}

function cacheResult(flightNumber, flightDate, result) {
  db.prepare(
    `INSERT OR REPLACE INTO flight_cache (flight_number, flight_date, response_json) VALUES (?, ?, ?)`
  ).run(flightNumber, flightDate, JSON.stringify(result));
}

module.exports = { lookupFlight };
