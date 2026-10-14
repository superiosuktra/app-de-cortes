import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

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
  console.warn('[BullMQ VideoWorker] Redis offline ou não conectado:', err.message);
});

// Criando o Worker que vai processar os itens da fila em background
export const videoWorker = new Worker('video-processing', async (job: Job) => {
  console.log(`[Worker] Iniciando processamento do job ${job.id} de tipo ${job.name}`);
  
  // Aqui entrará a lógica pesada de FFmpeg ou IA dependendo do job.name
  if (job.name === 'render-cut') {
    console.log(`[Worker] Processando renderização para: ${job.data.title}`);
    // Simulando um processamento demorado
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log(`[Worker] Job ${job.id} finalizado!`);
  return { success: true, jobId: job.id };
}, { connection });

videoWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completou com sucesso.`);
});

videoWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} falhou com erro: ${err.message}`);
});

videoWorker.on('error', (err) => {
  // Graceful warning when redis is offline
  console.warn('[BullMQ Worker] Conexão com Redis inativa:', err.message);
});
