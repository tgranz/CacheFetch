# CacheFetch

**An easy, self-hosting solution to cache web requests.**

## What for
- To speed up fetching heavy requests.
- To return data even if the requested URL fails.

## Why
CacheFetch was built for [SparkRadar](https://github.com/tgranz/sparkradar) when I realized that requests for the SPC outlooks and storm centers failed due to a fetch timeout very frequently.

## Where
You can host CacheFetch on any server. It is extremely lightweight and runs on one JS file with under 200 lines of code. Just clone the repo, run `npm install` and start it with `node index`.

## How
- CacheFetch accepts 3 parameters: `url`, `maxAge`, and `format`. URL is the URL to fetch from. MaxAge defines the maximum age of the cache in seconds. Format defines the format of the response (`txt` or `json`).
- When a request is recieved, CacheFetch checks for a cached response. If one exists, it will verify the age against maxAge; if the maxAge is greater than the cache age, the cached data will be returned.
- If the cache is older than maxAge, CacheFetch will attempt to fetch the resource. If it succeeds, it will update the cache and return the new data. If the request fails, the stale cache will still be returned.

## When
CacheFetch was made in 2026.

## Whose
CacheFetch is licensed with the MIT License. It was not vibecoded, rather developed entirely by me, @tgranz.

## Thanks
If you find my code useful, please consider donating to support my projects: [BuyMeACoffee](https://buymeacoffee.com/tgranz).

## Hello
You can send me an email at nimbusapps@proton.me.