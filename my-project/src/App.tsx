import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlogLayout } from "./components/BlogLayout";
import { useBlogState } from "./store/blogStore";
import type { Post, SavePostInput } from "./types";

const API = "https://jsonplaceholder.typicode.com/posts";

async function getPosts(): Promise<Post[]> {
  const response = await fetch(`${API}?_limit=12`);
  if (!response.ok) throw new Error("글 목록을 불러오지 못했어요.");
  return response.json();
}

async function getPost(id: number): Promise<Post> {
  const response = await fetch(`${API}/${id}`);
  if (!response.ok) throw new Error("글을 불러오지 못했어요.");
  return response.json();
}

async function savePost(post: SavePostInput): Promise<Post> {
  const isEdit = Boolean(post.id);
  const response = await fetch(isEdit ? `${API}/${post.id}` : API, {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  if (!response.ok) throw new Error(isEdit ? "글 수정에 실패했어요." : "글 작성에 실패했어요.");
  return response.json();
}

async function deletePost(id: number): Promise<void> {
  const response = await fetch(`${API}/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("글 삭제에 실패했어요.");
}

function App() {
  const queryClient = useQueryClient();
  const selectedId = useBlogState((s) => s.selectedId);
  const select = useBlogState((s) => s.select);
  const edit = useBlogState((s) => s.edit);
  const postsQuery = useQuery<Post[], Error>({ queryKey: ["posts"], queryFn: getPosts });
  const detailQuery = useQuery<Post, Error>({
    queryKey: ["post", selectedId],
    queryFn: () => getPost(selectedId!),
    enabled: Boolean(selectedId),
  });
  const saveMutation = useMutation<Post, Error, SavePostInput>({
    mutationFn: savePost,
    onSuccess: (saved) => {
      queryClient.setQueryData<Post[]>(["posts"], (old = []) => {
        const exists = old.some((post) => post.id === saved.id);
        return exists ? old.map((post) => post.id === saved.id ? saved : post) : [saved, ...old];
      });
      queryClient.setQueryData(["post", saved.id], saved);
      select(saved.id);
      edit(null);
    },
  });
  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: deletePost,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Post[]>(["posts"], (old = []) => old.filter((post) => post.id !== id));
      queryClient.removeQueries({ queryKey: ["post", id] });
      select(null);
      edit(null);
    },
  });
  return <BlogLayout postsQuery={postsQuery} detailQuery={detailQuery} saveMutation={saveMutation} deleteMutation={deleteMutation} />;
}

export default App;
