import { http } from './axios';
import { useSettingsStore } from '../../store/settingsStore';

// Base URL is typed by the user in Settings, so resolve it per request.
http.interceptors.request.use(config => {
  config.baseURL = useSettingsStore.getState().baseUrl;
  return config;
});
