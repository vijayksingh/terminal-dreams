import React from "react";
import type { FeedPost } from "../feed-context";
import styles from "../NewsFeedLab.module.css";

export type PostCardProps = {
  post: FeedPost;
  showType: boolean;
  showLikes: boolean;
  showScore: boolean;
  showEmbedding: boolean;
  isPending: boolean;
  hasFailed: boolean;
  onLike: () => void;
};

export function PostCard({
  post,
  showType,
  showLikes,
  showScore,
  showEmbedding,
  isPending,
  hasFailed,
  onLike,
}: PostCardProps) {
  const displayType = showType ? post.type : "text";
  const minutesAgo = post.timestamp === 0 ? "just now" : `${post.timestamp}m ago`;

  return (
    <article className={styles.postCard} data-type={displayType}>
      {/* Header */}
      <div className={styles.postHeader}>
        <div
          className={styles.postAvatar}
          style={{ background: `oklch(55% 0.14 ${post.avatarHue})` }}
        >
          {post.author[0]}
        </div>
        <div className={styles.postMeta}>
          <span className={styles.postAuthor}>{post.author}</span>
          <span className={styles.postHandle}>{post.handle} · {minutesAgo}</span>
        </div>
        {showScore && (
          <span className={styles.engagementBadge} title="Engagement score">
            ⚡{post.engagementScore}
          </span>
        )}
      </div>

      {/* Content */}
      <div className={styles.postContent}>{post.content}</div>

      {/* Type-specific content */}
      {displayType === "image" && post.imageHue !== undefined && (
        <div
          className={styles.postImage}
          style={{
            background: `linear-gradient(135deg, oklch(50% 0.15 ${post.imageHue}), oklch(40% 0.12 ${(post.imageHue + 60) % 360}))`,
            aspectRatio: post.imageAspect ?? 16 / 9,
          }}
        >
          <svg className={styles.postImageIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}

      {displayType === "link" && post.linkPreview && showEmbedding && (
        <div className={styles.linkPreview} style={{ borderLeftColor: post.linkPreview.color }}>
          <div className={styles.linkDomain}>{post.linkPreview.domain}</div>
          <div className={styles.linkTitle}>{post.linkPreview.title}</div>
          <div className={styles.linkDesc}>{post.linkPreview.description}</div>
        </div>
      )}

      {displayType === "poll" && post.poll && (
        <div className={styles.pollContainer}>
          {post.poll.options.map((opt, i) => {
            const pct = Math.round((opt.votes / post.poll!.totalVotes) * 100);
            return (
              <div key={i} className={styles.pollOption}>
                <div className={styles.pollBar} style={{ width: `${pct}%` }} />
                <span className={styles.pollLabel}>{opt.label}</span>
                <span className={styles.pollPct}>{pct}%</span>
              </div>
            );
          })}
          <div className={styles.pollTotal}>{post.poll.totalVotes.toLocaleString()} votes</div>
        </div>
      )}

      {/* Reaction bar */}
      <div className={styles.reactionBar}>
        <button
          type="button"
          className={styles.reactionButton}
          data-liked={post.liked ? "true" : undefined}
          data-pending={isPending ? "true" : undefined}
          data-failed={hasFailed ? "true" : undefined}
          onClick={showLikes ? onLike : undefined}
          disabled={!showLikes}
        >
          <span className={styles.heartIcon}>{post.liked ? "♥" : "♡"}</span>
          <span>{post.likes}</span>
        </button>
        <span className={styles.reactionStat}>💬 {post.comments}</span>
        <span className={styles.reactionStat}>↗ {post.shares}</span>
      </div>
    </article>
  );
}
