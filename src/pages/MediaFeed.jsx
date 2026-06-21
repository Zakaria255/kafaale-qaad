import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const C = {
  primary: "#004B96", secondary: "#4B7D19", bg: "#F4F7FC",
  border: "#D8E4F0", muted: "#5A6E8A", text: "#0D1F3C",
  danger: "#C0392B", card: "#fff",
};

const STORE_KEY = "kf_media_posts";
const loadPosts = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; } };
const savePosts = (posts) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(posts)); } catch {} };

// ─── Post card ────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, onLike, onComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comment,      setComment]      = useState("");
  const [lightbox,     setLightbox]     = useState(null);

  const hasLiked = post.likes?.includes(currentUser?.id);
  const isAdmin  = ['admin','super_admin','verification_office'].includes(currentUser?.role);
  const isOwner  = post.authorId === currentUser?.id;

  const submitComment = () => {
    if (!comment.trim()) return;
    onComment(post.id, comment.trim());
    setComment("");
  };

  const renderVideo = (src) => {
    if (!src) return null;
    if (src.match(/youtube\.com|youtu\.be/)) {
      const embedSrc = src.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
      return <iframe src={embedSrc} style={{ width: "100%", height: 320, border: "none" }} allowFullScreen title="video" />;
    }
    return (
      <video controls style={{ width: "100%", maxHeight: 380, background: "#000", display: "block" }}>
        <source src={src} />
        Your browser does not support video playback.
      </video>
    );
  };

  return (
    <div style={{ background: C.card, borderRadius: 20, boxShadow: "0 2px 12px #0001", border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 900, flexShrink: 0 }}>
          {(post.authorName || "K").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{post.authorName || "Kafaale Qaad"}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{new Date(post.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        {post.tag && (
          <span style={{ background: C.primary + "15", color: C.primary, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{post.tag}</span>
        )}
        {(isOwner || isAdmin) && (
          <button onClick={() => onDelete(post.id)} title="Delete post"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, padding: "4px 8px", borderRadius: 8 }}>🗑</button>
        )}
      </div>

      {/* Text content */}
      {post.title && <div style={{ padding: "0 20px 6px", fontWeight: 800, fontSize: 18, color: C.text }}>{post.title}</div>}
      {post.body  && <div style={{ padding: "0 20px 12px", fontSize: 15, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{post.body}</div>}

      {/* Image grid */}
      {post.images?.length > 0 && (
        <div style={{
          display: "grid", gap: 2,
          gridTemplateColumns: post.images.length === 1 ? "1fr" : post.images.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
          marginBottom: post.videoUrl ? 0 : 0,
        }}>
          {post.images.slice(0, 3).map((src, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: post.images.length === 1 ? "56%" : "100%", cursor: "pointer" }}
              onClick={() => setLightbox(src)}>
              <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 2 && post.images.length > 3 && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 900 }}>+{post.images.length - 3}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {post.videoUrl && renderVideo(post.videoUrl)}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => onLike(post.id)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: "none", background: hasLiked ? "#FEF2F2" : "#F8FAFC", cursor: "pointer", fontWeight: 700, fontSize: 14, color: hasLiked ? "#DC2626" : C.muted }}>
          {hasLiked ? "❤️" : "🤍"} {post.likes?.length || 0}
        </button>
        <button onClick={() => setShowComments(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: "none", background: showComments ? C.primary + "12" : "#F8FAFC", cursor: "pointer", fontWeight: 700, fontSize: 14, color: showComments ? C.primary : C.muted }}>
          💬 {post.comments?.length || 0}
        </button>
        <button onClick={() => { try { navigator.share({ title: post.title, text: post.body, url: window.location.href }); } catch { navigator.clipboard?.writeText(window.location.href); } }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: "none", background: "#F8FAFC", cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.muted }}>
          📤 Share
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${C.border}`, background: "#FAFBFD" }}>
          {(post.comments || []).length === 0 && (
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "8px 0 12px" }}>
              {currentUser ? "No comments yet. Be the first!" : "No comments yet. Log in to comment."}
            </div>
          )}
          {(post.comments || []).map((cm, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900, flexShrink: 0 }}>
                {(cm.authorName || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.primary }}>{cm.authorName}</div>
                <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{cm.body}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{new Date(cm.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))}
          {currentUser && (
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900, flexShrink: 0 }}>
                {(currentUser.name || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()}
                  placeholder="Write a comment…"
                  style={{ flex: 1, padding: "9px 14px", borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                <button onClick={submitComment} disabled={!comment.trim()}
                  style={{ padding: "9px 18px", borderRadius: 20, background: C.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: comment.trim() ? 1 : 0.5 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 24, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontWeight: 900 }}>✕</button>
        </div>
      )}
    </div>
  );
}

const TAGS = ["Update", "Success Story", "News", "Event", "Appeal", "Report", "Community"];

// ─── Main feed ────────────────────────────────────────────────────────────────
export default function MediaFeed() {
  const { user } = useAuth();
  const [posts,        setPosts]       = useState(loadPosts);
  const [showForm,     setShowForm]    = useState(false);
  const [form,         setForm]        = useState({ title: "", body: "", tag: "" });
  const [images,       setImages]      = useState([]);    // base64 strings
  const [videoSrc,     setVideoSrc]    = useState(null);  // base64 or YouTube URL
  const [videoName,    setVideoName]   = useState("");
  const [videoTab,     setVideoTab]    = useState("file"); // "file" | "youtube"
  const [ytUrl,        setYtUrl]       = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [filter,       setFilter]      = useState("all");
  const imgRef   = useRef(null);
  const videoRef = useRef(null);

  const isAdmin = ['admin','super_admin','verification_office'].includes(user?.role);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Image picker ────────────────────────────────────────────────────────────
  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setImages(p => [...p, ev.target.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  // ── Video file picker ───────────────────────────────────────────────────────
  const handleVideoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Warn if very large (> 50 MB — base64 will be ~67 MB in memory)
    if (file.size > 50 * 1024 * 1024) {
      alert("Video is too large (max 50 MB). Please trim it or use a YouTube link instead.");
      return;
    }

    setVideoLoading(true);
    setVideoName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      setVideoSrc(ev.target.result);
      setVideoLoading(false);
    };
    reader.onerror = () => {
      setVideoLoading(false);
      alert("Could not read video file. Try a different format.");
    };
    reader.readAsDataURL(file);
  };

  const removeVideo = () => { setVideoSrc(null); setVideoName(""); setYtUrl(""); };

  // ── Submit post ─────────────────────────────────────────────────────────────
  const finalVideoUrl = videoTab === "youtube" ? ytUrl.trim() : videoSrc;
  const canPost = form.body.trim() || images.length > 0 || finalVideoUrl;

  const submit = () => {
    if (!canPost) return;
    const newPost = {
      id:         Date.now().toString(),
      authorId:   user?.id || "anon",
      authorName: user?.name || "Kafaale Qaad",
      title:      form.title.trim(),
      body:       form.body.trim(),
      images,
      videoUrl:   finalVideoUrl || "",
      tag:        form.tag,
      likes:      [],
      comments:   [],
      createdAt:  new Date().toISOString(),
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    savePosts(updated);
    resetForm();
  };

  const resetForm = () => {
    setForm({ title: "", body: "", tag: "" });
    setImages([]);
    setVideoSrc(null);
    setVideoName("");
    setYtUrl("");
    setShowForm(false);
  };

  // ── Like / comment / delete ─────────────────────────────────────────────────
  const handleLike = (postId) => {
    if (!user) return;
    const updated = posts.map(p => {
      if (p.id !== postId) return p;
      const liked = p.likes?.includes(user.id);
      return { ...p, likes: liked ? p.likes.filter(id => id !== user.id) : [...(p.likes || []), user.id] };
    });
    setPosts(updated); savePosts(updated);
  };

  const handleComment = (postId, body) => {
    if (!user) return;
    const updated = posts.map(p => {
      if (p.id !== postId) return p;
      const cm = { authorId: user.id, authorName: user.name || "User", body, createdAt: new Date().toISOString() };
      return { ...p, comments: [...(p.comments || []), cm] };
    });
    setPosts(updated); savePosts(updated);
  };

  const handleDelete = (postId) => {
    const updated = posts.filter(p => p.id !== postId);
    setPosts(updated); savePosts(updated);
  };

  const filtered = filter === "all" ? posts : posts.filter(p => p.tag === filter);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})`, padding: "48px 24px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📱</div>
        <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, margin: "0 0 8px" }}>Community Media</h1>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0 }}>Stories, updates, and moments from Kafaale Qaad Hope Society</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Compose trigger ── */}
        {isAdmin && !showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 16, background: C.card, border: `1.5px dashed ${C.border}`, cursor: "pointer", marginBottom: 20, textAlign: "left" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>✍️</div>
            <span style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}>Share an update, photo, video or story…</span>
          </button>
        )}

        {/* ── Compose form ── */}
        {isAdmin && showForm && (
          <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, boxShadow: "0 4px 20px #0002" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>📝 Create New Post</div>

            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Title (optional)"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />

            <textarea value={form.body} onChange={e => set("body", e.target.value)} rows={4}
              placeholder="What's happening? Share an update, story, or news…"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, resize: "vertical", boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />

            {/* Tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => set("tag", form.tag === t ? "" : t)}
                  style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `2px solid ${form.tag === t ? C.primary : C.border}`, background: form.tag === t ? C.primary : "#fff", color: form.tag === t ? "#fff" : C.muted, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {images.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={src} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: `2px solid ${C.border}` }} />
                    <button onClick={() => setImages(p => p.filter((_, idx) => idx !== i))}
                      style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "#EF4444", color: "#fff", border: "2px solid #fff", cursor: "pointer", fontSize: 12, fontWeight: 900, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                  </div>
                ))}
                <button onClick={() => imgRef.current?.click()}
                  style={{ width: 80, height: 80, borderRadius: 10, border: `2px dashed ${C.border}`, background: "#F8FAFC", cursor: "pointer", fontSize: 24, color: C.muted, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
              </div>
            )}

            {/* Video section */}
            <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
              {/* Tab switcher */}
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
                {[["file","🎬 From Device"],["youtube","🔗 YouTube / URL"]].map(([key, label]) => (
                  <button key={key} onClick={() => { setVideoTab(key); removeVideo(); }}
                    style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: videoTab === key ? C.primary + "10" : "#fff", color: videoTab === key ? C.primary : C.muted, borderBottom: videoTab === key ? `2px solid ${C.primary}` : "2px solid transparent" }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 14 }}>
                {videoTab === "file" ? (
                  videoSrc ? (
                    /* Video preview */
                    <div>
                      <video src={videoSrc} controls style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000", display: "block" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📹 {videoName}</span>
                        <button onClick={removeVideo} style={{ padding: "4px 12px", borderRadius: 8, background: "#FEE2E2", color: C.danger, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    /* Drop zone / pick button */
                    <div
                      onClick={() => videoRef.current?.click()}
                      style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: "#FAFBFD" }}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.primary; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                      onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = C.border;
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("video/")) {
                          const synth = { target: { files: [file], value: "" } };
                          handleVideoFile(synth);
                        }
                      }}
                    >
                      {videoLoading ? (
                        <div style={{ color: C.muted, fontSize: 14 }}>⏳ Loading video…</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 36, marginBottom: 6 }}>🎬</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Click to choose a video</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>or drag and drop here · MP4, MOV, AVI, WebM · max 50 MB</div>
                        </>
                      )}
                    </div>
                  )
                ) : (
                  /* YouTube / URL input */
                  <div>
                    <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                      placeholder="Paste YouTube link or direct video URL…"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    {ytUrl.trim() && ytUrl.match(/youtube\.com|youtu\.be/) && (
                      <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden" }}>
                        <iframe
                          src={ytUrl.replace("watch?v=","embed/").replace("youtu.be/","youtube.com/embed/")}
                          style={{ width: "100%", height: 200, border: "none" }} allowFullScreen title="preview" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hidden file inputs */}
            <input ref={imgRef}   type="file" accept="image/*"  multiple style={{ display: "none" }} onChange={handleImages} />
            <input ref={videoRef} type="file" accept="video/*"           style={{ display: "none" }} onChange={handleVideoFile} />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {images.length === 0 && (
                <button onClick={() => imgRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, color: C.primary }}>
                  📷 Add Photos
                </button>
              )}
              <button onClick={submit} disabled={!canPost}
                style={{ padding: "9px 28px", borderRadius: 10, background: C.primary, color: "#fff", border: "none", cursor: canPost ? "pointer" : "default", fontWeight: 800, fontSize: 14, opacity: canPost ? 1 : 0.45 }}>
                📤 Post
              </button>
              <button onClick={resetForm}
                style={{ padding: "9px 18px", borderRadius: 10, background: "#F3F4F6", color: C.muted, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Tag filter bar ── */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
          {["all", ...TAGS].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `2px solid ${filter === t ? C.primary : C.border}`, background: filter === t ? C.primary : "#fff", color: filter === t ? "#fff" : C.muted, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t === "all" ? "All Posts" : t}
              {t !== "all" && posts.filter(p => p.tag === t).length > 0 && (
                <span style={{ marginLeft: 5, opacity: 0.7, fontWeight: 400, fontSize: 12 }}>{posts.filter(p => p.tag === t).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Feed ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>No posts yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {isAdmin ? "Share the first update with your community" : "Check back soon for updates from Kafaale Qaad"}
            </div>
          </div>
        ) : (
          filtered.map(post => (
            <PostCard key={post.id} post={post} currentUser={user}
              onLike={handleLike} onComment={handleComment} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
