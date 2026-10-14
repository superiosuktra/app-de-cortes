import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Conexão com o Redis local
const connection = new IORedis({
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 2) return null; // Não fica tentando em loop infinito se o Redis não estiver instalado localmente
    return 1000;
  },
});

connection.on('error', (err) => {
  // Graceful warning when local Redis is not active
  console.warn('[BullMQ VideoQueue] Redis offline ou não conectado:', err.message);
});

// Criando a fila de processamento de vídeos
export const videoQueue = new Queue('video-processing', { connection });
videoQueue.on('error', () => {});

export const addVideoJob = async (jobName: string, data: any) => {
  return await videoQueue.add(jobName, data);
};
