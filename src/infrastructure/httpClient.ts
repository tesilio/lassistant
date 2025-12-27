import axios from 'axios';
import { Agent } from 'https';

const httpsAgent = new Agent({ keepAlive: true });

export const httpClient = axios.create({
  timeout: 10000,
  httpsAgent,
  headers: {
    'User-Agent': 'Lassistant/1.0',
  },
});
