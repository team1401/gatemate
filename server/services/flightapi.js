const fetch = require('node-fetch');
const db = require('../db');

const API_KEY = process.env.AIRLABS_API_KEY;
const BASE_URL = 'https://airlabs.co/api/v9';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function lookupFlight(flightNumber, flightDate, depAirport, arrAirport) {
  const normalized = flightNumber.replace(/\s+/g, '').toUpperCase();
  const dateStr = flightDate;
  const depFilter = depAirport ? depAirport.toUpperCase() : null;
  const arrFilter = arrAirport ? arrAirport.toUpperCase() : null;

  // Cache key includes dep/arr airport if specified
  const cacheKey = depFilter && arrFilter ? `${normalized}_${depFilter}_${arrFilter}` : depFilter ? `${normalized}_${depFilter}` : normalized;

  const cached = db.prepare(
    `SELECT response_json, cached_at FROM flight_cache 
     WHERE flight_number = ? AND flight_date = ? 
     AND datetime(cached_at, '+24 hours') > datetime('now')`
  ).get(cacheKey, dateStr);

  if (cached) {
    console.log(`Cache hit: ${cacheKey} on ${dateStr}`);
    return JSON.parse(cached.response_json);
  }

  if (!API_KEY) {
    throw new Error('AirLabs API key not configured. Set AIRLABS_API_KEY in .env');
  }

  // 1. Try schedules endpoint only for today/tomorrow (real-time, ~10hr window)
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const isNearDate = dateStr === today || dateStr === tomorrow;
  
  if (isNearDate) {
    console.log(`AirLabs schedules call: ${normalized} on ${dateStr}`);
    try {
      const schedUrl = `${BASE_URL}/schedules?flight_iata=${normalized}&api_key=${API_KEY}`;
      const schedResponse = await fetch(schedUrl);
      
      if (schedResponse.ok) {
        const schedData = await schedResponse.json();
        if (!schedData.error) {
          let schedFlights = schedData.response || [];
          
          // Filter by departure airport if specified
          if (depFilter && schedFlights.length > 1) {
            const filtered = schedFlights.filter(f => f.dep_iata === depFilter);
            if (filtered.length > 0) schedFlights = filtered;
          }
          // Filter by arrival airport if specified
          if (arrFilter && schedFlights.length > 1) {
            const filtered = schedFlights.filter(f => f.arr_iata === arrFilter);
            if (filtered.length > 0) schedFlights = filtered;
          }
          
          if (schedFlights.length > 0) {
            // Multiple schedules? Let user pick
            if (schedFlights.length > 1 && !depFilter && !arrFilter) {
              const options = schedFlights.map(f => formatScheduleFlight(f, dateStr));
              return { multiple: true, options };
            }
            const result = { flight: formatScheduleFlight(schedFlights[0], dateStr) };
            cacheResult(cacheKey, dateStr, result);
            return result;
          }
        }
      }
    } catch (e) {
      console.error('Schedules lookup failed:', e.message);
    }
  }

  // 2. Routes endpoint (works for future dates)
  console.log(`AirLabs routes fallback: ${normalized} on ${dateStr}`);
  try {
    const routesUrl = `${BASE_URL}/routes?flight_iata=${normalized}&api_key=${API_KEY}`;
    const routesResponse = await fetch(routesUrl);

    if (routesResponse.ok) {
      const routesData = await routesResponse.json();
      if (!routesData.error) {
        const routes = routesData.response || [];
        if (routes.length > 0) {
          const requestedDate = new Date(dateStr + 'T12:00:00');
          const dayOfWeek = DAY_NAMES[requestedDate.getUTCDay()];
          
          // Filter to routes that operate on the requested day
          let dayMatches = routes.filter(r => r.days && r.days.includes(dayOfWeek));
          
          if (dayMatches.length === 0) {
            const availDays = routes[0].days ? routes[0].days.join(', ') : 'unknown days';
            throw new Error(`${normalized} doesn't operate on ${dayOfWeek}. This flight runs on: ${availDays}`);
          }

          // If departure airport specified, filter further
          if (depFilter) {
            const filtered = dayMatches.filter(r => r.dep_iata === depFilter);
            if (filtered.length > 0) dayMatches = filtered;
          }
          // If arrival airport specified, filter further
          if (arrFilter) {
            const filtered = dayMatches.filter(r => r.arr_iata === arrFilter);
            if (filtered.length > 0) dayMatches = filtered;
          }

          // If multiple legs match and no dep filter, return all options for user to pick
          if (dayMatches.length > 1 && !depFilter) {
            const options = dayMatches.map(r => formatRouteFlight(r, dateStr));
            return { multiple: true, options };
          }

          const result = { flight: formatRouteFlight(dayMatches[0], dateStr) };
          cacheResult(cacheKey, dateStr, result);
          return result;
        }
      }
    }
  } catch (e) {
    if (e.message.includes("doesn't operate")) throw e;
    console.error('Routes lookup failed:', e.message);
  }

  // 3. Real-time flights fallback
  console.log(`AirLabs flights fallback: ${normalized}`);
  try {
    const rtUrl = `${BASE_URL}/flights?flight_iata=${normalized}&api_key=${API_KEY}`;
    const rtResponse = await fetch(rtUrl);

    if (rtResponse.ok) {
      const rtData = await rtResponse.json();
      if (!rtData.error) {
        const rtFlights = rtData.response || [];
        if (rtFlights.length > 0) {
          const result = { flight: formatRealtimeFlight(rtFlights[0], dateStr) };
          cacheResult(cacheKey, dateStr, result);
          return result;
        }
      }
    }
  } catch (e) {
    console.error('Flights lookup failed:', e.message);
  }

  throw new Error(`No flight found for ${normalized}. Check the flight number and try again.`);
}

