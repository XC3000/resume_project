import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Automatically sends cookies for all HTTP requests to backend
});
