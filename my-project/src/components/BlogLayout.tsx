import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useBlogState } from "../store/blogStore";
import type { Post, SavePostInput } from "../types";

type Props = {
  postsQuery: UseQueryResult<Post[], Error>;
  detailQuery: UseQueryResult<Post, Error>;
  saveMutation: UseMutationResult<Post, Error, SavePostInput, unknown>;
  deleteMutation: UseMutationResult<void, Error, number, unknown>;
};

export function BlogLayout({ postsQuery, detailQuery, saveMutation, deleteMutation }: Props) {
  return (
    <main className="page">
      <SiteHeader />
      <Hero />
      <div className="main-grid">
        <Journal posts={postsQuery.data ?? []} postsQuery={postsQuery} detailQuery={detailQuery} deleteMutation={deleteMutation} />
        <aside className="sidebar">
          <Composer saveMutation={saveMutation} />
          <AboutCard />
        </aside>
      </div>
      <footer>작은 기록이 모여 나만의 이야기가 됩니다 <span>✳</span></footer>
    </main>
  );
}

function SiteHeader() {
  const select = useBlogState((s) => s.select);
  const edit = useBlogState((s) => s.edit);
  const setDraft = useBlogState((s) => s.setDraft);
  return (
    <header className="topbar">
      <a className="brand" href="#" onClick={() => { select(null); edit(null); setDraft({ draftTitle: "", draftBody: "" }); }}>tiny<span>log</span></a>
      <nav><a className="nav-active" href="#journal">저널</a><a href="#write">글 쓰기</a></nav>
      <span className="avatar">T</span>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div><p className="eyebrow">MONDAY, SEPTEMBER 27</p><h1>생각을 기록하고,<br /><span>나만의 이야기를 만듭니다.</span></h1><p className="intro">평범한 하루의 순간들을 천천히 적어보세요.</p><a className="hero-button" href="#write">오늘의 글 남기기 <span>↗</span></a></div>
      <div className="hero-art" aria-hidden="true"><span className="sun"></span><span className="hill hill-one"></span><span className="hill hill-two"></span><span className="art-note">a little<br />everyday</span></div>
    </section>
  );
}

type JournalProps = {
  posts: Post[];
  postsQuery: UseQueryResult<Post[], Error>;
  detailQuery: UseQueryResult<Post, Error>;
  deleteMutation: UseMutationResult<void, Error, number, unknown>;
};

function Journal({ posts, postsQuery, detailQuery, deleteMutation }: JournalProps) {
  const search = useBlogState((s) => s.search);
  const setSearch = useBlogState((s) => s.setSearch);
  const visiblePosts = posts.filter((post) => {
    const keyword = search.trim().toLowerCase();
    return !keyword || post.title.toLowerCase().includes(keyword) || post.body.toLowerCase().includes(keyword);
  });
  return (
    <section className="feed" id="journal">
      <div className="section-heading feed-heading"><div><p className="eyebrow">YOUR JOURNAL</p><h2>최근 기록 <span className="count">{visiblePosts.length}개의 글</span></h2></div>
        <label className="search-wrap"><span>⌕</span><input className="search" aria-label="글 검색" placeholder="기록 검색" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      </div>
      {postsQuery.isLoading && <div className="message">글을 가져오고 있어요…</div>}
      {postsQuery.isError && <div className="message error">{postsQuery.error.message} <button className="text-button" onClick={() => postsQuery.refetch()}>다시 시도</button></div>}
      {!postsQuery.isLoading && !postsQuery.isError && visiblePosts.length === 0 && <div className="message">검색 결과가 없어요.</div>}
      <div className="post-list">{visiblePosts.map((post, index) => <PostCard key={post.id} post={post} index={index} detailQuery={detailQuery} deleteMutation={deleteMutation} />)}</div>
    </section>
  );
}

