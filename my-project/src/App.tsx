import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface BlogState {
  selectedId: number | null;
  editId: number | null;
  search: string;
  select: (selectedId: number | null) => void;
  edit: (editId: number | null) => void;
  setSearch: (search: string) => void;
}

interface SavePostInput {
  id?: number;
  title: string;
  body: string;
  userId: number;
}

const API = "https://jsonplaceholder.typicode.com/posts";

const useBlogState = create<BlogState>((set) => ({
  selectedId: null,
  editId: null,
  search: "",
  select: (selectedId) => set({ selectedId }),
  edit: (editId) => set({ editId }),
  setSearch: (search) => set({ search }),
}));

async function getPosts(): Promise<Post[]> {
  const response = await fetch(`${API}?_limit=12`);

  if (!response.ok) {
    throw new Error("글 목록을 불러오지 못했어요.");
  }

  return response.json();
}

async function getPost(id: number): Promise<Post> {
  const response = await fetch(`${API}/${id}`);

  if (!response.ok) {
    throw new Error("글을 불러오지 못했어요.");
  }

  return response.json();
}

async function savePost(post: SavePostInput): Promise<Post> {
  const isEdit = Boolean(post.id);

  const response = await fetch(isEdit ? `${API}/${post.id}` : API, {
    method: isEdit ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    throw new Error(isEdit ? "글 수정에 실패했어요." : "글 작성에 실패했어요.");
  }

  return response.json();
}

async function deletePost(id: number): Promise<void> {
  const response = await fetch(`${API}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("글 삭제에 실패했어요.");
  }
}

function App() {
  const queryClient = useQueryClient();

  const { selectedId, editId, select, edit, search, setSearch } =
    useBlogState();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // 글 목록 조회
  const postsQuery = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: getPosts,
  });

  // 글 작성 / 수정
  const saveMutation = useMutation({
    mutationFn: savePost,

    onSuccess: (saved) => {
      queryClient.setQueryData<Post[]>(["posts"], (oldPosts = []) => {
        const exists = oldPosts.some((post) => post.id === saved.id);

        // 수정
        if (exists) {
          return oldPosts.map((post) => (post.id === saved.id ? saved : post));
        }

        // 새 글 작성
        return [saved, ...oldPosts];
      });

      // 상세 데이터도 최신 데이터로 변경
      queryClient.setQueryData<Post>(["post", saved.id], saved);

      select(saved.id);
      edit(null);
      setTitle("");
      setBody("");
    },
  });

  // 글 삭제
  const deleteMutation = useMutation({
    mutationFn: deletePost,

    onSuccess: (_, id) => {
      queryClient.setQueryData<Post[]>(["posts"], (oldPosts = []) =>
        oldPosts.filter((post) => post.id !== id),
      );

      queryClient.removeQueries({
        queryKey: ["post", id],
      });

      select(null);
      edit(null);
    },
  });

  // 글 상세 조회
  const detailQuery = useQuery<Post>({
    queryKey: ["post", selectedId],
    queryFn: () => getPost(selectedId!),
    enabled: Boolean(selectedId),
  });

  const posts = (postsQuery.data ?? []).filter((post) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return (
      post.title.toLowerCase().includes(keyword) ||
      post.body.toLowerCase().includes(keyword)
    );
  });

  // 수정 버튼
  const startEdit = (post: Post) => {
    edit(post.id);
    setTitle(post.title);
    setBody(post.body);
  };

  // 작성 / 수정 제출
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !body.trim()) {
      return;
    }

    saveMutation.mutate({
      id: editId ?? undefined,
      title: title.trim(),
      body: body.trim(),
      userId: 1,
    });
  };

  return (
    <main className="page">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={() => {
            select(null);
            edit(null);
            setTitle("");
            setBody("");
          }}
        >
          tiny<span>log</span>
        </a>

        <nav>
          <a className="nav-active" href="#journal">
            저널
          </a>
          <a href="#write">글 쓰기</a>
        </nav>

        <span className="avatar">T</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">MONDAY, SEPTEMBER 27</p>

          <h1>
            생각을 기록하고,
            <br />
            <span>나만의 이야기를 만듭니다.</span>
          </h1>

          <p className="intro">평범한 하루의 순간들을 천천히 적어보세요.</p>

          <a className="hero-button" href="#write">
            오늘의 글 남기기 <span>↗</span>
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <span className="sun"></span>
          <span className="hill hill-one"></span>
          <span className="hill hill-two"></span>

          <span className="art-note">
            a little
            <br />
            everyday
          </span>
        </div>
      </section>

      <div className="main-grid">
        <section className="feed" id="journal">
          <div className="section-heading feed-heading">
            <div>
              <p className="eyebrow">YOUR JOURNAL</p>

              <h2>
                최근 기록 <span className="count">{posts.length}개의 글</span>
              </h2>
            </div>

            <label className="search-wrap">
              <span>⌕</span>

              <input
                className="search"
                aria-label="글 검색"
                placeholder="기록 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          {postsQuery.isLoading && (
            <div className="message">글을 가져오고 있어요…</div>
          )}

          {postsQuery.isError && (
            <div className="message error">
              {postsQuery.error.message}{" "}
              <button
                className="text-button"
                onClick={() => postsQuery.refetch()}
              >
                다시 시도
              </button>
            </div>
          )}

          {!postsQuery.isLoading &&
            !postsQuery.isError &&
            posts.length === 0 && (
              <div className="message">검색 결과가 없어요.</div>
            )}

          <div className="post-list">
            {posts.map((post, index) => (
              <article
                className={`post card ${
                  selectedId === post.id ? "selected" : ""
                }`}
                key={post.id}
              >
                <button
                  className="post-open"
                  onClick={() =>
                    select(selectedId === post.id ? null : post.id)
                  }
                >
                  <span className="post-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="post-content">
                    <span className="post-meta">
                      2026년 9월 {27 - (index % 20)}일 <i>·</i> 2분 읽기
                    </span>

                    <span className="post-title">{post.title}</span>

                    <span className="post-preview">{post.body}</span>

                    <span className="post-category">일상의 기록</span>
                  </span>

                  <span className="arrow">↗</span>
                </button>

                {selectedId === post.id && (
                  <div className="detail">
                    {detailQuery.isFetching ? (
                      <p className="muted">상세 내용을 불러오는 중…</p>
                    ) : detailQuery.isError ? (
                      <p className="error">
                        {detailQuery.error.message}{" "}
                        <button
                          className="text-button"
                          onClick={() => detailQuery.refetch()}
                        >
                          다시 시도
                        </button>
                      </p>
                    ) : (
                      <>
                        <p>{detailQuery.data?.body}</p>

                        <div className="actions">
                          <button
                            className="text-button"
                            onClick={() => {
                              if (detailQuery.data) {
                                startEdit(detailQuery.data);
                              }
                            }}
                          >
                            수정
                          </button>

                          <button
                            className="text-button danger"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(post.id)}
                          >
                            {deleteMutation.isPending ? "삭제 중…" : "삭제"}
                          </button>
                        </div>

                        {deleteMutation.isError && (
                          <p className="error">
                            {deleteMutation.error.message}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <section className="composer card" id="write">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NEW ENTRY</p>

                <h2>{editId ? "기록 수정하기" : "새 기록 쓰기"}</h2>
              </div>

              {editId && (
                <button
                  className="text-button"
                  onClick={() => {
                    edit(null);
                    setTitle("");
                    setBody("");
                  }}
                >
                  취소
                </button>
              )}
            </div>

            <p className="form-hint">오늘의 생각을 편하게 적어보세요.</p>

            <form onSubmit={submit}>
              <label className="field-label" htmlFor="post-title">
                제목
              </label>

              <input
                id="post-title"
                aria-label="제목"
                placeholder="기록의 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />

              <label className="field-label" htmlFor="post-body">
                내용
              </label>

              <textarea
                id="post-body"
                aria-label="내용"
                placeholder="오늘은 어떤 하루였나요?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
              />

              {saveMutation.isError && (
                <p className="error">{saveMutation.error.message}</p>
              )}

              <div className="form-bottom">
                <span>{body.length}자</span>

                <button
                  className="primary"
                  disabled={
                    saveMutation.isPending || !title.trim() || !body.trim()
                  }
                >
                  {saveMutation.isPending
                    ? "저장 중…"
                    : editId
                      ? "수정 저장"
                      : "기록 발행"}{" "}
                  <span>↗</span>
                </button>
              </div>
            </form>
          </section>

          <section className="about card">
            <div className="about-icon">✳</div>

            <p className="eyebrow">ABOUT TINYLOG</p>

            <h3>나를 위한 작은 공간</h3>

            <p>
              잘 쓴 글이 아니어도 괜찮아요.
              <br />
              기록하는 마음이면 충분합니다.
            </p>

            <div className="about-foot">매일 조금씩, 나답게.</div>
          </section>
        </aside>
      </div>

      <footer>
        작은 기록이 모여 나만의 이야기가 됩니다 <span>✳</span>
      </footer>
    </main>
  );
}

export default App;
