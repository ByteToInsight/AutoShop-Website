process.env.VERCEL = '0';
const app = require('./server.js');
const http = require('http');
const server = app.listen(3001, () => {
  http.get('http://localhost:3001/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const sc = (data.match(/<script/gi) || []).length;
      const oc = (data.match(/onclick=/gi) || []).length;
      console.log('Script tags remaining:', sc);
      console.log('Onclick handlers remaining:', oc);
      console.log('Page size:', data.length, 'bytes');
      if (sc > 0) {
        const idx = data.search(/<script/i);
        console.log('First script at', idx, ':', data.substring(idx, idx + 120));
      }
      server.close();
    });
  });
});
