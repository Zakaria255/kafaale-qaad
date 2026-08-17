import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { media as mediaApi } from '../api/client.js';
import { C } from "../theme.js";

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
          <div style={{ fontWeight: 800, fontSize: 15 }}>{post.authorName || "Kafaala Qaad"}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{new Date(post.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        {post.tag && (
          <span style={{ background: C.primary + "15", color: C.primary, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{post.tag}</span>
        )}
        {(isOwner || isAdmin) && (
          <button onClick={() => onDelete(post.id)} title="Delete post"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, padding: "4px 8px", borderRadius: 8 }}></button>
        )}
      </div>

      {/* Text content */}
      {post.title && <div style={{ padding: "0 20px 6px", fontWeight: 800, fontSize: 18, color: C.text }}>{post.title}</div>}
      {post.body  && <div style={{ padding: "0 20px 12px", fontSize: 15, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{post.body}</div>}

      {/* Image grid */}
      {post.images?.length > 0 && (
        post.images.length === 1 ? (
          /* Single image: never crop — show the full picture, letterboxed if needed */
          <div style={{ background: "#F1F5F9", maxHeight: 480, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            onClick={() => setLightbox(post.images[0])}>
            <img src={post.images[0]} alt="" style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain", display: "block" }} />
          </div>
        ) : (
          <div style={{
            display: "grid", gap: 2,
            gridTemplateColumns: post.images.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
          }}>
            {post.images.slice(0, 3).map((src, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: "100%", cursor: "pointer" }}
                onClick={() => setLightbox(src)}>
                <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                {i === 2 && post.images.length > 3 && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 900 }}>+{post.images.length - 3}</div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Video */}
      {post.videoUrl && renderVideo(post.videoUrl)}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => onLike(post.id)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: "none", background: hasLiked ? "#FEF2F2" : "#F8FAFC", cursor: "pointer", fontWeight: 700, fontSize: 14, color: hasLiked ? "#DC2626" : C.muted }}>
          {hasLiked ? "" : ""} {post.likes?.length || 0}
        </button>
        <button onClick={() => setShowComments(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: "none", background: showComments ? C.primary + "12" : "#F8FAFC", cursor: "pointer", fontWeight: 700, fontSize: 14, color: showComments ? C.primary : C.muted }}>
          {post.comments?.length || 0}
        </button>
        <button onClick={() => { try { navigator.share({ title: post.title, text: post.body, url: window.location.href }); } catch { navigator.clipboard?.writeText(window.location.href); } }}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: "none", background: "#F8FAFC", cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.muted }}>
          Share
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

const TAGS_KEY = "kf_media_tags";
const DEFAULT_TAGS = ["Update", "Success Story", "News", "Event", "Appeal", "Report", "Community"];
const loadTags = () => { try { const t = JSON.parse(localStorage.getItem(TAGS_KEY) || "null"); return Array.isArray(t) && t.length ? t : DEFAULT_TAGS; } catch { return DEFAULT_TAGS; } };
const saveTags = (tags) => { try { localStorage.setItem(TAGS_KEY, JSON.stringify(tags)); } catch {} };

// ─── Main feed ────────────────────────────────────────────────────────────────
export default function MediaFeed() {
  const { user } = useAuth();
  const [posts,        setPosts]       = useState([]);
  const [showForm,     setShowForm]    = useState(false);
  const [form,         setForm]        = useState({ title: "", body: "", tag: "" });
  const [images,       setImages]      = useState([]);    // File objects — uploaded as-is, any size
  const [videoFile,    setVideoFile]   = useState(null);  // File object (from-device tab)
  const [videoTab,     setVideoTab]    = useState("file"); // "file" | "youtube"
  const [ytUrl,        setYtUrl]       = useState("");
  const [posting,      setPosting]     = useState(false);
  const [postError,    setPostError]   = useState("");
  const [filter,       setFilter]      = useState("all");
  const [tags,         setTags]        = useState(loadTags);
  const [newTag,       setNewTag]      = useState("");
  const imgRef   = useRef(null);
  const videoRef = useRef(null);

  const isAdmin = ['admin','super_admin','verification_office'].includes(user?.role);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Every visitor loads the same shared feed from the database.
  useEffect(() => {
    mediaApi.list().then(({ posts }) => setPosts(posts || [])).catch(() => {});
  }, []);

  // Local preview URLs for not-yet-uploaded files — revoked whenever the
  // underlying file list changes so we don't leak blob URLs.
  const imagePreviews = useMemo(() => images.map(f => URL.createObjectURL(f)), [images]);
  useEffect(() => () => imagePreviews.forEach(u => URL.revokeObjectURL(u)), [imagePreviews]);
  const videoPreview = useMemo(() => videoFile ? URL.createObjectURL(videoFile) : null, [videoFile]);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);

  // ── Category management ───────────────────────────────────────────────────────
  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (tags.some(x => x.toLowerCase() === t.toLowerCase())) { setNewTag(""); return; }
    const updated = [...tags, t];
    setTags(updated); saveTags(updated); setNewTag("");
  };
  const removeTag = (t) => {
    const updated = tags.filter(x => x !== t);
    setTags(updated); saveTags(updated);
    if (filter === t) setFilter("all");
    if (form.tag === t) set("tag", "");
  };

  // ── Image picker ────────────────────────────────────────────────────────────
  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(p => [...p, ...files]);
    e.target.value = "";
  };

  // ── Video file picker — no size cap; large files just take longer to upload ─
  const handleVideoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setVideoFile(file);
  };

  const removeVideo = () => { setVideoFile(null); setYtUrl(""); };

  // ── Submit post ─────────────────────────────────────────────────────────────
  const canPost = form.body.trim() || images.length > 0 || videoFile || (videoTab === "youtube" && ytUrl.trim());

  const submit = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    setPostError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("body", form.body.trim());
      fd.append("tag", form.tag);
      images.forEach(f => fd.append("images", f));
      if (videoTab === "file" && videoFile) fd.append("video", videoFile);
      if (videoTab === "youtube" && ytUrl.trim()) fd.append("videoUrl", ytUrl.trim());
      const { post } = await mediaApi.create(fd);
      setPosts(p => [post, ...p]);
      resetForm();
    } catch (e) {
      setPostError(e.message || "Failed to post — please try again.");
    } finally {
      setPosting(false);
    }
  };

  const resetForm = () => {
    setForm({ title: "", body: "", tag: "" });
    setImages([]);
    setVideoFile(null);
    setYtUrl("");
    setShowForm(false);
    setPostError("");
  };

  // ── Like / comment / delete ─────────────────────────────────────────────────
  const handleLike = (postId) => {
    if (!user) return;
    mediaApi.like(postId)
      .then(({ likes }) => setPosts(p => p.map(post => post.id === postId ? { ...post, likes } : post)))
      .catch(() => {});
  };

  const handleComment = (postId, body) => {
    if (!user) return;
    mediaApi.comment(postId, body)
      .then(({ comments }) => setPosts(p => p.map(post => post.id === postId ? { ...post, comments } : post)))
      .catch(() => {});
  };

  const handleDelete = (postId) => {
    mediaApi.remove(postId)
      .then(() => setPosts(p => p.filter(post => post.id !== postId)))
      .catch(() => {});
  };

  const filtered = filter === "all" ? posts : posts.filter(p => p.tag === filter);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", padding: "48px 24px 40px", textAlign: "center" }}>
        {/* Background photo */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `var(--kf-img-grade), url("/media-hero.jpg")`, backgroundSize: "cover", backgroundPosition: "center center" }} />
        {/* Brand gradient overlay for text readability */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${C.primary}E6, ${C.secondary}CC)` }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, margin: "0 0 8px", textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>Community Media</h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, margin: 0, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>Stories, updates, and moments from Kafaala Qaad Foundation</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Compose trigger ── */}
        {isAdmin && !showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 16, background: C.card, border: `1.5px dashed ${C.border}`, cursor: "pointer", marginBottom: 20, textAlign: "left" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}></div>
            <span style={{ fontSize: 15, color: C.muted, fontWeight: 600 }}>Share an update, photo, video or story…</span>
          </button>
        )}

        {/* ── Compose form ── */}
        {isAdmin && showForm && (
          <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20, boxShadow: "0 4px 20px #0002" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Create New Post</div>

            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Title (optional)"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />

            <textarea value={form.body} onChange={e => set("body", e.target.value)} rows={4}
              placeholder="What's happening? Share an update, story, or news…"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, resize: "vertical", boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />

            {/* Tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {tags.map(t => (
                <button key={t} onClick={() => set("tag", form.tag === t ? "" : t)}
                  style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `2px solid ${form.tag === t ? C.primary : C.border}`, background: form.tag === t ? C.primary : "#fff", color: form.tag === t ? "#fff" : C.muted, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {imagePreviews.map((src, i) => (
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
                {[["file","From Device"],["youtube","YouTube / URL"]].map(([key, label]) => (
                  <button key={key} onClick={() => { setVideoTab(key); removeVideo(); }}
                    style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: videoTab === key ? C.primary + "10" : "#fff", color: videoTab === key ? C.primary : C.muted, borderBottom: videoTab === key ? `2px solid ${C.primary}` : "2px solid transparent" }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 14 }}>
                {videoTab === "file" ? (
                  videoFile ? (
                    /* Video preview */
                    <div>
                      <video src={videoPreview} controls style={{ width: "100%", maxHeight: 240, borderRadius: 8, background: "#000", display: "block" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{videoFile.name}</span>
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
                        if (file && file.type.startsWith("video/")) setVideoFile(file);
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 6 }}></div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Click to choose a video</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>or drag and drop here · MP4, MOV, AVI, WebM · any size</div>
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

            {postError && (
              <div style={{ background: "#FEF2F2", color: C.danger, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{postError}</div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {images.length === 0 && (
                <button onClick={() => imgRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, color: C.primary }}>
                  Add Photos
                </button>
              )}
              <button onClick={submit} disabled={!canPost || posting}
                style={{ padding: "9px 28px", borderRadius: 10, background: C.primary, color: "#fff", border: "none", cursor: (canPost && !posting) ? "pointer" : "default", fontWeight: 800, fontSize: 14, opacity: (canPost && !posting) ? 1 : 0.45 }}>
                {posting ? "Posting…" : "Post"}
              </button>
              <button onClick={resetForm} disabled={posting}
                style={{ padding: "9px 18px", borderRadius: 10, background: "#F3F4F6", color: C.muted, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Tag filter bar ── */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
          {["all", ...tags].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: `2px solid ${filter === t ? C.primary : C.border}`, background: filter === t ? C.primary : "#fff", color: filter === t ? "#fff" : C.muted, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t === "all" ? "All Posts" : t}
              {t !== "all" && posts.filter(p => p.tag === t).length > 0 && (
                <span style={{ marginLeft: 5, opacity: 0.7, fontWeight: 400, fontSize: 12 }}>{posts.filter(p => p.tag === t).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Admin: manage categories ── */}
        {isAdmin && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>Manage Categories</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {tags.map(t => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1.5px solid ${C.border}`, background: "#F8FAFC", color: C.text }}>
                  {t}
                  <button onClick={() => removeTag(t)} title={`Remove "${t}"`}
                    style={{ width: 20, height: 20, borderRadius: "50%", background: C.danger, color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                </span>
              ))}
              {tags.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>No categories yet — add one below.</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newTag} onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="New category name…"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
              <button onClick={addTag}
                style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </div>
        )}

        {/* ── Feed ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>No posts yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {isAdmin ? "Share the first update with your community" : "Check back soon for updates from Kafaala Qaad"}
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