type PostCardProps = { post: Post; index: number; detailQuery: UseQueryResult<Post, Error>; deleteMutation: UseMutationResult<void, Error, number, unknown> };
function PostCard({ post, index, detailQuery, deleteMutation }: PostCardProps) {
  const selectedId = useBlogState((s) => s.selectedId);
  const select = useBlogState((s) => s.select);
  const edit = useBlogState((s) => s.edit);
  const setDraft = useBlogState((s) => s.setDraft);
  const active = selectedId === post.id;
  return (
    <article className={`post card ${active ? "selected" : ""}`}>
      <button className="post-open" onClick={() => select(active ? null : post.id)}>
        <span className="post-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="post-content"><span className="post-meta">2026년 9월 {27 - (index % 20)}일 <i>·</i> 2분 읽기</span><span className="post-title">{post.title}</span><span className="post-preview">{post.body}</span><span className="post-category">일상의 기록</span></span><span className="arrow">↗</span>
      </button>
      {active && <div className="detail">
        {detailQuery.isFetching ? <p className="muted">상세 내용을 불러오는 중…</p> : detailQuery.isError ? <p className="error">{detailQuery.error.message} <button className="text-button" onClick={() => detailQuery.refetch()}>다시 시도</button></p> : <>
          <p>{detailQuery.data?.body}</p><div className="actions"><button className="text-button" onClick={() => { if (detailQuery.data) { edit(detailQuery.data.id); setDraft({ draftTitle: detailQuery.data.title, draftBody: detailQuery.data.body }); } }}>수정</button><button className="text-button danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(post.id)}>{deleteMutation.isPending ? "삭제 중…" : "삭제"}</button></div>
          {deleteMutation.isError && <p className="error">{deleteMutation.error.message}</p>}
        </>}
      </div>}
    </article>
  );
}

function Composer({ saveMutation }: { saveMutation: UseMutationResult<Post, Error, SavePostInput, unknown> }) {
  const editId = useBlogState((s) => s.editId);
  const edit = useBlogState((s) => s.edit);
  const title = useBlogState((s) => s.draftTitle);
  const body = useBlogState((s) => s.draftBody);
  const setDraft = useBlogState((s) => s.setDraft);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    saveMutation.mutate({ id: editId ?? undefined, title: title.trim(), body: body.trim(), userId: 1 }, {
      onSuccess: () => { setDraft({ draftTitle: "", draftBody: "" }); },
    });
  };
  return (
    <section className="composer card" id="write">
      <div className="section-heading"><div><p className="eyebrow">NEW ENTRY</p><h2>{editId ? "기록 수정하기" : "새 기록 쓰기"}</h2></div>{editId && <button className="text-button" onClick={() => { edit(null); setDraft({ draftTitle: "", draftBody: "" }); }}>취소</button>}</div>
      <p className="form-hint">오늘의 생각을 편하게 적어보세요.</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="post-title">제목</label><input id="post-title" placeholder="기록의 제목" value={title} onChange={(e) => setDraft({ draftTitle: e.target.value, draftBody: body })} maxLength={100} />
        <label className="field-label" htmlFor="post-body">내용</label><textarea id="post-body" placeholder="오늘은 어떤 하루였나요?" value={body} onChange={(e) => setDraft({ draftTitle: title, draftBody: e.target.value })} rows={7} />
        {saveMutation.isError && <p className="error">{saveMutation.error.message}</p>}
        <div className="form-bottom"><span>{body.length}자</span><button className="primary" disabled={saveMutation.isPending || !title.trim() || !body.trim()}>{saveMutation.isPending ? "저장 중…" : editId ? "수정 저장" : "기록 발행"} <span>↗</span></button></div>
      </form>
    </section>
  );
}

function AboutCard() {
  return <section className="about card"><div className="about-icon">✳</div><p className="eyebrow">ABOUT TINYLOG</p><h3>나를 위한 작은 공간</h3><p>잘 쓴 글이 아니어도 괜찮아요.<br />기록하는 마음이면 충분합니다.</p><div className="about-foot">매일 조금씩, 나답게.</div></section>;
}
