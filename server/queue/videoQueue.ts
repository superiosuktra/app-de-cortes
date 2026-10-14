import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Conexão com o Redis local
const connection = new IORedis({
  maxRetriesPerRequest: null
});

// Criando a fila de processamento de vídeos
export const videoQueue = new Queue('video-processing', { connection });

export const addVideoJob = async (jobName: string, data: any) => {
  return await videoQueue.add(jobName, data);
};
