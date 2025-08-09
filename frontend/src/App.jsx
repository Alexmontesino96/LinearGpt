import { useEffect, useRef, useState } from 'react';

export default function App() {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [renderPayload, setRenderPayload] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    async function connect() {
      const pc = new RTCPeerConnection();
      const dc = pc.createDataChannel('oai-events');
      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'render') setRenderPayload(msg.payload);
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getAudioTracks().forEach((t) => pc.addTrack(t, stream));
      localRef.current.srcObject = stream;

      pc.ontrack = (e) => {
        const rstream = e.streams[0];
        remoteRef.current.srcObject = rstream;
        monitorAudio(rstream);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OAI_KEY}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });
      const answer = { type: 'answer', sdp: await res.text() };
      await pc.setRemoteDescription(answer);
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
    <div className={`voice-container ${renderPayload ? 'card' : 'bubble'} ${speaking && !renderPayload ? 'speaking' : ''}`}>
      <audio ref={localRef} autoPlay muted />
      <audio ref={remoteRef} autoPlay />
      {renderPayload && <RenderHost payload={renderPayload} />}
    </div>
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
