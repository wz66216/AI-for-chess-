export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const fen = url.searchParams.get('fen');
    if (!fen) {
      return new Response(JSON.stringify({ error: 'missing fen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      const token = env.LICHESS_TOKEN;
      const lichessResp = await fetch(
        `https://explorer.lichess.org/masters?fen=${encodeURIComponent(fen)}&moves=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'ChessExplain/1.0 (Cloudflare Worker)',
            'Accept': 'application/json',
          },
        },
      );
      const data = await lichessResp.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
