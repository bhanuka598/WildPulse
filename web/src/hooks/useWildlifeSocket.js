import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const EVENTS = [
  'wildlife:location-updated',
  'wildlife:alert-created',
  'wildlife:alert-updated',
  'wildlife:sensor-offline',
  'wildlife:dispatch-created',
  'wildlife:dispatch-updated',
];

export function socketBaseUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;
  const api = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return api.replace(/\/api\/?$/, '');
}

export function playAlertTone() {
  if (localStorage.getItem('wildlife-alert-sound') !== 'on') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.35);
  oscillator.onended = () => ctx.close();
}

export function useWildlifeSocket(onEvent) {
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(socketBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    const forward = (name) => (payload) => handler.current?.(name, payload);
    const bound = EVENTS.map((name) => {
      const fn = forward(name);
      socket.on(name, fn);
      return [name, fn];
    });
    const onConnect = () => handler.current?.('socket:connected', {});
    socket.on('connect', onConnect);

    return () => {
      bound.forEach(([name, fn]) => socket.off(name, fn));
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, []);
}
