# Recipes

## Batch file processing

```js
import fs from 'node:fs/promises';
import pLimit from 'p-limit';

const limit = pLimit(5);

const files = await fs.readdir('uploads');

const results = await limit.map(files, async file => {
	const content = await fs.readFile(`uploads/${file}`, 'utf8');
	return JSON.parse(content);
});
```

## Fetch multiple URLs

```js
import pLimit from 'p-limit';

const limit = pLimit(3);

const urls = [
	'https://api.example.com/users/1',
	'https://api.example.com/users/2',
	'https://api.example.com/users/3',
	'https://api.example.com/users/4',
	'https://api.example.com/users/5',
];

const results = await limit.map(urls, async url => {
	const response = await fetch(url);
	return response.json();
});
```

## Error handling with partial results

Use `Promise.allSettled` to continue processing even if some tasks fail, for example when a request returns a non-2xx response:

```js
import pLimit from 'p-limit';

const limit = pLimit(3);

const urls = [
	'https://api.example.com/users/1',
	'https://api.example.com/users/2',
	'https://api.example.com/users/3',
];

const results = await Promise.allSettled(
	urls.map(url => limit(async () => {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Request failed with ${response.status} for ${url}`);
		}

		return response.json();
	}))
);

for (const result of results) {
	if (result.status === 'fulfilled') {
		console.log(result.value);
	} else {
		console.error(result.reason);
	}
}
```

## Graceful shutdown

Use `clearQueue()` to discard pending tasks when shutting down. Promises for discarded tasks never settle, so only wait for already running tasks during shutdown:

```js
import pLimit from 'p-limit';

const limit = pLimit(5);

const urls = getUrls(); // Assume this returns a large list of URLs

const runningPromises = new Set();

const promises = urls.map(url => limit(async () => {
	const fetchPromise = fetch(url);
	runningPromises.add(fetchPromise);

	try {
		return await fetchPromise;
	} finally {
		runningPromises.delete(fetchPromise);
	}
}));

const shutdown = () => {
	// Discard pending tasks (already running tasks will complete)
	limit.clearQueue();

	void Promise.allSettled([...runningPromises]).finally(() => {
		process.exit(0);
	});
};

for (const signal of ['SIGTERM', 'SIGINT']) {
	process.once(signal, shutdown);
}

const results = await Promise.allSettled(promises);
```

## Dynamic concurrency

Adjust concurrency at runtime, for example, in response to rate limiting:

```js
import pLimit from 'p-limit';

const limit = pLimit(10);

const urls = getUrls(); // Assume this returns a list of URLs

async function fetchWithBackoff(url) {
	const response = await fetch(url);

	if (response.status === 429) {
		limit.concurrency = Math.max(1, Math.floor(limit.concurrency / 2));
	} else if (limit.concurrency < 10) {
		limit.concurrency++;
	}

	return response;
}

const results = await limit.map(urls, fetchWithBackoff);
```

## Reusable limited function

Use `limitFunction()` when you want a single function to manage its own concurrency:

```js
import {limitFunction} from 'p-limit';

const urls = getUrls(); // Assume this returns a list of URLs

const fetchUrl = async url => {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Request failed with ${response.status} for ${url}`);
	}

	return response.json();
};

const limitedFetchUrl = limitFunction(fetchUrl, {concurrency: 3});

const results = await Promise.all(urls.map(url => limitedFetchUrl(url)));
```

## Shared context provider

Use `limit(fn, ...args)` to pass a shared context (like a client instance) to all limited calls:

```js
import pLimit from 'p-limit';
import {S3} from '@aws-sdk/client-s3';

const limit = pLimit(2);
const client = new S3({});

const runWithClient = (function_, ...arguments_) => limit(function_, client, ...arguments_);

const fetchFromSomeBucket = (client, fileKey) => client.getObject({
	Bucket: 'someBucket',
	Key: fileKey
});

const results = await Promise.all([
	runWithClient(fetchFromSomeBucket, 'someFileKey1'),
	runWithClient(fetchFromSomeBucket, 'someFileKey2'),
	runWithClient(fetchFromSomeBucket, 'someFileKey3')
]);
```

## Progress reporting

Use `activeCount` and `pendingCount` to report progress while work is running:

```js
import pLimit from 'p-limit';

const limit = pLimit(5);

const urls = getUrls(); // Assume this returns a list of URLs

const progressInterval = setInterval(() => {
	console.log(`Running: ${limit.activeCount}, pending: ${limit.pendingCount}`);
}, 250);

let results;

try {
	results = await limit.map(urls, url => fetch(url));
} finally {
	clearInterval(progressInterval);
}
```
