import { useEffect, useRef, useState } from 'react';

export default function App() {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [renderPayload, setRenderPayload] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState('connecting');

  // store references for cleanup
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function connect() {
      console.log('Starting WebRTC connection...');
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
          setStatus(pc.connectionState);
        };

        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;
        dc.onopen = () => console.log('Data channel opened');
        dc.onerror = (err) => console.error('Data channel error', err);
        dc.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          console.log('Data channel message:', msg.type);
          if (msg.type === 'render') setRenderPayload(msg.payload);
        };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
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

        const res = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OAI_KEY}`,
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

    return () => {
      if (dcRef.current && dcRef.current.readyState !== 'closed') {
        try {
          dcRef.current.close();
        } catch (e) {
          console.error('Failed to close data channel', e);
        }
      }
      if (pcRef.current && pcRef.current.connectionState !== 'closed') {
        try {
          pcRef.current.close();
        } catch (e) {
          console.error('Failed to close peer connection', e);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
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
