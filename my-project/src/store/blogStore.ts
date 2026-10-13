import { create } from "zustand";

interface BlogState {
  selectedId: number | null;
  editId: number | null;
  search: string;
  draftTitle: string;
  draftBody: string;
  select: (selectedId: number | null) => void;
  edit: (editId: number | null) => void;
  setSearch: (search: string) => void;
  setDraft: (draft: { draftTitle: string; draftBody: string }) => void;
}

export const useBlogState = create<BlogState>((set) => ({
  selectedId: null,
  editId: null,
  search: "",
  draftTitle: "",
  draftBody: "",
  select: (selectedId) => set({ selectedId }),
  edit: (editId) => set({ editId }),
  setSearch: (search) => set({ search }),
  setDraft: (draft) => set(draft),
}));
