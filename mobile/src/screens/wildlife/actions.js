import syncService from '../../services/syncService';
import api from '../../api/client';

export function operationId(action, dispatchId) {
  return `wl_${action}_${dispatchId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function sendDispatchAction({ dispatchId, action, note, outcome, photoUri }) {
  const online = await syncService.isConnected();
  if (!online) {
    const id = operationId(action, dispatchId);
    await syncService.enqueueWildlifeOp({ operationId: id, dispatchId, action, note, outcome, photoUri: photoUri || '' });
    return { queued: true, operationId: id };
  }
  if (action === 'complete' && photoUri) {
    const form = new FormData();
    form.append('note', note || '');
    form.append('outcome', outcome || '');
    form.append('photo', { uri: photoUri, name: 'response.jpg', type: 'image/jpeg' });
    const { data } = await api.patch(`/wildlife/dispatches/${dispatchId}/complete`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { queued: false, dispatch: data.dispatch, photoStored: Boolean(data.photoStored) };
  }
  const { data } = await api.patch(`/wildlife/dispatches/${dispatchId}/${action}`, { note, outcome });
  return { queued: false, dispatch: data.dispatch, photoStored: false };
}

export function apiMessage(error) {
  return error?.response?.data?.message || error?.message || 'Request failed';
}
