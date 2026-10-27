import { createServer } from 'node:http';

/**
 * Server tiruan Google Places API (New) untuk uji integrasi lokal.
 * Menyajikan 6 halaman × 20 place; ±35% punya website; Place Details
 * melengkapi nomor telepon untuk place yang tidak membawa nomor.
 */

let requestCount = 0;

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/stats') {
    json(res, 200, { requests: requestCount });
    return;
  }

  requestCount += 1;

  if (req.method === 'POST' && url.pathname === '/v1/places:searchText') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      const page = Number(body.pageToken ?? 0);
      const places = Array.from({ length: 20 }, (_, index) => {
        const seq = page * 20 + index;
        const hasWebsite = seq % 3 === 0;
        const hasPhone = seq % 7 !== 0;
        const id = `place-${seq}`;
        return {
          id,
          displayName: { text: `Usaha ${seq} ${body.textQuery?.slice(0, 12) ?? ''}` },
          formattedAddress: `Jl. Uji No. ${seq}, ${body.textQuery?.split(' di ').pop() ?? 'Jakarta'}`,
          ...(hasPhone
            ? { nationalPhoneNumber: `0812${String(1000000 + seq).slice(0, 7)}` }
            : {}),
          ...(hasWebsite ? { websiteUri: `https://usaha${seq}.example.com` } : {}),
          rating: 4.1,
          userRatingCount: 42,
          googleMapsUri: `https://maps.google.com/?q=${id}`,
        };
      });
      json(res, 200, {
        places,
        ...(page < 5 ? { nextPageToken: String(page + 1) } : {}),
      });
    });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/v1/places/')) {
    const id = decodeURIComponent(url.pathname.slice('/v1/places/'.length));
    const seq = Number(id.replace('place-', ''));
    json(res, 200, {
      id,
      nationalPhoneNumber: `0813${String(2000000 + seq).slice(0, 7)}`,
      ...(seq % 17 === 0 ? { websiteUri: `https://detail-${seq}.example.com` } : {}),
    });
    return;
  }

  json(res, 404, { error: { message: 'not found' } });
});

server.listen(4010, '127.0.0.1', () => console.log('fake places on 4010'));
