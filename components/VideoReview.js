"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, MessageSquare, Check, X, RotateCcw, Send, Reply, Film, Download } from "lucide-react";
import { COLORS, STATUS_META } from "@/lib/constants";
import { setItemStatus, addComment, toggleCommentTag, setDownloadLink } from "@/lib/actions/items";

function fmtTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

function getDriveFileId(url) {
  if (!url || !/drive\.google\.com/.test(url)) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return (m1 && m1[1]) || (m2 && m2[1]) || null;
}
function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?[^#]*\bv=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
function getYouTubeEmbedUrl(id) {
  return `https://www.youtube.com/embed/${id}`;
}

const inputStyle = { padding: "9px 11px", borderRadius: 7, border: `1px solid ${COLORS.line}`, fontSize: 13.5, outline: "none" };

function StatusButton({ label, color, onClick, icon, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 13px",
        borderRadius: 8,
        border: `1px solid ${color}`,
        background: "#fff",
        color,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon} {label}
    </button>
  );
}

function CommentRow({ c, onJump, onToggleTag, small }) {
  const roleColor = { ADMIN: COLORS.violet, CLIENT: "#0C447C", CREATOR: COLORS.green }[c.authorRole] || COLORS.slate;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <button
          onClick={onJump}
          style={{
            border: "none",
            background: "transparent",
            color: COLORS.red,
            fontFamily: "ui-monospace, monospace",
            fontSize: small ? 11.5 : 12.5,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {fmtTime(c.timecode)}
        </button>
        <span style={{ fontSize: small ? 11.5 : 12, fontWeight: 700, color: roleColor }}>{c.authorEmail.split("@")[0]}</span>
      </div>
      <div style={{ fontSize: small ? 12.5 : 13.5, lineHeight: 1.5, color: COLORS.ink, marginBottom: onToggleTag ? 8 : 0 }}>
        {c.text}
      </div>
      {onToggleTag && (
        <span
          onClick={onToggleTag}
          style={{
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
            background: c.tag === "done" ? COLORS.greenBg : COLORS.slateBg,
            color: c.tag === "done" ? COLORS.green : COLORS.slate,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {c.tag === "done" ? "Done" : "To do"}
        </span>
      )}
    </div>
  );
}

export default function VideoReview({ item, initialComments, session }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [draft, setDraft] = useState("");
  const [replyOpen, setReplyOpen] = useState({});
  const [replyDraft, setReplyDraft] = useState({});
  const [linkDraft, setLinkDraft] = useState(item.link || "");

  useEffect(() => {
    setLinkDraft(item.link || "");
  }, [item.id, item.link]);

  const isAdmin = session.role === "ADMIN";
  const isClient = session.role === "CLIENT";
  const isCreator = session.role === "CREATOR";
  const canModerate = isClient || isAdmin;
  const canProduce = isCreator || isAdmin;

  function runAction(fn) {
    startTransition(() => {
      fn().then(() => router.refresh());
    });
  }

  function handleStatus(status) {
    runAction(() => setItemStatus(item.id, status));
  }

  function handleAddComment(parentId, text, timecode) {
    if (!text.trim()) return;
    runAction(() => addComment(item.id, { parentId, text, timecode }));
  }

  function handleToggleTag(commentId) {
    runAction(() => toggleCommentTag(commentId, item.id));
  }

  function saveDownloadLink() {
    runAction(() => setDownloadLink(item.id, linkDraft));
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.pause();
    else v.play();
  }

  function scrubTo(clientX) {
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = ratio * duration;
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  function jumpTo(t) {
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  const topLevel = initialComments.filter((c) => !c.parentId).sort((a, b) => a.timecode - b.timecode);
  const childrenOf = (pid) => initialComments.filter((c) => c.parentId === pid).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const driveFileId = getDriveFileId(item.videoUrl);
  const youTubeId = !driveFileId ? getYouTubeId(item.videoUrl) : null;
  const effectiveVideoSrc = driveFileId ? `/api/drive/${driveFileId}` : item.videoUrl;
  const useManualIframe = !!youTubeId;
  const manualIframeUrl = youTubeId ? getYouTubeEmbedUrl(youTubeId) : null;
  const manualIframeSourceLabel = "YouTube";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 16px", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{item.name}</div>
          <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 2 }}>
            {item.packName}
            {isAdmin && item.executor ? ` · Assignee: ${item.executor}` : ""}
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 11px",
            borderRadius: 7,
            background: STATUS_META[item.status].bg,
            color: STATUS_META[item.status].fg,
          }}
        >
          {STATUS_META[item.status].label}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 20 }}>
        <div>
          <div
            style={{
              background: COLORS.ink,
              borderRadius: 14,
              overflow: "hidden",
              position: "relative",
              aspectRatio: "16/10",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {useManualIframe ? (
              <iframe
                src={manualIframeUrl}
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : item.videoUrl ? (
              <video
                ref={videoRef}
                src={effectiveVideoSrc}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration || 60)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <div style={{ color: "#8b8a94", textAlign: "center", padding: 24 }}>
                <Film size={30} style={{ marginBottom: 8, opacity: 0.6 }} />
                <div style={{ fontSize: 13 }}>No video connected. Add a direct file link (or a Google Drive / YouTube link) in the video's card.</div>
              </div>
            )}
          </div>

          {useManualIframe ? (
            <div style={{ margin: "12px 0" }}>
              <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 8 }}>
                This video is playing through {manualIframeSourceLabel}'s own player above — use its controls to play/seek. The timeline below doesn't control that player; click it (or type below) to set where a new comment should be tagged, matching what you see playing.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: COLORS.slate }}>Position:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ ...inputStyle, width: 90 }}
                  />
                  <span style={{ fontSize: 12, color: COLORS.slate, fontFamily: "ui-monospace, monospace" }}>sec ({fmtTime(currentTime)})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: COLORS.slate }}>Total length:</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={Math.round(duration)}
                    onChange={(e) => setDuration(Math.max(1, parseFloat(e.target.value) || 1))}
                    style={{ ...inputStyle, width: 90 }}
                  />
                  <span style={{ fontSize: 12, color: COLORS.slate }}>sec</span>
                </div>
              </div>

              <div
                ref={timelineRef}
                onClick={(e) => scrubTo(e.clientX)}
                style={{ position: "relative", height: 34, background: "#EFEEE8", borderRadius: 8, cursor: "pointer", marginBottom: 4 }}
              >
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${Math.min(100, (currentTime / duration) * 100)}%`, background: "#DCDAF9", borderRadius: 8 }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${Math.min(100, (currentTime / duration) * 100)}%`, width: 2, background: COLORS.violet }} />
                {topLevel.map((c) => (
                  <div key={c.id} title={c.text} style={{ position: "absolute", top: 4, width: 10, height: 10, borderRadius: "50%", background: c.tag === "done" ? COLORS.green : COLORS.red, left: `calc(${Math.min(100, (c.timecode / duration) * 100)}% - 5px)`, border: "2px solid #fff" }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 8 }}>Click the track to set the comment position. Dots are comments.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
                <button
                  onClick={togglePlay}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.line}`,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: COLORS.slate, minWidth: 108 }}>
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </div>
              </div>

              <div
                ref={timelineRef}
                onClick={(e) => scrubTo(e.clientX)}
                style={{ position: "relative", height: 34, background: "#EFEEE8", borderRadius: 8, cursor: "pointer", marginBottom: 4 }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${(currentTime / duration) * 100}%`,
                    background: "#DCDAF9",
                    borderRadius: 8,
                  }}
                />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(currentTime / duration) * 100}%`, width: 2, background: COLORS.violet }} />
                {topLevel.map((c) => (
                  <div
                    key={c.id}
                    title={c.text}
                    style={{
                      position: "absolute",
                      top: 4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: c.tag === "done" ? COLORS.green : COLORS.red,
                      left: `calc(${(c.timecode / duration) * 100}% - 5px)`,
                      border: "2px solid #fff",
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: COLORS.slate, marginBottom: 18 }}>Click the track to scrub. Dots are comments.</div>
            </>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Comment at ${fmtTime(currentTime)}…`}
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddComment(null, draft, currentTime);
                  setDraft("");
                }
              }}
            />
            <button
              onClick={() => {
                handleAddComment(null, draft, currentTime);
                setDraft("");
              }}
              style={{
                padding: "0 14px",
                borderRadius: 7,
                border: "none",
                background: COLORS.violet,
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={13} /> Add
            </button>
          </div>

          <div style={{ marginTop: 22, borderTop: `1px solid ${COLORS.line}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Status</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canProduce && (
                <>
                  <StatusButton label="In progress" color={COLORS.amber} icon={<RotateCcw size={13} />} onClick={() => handleStatus("PROGRESS")} />
                  <StatusButton label="Send for approval" color={COLORS.red} icon={<Send size={13} />} onClick={() => handleStatus("TO_APPROVE")} />
                </>
              )}
              {canModerate && item.status === "TO_APPROVE" && (
                <>
                  <StatusButton label="Approve" color={COLORS.green} icon={<Check size={13} />} onClick={() => handleStatus("DONE")} />
                  <StatusButton label="Request changes" color={COLORS.amber} icon={<X size={13} />} onClick={() => handleStatus("PROGRESS")} />
                </>
              )}
              {canModerate && item.status === "DONE" && (
                <StatusButton label="Undo approval" color={COLORS.amber} icon={<RotateCcw size={13} />} onClick={() => handleStatus("PROGRESS")} />
              )}
              {!canModerate && !canProduce && <div style={{ fontSize: 13, color: COLORS.slate }}>You don't have permission to change the status.</div>}
              {canModerate && item.status !== "TO_APPROVE" && item.status !== "DONE" && (
                <div style={{ fontSize: 12.5, color: COLORS.slate, alignSelf: "center" }}>
                  Approval becomes available once the creator submits the video for review.
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 22, borderTop: `1px solid ${COLORS.line}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Download</div>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 8, border: `1px solid ${COLORS.green}`, color: COLORS.green, fontSize: 12.5, fontWeight: 700, textDecoration: "none", marginBottom: isAdmin ? 10 : 0 }}
              >
                <Download size={13} /> Download final file
              </a>
            ) : (
              <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: isAdmin ? 10 : 0 }}>No download link set yet.</div>
            )}
            {isAdmin && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  placeholder="Google Drive link (or any file link) for the client"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={(e) => { if (e.key === "Enter") saveDownloadLink(); }}
                />
                <button
                  onClick={saveDownloadLink}
                  style={{ padding: "0 14px", borderRadius: 7, border: "none", background: COLORS.violet, color: "#fff", fontWeight: 600, cursor: "pointer" }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageSquare size={14} /> Comments ({initialComments.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 640, overflowY: "auto", paddingRight: 2 }}>
            {topLevel.length === 0 && <div style={{ fontSize: 13, color: COLORS.slate }}>No comments yet.</div>}
            {topLevel.map((c) => (
              <div key={c.id} style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 11, padding: 13 }}>
                <CommentRow c={c} onJump={() => jumpTo(c.timecode)} onToggleTag={() => handleToggleTag(c.id)} />
                {replyOpen[c.id] && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 18 }}>
                    <input
                      value={replyDraft[c.id] || ""}
                      onChange={(e) => setReplyDraft({ ...replyDraft, [c.id]: e.target.value })}
                      placeholder="Reply in thread…"
                      style={{ ...inputStyle, flex: 1, fontSize: 12.5, padding: "7px 9px" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment(c.id, replyDraft[c.id] || "", c.timecode);
                          setReplyDraft({ ...replyDraft, [c.id]: "" });
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        handleAddComment(c.id, replyDraft[c.id] || "", c.timecode);
                        setReplyDraft({ ...replyDraft, [c.id]: "" });
                      }}
                      style={{ padding: "0 10px", borderRadius: 6, border: "none", background: COLORS.ink, color: "#fff", cursor: "pointer", fontSize: 12 }}
                    >
                      Reply
                    </button>
                  </div>
                )}
                {childrenOf(c.id).map((r) => (
                  <div key={r.id} style={{ marginLeft: 18, marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${COLORS.line}` }}>
                    <CommentRow c={r} onJump={() => jumpTo(r.timecode)} small />
                  </div>
                ))}
                <button
                  onClick={() => setReplyOpen({ ...replyOpen, [c.id]: !replyOpen[c.id] })}
                  style={{ marginTop: 8, border: "none", background: "transparent", color: COLORS.slate, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
                >
                  <Reply size={12} /> {replyOpen[c.id] ? "Hide thread" : "Thread"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
