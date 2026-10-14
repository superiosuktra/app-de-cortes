import { create } from 'zustand';

type Cut = {
  id: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'processing' | 'done';
};

interface ProjectState {
  currentVideoUrl: string;
  cuts: Cut[];
  isProcessing: boolean;
  setVideoUrl: (url: string) => void;
  addCut: (cut: Cut) => void;
  updateCutStatus: (id: string, status: Cut['status']) => void;
  setProcessing: (status: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentVideoUrl: '',
  cuts: [],
  isProcessing: false,
  setVideoUrl: (url) => set({ currentVideoUrl: url }),
  addCut: (cut) => set((state) => ({ cuts: [...state.cuts, cut] })),
  updateCutStatus: (id, status) => set((state) => ({
    cuts: state.cuts.map(c => c.id === id ? { ...c, status } : c)
  })),
  setProcessing: (status) => set({ isProcessing: status }),
}));
