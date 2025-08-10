import { createServer } from 'http';

const cards = {
  component: 'ClassCardGrid',
  props: {
    date: '2024-06-01',
    gym: 'Downtown Gym',
    items: [
      { id: '1', title: 'Yoga', start: '09:00', coach: 'Alice', spots: 5 },
      { id: '2', title: 'Pilates', start: '10:30', coach: 'Bob', spots: 3 }
    ]
  }
};

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/cards') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cards));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});
