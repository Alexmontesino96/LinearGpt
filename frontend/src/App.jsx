import { useEffect, useRef, useState } from 'react';

export default function App() {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [renderPayload, setRenderPayload] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    async function connect() {
      console.log('Starting WebRTC connection...');
      try {
        const pc = new RTCPeerConnection();
        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
          setStatus(pc.connectionState);
        };

        const dc = pc.createDataChannel('oai-events');
        dc.onopen = () => console.log('Data channel opened');
        dc.onerror = (err) => console.error('Data channel error', err);
        dc.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          console.log('Data channel message:', msg.type);
          if (msg.type === 'render') setRenderPayload(msg.payload);
        };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Got user media');
        stream.getAudioTracks().forEach((t) => pc.addTrack(t, stream));
        localRef.current.srcObject = stream;

        pc.ontrack = (e) => {
          console.log('Received remote track');
          const rstream = e.streams[0];
          remoteRef.current.srcObject = rstream;
          monitorAudio(rstream);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('Created local offer');

        const key = import.meta.env.VITE_OAI_KEY;
        const endpoint = import.meta.env.VITE_OAI_ENDPOINT;
        const model = import.meta.env.VITE_OAI_MODEL;
        const missing = [];
        if (!key) missing.push('VITE_OAI_KEY');
        if (!endpoint) missing.push('VITE_OAI_ENDPOINT');
        if (!model) missing.push('VITE_OAI_MODEL');
        if (missing.length) {
          const msg = `Missing env vars: ${missing.join(', ')}`;
          console.error(msg);
          setStatus(msg);
          return;
        }

        const res = await fetch(`${endpoint}?model=${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        });
        console.log('Sent offer, awaiting answer...');
        const answer = { type: 'answer', sdp: await res.text() };
        await pc.setRemoteDescription(answer);
        console.log('Remote description set');
      } catch (err) {
        console.error('Connection failed', err);
        setStatus('error');
      }
    }
    connect();
  }, []);

  useEffect(() => {
    if (renderPayload) {
      const t = setTimeout(() => setRenderPayload(null), 8000);
      return () => clearTimeout(t);
    }
  }, [renderPayload]);

  function monitorAudio(stream) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    src.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setSpeaking(rms > 0.02);
      requestAnimationFrame(loop);
    };
    loop();
  }

  return (
    <>
      <div className="status">{status}</div>
      <div className={`voice-container ${renderPayload ? 'card' : 'bubble'} ${speaking && !renderPayload ? 'speaking' : ''}`}>
        <audio ref={localRef} autoPlay muted />
        <audio ref={remoteRef} autoPlay />
        {renderPayload && <RenderHost payload={renderPayload} />}
      </div>
    </>
  );
}

function RenderHost({ payload }) {
  switch (payload.component) {
    case 'ClassCardGrid':
      return <ClassCardGrid {...payload.props} />;
    default:
      return null;
  }
}

function ClassCardGrid({ date, gym, items }) {
  return (
    <div className="card-grid">
      <h3>{gym} – {date}</h3>
      {items.map((c) => (
        <div key={c.id} className="card">
          <strong>{c.title}</strong><br />
          {c.start} – {c.coach} ({c.spots} cupos)
        </div>
      ))}
    </div>
  );
}
