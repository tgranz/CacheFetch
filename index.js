/*

CacheFetch

A simple Express API server to fetch data from a URL with caching.
The purpose of this API is to provide a reponse every time even if a specific API endpoint fails to respond and speed up reponse times.

(c) 2026 tgranz | MIT License

Currently supports the following formats:
- JSON ('json')
- Plain text ('txt')

Endpoints:
- GET /: Basic endpoint to check if the API is running.
- GET /cache: Fetches data from the specified URL and caches it.
  - url: The URL to fetch data from.
  - format (optional): The format of the cached data. Default is json.
  - maxAge (optional): The maximum age of the cache in seconds. Default is 3600 (1 hour).

Response Codes:
- 200: Success. Data was returned fulfilling request requirements.
- 204: Failed to fetch but cache was available that was outside the maxAge constraint. Stale cache returned.
- 400: Bad request. Invalid format or missing URL parameter.
- 404: Not found. Failed to fetch from the specified URL. Will NOT look for cache if fetch fails.
- 500: Internal server error. An error occurred while processing the request (see description in response).
- 504: Gateway timeout. The request timed out and no cache was available to return.

Example:
http://localhost:3000/cache?url=https%3A%2F%2Fapi.sparkradar.app%2Fconnections&maxAge=3600
  > Remember to encode the URL parameter when making requests.

*/

// Imports
import express from 'express';
import fs from 'fs';

// Constants and settings
const PORT = 3141;
const SUPPORTED_FORMATS = ['json', 'txt'];
const CACHE_META_FILE = 'cache/meta.json';
const CACHE_DIR = 'cache';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

// Initialize cache metadata
if (!fs.existsSync(CACHE_META_FILE)) {
    fs.writeFileSync(CACHE_META_FILE, JSON.stringify({}));
}

// Initialize Express app
const app = express();

// Root directory
app.get('/', (req, res) => {
    res.status(200).json({message: 'success', description: 'API is running.'});
});

// Cache endpoint
app.get('/cache', (req, res) => {
    // Extract query parameters
    const url = req.query.url || '';
    const format = req.query.format || 'json';
    const maxAge = req.query.maxAge || 3600; // Default 1 hour

    // Verify format
    if (!SUPPORTED_FORMATS.includes(format)) {
        return res.status(400).json({message: 'invalid format', description: `Invalid format. Supported formats include: ${SUPPORTED_FORMATS.join(', ')}.`});
    }

    // Identify cache file path
    const cacheFile = `${CACHE_DIR}/${url.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;

    // Old cache flag
    let isStaleCache = false;

    // See if the cache file exists
    if (fs.existsSync(cacheFile)) {
        // Check the cache age
        const cacheMeta = JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf-8'));
        const cacheEntry = cacheMeta[cacheFile];

        // Cache is good, return cached data
        if (cacheEntry && (Date.now() - cacheEntry.timestamp) < maxAge * 1000) {
            const cachedData = fs.readFileSync(cacheFile, 'utf-8');
            if (format === 'json') {
                return res.status(200).json(JSON.parse(cachedData));
            } else {
                return res.status(200).type('text/plain').send(cachedData);
            }
        }

        // Cache is stale by request. Attempt to re-fetch but return stale data if fetch fails
        isStaleCache = true;
    }
    
    // Cache file doesn't exist or is stale, fetch data and cache it

    // Set a timeout
    const timeout = new AbortController();
    const fetchTimeout = setTimeout(() => {
        timeout.abort();

        if (isStaleCache) {
            const cachedData = fs.readFileSync(cacheFile, 'utf-8');
            if (format === 'json') {
                return res.status(204).json(JSON.parse(cachedData));
            } else {
                return res.status(204).type('text/plain').send(cachedData);
            }
        } else {
            return res.status(504).json({message: 'timeout', description: 'The request timed out while fetching data. No cached data available.'});
        }
    }, 5000);

    // Perform the fetch
    fetch(url, { signal: timeout.signal })
    .then(response => {
        if (response.ok) {
            if (format === 'json') {
                return response.json();
            } else {
                return response.text();
            }
        } else {
            clearTimeout(fetchTimeout);
            return res.status(404).json({message: 'fetch error', description: `Failed to fetch from URL. Status: ${response.status}`});
        }
    })
    .then(data => {
        if (data === undefined) return; // 404 already sent
        clearTimeout(fetchTimeout);
        if (format === 'json') {
            data = JSON.stringify(data);
        } else {
            data = data.toString();
        }

        // Write the cache data
        fs.writeFileSync(cacheFile, data);

        // Update cache metadata
        const cacheMeta = JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf-8'));
        cacheMeta[cacheFile] = { url, format, timestamp: Date.now() };
        fs.writeFileSync(CACHE_META_FILE, JSON.stringify(cacheMeta));

        // Return the fetched data
        if (format === 'json') {
            res.status(200).json(JSON.parse(data));
        } else {
            res.status(200).type('text/plain').send(data);
        }
    })
    .catch(error => {
        if (!res.headersSent) {
            res.status(500).json({message: 'error', description: 'An error occurred while fetching data.', error: error.message});
        }
    });
});

app.listen(PORT, () => {
    console.log(`CacheFetch running on http://localhost:${PORT}`);
});

app.on('error', (err, req, res) => {
    console.warn('An error occurred:', err);
    res.status(500).json({message: 'error', description: 'An internal server error occurred.', error: err.message});
});