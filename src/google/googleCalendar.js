// ================================================================
// Google Calendar API Integration
// Creates Google Meet links automatically inside the app
// ================================================================

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

// Load Google API scripts dynamically
export function loadGoogleScripts() {
  return new Promise((resolve) => {
    // Load GAPI
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        if (gisInited) resolve();
      });
    };
    document.body.appendChild(gapiScript);

    // Load GIS (Google Identity Services)
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // set dynamically
      });
      gisInited = true;
      if (gapiInited) resolve();
    };
    document.body.appendChild(gisScript);
  });
}

// Request Google OAuth token
export function getGoogleToken() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) reject(resp);
      else resolve(resp);
    };
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

// Check if already signed in
export function isGoogleSignedIn() {
  return window.gapi?.client?.getToken() !== null;
}

// Sign out of Google
export function googleSignOut() {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
}

// Create Google Calendar event with Meet link
export async function createMeetEvent({ title, date, time, duration, description }) {
  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  const event = {
    summary: title,
    description: description || 'EduLearn Live Class',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    conferenceData: {
      createRequest: {
        requestId: `edulearn-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    resource: event,
  });

  const meetLink = response.result.conferenceData?.entryPoints?.find(
    ep => ep.entryPointType === 'video'
  )?.uri;

  return {
    meetLink,
    eventId: response.result.id,
    eventLink: response.result.htmlLink,
  };
}