function formatScheduleFlight(flight, dateStr) {
  const depTime = flight.dep_time || flight.dep_time_utc || '';
  const arrTime = flight.arr_time || flight.arr_time_utc || '';
  const depDateTime = depTime.includes('-') ? depTime : `${dateStr} ${depTime}`;
  const arrDateTime = arrTime.includes('-') ? arrTime : `${dateStr} ${arrTime}`;

  return {
    flight_number: flight.flight_iata || flight.flight_icao || '',
    flight_date: dateStr,
    airline_name: flight.airline_iata || '',
    departure_airport: flight.dep_iata || '',
    departure_airport_name: flight.dep_iata || '',
    departure_time: depDateTime,
    departure_terminal: flight.dep_terminal || '',
    departure_gate: flight.dep_gate || '',
    arrival_airport: flight.arr_iata || '',
    arrival_airport_name: flight.arr_iata || '',
    arrival_time: arrDateTime,
    arrival_terminal: flight.arr_terminal || '',
    arrival_gate: flight.arr_gate || '',
    status: flight.status || 'scheduled'
  };
}

function formatRouteFlight(route, dateStr) {
  const depTime = route.dep_time || '00:00';
  const arrTime = route.arr_time || '00:00';
  const arrTerminal = Array.isArray(route.arr_terminals) ? route.arr_terminals[0] : (route.arr_terminal || '');
  const depTerminal = Array.isArray(route.dep_terminals) ? route.dep_terminals[0] : (route.dep_terminal || '');

  return {
    flight_number: route.flight_iata || route.flight_icao || '',
    flight_date: dateStr,
    airline_name: route.airline_iata || '',
    departure_airport: route.dep_iata || '',
    departure_airport_name: route.dep_iata || '',
    departure_time: `${dateStr} ${depTime}`,
    departure_terminal: depTerminal,
    departure_gate: '',
    arrival_airport: route.arr_iata || '',
    arrival_airport_name: route.arr_iata || '',
    arrival_time: `${dateStr} ${arrTime}`,
    arrival_terminal: arrTerminal,
    arrival_gate: '',
    status: 'scheduled',
    duration: route.duration || null
  };
}

function formatRealtimeFlight(flight, dateStr) {
  return {
    flight_number: flight.flight_iata || flight.flight_icao || '',
    flight_date: dateStr,
    airline_name: flight.airline_iata || '',
    departure_airport: flight.dep_iata || '',
    departure_airport_name: flight.dep_iata || '',
    departure_time: `${dateStr} ${flight.dep_time_utc || '00:00'}`,
    departure_terminal: '',
    departure_gate: '',
    arrival_airport: flight.arr_iata || '',
    arrival_airport_name: flight.arr_iata || '',
    arrival_time: `${dateStr} ${flight.arr_time_utc || '00:00'}`,
    arrival_terminal: '',
    arrival_gate: '',
    status: flight.status || 'en-route'
  };
}

function cacheResult(flightNumber, flightDate, result) {
  db.prepare(
    `INSERT OR REPLACE INTO flight_cache (flight_number, flight_date, response_json) VALUES (?, ?, ?)`
  ).run(flightNumber, flightDate, JSON.stringify(result));
}

module.exports = { lookupFlight };
