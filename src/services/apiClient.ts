export const apiClient = {
  // Buscar informações do vídeo do YouTube
  fetchVideoInfo: async (url: string) => {
    const response = await fetch('/api/video-info', { // O Vite geralmente redireciona /api para o Backend
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Erro ao buscar dados do vídeo');
    return response.json();
  },

  // Enviar vídeo para processamento/corte
  requestCut: async (formData: FormData) => {
    const response = await fetch('/api/render-download-cut', {
      method: 'POST',
      body: formData, // FormData é usado porque o backend espera um arquivo via Multer
    });
    if (!response.ok) throw new Error('Erro ao solicitar corte');
    return response.blob(); // Atualmente o backend retorna o arquivo de vídeo para download
  }
};
