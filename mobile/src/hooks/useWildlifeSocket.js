import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../api/client';

const EVENTS = [
  'wildlife:location-updated',
  'wildlife:alert-created',
  'wildlife:alert-updated',
  'wildlife:sensor-offline',
  'wildlife:dispatch-created',
  'wildlife:dispatch-updated',
];

export function useWildlifeSocket(onEvent) {
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let socket;
    let cancelled = false;
    const bound = [];

    async function connect() {
      if (!API_URL) return;
      const token = await AsyncStorage.getItem('token');
      if (cancelled) return;
      socket = io(API_URL.replace(/\/api\/?$/, ''), {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      EVENTS.forEach((name) => {
        const fn = (payload) => handler.current?.(name, payload);
        socket.on(name, fn);
        bound.push([name, fn]);
      });
      const onConnect = () => handler.current?.('socket:connected', {});
      socket.on('connect', onConnect);
      bound.push(['connect', onConnect]);
    }

    connect();
    return () => {
      cancelled = true;
      bound.forEach(([name, fn]) => socket?.off(name, fn));
      socket?.disconnect();
    };
  }, []);
}
