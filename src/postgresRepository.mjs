
import escapeHtml from 'escape-html';

function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || `item-${Date.now()}`;
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const CURRENT_TERMS_VERSION = '2026-06-28';

function toIsoDate(value) {
  return value?.toISOString?.() ?? value ?? null;
}

function toIsoDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isRecentlyOnline(value) {
  const timestamp = Date.parse(String(value ?? ''));
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= ONLINE_WINDOW_MS;
}

function userFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    login: row.login,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
    registeredAt: toIsoDate(row.registered_at),
    lastLoginAt: toIsoDate(row.last_login_at),
    lastSeenAt: toIsoDate(row.last_seen_at),
    isOnline: isRecentlyOnline(row.last_seen_at),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    profile: row.display_name == null ? null : {
        userId: row.id,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      coverImageUrl: row.cover_image_url,
      coverImagePositionX: Number(row.cover_image_position_x ?? 50),
      coverImagePositionY: Number(row.cover_image_position_y ?? 50),
      coverImageScale: Number(row.cover_image_scale ?? 1),
      city: row.city,
      websiteUrl: row.website_url,
      birthDate: toIsoDateOnly(row.birth_date),
      ratingTotal: Number(row.rating_total ?? 0),
      worksCountCached: Number(row.works_count_cached ?? 0),
      isClassic: Boolean(row.is_classic),
      isMemorialPage: Boolean(row.is_memorial_page),
      isFeatured: Boolean(row.is_featured),
      isChild: Boolean(row.is_child),
      peachBalance: Number(row.peach_balance ?? 0),
      audioUploadSlots: Number(row.audio_upload_slots ?? 0),
      profileLinks: Array.isArray(row.profile_links) ? row.profile_links : undefined,
    },
  };
}

function authorFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    login: row.login,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverImageUrl: row.cover_image_url,
    coverImagePositionX: Number(row.cover_image_position_x ?? 50),
    coverImagePositionY: Number(row.cover_image_position_y ?? 50),
    coverImageScale: Number(row.cover_image_scale ?? 1),
    city: row.city,
    websiteUrl: row.website_url,
    birthDate: toIsoDateOnly(row.birth_date),
    ratingTotal: Number(row.rating_total ?? 0),
    worksCountCached: Number(row.works_count_cached ?? 0),
    isClassic: Boolean(row.is_classic),
    isMemorialPage: Boolean(row.is_memorial_page),
    isFeatured: Boolean(row.is_featured),
    isChild: Boolean(row.is_child),
    profileLinks: Array.isArray(row.profile_links) ? row.profile_links : undefined,
    registeredAt: toIsoDate(row.registered_at),
    lastSeenAt: toIsoDate(row.last_seen_at),
    isOnline: isRecentlyOnline(row.last_seen_at),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function workFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    excerpt: row.excerpt,
    status: row.status,
    sectionCode: row.section_code,
    genreSlug: row.genre_slug,
    projectFormat: row.project_format,
    pdfUrl: row.pdf_url ?? null,
    pdfFileName: row.pdf_file_name ?? null,
    audioUrl: row.audio_url ?? null,
    audioFileName: row.audio_file_name ?? null,
    commentsCount: Number(row.comments_count ?? 0),
    ratingsCount: Number(row.ratings_count ?? 0),
    averageRating: Number(row.average_rating ?? 0),
    likesCount: Number(row.likes_count ?? 0),
    dislikesCount: Number(row.dislikes_count ?? 0),
    announcementActive: Boolean(row.announcement_active),
    announcementCount: Number(row.announcement_count ?? 0),
    publishedAt: row.published_at?.toISOString?.() ?? row.published_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    authorUserId: row.author_user_id,
    author: row.author_login ? {
      id: row.author_id ?? row.author_user_id,
      email: row.author_email,
      login: row.author_login,
      displayName: row.author_display_name,
      bio: row.author_bio,
      avatarUrl: row.author_avatar_url,
      coverImageUrl: row.author_cover_image_url,
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isMemorialPage: Boolean(row.author_is_memorial_page),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
      lastSeenAt: toIsoDate(row.author_last_seen_at),
      isOnline: isRecentlyOnline(row.author_last_seen_at),
      createdAt: row.author_created_at?.toISOString?.() ?? row.author_created_at,
      updatedAt: row.author_updated_at?.toISOString?.() ?? row.author_updated_at,
    } : null,
  };
}

function workCommentFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workId: row.work_id,
    userId: row.user_id,
    parentCommentId: row.parent_comment_id,
    body: row.body,
    imageUrl: row.image_url,
    status: row.status,
    likesCount: Number(row.likes_count ?? 0),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    author: row.author_login ? {
      id: row.author_id ?? row.user_id,
      email: row.author_email,
      login: row.author_login,
      displayName: row.author_display_name,
      bio: row.author_bio,
      avatarUrl: row.author_avatar_url,
      coverImageUrl: row.author_cover_image_url,
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isMemorialPage: Boolean(row.author_is_memorial_page),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
      lastSeenAt: toIsoDate(row.author_last_seen_at),
      isOnline: isRecentlyOnline(row.author_last_seen_at),
      createdAt: row.author_created_at?.toISOString?.() ?? row.author_created_at,
      updatedAt: row.author_updated_at?.toISOString?.() ?? row.author_updated_at,
    } : null,
  };
}

function forumSectionFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: Number(row.sort_order ?? 0),
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function forumTopicFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    sectionSlug: row.section_slug,
    repliesCount: Number(row.replies_count ?? 0),
    viewsCount: normalizeForumTopicViewCount(row.views_count),
    status: row.status,
    isPinned: Boolean(row.is_pinned),
    imageUrl: row.image_url ?? null,
    featuredMain: Boolean(row.featured_main),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    lastPostAt: row.last_post_at?.toISOString?.() ?? row.last_post_at,
    authorUserId: row.author_user_id,
    author: row.author_login ? {
      id: row.author_id ?? row.author_user_id,
      email: row.author_email,
      login: row.author_login,
      displayName: row.author_display_name,
      bio: row.author_bio,
      avatarUrl: row.author_avatar_url,
      coverImageUrl: row.author_cover_image_url,
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isMemorialPage: Boolean(row.author_is_memorial_page),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
      lastSeenAt: toIsoDate(row.author_last_seen_at),
      isOnline: isRecentlyOnline(row.author_last_seen_at),
      createdAt: row.author_created_at?.toISOString?.() ?? row.author_created_at,
      updatedAt: row.author_updated_at?.toISOString?.() ?? row.author_updated_at,
    } : null,
  };
}

function forumPostFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    topicId: row.topic_id,
    userId: row.author_user_id,
    parentPostId: row.parent_post_id,
    body: row.body,
    imageUrl: row.image_url,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    author: row.author_login ? {
      id: row.author_id ?? row.author_user_id,
      email: row.author_email,
      login: row.author_login,
      displayName: row.author_display_name,
      bio: row.author_bio,
      avatarUrl: row.author_avatar_url,
      coverImageUrl: row.author_cover_image_url,
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isMemorialPage: Boolean(row.author_is_memorial_page),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
      lastSeenAt: toIsoDate(row.author_last_seen_at),
      isOnline: isRecentlyOnline(row.author_last_seen_at),
      createdAt: row.author_created_at?.toISOString?.() ?? row.author_created_at,
      updatedAt: row.author_updated_at?.toISOString?.() ?? row.author_updated_at,
    } : null,
  };
}

function contestFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    contestScope: row.contest_scope,
    status: row.status,
    startsAt: row.starts_at?.toISOString?.() ?? row.starts_at,
    submissionEndsAt: row.submission_ends_at?.toISOString?.() ?? row.submission_ends_at,
    votingEndsAt: row.voting_ends_at?.toISOString?.() ?? row.voting_ends_at,
    resultsPublishedAt: row.results_published_at?.toISOString?.() ?? row.results_published_at,
    coverImageUrl: row.cover_image_url,
    sourceUrl: row.source_url,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function radioTrackFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    creatorUserId: row.creator_user_id,
    title: row.title,
    authorName: row.author_name,
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    audioUrl: row.audio_url,
    sourceUrl: row.source_url,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    averageRating: row.average_rating == null ? 0 : Number(row.average_rating),
    ratingsCount: row.ratings_count == null ? 0 : Number(row.ratings_count),
  };
}

function workViewerFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workId: row.work_id,
    viewerUserId: row.viewer_user_id,
    viewedAt: toIsoDate(row.viewed_at),
    viewer: row.viewer_login ? {
      id: row.viewer_id ?? row.viewer_user_id,
      email: row.viewer_email,
      login: row.viewer_login,
      displayName: row.viewer_display_name,
      bio: row.viewer_bio,
      avatarUrl: row.viewer_avatar_url,
      coverImageUrl: row.viewer_cover_image_url,
      city: row.viewer_city,
      websiteUrl: row.viewer_website_url,
      ratingTotal: Number(row.viewer_rating_total ?? 0),
      worksCountCached: Number(row.viewer_works_count_cached ?? 0),
      isClassic: Boolean(row.viewer_is_classic),
      isMemorialPage: Boolean(row.viewer_is_memorial_page),
      isFeatured: Boolean(row.viewer_is_featured),
      registeredAt: toIsoDate(row.viewer_registered_at),
      lastSeenAt: toIsoDate(row.viewer_last_seen_at),
      isOnline: isRecentlyOnline(row.viewer_last_seen_at),
      createdAt: toIsoDate(row.viewer_created_at),
      updatedAt: toIsoDate(row.viewer_updated_at),
    } : null,
  };
}

function pageVisitorFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workId: row.work_id,
    viewerUserId: row.viewer_user_id,
    viewedAt: toIsoDate(row.viewed_at),
    workTitle: row.work_title ?? null,
    workSlug: row.work_slug ?? null,
    viewer: row.viewer_login ? {
      id: row.viewer_id ?? row.viewer_user_id,
      email: row.viewer_email,
      login: row.viewer_login,
      displayName: row.viewer_display_name,
      bio: row.viewer_bio,
      avatarUrl: row.viewer_avatar_url,
      coverImageUrl: row.viewer_cover_image_url,
      city: row.viewer_city,
      websiteUrl: row.viewer_website_url,
      ratingTotal: Number(row.viewer_rating_total ?? 0),
      worksCountCached: Number(row.viewer_works_count_cached ?? 0),
      isClassic: Boolean(row.viewer_is_classic),
      isMemorialPage: Boolean(row.viewer_is_memorial_page),
      isFeatured: Boolean(row.viewer_is_featured),
      registeredAt: toIsoDate(row.viewer_registered_at),
      lastSeenAt: toIsoDate(row.viewer_last_seen_at),
      isOnline: isRecentlyOnline(row.viewer_last_seen_at),
      createdAt: toIsoDate(row.viewer_created_at),
      updatedAt: toIsoDate(row.viewer_updated_at),
    } : null,
  };
}


function authorReviewFeedItemFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    body: row.body,
    status: row.status,
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    workId: row.work_id,
    workTitle: row.work_title,
    workSlug: row.work_slug,
    commentAuthor: row.comment_author_login ? {
      id: row.comment_author_id,
      email: row.comment_author_email,
      login: row.comment_author_login,
      displayName: row.comment_author_display_name,
      bio: row.comment_author_bio,
      avatarUrl: row.comment_author_avatar_url,
      coverImageUrl: row.comment_author_cover_image_url,
      city: row.comment_author_city,
      websiteUrl: row.comment_author_website_url,
      ratingTotal: Number(row.comment_author_rating_total ?? 0),
      worksCountCached: Number(row.comment_author_works_count_cached ?? 0),
      isClassic: Boolean(row.comment_author_is_classic),
      isFeatured: Boolean(row.comment_author_is_featured),
      registeredAt: toIsoDate(row.comment_author_registered_at),
      lastSeenAt: toIsoDate(row.comment_author_last_seen_at),
      isOnline: isRecentlyOnline(row.comment_author_last_seen_at),
      createdAt: toIsoDate(row.comment_author_created_at),
      updatedAt: toIsoDate(row.comment_author_updated_at),
    } : null,
    workAuthor: row.work_author_login ? {
      id: row.work_author_id,
      email: row.work_author_email,
      login: row.work_author_login,
      displayName: row.work_author_display_name,
      bio: row.work_author_bio,
      avatarUrl: row.work_author_avatar_url,
      coverImageUrl: row.work_author_cover_image_url,
      city: row.work_author_city,
      websiteUrl: row.work_author_website_url,
      ratingTotal: Number(row.work_author_rating_total ?? 0),
      worksCountCached: Number(row.work_author_works_count_cached ?? 0),
      isClassic: Boolean(row.work_author_is_classic),
      isFeatured: Boolean(row.work_author_is_featured),
      registeredAt: toIsoDate(row.work_author_registered_at),
      lastSeenAt: toIsoDate(row.work_author_last_seen_at),
      isOnline: isRecentlyOnline(row.work_author_last_seen_at),
      createdAt: toIsoDate(row.work_author_created_at),
      updatedAt: toIsoDate(row.work_author_updated_at),
    } : null,
  };
}

function buildLimitOffset(limit = 20, offset = 0) {
  return { limit: Math.min(Math.max(Number(limit) || 20, 1), 100), offset: Math.max(Number(offset) || 0, 0) };
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeOptionalDate(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('birthDate must use YYYY-MM-DD');
  return normalized;
}

function normalizeForumTopicViewCount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : 0;
}

function privateMessageFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    recipientUserId: row.recipient_user_id,
    body: row.body,
    status: row.status,
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    readAt: toIsoDate(row.read_at),
    sender: row.sender_login ? {
      id: row.sender_id ?? row.sender_user_id,
      email: row.sender_email,
      login: row.sender_login,
      displayName: row.sender_display_name,
      bio: row.sender_bio,
      avatarUrl: row.sender_avatar_url,
      coverImageUrl: row.sender_cover_image_url,
      city: row.sender_city,
      websiteUrl: row.sender_website_url,
      birthDate: toIsoDateOnly(row.sender_birth_date),
      ratingTotal: Number(row.sender_rating_total ?? 0),
      worksCountCached: Number(row.sender_works_count_cached ?? 0),
      isClassic: Boolean(row.sender_is_classic),
      isFeatured: Boolean(row.sender_is_featured),
      registeredAt: toIsoDate(row.sender_registered_at),
      lastSeenAt: toIsoDate(row.sender_last_seen_at),
      isOnline: isRecentlyOnline(row.sender_last_seen_at),
      createdAt: toIsoDate(row.sender_created_at),
      updatedAt: toIsoDate(row.sender_updated_at),
    } : null,
    recipient: row.recipient_login ? {
      id: row.recipient_id ?? row.recipient_user_id,
      email: row.recipient_email,
      login: row.recipient_login,
      displayName: row.recipient_display_name,
      bio: row.recipient_bio,
      avatarUrl: row.recipient_avatar_url,
      coverImageUrl: row.recipient_cover_image_url,
      city: row.recipient_city,
      websiteUrl: row.recipient_website_url,
      birthDate: toIsoDateOnly(row.recipient_birth_date),
      ratingTotal: Number(row.recipient_rating_total ?? 0),
      worksCountCached: Number(row.recipient_works_count_cached ?? 0),
      isClassic: Boolean(row.recipient_is_classic),
      isFeatured: Boolean(row.recipient_is_featured),
      registeredAt: toIsoDate(row.recipient_registered_at),
      lastSeenAt: toIsoDate(row.recipient_last_seen_at),
      isOnline: isRecentlyOnline(row.recipient_last_seen_at),
      createdAt: toIsoDate(row.recipient_created_at),
      updatedAt: toIsoDate(row.recipient_updated_at),
    } : null,
  };
}

function privateDialogFromRow(row) {
  if (!row) return null;
  return {
    peerUserId: row.peer_user_id,
    lastMessageBody: row.last_message_body,
    lastMessageAt: toIsoDate(row.last_message_at),
    unreadCount: Number(row.unread_count ?? 0),
    peer: row.peer_login ? {
      id: row.peer_id ?? row.peer_user_id,
      email: row.peer_email,
      login: row.peer_login,
      displayName: row.peer_display_name,
      bio: row.peer_bio,
      avatarUrl: row.peer_avatar_url,
      coverImageUrl: row.peer_cover_image_url,
      city: row.peer_city,
      websiteUrl: row.peer_website_url,
      birthDate: toIsoDateOnly(row.peer_birth_date),
      ratingTotal: Number(row.peer_rating_total ?? 0),
      worksCountCached: Number(row.peer_works_count_cached ?? 0),
      isClassic: Boolean(row.peer_is_classic),
      isFeatured: Boolean(row.peer_is_featured),
      registeredAt: toIsoDate(row.peer_registered_at),
      lastSeenAt: toIsoDate(row.peer_last_seen_at),
      isOnline: isRecentlyOnline(row.peer_last_seen_at),
      createdAt: toIsoDate(row.peer_created_at),
      updatedAt: toIsoDate(row.peer_updated_at),
    } : null,
  };
}

function normalizeSocialProvider(value) {
  const provider = String(value ?? '').trim().toLowerCase();
  if (!provider) throw new Error('provider is required');
  return provider;
}

function buildSyntheticSocialEmail(provider, providerUserId) {
  return `${provider}-${providerUserId}@social.littop.local`;
}

function normalizeLoginCandidate(value, fallback = 'author') {
  return slugify(value || fallback).slice(0, 48);
}

async function buildUniqueLogin(client, baseCandidate) {
  const root = normalizeLoginCandidate(baseCandidate, 'author');

  for (let suffix = 0; suffix < 500; suffix += 1) {
    const candidate = suffix === 0 ? root : `${root}-${suffix + 1}`;
    const { rowCount } = await client.query(
      `
      select 1
      from users
      where login = $1
      limit 1
      `,
      [candidate],
    );

    if (!rowCount) {
      return candidate;
    }
  }

  throw new Error('Could not allocate unique login for social auth user');
}


function buildManagedAuthorEmail(login) {
  return `${login}@managed.littop.local`;
}

function normalizeOptionalNumber(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
}

function normalizeProfileLinksInput(profileLinks = []) {
  if (!Array.isArray(profileLinks)) return [];
  return profileLinks
    .map((item, index) => ({
      label: String(item?.label ?? '').trim(),
      url: String(item?.url ?? '').trim(),
      sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
    }))
    .filter((item) => item.label && item.url);
}

async function replaceAuthorProfileLinks(userId, profileLinks, client) {
  await client.query('delete from author_profile_links where user_id = $1', [userId]);
  const normalized = normalizeProfileLinksInput(profileLinks);
  for (const item of normalized) {
    await client.query(
      `
      insert into author_profile_links (user_id, label, url, sort_order)
      values ($1, $2, $3, $4)
      `,
      [userId, item.label, item.url, item.sortOrder],
    );
  }
}

async function listAuthorProfileLinks(userId, db) {
  if (!userId) return [];
  const { rows } = await db.query(
    `
    select label, url, sort_order
    from author_profile_links
    where user_id = $1
    order by sort_order asc, id asc
    `,
    [userId],
  );
  return rows.map((row) => ({ label: row.label, url: row.url, sortOrder: Number(row.sort_order ?? 0) }));
}

function buildHalfYearWindowKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() < 6 ? 'H1' : 'H2'}`;
}

function describeRatingEvent(row) {
  switch (row?.event_type) {
    case 'unique-work-reader': return 'Новый уникальный читатель произведения';
    case 'work-comment-received': return 'Получен новый отклик под произведением';
    case 'forum-message-received': return 'Получено новое сообщение на форуме';
    case 'work-created': return 'Добавлено новое произведение';
    case 'first-avatar': return 'Добавлена аватарка';
    case 'first-city': return 'Указан город';
    case 'first-birth-date': return 'Указана дата рождения';
    case 'forum-participation-halfyear': return 'Первое участие на форуме за полугодие';
    default: return row?.event_type || 'Изменение рейтинга';
  }
}

function ratingEventFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    eventKey: row.event_key,
    points: Number(row.points ?? 0),
    createdAt: toIsoDate(row.created_at),
    label: describeRatingEvent(row),
  };
}

async function awardRatingEvent({ userId, eventType, points, eventKey, meta = {} }, client) {
  if (!userId || !eventType || !points || !eventKey) return false;
  const inserted = await client.query(
    `
    insert into author_rating_events (user_id, event_type, event_key, points, meta)
    values ($1, $2, $3, $4, $5::jsonb)
    on conflict (event_key) do nothing
    returning id
    `,
    [userId, eventType, eventKey, points, JSON.stringify(meta ?? {})],
  );
  if (!inserted.rows[0]) return false;
  await client.query(
    `
    update author_profiles
    set rating_total = coalesce(rating_total, 0) + $2,
        updated_at = now()
    where user_id = $1
    `,
    [userId, points],
  );
  return true;
}

function normalizePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('amount must be a positive integer');
  }
  return parsed;
}

async function applyPeachDelta({ userId, amount, kind, note = null, meta = {}, createdByUserId = null, requireSufficientBalance = false }, client) {
  if (!userId) throw new Error('userId is required');
  const normalizedAmount = Number.parseInt(amount, 10);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    throw new Error('amount must be a non-zero integer');
  }
  const updated = await client.query(
    requireSufficientBalance
      ? `
        update author_profiles
        set peach_balance = peach_balance + $1,
            updated_at = now()
        where user_id = $2
          and peach_balance + $1 >= 0
        returning peach_balance
        `
      : `
        update author_profiles
        set peach_balance = peach_balance + $1,
            updated_at = now()
        where user_id = $2
        returning peach_balance
        `,
    [normalizedAmount, userId],
  );
  if (!updated.rows[0]) {
    throw new Error('Недостаточно персиков.');
  }
  const inserted = await client.query(
    `
    insert into peach_transactions (user_id, amount, kind, note, meta, created_by_user_id)
    values ($1, $2, $3, $4, $5::jsonb, $6)
    returning id
    `,
    [userId, normalizedAmount, kind, normalizeOptionalText(note), JSON.stringify(meta ?? {}), createdByUserId],
  );
  return { id: inserted.rows[0]?.id ?? null, balance: Number(updated.rows[0].peach_balance ?? 0) };
}

export function createPostgresRepository(pool) {
  return {
    async ping() {
      await pool.query('select 1');
      return true;
    },

    async findUserByEmailOrLogin(email, login) {
      const { rows } = await pool.query(
        `
        select u.*, ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where u.email = $1 or u.login = $2
        limit 1
        `,
        [email, login],
      );
      return userFromRow(rows[0]);
    },

    async getUserByIdentifier(identifier) {
      const { rows } = await pool.query(
        `
        select u.*, ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where (u.email = $1 or u.login = $1)
          and u.status <> 'deleted'
        limit 1
        `,
        [identifier],
      );
      return userFromRow(rows[0]);
    },

    async getUserByIdentifierIncludingDeleted(identifier) {
      const { rows } = await pool.query(
        `
        select u.*, ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where (u.email = $1 or u.login = $1)
        limit 1
        `,
        [identifier],
      );
      return userFromRow(rows[0]);
    },

    async createUser({ email, login, passwordHash, displayName, termsAcceptedAt = new Date(), termsVersion = CURRENT_TERMS_VERSION }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const allocatedLogin = await buildUniqueLogin(
          client,
          normalizeLoginCandidate(login || normalizedEmail.split('@')[0], 'author'),
        );
        const inserted = await client.query(
          `
          insert into users (email, login, password_hash, terms_accepted_at, terms_version)
          values ($1, $2, $3, $4, $5)
          returning id
          `,
          [email, login, passwordHash, termsAcceptedAt, normalizeOptionalText(termsVersion)],
        );
        const userId = inserted.rows[0].id;
        await client.query(
          `
          insert into author_profiles (user_id, display_name)
          values ($1, $2)
          `,
          [userId, displayName],
        );
        await client.query('commit');
        return await this.getUserById(userId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async getUserById(id) {
      const { rows } = await pool.query(
        `
        select u.*, ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where u.id = $1
        limit 1
        `,
        [id],
      );
      return userFromRow(rows[0]);
    },

    async findUserByEmail(email) {
      const normalizedEmail = normalizeOptionalText(email);
      if (!normalizedEmail) return null;

      const { rows } = await pool.query(
        `
        select u.*, ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where u.email = $1
          and u.status <> 'deleted'
        limit 1
        `,
        [normalizedEmail],
      );
      console.log(normalizedEmail)
      return userFromRow(rows[0]);
    },

    async getUserByEmail(email) {
      return this.findUserByEmail(email);
    },

    async updateUserPassword({ userId, passwordHash }) {
      if (!userId) {
        throw new Error('userId is required');
      }
      if (!passwordHash) {
        throw new Error('passwordHash is required');
      }

      await pool.query(
        `
        update users
        set password_hash = $2,
            updated_at = now()
        where id = $1
        `,
        [userId, passwordHash],
      );
      return this.getUserById(userId);
    },

    async getUserBySocialAccount({ provider, providerUserId }) {
      const normalizedProvider = normalizeSocialProvider(provider);
      const normalizedProviderUserId = String(providerUserId ?? '').trim();
      if (!normalizedProviderUserId) return null;

      const { rows } = await pool.query(
        `
        select u.*, ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from social_accounts sa
        join users u on u.id = sa.user_id
        left join author_profiles ap on ap.user_id = u.id
        where sa.provider = $1 and sa.provider_user_id = $2
          and u.status <> 'deleted'
        limit 1
        `,
        [normalizedProvider, normalizedProviderUserId],
      );
      return userFromRow(rows[0]);
    },

    async linkSocialAccount({
      userId,
      provider,
      providerUserId,
      providerEmail = null,
      providerLogin = null,
      avatarUrl = null,
      profileUrl = null,
    }) {
      const normalizedProvider = normalizeSocialProvider(provider);
      const normalizedProviderUserId = String(providerUserId ?? '').trim();
      if (!normalizedProviderUserId) {
        throw new Error('providerUserId is required');
      }

      await pool.query(
        `
        insert into social_accounts (
          user_id,
          provider,
          provider_user_id,
          provider_email,
          provider_login,
          profile_url,
          avatar_url
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (provider, provider_user_id) do update set
          user_id = excluded.user_id,
          provider_email = excluded.provider_email,
          provider_login = excluded.provider_login,
          profile_url = excluded.profile_url,
          avatar_url = excluded.avatar_url,
          updated_at = now()
        `,
        [
          userId,
          normalizedProvider,
          normalizedProviderUserId,
          normalizeOptionalText(providerEmail),
          normalizeOptionalText(providerLogin),
          normalizeOptionalText(profileUrl),
          normalizeOptionalText(avatarUrl),
        ],
      );
    },

    async createUserFromSocialAuth({
      provider,
      providerUserId,
      email = null,
      displayName,
      loginHint = null,
      avatarUrl = null,
      profileUrl = null,
      passwordHash,
      termsAcceptedAt = new Date(),
      termsVersion = CURRENT_TERMS_VERSION,
    }) {
      const normalizedProvider = normalizeSocialProvider(provider);
      const normalizedProviderUserId = String(providerUserId ?? '').trim();
      const normalizedDisplayName = String(displayName ?? '').trim() || `${normalizedProvider.toUpperCase()} author`;
      const normalizedEmail = normalizeOptionalText(email) || buildSyntheticSocialEmail(normalizedProvider, normalizedProviderUserId);

      if (!normalizedProviderUserId) {
        throw new Error('providerUserId is required');
      }
      if (!passwordHash) {
        throw new Error('passwordHash is required');
      }

      const client = await pool.connect();
      try {
        await client.query('begin');

        const login = await buildUniqueLogin(
          client,
          normalizeLoginCandidate(loginHint, `${normalizedProvider}-${normalizedProviderUserId}`),
        );

        const insertedUser = await client.query(
          `
          insert into users (email, login, password_hash, terms_accepted_at, terms_version)
          values ($1, $2, $3, $4, $5)
          returning id
          `,
          [normalizedEmail, login, passwordHash, termsAcceptedAt, normalizeOptionalText(termsVersion)],
        );

        const userId = insertedUser.rows[0].id;

        await client.query(
          `
          insert into author_profiles (user_id, display_name, avatar_url)
          values ($1, $2, $3)
          `,
          [userId, normalizedDisplayName, normalizeOptionalText(avatarUrl)],
        );

        await client.query(
          `
          insert into social_accounts (
            user_id,
            provider,
            provider_user_id,
            provider_email,
            provider_login,
            profile_url,
            avatar_url
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            userId,
            normalizedProvider,
            normalizedProviderUserId,
            normalizeOptionalText(email),
            normalizeOptionalText(loginHint),
            normalizeOptionalText(profileUrl),
            normalizeOptionalText(avatarUrl),
          ],
        );

        await client.query('commit');
        return await this.getUserById(userId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async updateUserProfile({ userId, displayName, bio = null, avatarUrl = undefined, coverImageUrl = undefined, city = null, websiteUrl = null, birthDate = null, coverImagePositionX = 50, coverImagePositionY = 50, coverImageScale = 1, profileLinks = [] }) {
      const normalizedDisplayName = String(displayName ?? '').trim();
      if (!normalizedDisplayName) {
        throw new Error('displayName is required');
      }

      const client = await pool.connect();
      try {
        await client.query('begin');
        const existing = await client.query(
          `
          select avatar_url, city, birth_date
          from author_profiles
          where user_id = $1
          limit 1
          `,
          [userId],
        );
        const previous = existing.rows[0] ?? {};
        const normalizedAvatarUrl = normalizeOptionalText(avatarUrl);
        const normalizedCity = normalizeOptionalText(city);
        const normalizedBirthDate = normalizeOptionalDate(birthDate);
        await client.query(
          `
          insert into author_profiles (
            user_id, display_name, bio, avatar_url, cover_image_url, cover_image_position_x, cover_image_position_y, cover_image_scale, city, website_url, birth_date
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          on conflict (user_id) do update set
            display_name = excluded.display_name,
            bio = excluded.bio,
            avatar_url = excluded.avatar_url,
            cover_image_url = excluded.cover_image_url,
            cover_image_position_x = excluded.cover_image_position_x,
            cover_image_position_y = excluded.cover_image_position_y,
            cover_image_scale = excluded.cover_image_scale,
            city = excluded.city,
            website_url = excluded.website_url,
            birth_date = excluded.birth_date,
            updated_at = now()
          `,
          [
            userId,
            normalizedDisplayName,
            normalizeOptionalText(bio),
            normalizedAvatarUrl,
            normalizeOptionalText(coverImageUrl),
            normalizeOptionalNumber(coverImagePositionX, 50),
            normalizeOptionalNumber(coverImagePositionY, 50),
            normalizeOptionalNumber(coverImageScale, 1),
            normalizedCity,
            normalizeOptionalText(websiteUrl),
            normalizedBirthDate,
          ],
        );
        await replaceAuthorProfileLinks(userId, profileLinks, client);
        if (!previous.avatar_url && normalizedAvatarUrl) {
          await awardRatingEvent({ userId, eventType: 'first-avatar', points: 10, eventKey: `first-avatar:${userId}` }, client);
        }
        if (!previous.city && normalizedCity) {
          await awardRatingEvent({ userId, eventType: 'first-city', points: 10, eventKey: `first-city:${userId}` }, client);
        }
        if (!previous.birth_date && normalizedBirthDate) {
          await awardRatingEvent({ userId, eventType: 'first-birth-date', points: 10, eventKey: `first-birth-date:${userId}` }, client);
        }
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }

      return this.getUserById(userId);
    },

    async touchUserPresence(userId) {
      if (!userId) return null;
      await pool.query(
        `
        update users
        set last_seen_at = now()
        where id = $1
        `,
        [userId],
      );
      return this.getUserById(userId);
    },

    async closeUserAccount({ userId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(
          `
          update works
          set account_restore_status = case when status <> 'archived' then status else account_restore_status end,
              status = 'archived',
              updated_at = now()
          where author_user_id = $1
            and status <> 'archived'
          `,
          [userId],
        );
        await client.query(
          `
          update forum_topics
          set account_restore_status = case when status <> 'archived' then status else account_restore_status end,
              status = 'archived',
              updated_at = now()
          where author_user_id = $1
            and status <> 'archived'
          `,
          [userId],
        );
        await client.query(
          `
          update forum_posts
          set account_restore_status = case when status <> 'deleted' then status else account_restore_status end,
              status = 'deleted',
              updated_at = now()
          where author_user_id = $1
            and status <> 'deleted'
          `,
          [userId],
        );
        await client.query(
          `
          update work_comments
          set account_restore_status = case when status <> 'deleted' then status else account_restore_status end,
              status = 'deleted',
              updated_at = now()
          where user_id = $1
            and status <> 'deleted'
          `,
          [userId],
        );
        const updated = await client.query(
          `
          update users
          set status = 'deleted',
              deleted_at = now(),
              updated_at = now(),
              last_seen_at = now()
          where id = $1
            and status <> 'deleted'
          returning id
          `,
          [userId],
        );
        if (!updated.rows[0]) {
          throw new Error('User account is already closed or missing');
        }
        await client.query(
          `
          update author_profiles
          set works_count_cached = 0,
              updated_at = now()
          where user_id = $1
          `,
          [userId],
        );
        await client.query(
          `
          update works w
          set comments_count = coalesce(stats.cnt, 0)
          from (
            select work_id, count(*)::int as cnt
            from work_comments
            where status = 'visible'
            group by work_id
          ) stats
          where w.id = stats.work_id
          `,
        );
        await client.query(
          `
          update works
          set comments_count = 0
          where id not in (
            select distinct work_id
            from work_comments
            where status = 'visible'
          )
          `,
        );
        await client.query(
          `
          update forum_topics ft
          set replies_count = coalesce(stats.cnt, 0),
              last_post_at = coalesce(stats.last_post_at, ft.created_at)
          from (
            select topic_id, count(*)::int as cnt, max(created_at) as last_post_at
            from forum_posts
            where status = 'visible'
            group by topic_id
          ) stats
          where ft.id = stats.topic_id
          `,
        );
        await client.query(
          `
          update forum_topics
          set replies_count = 0,
              last_post_at = created_at
          where id not in (
            select distinct topic_id
            from forum_posts
            where status = 'visible'
          )
          `,
        );
        await client.query('commit');
        return true;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },


    async reopenUserAccount({ userId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const updated = await client.query(
          `
          update users
          set status = 'active',
              deleted_at = null,
              updated_at = now()
          where id = $1
            and status = 'deleted'
          returning id
          `,
          [userId],
        );
        if (!updated.rows[0]) {
          throw new Error('Аккаунт нельзя открыть повторно.');
        }
        await client.query(
          `
          update works
          set status = coalesce(account_restore_status, 'published'::publication_status),
              account_restore_status = null,
              updated_at = now()
          where author_user_id = $1
            and status = 'archived'
          `,
          [userId],
        );
        await client.query(
          `
          update forum_topics
          set status = coalesce(account_restore_status, 'open'::forum_topic_status),
              account_restore_status = null,
              updated_at = now()
          where author_user_id = $1
            and status = 'archived'
          `,
          [userId],
        );
        await client.query(
          `
          update forum_posts
          set status = coalesce(account_restore_status, 'visible'::moderation_status),
              account_restore_status = null,
              updated_at = now()
          where author_user_id = $1
            and status = 'deleted'
          `,
          [userId],
        );
        await client.query(
          `
          update work_comments
          set status = coalesce(account_restore_status, 'visible'::moderation_status),
              account_restore_status = null,
              updated_at = now()
          where user_id = $1
            and status = 'deleted'
          `,
          [userId],
        );
        await client.query(
          `
          update author_profiles
          set works_count_cached = (
            select count(*)::int
            from works
            where author_user_id = $1
              and status = 'published'
          ),
              updated_at = now()
          where user_id = $1
          `,
          [userId],
        );
        await client.query('commit');
        return this.getUserById(userId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async getAuthorByUserId(userId) {
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        join author_profiles ap on ap.user_id = u.id
        where u.id = $1
        limit 1
        `,
        [userId],
      );
      return authorFromRow(rows[0]);
    },

    async listAuthors({ limit = 20, offset = 0, search = null, classicsOnly = false, memorialOnly = false, featuredOnly = false, childrenOnly = false, sort = 'rating' } = {}) {
      const page = buildLimitOffset(limit, offset);
      const conditions = [];
      const params = [];
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(u.login ilike $${params.length} or u.email::text ilike $${params.length} or ap.display_name ilike $${params.length})`);
      }
      if (classicsOnly) conditions.push('ap.is_classic = true');
      if (memorialOnly) conditions.push('ap.is_memorial_page = true');
      if (featuredOnly) conditions.push('ap.is_featured = true');
      if (childrenOnly) conditions.push('ap.is_child = true');
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const authorOrder = {
        alphabetical: 'lower(coalesce(ap.display_name, u.login)) asc, u.id asc',
        registered: 'u.registered_at desc nulls last, u.id desc',
        rating: 'ap.rating_total desc, u.id desc',
      }[String(sort).toLowerCase()] || 'ap.rating_total desc, u.id desc';
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        join author_profiles ap on ap.user_id = u.id
        ${where ? `${where} and u.status <> 'deleted'` : `where u.status <> 'deleted'`}
        order by ${authorOrder}
        limit $${params.length - 1} offset $${params.length}
        `,
        params,
      );
      return rows.map(authorFromRow);
    },

    async listOnlineAuthors({ limit = 12 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        join author_profiles ap on ap.user_id = u.id
        where u.status <> 'deleted'
          and coalesce(ap.is_classic, false) = false
          and coalesce(ap.is_memorial_page, false) = false
          and u.last_seen_at is not null
          and u.last_seen_at >= now() - interval '5 minutes'
        order by u.last_seen_at desc, u.registered_at desc
        limit $1
        `,
        [page.limit],
      );
      return rows.map(authorFromRow);
    },


    async listTodayVisitors({ limit = 12 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        join author_profiles ap on ap.user_id = u.id
        where u.status <> 'deleted'
          and coalesce(ap.is_classic, false) = false
          and coalesce(ap.is_memorial_page, false) = false
          and u.last_seen_at is not null
          and u.last_seen_at >= date_trunc('day', now())
        order by u.last_seen_at desc, u.registered_at desc
        limit $1
        `,
        [page.limit],
      );
      return rows.map(authorFromRow);
    },

    async listBirthdayAuthors({ limit = 12 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        join author_profiles ap on ap.user_id = u.id
        where u.status <> 'deleted'
          and ap.birth_date is not null
          and extract(month from ap.birth_date) = extract(month from current_date)
          and extract(day from ap.birth_date) = extract(day from current_date)
        order by ap.display_name asc, u.registered_at desc
        limit $1
        `,
        [page.limit],
      );
      return rows.map(authorFromRow);
    },

    async getAuthor({ id = null, login = null } = {}) {
      const field = id != null ? 'u.id = $1' : 'u.login = $1';
      const value = id != null ? id : login;
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from users u
        join author_profiles ap on ap.user_id = u.id
        where ${field}
          and u.status <> 'deleted'
        limit 1
        `,
        [value],
      );
      return authorFromRow(rows[0]);
    },

    async registerWorkView({ workId, viewerUserId }) {
      if (!workId || !viewerUserId) return null;
      const client = await pool.connect();
      try {
        await client.query('begin');
        const workRow = await client.query(
          `
          select author_user_id
          from works
          where id = $1
          limit 1
          `,
          [workId],
        );
        const authorUserId = workRow.rows[0]?.author_user_id ?? null;
        const insertedView = await client.query(
          `
          insert into work_views (work_id, viewer_user_id, viewed_at)
          values ($1, $2, now())
          on conflict (work_id, viewer_user_id)
          where viewer_user_id is not null
          do update set viewed_at = excluded.viewed_at
          returning id, (xmax = 0) as inserted
          `,
          [workId, viewerUserId],
        );
        if (authorUserId != null) {
          await client.query(
            `
            insert into work_page_views (work_id, author_user_id, viewer_user_id, viewed_at)
            values ($1, $2, $3, now())
            `,
            [workId, authorUserId, viewerUserId],
          );
          if (insertedView.rows[0]?.inserted && String(authorUserId) != String(viewerUserId)) {
            await awardRatingEvent({
              userId: authorUserId,
              eventType: 'unique-work-reader',
              points: 1,
              eventKey: `unique-work-reader:${workId}:${viewerUserId}`,
              meta: { workId, viewerUserId },
            }, client);
          }
        }
        await client.query('commit');
        return true;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listWorkViewers({ workId, limit = 100 }) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select wv.*,
               u.id as viewer_id, u.email as viewer_email, u.login as viewer_login, u.registered_at as viewer_registered_at,
               u.last_seen_at as viewer_last_seen_at, u.created_at as viewer_created_at, u.updated_at as viewer_updated_at,
               ap.display_name as viewer_display_name, ap.bio as viewer_bio, ap.avatar_url as viewer_avatar_url,
               ap.cover_image_url as viewer_cover_image_url, ap.city as viewer_city, ap.website_url as viewer_website_url,
               ap.birth_date as viewer_birth_date,
               ap.rating_total as viewer_rating_total, ap.works_count_cached as viewer_works_count_cached,
               ap.is_classic as viewer_is_classic, ap.is_memorial_page as viewer_is_memorial_page, ap.is_featured as viewer_is_featured
        from work_views wv
        left join users u on u.id = wv.viewer_user_id
        left join author_profiles ap on ap.user_id = u.id
        where wv.work_id = $1
          and coalesce(ap.is_classic, false) = false
          and coalesce(ap.is_memorial_page, false) = false
        order by wv.viewed_at desc, wv.id desc
        limit $2
        `,
        [workId, page.limit],
      );
      return rows.map(workViewerFromRow);
    },

    async hasUserLikedWork({ workId, userId }) {
      if (!workId || !userId) return false;
      const { rows } = await pool.query(
        `
        select 1
        from work_likes
        where work_id = $1 and user_id = $2
        limit 1
        `,
        [workId, userId],
      );
      return Boolean(rows[0]);
    },

    async hasUserDislikedWork({ workId, userId }) {
      if (!workId || !userId) return false;
      const { rows } = await pool.query(
        `
        select 1
        from public.work_dislikes
        where work_id = $1 and user_id = $2
        limit 1
        `,
        [workId, userId],
      );
      return Boolean(rows[0]);
    },

    async hasUserLikedWorkComment({ commentId, userId }) {
      if (!commentId || !userId) return false;
      const { rows } = await pool.query(
        `
        select 1
        from work_comment_likes
        where comment_id = $1 and user_id = $2
        limit 1
        `,
        [commentId, userId],
      );
      return Boolean(rows[0]);
    },

    async hasWorkAnnouncement({ workId }) {
      if (!workId) return false;
      const { rows } = await pool.query(
        `
        select 1
        from work_announcements
        where work_id = $1
        limit 1
        `,
        [workId],
      );
      return Boolean(rows[0]);
    },

    async toggleWorkLike({ workId, userId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const existing = await client.query(
          `
          select id
          from work_likes
          where work_id = $1 and user_id = $2
          limit 1
          `,
          [workId, userId],
        );
        if (existing.rows[0]) {
          await client.query('delete from work_likes where id = $1', [existing.rows[0].id]);
        } else {
          await client.query('delete from public.work_dislikes where work_id = $1 and user_id = $2', [workId, userId]);
          await client.query(
            `
            insert into work_likes (work_id, user_id)
            values ($1, $2)
            `,
            [workId, userId],
          );
        }
        await client.query('commit');
        return await this.getWorkById(workId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async toggleWorkDislike({ workId, userId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const existing = await client.query(
          `
          select id
          from public.work_dislikes
          where work_id = $1 and user_id = $2
          limit 1
          `,
          [workId, userId],
        );
        if (existing.rows[0]) {
          await client.query('delete from public.work_dislikes where id = $1', [existing.rows[0].id]);
        } else {
          await client.query('delete from work_likes where work_id = $1 and user_id = $2', [workId, userId]);
          await client.query(
            `
            insert into public.work_dislikes (work_id, user_id)
            values ($1, $2)
            `,
            [workId, userId],
          );
        }
        await client.query('commit');
        return await this.getWorkById(workId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async toggleWorkCommentLike({ commentId, userId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const target = await client.query(
          `
          select work_id
          from work_comments
          where id = $1 and status = 'visible'
          limit 1
          `,
          [commentId],
        );
        if (!target.rows[0]) {
          throw new Error('Comment not found');
        }
        const existing = await client.query(
          `
          select id
          from work_comment_likes
          where comment_id = $1 and user_id = $2
          limit 1
          `,
          [commentId, userId],
        );
        if (existing.rows[0]) {
          await client.query('delete from work_comment_likes where id = $1', [existing.rows[0].id]);
        } else {
          await client.query(
            `
            insert into work_comment_likes (comment_id, user_id)
            values ($1, $2)
            `,
            [commentId, userId],
          );
        }
        await client.query('commit');
        const comments = await this.listWorkComments({ workId: target.rows[0].work_id, limit: 500, offset: 0 });
        return comments.find((comment) => String(comment.id) === String(commentId)) ?? null;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listWorkLikers({ workId, limit = 100 }) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url,
               ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from work_likes wl
        join users u on u.id = wl.user_id
        left join author_profiles ap on ap.user_id = u.id
        where wl.work_id = $1
        order by wl.created_at desc, wl.id desc
        limit $2
        `,
        [workId, page.limit],
      );
      return rows.map(authorFromRow);
    },

    async listWorkCommentLikers({ commentId, limit = 100 }) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url,
               ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from work_comment_likes wcl
        join users u on u.id = wcl.user_id
        left join author_profiles ap on ap.user_id = u.id
        where wcl.comment_id = $1
        order by wcl.created_at desc, wcl.id desc
        limit $2
        `,
        [commentId, page.limit],
      );
      return rows.map(authorFromRow);
    },

    async listWorkReaders({ workId, limit = 100 }) {
      const page = buildLimitOffset(limit, 0);
      const batchSize = 200;
      const { rows: statsRows } = await pool.query(
        `
        select count(*)::int as total_views
        from work_page_views
        where work_id = $1
        `,
        [workId],
      );
      const totalViews = Number(statsRows[0]?.total_views ?? 0);
      const lockedViews = Math.floor(totalViews / batchSize) * batchSize;
      if (!lockedViews) {
        return { totalViews, lockedViews, batchSize, viewers: [] };
      }
      const { rows } = await pool.query(
        `
        with ordered_events as (
          select wpv.*, row_number() over (order by wpv.id asc) as seq
          from work_page_views wpv
          where wpv.work_id = $1
            and wpv.viewer_user_id is not null
        ),
        locked_events as (
          select *
          from ordered_events
          where seq <= $2
        ),
        latest as (
          select distinct on (viewer_user_id) *
          from locked_events
          order by viewer_user_id, viewed_at desc, id desc
        )
        select latest.*,
               u.id as viewer_id, u.email as viewer_email, u.login as viewer_login, u.registered_at as viewer_registered_at,
               u.last_seen_at as viewer_last_seen_at, u.created_at as viewer_created_at, u.updated_at as viewer_updated_at,
               ap.display_name as viewer_display_name, ap.bio as viewer_bio, ap.avatar_url as viewer_avatar_url,
               ap.cover_image_url as viewer_cover_image_url, ap.city as viewer_city, ap.website_url as viewer_website_url,
               ap.birth_date as viewer_birth_date,
               ap.rating_total as viewer_rating_total, ap.works_count_cached as viewer_works_count_cached,
               ap.is_classic as viewer_is_classic, ap.is_memorial_page as viewer_is_memorial_page, ap.is_featured as viewer_is_featured
        from latest
        left join users u on u.id = latest.viewer_user_id
        left join author_profiles ap on ap.user_id = u.id
        where coalesce(ap.is_classic, false) = false
          and coalesce(ap.is_memorial_page, false) = false
        order by latest.viewed_at desc, latest.id desc
        limit $3
        `,
        [workId, lockedViews, page.limit],
      );
      return { totalViews, lockedViews, batchSize, viewers: rows.map(workViewerFromRow) };
    },

    async listAuthorPageVisitorsByWork({ workId, limit = 100 }) {
      const page = buildLimitOffset(limit, 0);
      const batchSize = 200;
      const { rows: workRows } = await pool.query(
        `
        select author_user_id
        from works
        where id = $1
        limit 1
        `,
        [workId],
      );
      const authorUserId = workRows[0]?.author_user_id ?? null;
      if (!authorUserId) {
        return { totalViews: 0, lockedViews: 0, batchSize, visitors: [] };
      }
      const { rows: statsRows } = await pool.query(
        `
        select count(*)::int as total_views
        from work_page_views
        where author_user_id = $1
        `,
        [authorUserId],
      );
      const totalViews = Number(statsRows[0]?.total_views ?? 0);
      const lockedViews = Math.floor(totalViews / batchSize) * batchSize;
      if (!lockedViews) {
        return { totalViews, lockedViews, batchSize, visitors: [] };
      }
      const { rows } = await pool.query(
        `
        with ordered_events as (
          select wpv.*, row_number() over (order by wpv.id asc) as seq
          from work_page_views wpv
          where wpv.author_user_id = $1
            and wpv.viewer_user_id is not null
        ),
        locked_events as (
          select *
          from ordered_events
          where seq <= $2
        ),
        latest as (
          select distinct on (viewer_user_id) *
          from locked_events
          order by viewer_user_id, viewed_at desc, id desc
        )
        select latest.*, w.title as work_title, w.slug as work_slug,
               u.id as viewer_id, u.email as viewer_email, u.login as viewer_login, u.registered_at as viewer_registered_at,
               u.last_seen_at as viewer_last_seen_at, u.created_at as viewer_created_at, u.updated_at as viewer_updated_at,
               ap.display_name as viewer_display_name, ap.bio as viewer_bio, ap.avatar_url as viewer_avatar_url,
               ap.cover_image_url as viewer_cover_image_url, ap.city as viewer_city, ap.website_url as viewer_website_url,
               ap.birth_date as viewer_birth_date,
               ap.rating_total as viewer_rating_total, ap.works_count_cached as viewer_works_count_cached,
               ap.is_classic as viewer_is_classic, ap.is_memorial_page as viewer_is_memorial_page, ap.is_featured as viewer_is_featured
        from latest
        join works w on w.id = latest.work_id
        left join users u on u.id = latest.viewer_user_id
        left join author_profiles ap on ap.user_id = u.id
        where coalesce(ap.is_classic, false) = false
          and coalesce(ap.is_memorial_page, false) = false
        order by latest.viewed_at desc, latest.id desc
        limit $3
        `,
        [authorUserId, lockedViews, page.limit],
      );
      return { totalViews, lockedViews, batchSize, visitors: rows.map(pageVisitorFromRow) };
    },

    async listWorkGenres({ sectionCode = null } = {}) {
      const params = [];
      const conditions = [];
      if (sectionCode) {
        params.push(sectionCode);
        conditions.push(`ws.code = $${params.length}`);
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select wg.slug, wg.name, ws.code as section_code
        from work_genres wg
        join work_sections ws on ws.id = wg.section_id
        ${where}
        order by ws.sort_order asc, wg.sort_order asc, wg.name asc
        `,
        params,
      );
      return rows.map((row) => ({ slug: row.slug, name: row.name, sectionCode: row.section_code }));
    },

    async listAnnouncedWorks({ limit = 12 } = {}) {
      const page = buildLimitOffset(limit, 0);
      await pool.query(`update works w set announcement_active = false where w.announcement_active = true and exists (select 1 from work_announcements wa where wa.work_id = w.id and wa.expires_at <= now())`);
      await pool.query(`update work_announcements set revoked_at = coalesce(revoked_at, now()) where expires_at <= now() and revoked_at is null`);
      const { rows } = await pool.query(
        `
        select w.*, ws.code as section_code, wg.slug as genre_slug,
               (select count(*)::int from work_likes wl where wl.work_id = w.id) as likes_count,
               true as announcement_active,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured
        from work_announcements wa
        join works w on w.id = wa.work_id
        join work_sections ws on ws.id = w.section_id
        left join work_genres wg on wg.id = w.genre_id
        join users u on u.id = w.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        where w.status = 'published'
          and wa.revoked_at is null
          and wa.expires_at > now()
        order by wa.created_at desc, wa.id desc
        limit $1
        `,
        [page.limit],
      );
      return rows.map(workFromRow);
    },

    async listRecentWorkComments({ limit = 12 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select wc.id, wc.body, wc.created_at, w.id as work_id, w.title as work_title, w.slug as work_slug,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.last_seen_at as author_last_seen_at, u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url,
               ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x,
               ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale,
               ap.city as author_city, ap.website_url as author_website_url, ap.birth_date as author_birth_date,
               ap.rating_total as author_rating_total, ap.works_count_cached as author_works_count_cached,
               ap.is_classic as author_is_classic, ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured, ap.is_child as author_is_child
        from work_comments wc
        join works w on w.id = wc.work_id and w.status = 'published'
        join users u on u.id = wc.user_id
        left join author_profiles ap on ap.user_id = u.id
        where wc.status = 'visible'
          and u.status <> 'deleted'
        order by wc.created_at desc, wc.id desc
        limit $1
        `,
        [page.limit],
      );
      return rows.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: toIsoDate(row.created_at),
        work: { id: row.work_id, title: row.work_title, slug: row.work_slug },
        author: authorFromRow({
          id: row.author_id, email: row.author_email, login: row.author_login,
          registered_at: row.author_registered_at, last_seen_at: row.author_last_seen_at,
          created_at: row.author_created_at, updated_at: row.author_updated_at,
          display_name: row.author_display_name, bio: row.author_bio, avatar_url: row.author_avatar_url,
          cover_image_url: row.author_cover_image_url, cover_image_position_x: row.author_cover_image_position_x,
          cover_image_position_y: row.author_cover_image_position_y, cover_image_scale: row.author_cover_image_scale,
          city: row.author_city, website_url: row.author_website_url, birth_date: row.author_birth_date,
          rating_total: row.author_rating_total, works_count_cached: row.author_works_count_cached,
          is_classic: row.author_is_classic, is_memorial_page: row.author_is_memorial_page,
          is_featured: row.author_is_featured, is_child: row.author_is_child,
        }),
      }));
    },

    async deactivateWorkAnnouncement({ workId, actorUserId = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(
          `
          update work_announcements
          set revoked_at = now(), revoked_by_user_id = $2
          where work_id = $1 and revoked_at is null
          `,
          [workId, actorUserId],
        );


        await client.query(
          `
          update works
          set announcement_active = false
          where id = $1
          `,
          [workId],
        );

        await client.query('commit');
        return await this.getWorkById(workId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async activateWorkAnnouncement({ workId, activatedByUserId, isAdmin = false }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(`update works w set announcement_active = false where w.announcement_active = true and exists (select 1 from work_announcements wa where wa.work_id = w.id and wa.expires_at <= now())`);
        await client.query('update work_announcements set revoked_at = coalesce(revoked_at, now()) where expires_at <= now() and revoked_at is null');
        const work = await client.query(
          `
          select id, author_user_id, announcement_active
          from works
          where id = $1 and status = 'published'
          limit 1
          `,
          [workId],
        );
        if (!work.rows[0]) {
          throw new Error('Work not found or not published');
        }

        const existing = await client.query(
          `
          select id
          from work_announcements
          where work_id = $1
          limit 1
          `,
          [workId],
        );
        if (existing.rows[0]) {
          await client.query('commit');
          return await this.getWorkById(workId);
        }

        const stats = await client.query('select count(*)::int as cnt from work_announcements where revoked_at is null');
        const activeCount = Number(stats.rows[0]?.cnt ?? 0);
        if (activeCount >= 12) {
          const oldest = await client.query(
            `
            select work_id
            from work_announcements
            order by created_at asc, id asc
            limit 1
            `,
          );
          const oldestWorkId = oldest.rows[0]?.work_id;
          if (oldestWorkId) {
            await client.query(
              `
              update works
              set announcement_active = false
              where id = $1
              `,
              [oldestWorkId],
            );
          }
          await client.query(
            `
            update work_announcements
            set revoked_at = now(), revoked_by_user_id = $1
            where id = (
              select id
              from work_announcements
              where revoked_at is null
              order by created_at asc, id asc
              limit 1
            )
            `,
            [activatedByUserId],
          );
        }

        if (!isAdmin) {
          await applyPeachDelta(
            {
              userId: activatedByUserId,
              amount: -50,
              kind: 'work_announcement',
              note: 'Анонс произведения на главной',
              requireSufficientBalance: true,
            },
            client,
          );
        }

        await client.query(
          `
          update works
          set announcement_active = true,
              announcement_count = coalesce(announcement_count, 0) + 1
          where id = $1
          `,
          [workId],
        );

        await client.query(
          `
          insert into work_announcements (work_id, activated_by_user_id, expires_at)
          values ($1, $2, now() + interval '7 days')
          `,
          [workId, activatedByUserId],
        );

        const authorId = work.rows[0].author_user_id;
        if (authorId) {
          await awardRatingEvent(
            {
              userId: authorId,
              eventType: 'work_announcement',
              eventKey: `work_announcement:${workId}:${activatedByUserId}:${Date.now()}`,
              points: 50,
              meta: { workId, activatedByUserId },
            },
            client,
          );
        }

        await client.query('commit');
        return await this.getWorkById(workId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listWrittenWorkComments({ authorUserId, limit = 50 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select wc.id, wc.body, wc.status, wc.created_at, wc.updated_at,
               w.id as work_id, w.title as work_title, w.slug as work_slug,
               cu.id as comment_author_id, cu.email as comment_author_email, cu.login as comment_author_login,
               cu.registered_at as comment_author_registered_at, cu.last_seen_at as comment_author_last_seen_at,
               cu.created_at as comment_author_created_at, cu.updated_at as comment_author_updated_at,
               cap.display_name as comment_author_display_name, cap.bio as comment_author_bio,
               cap.avatar_url as comment_author_avatar_url, cap.cover_image_url as comment_author_cover_image_url,
               cap.city as comment_author_city, cap.website_url as comment_author_website_url, cap.birth_date as comment_author_birth_date,
               cap.rating_total as comment_author_rating_total, cap.works_count_cached as comment_author_works_count_cached,
               cap.is_classic as comment_author_is_classic, cap.is_featured as comment_author_is_featured,
               wu.id as work_author_id, wu.email as work_author_email, wu.login as work_author_login,
               wu.registered_at as work_author_registered_at, wu.last_seen_at as work_author_last_seen_at,
               wu.created_at as work_author_created_at, wu.updated_at as work_author_updated_at,
               wap.display_name as work_author_display_name, wap.bio as work_author_bio,
               wap.avatar_url as work_author_avatar_url, wap.cover_image_url as work_author_cover_image_url,
               wap.city as work_author_city, wap.website_url as work_author_website_url, wap.birth_date as work_author_birth_date,
               wap.rating_total as work_author_rating_total, wap.works_count_cached as work_author_works_count_cached,
               wap.is_classic as work_author_is_classic, wap.is_featured as work_author_is_featured
        from work_comments wc
        join works w on w.id = wc.work_id
        join users cu on cu.id = wc.user_id
        left join author_profiles cap on cap.user_id = cu.id
        join users wu on wu.id = w.author_user_id
        left join author_profiles wap on wap.user_id = wu.id
        where wc.user_id = $1
          and w.author_user_id <> $1
          and wc.status = 'visible'
        order by wc.created_at desc, wc.id desc
        limit $2
        `,
        [authorUserId, page.limit],
      );
      return rows.map(authorReviewFeedItemFromRow);
    },

    async listReceivedWorkComments({ authorUserId, limit = 50 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select wc.id, wc.body, wc.status, wc.created_at, wc.updated_at,
               w.id as work_id, w.title as work_title, w.slug as work_slug,
               cu.id as comment_author_id, cu.email as comment_author_email, cu.login as comment_author_login,
               cu.registered_at as comment_author_registered_at, cu.last_seen_at as comment_author_last_seen_at,
               cu.created_at as comment_author_created_at, cu.updated_at as comment_author_updated_at,
               cap.display_name as comment_author_display_name, cap.bio as comment_author_bio,
               cap.avatar_url as comment_author_avatar_url, cap.cover_image_url as comment_author_cover_image_url,
               cap.city as comment_author_city, cap.website_url as comment_author_website_url, cap.birth_date as comment_author_birth_date,
               cap.rating_total as comment_author_rating_total, cap.works_count_cached as comment_author_works_count_cached,
               cap.is_classic as comment_author_is_classic, cap.is_featured as comment_author_is_featured,
               wu.id as work_author_id, wu.email as work_author_email, wu.login as work_author_login,
               wu.registered_at as work_author_registered_at, wu.last_seen_at as work_author_last_seen_at,
               wu.created_at as work_author_created_at, wu.updated_at as work_author_updated_at,
               wap.display_name as work_author_display_name, wap.bio as work_author_bio,
               wap.avatar_url as work_author_avatar_url, wap.cover_image_url as work_author_cover_image_url,
               wap.city as work_author_city, wap.website_url as work_author_website_url, wap.birth_date as work_author_birth_date,
               wap.rating_total as work_author_rating_total, wap.works_count_cached as work_author_works_count_cached,
               wap.is_classic as work_author_is_classic, wap.is_featured as work_author_is_featured
        from work_comments wc
        join works w on w.id = wc.work_id
        join users cu on cu.id = wc.user_id
        left join author_profiles cap on cap.user_id = cu.id
        join users wu on wu.id = w.author_user_id
        left join author_profiles wap on wap.user_id = wu.id
        where w.author_user_id = $1
          and wc.user_id <> $1
          and wc.status = 'visible'
        order by wc.created_at desc, wc.id desc
        limit $2
        `,
        [authorUserId, page.limit],
      );
      return rows.map(authorReviewFeedItemFromRow);
    },

    async listMyWorkGroups({ authorUserId }) {
      const { rows: groups } = await pool.query(`select id, name, description, position, coalesce(is_collapsed, false) as is_collapsed from work_collections where author_user_id = $1 order by position, id`, [authorUserId]);
      const works = (await this.listWorks({ authorId: authorUserId, status: null, limit: 500, offset: 0 })).filter((work) => work.status !== 'archived');
      const memberships = groups.length ? (await pool.query(`select collection_id, work_id from work_collection_items where collection_id = any($1::bigint[]) order by position, work_id`, [groups.map((g) => g.id)])).rows : [];
      const byId = new Map(works.map((work) => [String(work.id), work]));
      return groups.map((group) => ({ id: group.id, name: group.name, description: group.description, position: Number(group.position || 0), isCollapsed: Boolean(group.is_collapsed), works: memberships.filter((item) => String(item.collection_id) === String(group.id)).map((item) => byId.get(String(item.work_id))).filter(Boolean) }));
    },

    async createMyWorkGroup({ authorUserId, name, description = null }) {
      const normalizedName = String(name ?? '').trim();
      if (!normalizedName) throw new Error('Group name is required');
      const code = `author-${authorUserId}-${slugify(normalizedName)}-${Date.now()}`;
      const { rows } = await pool.query(`insert into work_collections (code, name, description, collection_type, is_public, author_user_id, position, is_collapsed) values ($1, $2, $3, 'curated', true, $4, (select coalesce(max(position), -1) + 1 from work_collections where author_user_id = $4), false) returning id, name, description, position, is_collapsed`, [code, normalizedName, String(description ?? '').trim() || null, authorUserId]);
      const group = rows[0];
      return { id: group.id, name: group.name, description: group.description, position: Number(group.position || 0), isCollapsed: Boolean(group.is_collapsed), works: [] };
    },

    async updateMyWorkGroup({ authorUserId, groupId, name, description = null }) {
      const normalizedName = String(name ?? '').trim();
      if (!normalizedName) throw new Error('Group name is required');
      const { rows } = await pool.query(
        `update work_collections
         set name = $1, description = $2
         where id = $3 and author_user_id = $4
         returning id, name, description, position, coalesce(is_collapsed, false) as is_collapsed`,
        [normalizedName, String(description ?? '').trim() || null, groupId, authorUserId],
      );
      if (!rows.length) throw new Error('Work group not found');
      const group = rows[0];
      const allGroups = await this.listMyWorkGroups({ authorUserId });
      return allGroups.find((item) => String(item.id) === String(group.id)) || {
        id: group.id, name: group.name, description: group.description,
        position: Number(group.position || 0), isCollapsed: Boolean(group.is_collapsed), works: [],
      };
    },

    async reorderMyWorkGroups({ authorUserId, groupIds }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        for (let index = 0; index < groupIds.length; index += 1) await client.query('update work_collections set position = $1 where id = $2 and author_user_id = $3', [index, groupIds[index], authorUserId]);
        await client.query('commit');
        return this.listMyWorkGroups({ authorUserId });
      } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    },

    async setMyWorkGroupItems({ authorUserId, groupId, workIds }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const group = await client.query('select id from work_collections where id = $1 and author_user_id = $2 for update', [groupId, authorUserId]);
        if (!group.rows.length) throw new Error('Work group not found');
        const valid = workIds.length ? await client.query('select id from works where id = any($1::bigint[]) and author_user_id = $2 order by array_position($1::bigint[], id)', [workIds, authorUserId]) : { rows: [] };
        await client.query('delete from work_collection_items where collection_id = $1', [groupId]);
        for (let index = 0; index < valid.rows.length; index += 1) await client.query('insert into work_collection_items (collection_id, work_id, position) values ($1, $2, $3)', [groupId, valid.rows[index].id, index]);
        await client.query('commit');
        return (await this.listMyWorkGroups({ authorUserId })).find((item) => String(item.id) === String(groupId));
      } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    },

    async setMyWorkGroupCollapsed({ authorUserId, groupId, isCollapsed }) {
      const { rows } = await pool.query('update work_collections set is_collapsed = $1 where id = $2 and author_user_id = $3 returning id', [Boolean(isCollapsed), groupId, authorUserId]);
      if (!rows.length) throw new Error('Work group not found');
      return (await this.listMyWorkGroups({ authorUserId })).find((item) => String(item.id) === String(groupId));
    },

    async listWorks({ limit = 20, offset = 0, sectionCode = null, genreSlug = null, authorId = null, search = null, status = 'published', createdToday = false } = {}) {
      const page = buildLimitOffset(limit, offset);
      const conditions = [];
      const params = [];
      if (sectionCode) {
        params.push(sectionCode);
        conditions.push(`ws.code = $${params.length}`);
      }
      if (genreSlug) {
        params.push(genreSlug);
        conditions.push(`wg.slug = $${params.length}`);
      }
      if (authorId) {
        params.push(authorId);
        conditions.push(`w.author_user_id = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(w.title ilike $${params.length} or coalesce(w.summary,'') ilike $${params.length} or coalesce(w.body,'') ilike $${params.length})`);
      }
      if (status) {
        params.push(status);
        conditions.push(`w.status = $${params.length}`);
      }
      if (createdToday) {
        conditions.push(`date(w.created_at) = current_date`);
      }
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select w.*, ws.code as section_code, wg.slug as genre_slug,
               (select count(*)::int from work_likes wl where wl.work_id = w.id) as likes_count,
               (select count(*)::int from public.work_dislikes wd where wd.work_id = w.id) as dislikes_count,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured
        from works w
        join work_sections ws on ws.id = w.section_id
        left join work_genres wg on wg.id = w.genre_id
        join users u on u.id = w.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        ${where}
        order by coalesce(w.published_at, w.created_at) desc
        limit $${params.length - 1} offset $${params.length}
        `,
        params,
      );
      return rows.map(workFromRow);
    },

    async getWorkById(id) {
      const { rows } = await pool.query(
        `
        select w.*, ws.code as section_code, wg.slug as genre_slug,
               (select count(*)::int from work_likes wl where wl.work_id = w.id) as likes_count,
               (select count(*)::int from public.work_dislikes wd where wd.work_id = w.id) as dislikes_count,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured
        from works w
        join work_sections ws on ws.id = w.section_id
        left join work_genres wg on wg.id = w.genre_id
        join users u on u.id = w.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        where w.id = $1
        limit 1
        `,
        [id],
      );
      return workFromRow(rows[0]);
    },

    async getWorkBySlug(slug) {
      const { rows } = await pool.query(
        `
        select w.*, ws.code as section_code, wg.slug as genre_slug,
               (select count(*)::int from work_likes wl where wl.work_id = w.id) as likes_count,
               exists(select 1 from work_announcements wa where wa.work_id = w.id) as announcement_active,
               (select count(*)::int from public.work_dislikes wd where wd.work_id = w.id) as dislikes_count,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured
        from works w
        join work_sections ws on ws.id = w.section_id
        left join work_genres wg on wg.id = w.genre_id
        join users u on u.id = w.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        where w.slug = $1
        limit 1
        `,
        [slug],
      );
      return workFromRow(rows[0]);
    },

    async createWork({ authorUserId, sectionCode, genreSlug = null, title, summary = null, body = null, excerpt = null, status = 'published', projectFormat = null, pdfUrl = null, pdfFileName = null, audioUrl = null, audioFileName = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const section = await client.query('select id from work_sections where code = $1 limit 1', [sectionCode]);
        if (!section.rows[0]) throw new Error(`Unknown sectionCode: ${sectionCode}`);
        let genreId = null;
        if (genreSlug) {
          const genre = await client.query('select id from work_genres where slug = $1 limit 1', [genreSlug]);
          if (!genre.rows[0]) throw new Error(`Unknown genreSlug: ${genreSlug}`);
          genreId = genre.rows[0].id;
        }
        const slug = `${slugify(title)}-${Date.now()}`;
        const publishedAt = status === 'published' ? new Date() : null;
        const inserted = await client.query(
          `
          insert into works (
            author_user_id, section_id, genre_id, title, slug, summary, body, excerpt, status, project_format,
            published_at, pdf_url, pdf_file_name, audio_url, audio_file_name
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          returning id
          `,
          [
            authorUserId,
            section.rows[0].id,
            genreId,
            title,
            slug,
            summary,
            body,
            excerpt,
            status,
            projectFormat,
            publishedAt,
            normalizeOptionalText(pdfUrl),
            normalizeOptionalText(pdfFileName),
            normalizeOptionalText(audioUrl),
            normalizeOptionalText(audioFileName),
          ],
        );
        await client.query(
          "update author_profiles set works_count_cached = (select count(*) from works where author_user_id = $1 and status <> 'archived') where user_id = $1",
          [authorUserId],
        );
        await awardRatingEvent({ userId: authorUserId, eventType: 'work-created', points: 1, eventKey: `work-created:${inserted.rows[0].id}`, meta: { workId: inserted.rows[0].id } }, client);
        await client.query('commit');
        return await this.getWorkById(inserted.rows[0].id);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async adminUpdateWork({ workId, ...input }) {
      return this.updateWork({ workId, ...input, canManageAll: true, authorUserId: null });
    },

    async adminReassignWorkGroupOwner({ groupId, destinationAuthorId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const group = await client.query('select id, author_user_id from work_collections where id = $1 for update', [groupId]);
        if (!group.rows.length) throw new Error('Work group not found');
        const destination = await client.query("select id from users where id = $1 and status = 'active' for update", [destinationAuthorId]);
        if (!destination.rows.length) throw new Error('Destination author not found or inactive');
        await client.query('update work_collections set author_user_id = $1, updated_at = now() where id = $2', [destinationAuthorId, groupId]);
        const works = await client.query('select work_id from work_collection_items where collection_id = $1', [groupId]);
        await client.query('update works set author_user_id = $1, updated_at = now() where id = any($2::bigint[])', [destinationAuthorId, works.rows.map((row) => row.work_id)]);
        for (const authorId of [group.rows[0].author_user_id, destinationAuthorId]) await client.query("update author_profiles set works_count_cached = (select count(*) from works where author_user_id = $1 and status <> 'archived') where user_id = $1", [authorId]);
        await client.query('commit');
        return (await this.listMyWorkGroups({ authorUserId: destinationAuthorId })).find((item) => String(item.id) === String(groupId));
      } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    },

    async adminReassignWorkOwner({ workId, destinationAuthorId }) {
      if (!workId || !destinationAuthorId) throw new Error('Work and destination author are required');
      const client = await pool.connect();
      try {
        await client.query('begin');
        const workResult = await client.query('select id, author_user_id from works where id = $1 for update', [workId]);
        const current = workResult.rows[0];
        if (!current) throw new Error('Work not found');
        const destination = await client.query("select id from users where id = $1 and status = 'active' for update", [destinationAuthorId]);
        if (!destination.rows[0]) throw new Error('Destination author not found or inactive');
        if (String(current.author_user_id) !== String(destinationAuthorId)) {
          await client.query('update works set author_user_id = $1, updated_at = now() where id = $2', [destinationAuthorId, workId]);
          for (const authorId of [current.author_user_id, destinationAuthorId]) {
            await client.query("update author_profiles set works_count_cached = (select count(*) from works where author_user_id = $1 and status <> 'archived') where user_id = $1", [authorId]);
          }
        }
        await client.query('commit');
        return this.getWorkById(workId);
      } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    },

    async adminSoftDeleteWork({ workId }) {
      return this.softDeleteWork({ workId, canManageAll: true, authorUserId: null });
    },

    async adminSoftDeleteWorkComment({ commentId }) {
      return this.softDeleteWorkComment({ commentId, actorUserId: null, canManageAll: true });
    },

    async adminSoftDeleteForumTopic({ topicId }) {
      return this.softDeleteForumTopic({ topicId, authorUserId: null, canManageAll: true });
    },

    async adminSoftDeleteForumPost({ postId }) {
      return this.softDeleteForumPost({ postId, authorUserId: null, canManageAll: true });
    },

    async adminDeactivateWorkAnnouncement({ workId, actorUserId }) {
      return this.deactivateWorkAnnouncement({ workId, actorUserId });
    },

    // COPY preserves the original work rows (and author), copying only
    // collection membership. MOVE changes ownership and removes source links.
    async adminTransferWorkGroup({ sourceAuthorId, destinationAuthorId, sourceGroupId, destinationGroupId = null, mode = 'move', conflictPolicy = 'error' }) {
      if (!sourceAuthorId || !destinationAuthorId || !sourceGroupId || String(sourceAuthorId) === String(destinationAuthorId)) throw new Error('Invalid source, destination or group id');
      if (!['move', 'copy'].includes(mode) || !['error', 'rename'].includes(conflictPolicy)) throw new Error('Invalid transfer policy');
      const client = await pool.connect();
      try {
        await client.query('begin');
        const sourceCollection = await client.query('select id, code, name, description, section_id, collection_type, is_public from work_collections where id = $1 and author_user_id = $2 for update', [sourceGroupId, sourceAuthorId]);
        if (!sourceCollection.rows.length) throw new Error('Source group does not belong to source author');
        const source = await client.query(`select wci.work_id, wci.position, w.author_user_id from work_collection_items wci join works w on w.id = wci.work_id where wci.collection_id = $1 order by wci.position, wci.work_id for update`, [sourceGroupId]);
        if (!source.rows.length) throw new Error('Source group is empty or does not belong to source author');
        if (source.some((row) => String(row.author_user_id) !== String(sourceAuthorId))) throw new Error('Source group contains work owned by another author');
        let targetId;
        if (destinationGroupId != null) {
          const target = await client.query('select id from work_collections where id = $1 and author_user_id = $2 for update', [destinationGroupId, destinationAuthorId]);
          if (!target.rows.length) throw new Error('Destination group does not belong to destination author');
          targetId = target.rows[0].id;
        } else {
          const code = `admin-transfer-${sourceGroupId}-to-${destinationAuthorId}`;
          await client.query(`insert into work_collections (code, name, description, section_id, collection_type, is_public, author_user_id)
            values ($1, $2, $3, $4, $5, $6, $7) on conflict (code) do nothing`, [code, sourceCollection.rows[0].name, sourceCollection.rows[0].description, sourceCollection.rows[0].section_id, sourceCollection.rows[0].collection_type, sourceCollection.rows[0].is_public, destinationAuthorId]);
          const target = await client.query('select id from work_collections where code = $1 and author_user_id = $2 for update', [code, destinationAuthorId]);
          if (!target.rows.length) throw new Error('Transfer destination code is owned by another account');
          targetId = target.rows[0].id;
        }
        const dest = await client.query('select work_id from work_collection_items where collection_id = $1', [targetId]);
        const existing = new Set(dest.rows.map((row) => String(row.work_id)));
        let transferredWorksCount = 0; let skippedWorksCount = 0;
        for (const row of source.rows) {
          if (existing.has(String(row.work_id))) {
            if (conflictPolicy === 'error') throw new Error(`Work ${row.work_id} already exists in destination group`);
            skippedWorksCount += 1;
            continue;
          }
          if (mode === 'move') await client.query('update works set author_user_id = $1, updated_at = now() where id = $2 and author_user_id = $3', [destinationAuthorId, row.work_id, sourceAuthorId]);
          await client.query('insert into work_collection_items (collection_id, work_id, position) values ($1, $2, $3) on conflict do nothing', [targetId, row.work_id, row.position]);
          if (mode === 'move') await client.query('delete from work_collection_items where collection_id = $1 and work_id = $2', [sourceGroupId, row.work_id]);
          transferredWorksCount += 1;
        }
        await client.query('commit');
        return { groupId: targetId, sourceAuthorId, destinationAuthorId, mode, conflictPolicy, transferredWorksCount, skippedWorksCount };
      } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    },

    async updateWork({ workId, authorUserId, canManageAll = false, sectionCode, genreSlug = null, title, summary = null, body = null, excerpt = null, status = 'published', projectFormat = null, pdfUrl = null, pdfFileName = null, audioUrl = null, audioFileName = null }) {
      const normalizedTitle = String(title ?? '').trim();
      if (!normalizedTitle) {
        throw new Error('title is required');
      }

      const client = await pool.connect();
      try {
        await client.query('begin');
        const existing = await client.query(
          `
          select id, author_user_id, published_at
          from works
          where id = $1
          limit 1
          `,
          [workId],
        );
        const current = existing.rows[0];
        if (!current) {
          throw new Error('Work not found');
        }
        if (!canManageAll && String(current.author_user_id) !== String(authorUserId)) {
          throw new Error('Only the owner can edit this work');
        }

        const section = await client.query('select id from work_sections where code = $1 limit 1', [sectionCode]);
        if (!section.rows[0]) throw new Error(`Unknown sectionCode: ${sectionCode}`);

        let genreId = null;
        if (genreSlug) {
          const genre = await client.query('select id from work_genres where slug = $1 limit 1', [genreSlug]);
          if (!genre.rows[0]) throw new Error(`Unknown genreSlug: ${genreSlug}`);
          genreId = genre.rows[0].id;
        }

        const publishedAt = status === 'published' ? (current.published_at ?? new Date()) : current.published_at;
        await client.query(
          `
          update works
          set section_id = $1,
              genre_id = $2,
              title = $3,
              summary = $4,
              body = $5,
              excerpt = $6,
              status = $7,
              project_format = $8,
              published_at = $9,
              pdf_url = $10,
              pdf_file_name = $11,
              audio_url = $12,
              audio_file_name = $13,
              updated_at = now()
          where id = $14 and ($15::boolean = true or author_user_id = $16)
          `,
          [
            section.rows[0].id,
            genreId,
            normalizedTitle,
            summary,
            body,
            excerpt,
            status,
            projectFormat,
            publishedAt,
            normalizeOptionalText(pdfUrl),
            normalizeOptionalText(pdfFileName),
            normalizeOptionalText(audioUrl),
            normalizeOptionalText(audioFileName),
            workId,
            canManageAll,
            authorUserId,
          ],
        );
        await client.query('commit');
        return await this.getWorkById(workId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async softDeleteWork({ workId, authorUserId, canManageAll = false }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const updated = await client.query(
          `
          update works
          set status = 'archived',
              updated_at = now()
          where id = $1 and ($2::boolean = true or author_user_id = $3)
          returning id, author_user_id
          `,
          [workId, canManageAll, authorUserId],
        );
        if (!updated.rows[0]) {
          throw new Error('Only the owner can delete this work');
        }
        await client.query(
          "update author_profiles set works_count_cached = (select count(*) from works where author_user_id = $1 and status <> 'archived') where user_id = $1",
          [updated.rows[0].author_user_id],
        );
        await client.query('commit');
        return await this.getWorkById(workId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async upsertWorkRating({ workId, userId, rating }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await client.query(
          `
          insert into work_ratings (work_id, user_id, rating)
          values ($1, $2, $3)
          on conflict (work_id, user_id)
          do update set rating = excluded.rating, updated_at = now()
          returning *
          `,
          [workId, userId, rating],
        );
        await client.query(
          `
          update works w
          set ratings_count = stats.cnt,
              average_rating = stats.avg_rating
          from (
            select work_id, count(*)::int as cnt, avg(rating)::numeric(4,2) as avg_rating
            from work_ratings
            where work_id = $1
            group by work_id
          ) stats
          where w.id = stats.work_id
          `,
          [workId],
        );
        await client.query('commit');
        const row = result.rows[0];
        return {
          id: row.id,
          workId: row.work_id,
          userId: row.user_id,
          rating: row.rating,
          createdAt: row.created_at?.toISOString?.() ?? row.created_at,
          updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
        };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async addWorkComment({ workId, userId, body, parentCommentId = null, imageUrl = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        if (parentCommentId != null) {
          const parent = await client.query(
            `
            select id
            from work_comments
            where id = $1 and work_id = $2
            limit 1
            `,
            [parentCommentId, workId],
          );
          if (!parent.rows[0]) {
            throw new Error('Parent comment not found in this work');
          }
        }
        const workRow = await client.query(
          `
          select author_user_id
          from works
          where id = $1
          limit 1
          `,
          [workId],
        );
        const workAuthorUserId = workRow.rows[0]?.author_user_id ?? null;
        const inserted = await client.query(
          `
          insert into work_comments (work_id, user_id, parent_comment_id, body, image_url)
          values ($1, $2, $3, $4, $5)
          returning *
          `,
          [workId, userId, parentCommentId, body, normalizeOptionalText(imageUrl)],
        );
        await client.query('update works set comments_count = comments_count + 1 where id = $1', [workId]);
        if (workAuthorUserId && String(workAuthorUserId) !== String(userId)) {
          await awardRatingEvent({
            userId: workAuthorUserId,
            eventType: 'work-comment-received',
            points: 5,
            eventKey: `work-comment-received:${inserted.rows[0].id}:${workAuthorUserId}`,
            meta: { workId, commentId: inserted.rows[0].id },
          }, client);
          await applyPeachDelta({
            userId,
            amount: 5,
            kind: 'work-comment-written',
            note: 'Сообщение под произведением другого автора',
            meta: { workId, commentId: inserted.rows[0].id },
          }, client);
        }
        await client.query('commit');
        const comment = inserted.rows[0];
        const author = await this.getAuthorByUserId(userId);
        return workCommentFromRow({ ...comment, likes_count: 0, author_login: author?.login, author_email: author?.email, author_display_name: author?.displayName, author_bio: author?.bio, author_avatar_url: author?.avatarUrl, author_cover_image_url: author?.coverImageUrl, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_memorial_page: author?.isMemorialPage, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_last_seen_at: author?.lastSeenAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt, author_id: author?.id });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async updateWorkComment({ commentId, userId, canManageAll = false, body, imageUrl = null }) {
      const normalizedBody = String(body ?? '').trim();
      if (!normalizedBody) {
        throw new Error('body is required');
      }
      const { rows } = await pool.query(
        `
        update work_comments
        set body = $1,
            image_url = $2,
            updated_at = now()
        where id = $3
          and status = 'visible'
          and ($4::boolean = true or user_id = $5)
        returning *
        `,
        [normalizedBody, normalizeOptionalText(imageUrl), commentId, canManageAll, userId],
      );
      if (!rows[0]) {
        throw new Error('Only the author can edit this comment');
      }
      const comments = await this.listWorkComments({ workId: rows[0].work_id, limit: 500, offset: 0 });
      return comments.find((comment) => String(comment.id) === String(commentId)) ?? null;
    },

    async softDeleteWorkComment({ commentId, actorUserId, canManageAll = false }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const target = await client.query(
          `
          select wc.*, w.author_user_id as work_author_user_id
          from work_comments wc
          join works w on w.id = wc.work_id
          where wc.id = $1
          limit 1
          `,
          [commentId],
        );
        const row = target.rows[0];
        if (!row) {
          throw new Error('Comment not found');
        }
        const canDelete = canManageAll || String(row.user_id) === String(actorUserId) || String(row.work_author_user_id) === String(actorUserId);
        if (!canDelete) {
          throw new Error('Only the author, recipient or admin can delete this comment');
        }
        await client.query(
          `
          with recursive subtree as (
            select id
            from work_comments
            where id = $1
            union all
            select wc.id
            from work_comments wc
            join subtree s on s.id = wc.parent_comment_id
          )
          update work_comments
          set status = 'deleted',
              body = 'УДАЛЕНО',
              image_url = null,
              updated_at = now()
          where id in (select id from subtree)
            and status <> 'deleted'
          `,
          [commentId],
        );
        await client.query(
          `
          update works
          set comments_count = (
            select count(*)::int
            from work_comments
            where work_id = $1 and status = 'visible'
          )
          where id = $1
          `,
          [row.work_id],
        );
        await client.query('commit');
        const author = await this.getAuthorByUserId(row.user_id);
        return workCommentFromRow({ ...row, body: 'УДАЛЕНО', image_url: null, status: 'deleted', likes_count: 0, author_login: author?.login, author_email: author?.email, author_display_name: author?.displayName, author_bio: author?.bio, author_avatar_url: author?.avatarUrl, author_cover_image_url: author?.coverImageUrl, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_last_seen_at: author?.lastSeenAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt, author_id: author?.id });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listWorkComments({ workId, limit = 50, offset = 0 }) {
      const page = buildLimitOffset(limit, offset);
      const { rows } = await pool.query(
        `
        select wc.*,
               (select count(*)::int from work_comment_likes wcl where wcl.comment_id = wc.id) as likes_count,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured
        from work_comments wc
        join users u on u.id = wc.user_id
        left join author_profiles ap on ap.user_id = u.id
        where wc.work_id = $1
          and wc.status = 'visible'
        order by wc.created_at asc
        limit $2 offset $3
        `,
        [workId, page.limit, page.offset],
      );
      return rows.map(workCommentFromRow);
    },

    async listForumSections() {
      const { rows } = await pool.query('select * from forum_sections order by sort_order asc, name asc');
      return rows.map(forumSectionFromRow);
    },

    async listForumTopics({ sectionSlug = null, tag = null, featuredMain, limit = 20, offset = 0 } = {}) {
      const page = buildLimitOffset(limit, offset);
      const conditions = [];
      const params = [];
      if (sectionSlug) {
        params.push(sectionSlug);
        conditions.push(`fs.slug = $${params.length}`);
      }
      if (tag) {
        params.push(tag);
        conditions.push(`exists (select 1 from forum_topic_tags ftt2 join forum_tags ft2 on ft2.id = ftt2.tag_id where ftt2.topic_id = ft.id and (ft2.slug = $${params.length} or ft2.name = $${params.length}))`);
      }
      if (featuredMain !== undefined && featuredMain !== null) {
        params.push(Boolean(featuredMain));
        conditions.push(`ft.featured_main = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select ft.*, fs.slug as section_slug,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured,
               array_remove(array_agg(distinct tg.name), null) as tags
        from forum_topics ft
        join forum_sections fs on fs.id = ft.section_id
        join users u on u.id = ft.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        left join forum_topic_tags ftt on ftt.topic_id = ft.id
        left join forum_tags tg on tg.id = ftt.tag_id
        ${where ? `${where} and ft.status in ('open', 'closed')` : `where ft.status in ('open', 'closed')`}
        group by ft.id, fs.slug, u.id, ap.user_id
        order by ft.is_pinned desc, (case when fs.slug = 'editor-column' then ft.created_at else coalesce(ft.last_post_at, ft.created_at) end) desc
        limit $${params.length - 1} offset $${params.length}
        `,
        params,
      );
      return rows.map(forumTopicFromRow);
    },

    async getForumTopic({ id = null, slug = null } = {}) {
      const { rows } = await pool.query(
        `
        select ft.*, fs.slug as section_slug,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured,
               array_remove(array_agg(distinct tg.name), null) as tags
        from forum_topics ft
        join forum_sections fs on fs.id = ft.section_id
        join users u on u.id = ft.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        left join forum_topic_tags ftt on ftt.topic_id = ft.id
        left join forum_tags tg on tg.id = ftt.tag_id
        where ${id != null ? 'ft.id = $1' : 'ft.slug = $1'}
          and ft.status in ('open', 'closed')
        group by ft.id, fs.slug, u.id, ap.user_id
        limit 1
        `,
        [id != null ? id : slug],
      );
      return forumTopicFromRow(rows[0]);
    },

    async createForumTopic({ sectionSlug, authorUserId, title, body, imageUrl, featuredMain }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const section = await client.query('select id from forum_sections where slug = $1 limit 1', [sectionSlug]);
        if (!section.rows[0]) throw new Error(`Unknown sectionSlug: ${sectionSlug}`);
        const slug = `${slugify(title)}-${Date.now()}`;
        const inserted = await client.query(
          `
          insert into forum_topics (section_id, author_user_id, title, slug, body, image_url, featured_main, last_post_at)
          values ($1, $2, $3, $4, $5, $6, $7, now())
          returning id
          `,
          [section.rows[0].id, authorUserId, title, slug, body, imageUrl ?? null, Boolean(featuredMain ?? false)],
        );
        await client.query('commit');
        return await this.getForumTopic({ id: inserted.rows[0].id });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async updateForumTopic({ topicId, authorUserId, canManageAll = false, canManageEditorial = false, sectionSlug, title, body, imageUrl, featuredMain }) {
      const normalizedSectionSlug = String(sectionSlug ?? '').trim();
      const normalizedTitle = String(title ?? '').trim();
      const normalizedBody = String(body ?? '').trim();
      if (!normalizedSectionSlug) throw new Error('sectionSlug is required');
      if (!normalizedTitle) throw new Error('title is required');
      if (!normalizedBody) throw new Error('body is required');

      const client = await pool.connect();
      try {
        await client.query('begin');
        const section = await client.query('select id from forum_sections where slug = $1 limit 1', [normalizedSectionSlug]);
        if (!section.rows[0]) throw new Error(`Unknown sectionSlug: ${normalizedSectionSlug}`);

        const assignments = [
          'section_id = $1',
          'title = $2',
          'body = $3',
          'updated_at = now()',
        ];
        const values = [section.rows[0].id, normalizedTitle, normalizedBody];
        if (imageUrl !== undefined) {
          values.push(imageUrl ?? null);
          assignments.push(`image_url = $${values.length}`);
        }
        if (featuredMain !== undefined) {
          values.push(Boolean(featuredMain));
          assignments.push(`featured_main = $${values.length}`);
        }
        values.push(topicId, canManageAll, canManageEditorial, authorUserId);
        const topicIdIdx = values.length - 3;
        const canManageAllIdx = values.length - 2;
        const canManageEditorialIdx = values.length - 1;
        const authorIdx = values.length;
        const { rows } = await client.query(
          `
          update forum_topics
          set ${assignments.join(',\n              ')}
          where id = $${topicIdIdx}
            and ($${canManageAllIdx}::boolean = true or $${canManageEditorialIdx}::boolean = true or author_user_id = $${authorIdx})
            and status in ('open', 'closed')
          returning id
          `,
          values,
        );
        if (!rows[0]) {
          throw new Error('Only the owner or an editor/admin can edit this topic');
        }
        await client.query('commit');
        return await this.getForumTopic({ id: topicId });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async softDeleteForumTopic({ topicId, authorUserId, canManageAll = false }) {
      const snapshot = await this.getForumTopic({ id: topicId });
      const client = await pool.connect();
      try {
        await client.query('begin');
        const updated = await client.query(
          `
          update forum_topics
          set status = 'archived',
              updated_at = now()
          where id = $1
            and ($2::boolean = true or author_user_id = $3)
            and status <> 'archived'
          returning id
          `,
          [topicId, canManageAll, authorUserId],
        );
        if (!updated.rows[0]) {
          throw new Error('Only the owner can delete this topic');
        }
        await client.query(
          `
          update forum_posts
          set status = 'deleted',
              updated_at = now()
          where topic_id = $1
            and status <> 'deleted'
          `,
          [topicId],
        );
        await client.query(
          `
          update forum_topics
          set replies_count = 0,
              last_post_at = created_at
          where id = $1
          `,
          [topicId],
        );
        await client.query('commit');
        return snapshot ? { ...snapshot, status: 'archived', repliesCount: 0 } : null;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async setForumTopicStatus({ topicId, status, canManageAll = false }) {
      if (!canManageAll) throw new Error('Only admin can change topic status');
      const client = await pool.connect();
      try {
        const updated = await client.query(
          `
          update forum_topics
          set status = $1,
              updated_at = now()
          where id = $2
            and status <> 'archived'
          returning id
          `,
          [status, topicId],
        );
        if (updated.rowCount === 0) throw new Error('Topic not found or already archived');
        return await this.getForumTopic({ id: topicId });
      } finally {
        client.release();
      }
    },

    async createForumPost({ topicId, authorUserId, body, parentPostId = null, imageUrl = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        if (parentPostId != null) {
          const parent = await client.query(
            `
            select id
            from forum_posts
            where id = $1 and topic_id = $2
            limit 1
            `,
            [parentPostId, topicId],
          );
          if (!parent.rows[0]) {
            throw new Error('Parent post not found in this topic');
          }
        }
        const topicRow = await client.query(
          `
          select author_user_id
          from forum_topics
          where id = $1
          limit 1
          `,
          [topicId],
        );
        const topicAuthorUserId = topicRow.rows[0]?.author_user_id ?? null;
        const inserted = await client.query(
          `
          insert into forum_posts (topic_id, author_user_id, parent_post_id, body, image_url)
          values ($1, $2, $3, $4, $5)
          returning *
          `,
          [topicId, authorUserId, parentPostId, body, normalizeOptionalText(imageUrl)],
        );
        await client.query(
          `update forum_topics set replies_count = replies_count + 1, last_post_at = now() where id = $1`,
          [topicId],
        );
        await awardRatingEvent({
          userId: authorUserId,
          eventType: 'forum-participation-halfyear',
          points: 10,
          eventKey: `forum-participation-halfyear:${authorUserId}:${buildHalfYearWindowKey()}`,
          meta: { topicId },
        }, client);
        if (topicAuthorUserId && String(topicAuthorUserId) !== String(authorUserId)) {
          await awardRatingEvent({
            userId: topicAuthorUserId,
            eventType: 'forum-message-received',
            points: 5,
            eventKey: `forum-message-received:${inserted.rows[0].id}:${topicAuthorUserId}`,
            meta: { topicId, postId: inserted.rows[0].id },
          }, client);
        }
        await client.query('commit');
        const post = inserted.rows[0];
        const author = await this.getAuthorByUserId(authorUserId);
        return forumPostFromRow({ ...post, author_id: author?.id, author_email: author?.email, author_login: author?.login, author_display_name: author?.displayName, author_bio: author?.bio, author_avatar_url: author?.avatarUrl, author_cover_image_url: author?.coverImageUrl, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_last_seen_at: author?.lastSeenAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async updateForumPost({ postId, authorUserId, canManageAll = false, body, imageUrl = null }) {
      const normalizedBody = String(body ?? '').trim();
      if (!normalizedBody) {
        throw new Error('body is required');
      }

      const { rows } = await pool.query(
        `
        update forum_posts
        set body = $1,
            image_url = $2,
            updated_at = now()
        where id = $3 and ($4::boolean = true or author_user_id = $5)
        returning *
        `,
        [normalizedBody, normalizeOptionalText(imageUrl), postId, canManageAll, authorUserId],
      );
      if (!rows[0]) {
        throw new Error('Only the owner can edit this message');
      }
      const author = await this.getAuthorByUserId(rows[0].author_user_id);
      return forumPostFromRow({ ...rows[0], author_id: author?.id, author_email: author?.email, author_login: author?.login, author_display_name: author?.displayName, author_bio: author?.bio, author_avatar_url: author?.avatarUrl, author_cover_image_url: author?.coverImageUrl, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_last_seen_at: author?.lastSeenAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt });
    },

    async softDeleteForumPost({ postId, authorUserId, canManageAll = false }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const target = await client.query(
          `
          select *
          from forum_posts
          where id = $1
          limit 1
          `,
          [postId],
        );
        const row = target.rows[0];
        if (!row) {
          throw new Error('Message not found');
        }
        if (!canManageAll && String(row.author_user_id) !== String(authorUserId)) {
          throw new Error('Only the owner can delete this message');
        }
        await client.query(
          `
          with recursive subtree as (
            select id
            from forum_posts
            where id = $1
            union all
            select fp.id
            from forum_posts fp
            join subtree s on s.id = fp.parent_post_id
          )
          update forum_posts
          set status = 'deleted',
              body = 'УДАЛЕНО',
              image_url = null,
              updated_at = now()
          where id in (select id from subtree)
            and status <> 'deleted'
          `,
          [postId],
        );
        await client.query(
          `
          update forum_topics ft
          set replies_count = coalesce(stats.cnt, 0),
              last_post_at = coalesce(stats.last_post_at, ft.created_at)
          from (
            select topic_id, count(*)::int as cnt, max(created_at) as last_post_at
            from forum_posts
            where topic_id = $1 and status = 'visible'
            group by topic_id
          ) stats
          where ft.id = $1 and ft.id = stats.topic_id
          `,
          [row.topic_id],
        );
        await client.query(
          `
          update forum_topics
          set replies_count = 0,
              last_post_at = created_at
          where id = $1
            and not exists (select 1 from forum_posts where topic_id = $1 and status = 'visible')
          `,
          [row.topic_id],
        );
        await client.query('commit');
        const author = await this.getAuthorByUserId(row.author_user_id);
        return forumPostFromRow({ ...row, body: 'УДАЛЕНО', image_url: null, status: 'deleted', author_id: author?.id, author_email: author?.email, author_login: author?.login, author_display_name: author?.displayName, author_bio: author?.bio, author_avatar_url: author?.avatarUrl, author_cover_image_url: author?.coverImageUrl, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_last_seen_at: author?.lastSeenAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async incrementForumTopicViews({ topicId }) {
      const { rows } = await pool.query(
        `
        update forum_topics
        set views_count = coalesce(views_count, 0) + 1,
            updated_at = now()
        where id = $1
          and status in ('open', 'closed')
        returning id
        `,
        [topicId],
      );
      if (!rows[0]) return null;
      return this.getForumTopic({ id: topicId });
    },

    async listForumPosts(topicId) {
      const { rows } = await pool.query(
        `
        select fp.*, u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at, u.last_seen_at as author_last_seen_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.avatar_url as author_avatar_url, ap.cover_image_url as author_cover_image_url, ap.cover_image_position_x as author_cover_image_position_x, ap.cover_image_position_y as author_cover_image_position_y, ap.cover_image_scale as author_cover_image_scale, ap.city as author_city,
               ap.website_url as author_website_url, ap.birth_date as author_birth_date, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_memorial_page as author_is_memorial_page,
               ap.is_featured as author_is_featured
        from forum_posts fp
        join users u on u.id = fp.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        where fp.topic_id = $1
          and fp.status = 'visible'
        order by fp.created_at asc
        `,
        [topicId],
      );
      return rows.map(forumPostFromRow);
    },

    async getAuthorProfileLinks(userId) {
      return listAuthorProfileLinks(userId, pool);
    },

    async listUserRatingEvents({ userId, limit = 50 } = {}) {
      if (!userId) return [];
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select id, user_id, event_type, event_key, points, meta, created_at
        from author_rating_events
        where user_id = $1
        order by created_at desc, id desc
        limit $2
        `,
        [userId, page.limit],
      );
      return rows.map(ratingEventFromRow);
    },

    async listUserPeachTransactions({ userId, limit = 50 } = {}) {
      if (!userId) return [];
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select id, amount, kind, note, created_at
        from peach_transactions
        where user_id = $1
        order by created_at desc, id desc
        limit $2
        `,
        [userId, page.limit],
      );
      return rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        kind: row.kind,
        note: row.note ?? null,
        createdAt: toIsoDate(row.created_at),
      }));
    },

    async listGrantedPeachTransactions({ userId, limit = 100 } = {}) {
      if (!userId) return [];
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select id, amount, kind, note, created_at, user_id as target_user_id
        from peach_transactions
        where created_by_user_id = $1
        order by created_at desc, id desc
        limit $2
        `,
        [userId, page.limit],
      );
      return rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        kind: row.kind,
        note: row.note ?? null,
        createdAt: toIsoDate(row.created_at),
        targetUserId: row.target_user_id ?? null,
      }));
    },

    async updateAuthorPageFlags({ authorId, isClassic = false, isMemorialPage = false, isChild = false }) {
      await pool.query(
        `
        update author_profiles
        set is_classic = $1,
            is_memorial_page = $2,
            is_child = $3,
            updated_at = now()
        where user_id = $4
        `,
        [Boolean(isClassic), Boolean(isMemorialPage), Boolean(isChild), authorId],
      );
      return this.getAuthor({ id: authorId });
    },

    async grantPeachesByLogin({ login, amount, note = null, grantedByUserId = null }) {
      const normalizedLogin = String(login ?? '').trim();
      if (!normalizedLogin) throw new Error('login is required');
      const normalizedAmount = normalizePositiveInteger(amount);
      const client = await pool.connect();
      try {
        await client.query('begin');
        const userRow = await client.query(
          `
          select id
          from users
          where login = $1
            and status <> 'deleted'
          limit 1
          `,
          [normalizedLogin],
        );
        const targetUserId = userRow.rows[0]?.id ?? null;
        if (!targetUserId) throw new Error('Пользователь не найден.');
        await applyPeachDelta({
          userId: targetUserId,
          amount: normalizedAmount,
          kind: 'admin-grant',
          note: note || 'Начисление от администратора',
          meta: { login: normalizedLogin },
          createdByUserId: grantedByUserId,
        }, client);
        await client.query('commit');
        return this.getUserById(targetUserId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async purchaseAudioUploadPack({ userId }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await applyPeachDelta({
          userId,
          amount: -100,
          kind: 'audio-pack-purchase',
          note: 'Пакет на 20 загрузок аудио',
          meta: { slots: 20 },
          requireSufficientBalance: true,
        }, client);
        await client.query(
          `
          update author_profiles
          set audio_upload_slots = audio_upload_slots + 20,
              updated_at = now()
          where user_id = $1
          `,
          [userId],
        );
        await client.query('commit');
        return this.getUserById(userId);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async createAuthorReviewRequest({ requesterUserId, workId = null, title, message = null }) {
      const normalizedTitle = String(title ?? '').trim();
      if (!normalizedTitle) throw new Error('title is required');
      const client = await pool.connect();
      try {
        await client.query('begin');
        await applyPeachDelta({
          userId: requesterUserId,
          amount: -100,
          kind: 'admin-review-request',
          note: normalizedTitle,
          meta: { workId: workId || null },
          requireSufficientBalance: true,
        }, client);
        const { rows } = await client.query(
          `
          insert into author_review_requests (requester_user_id, work_id, title, message, cost_peaches)
          values ($1, $2, $3, $4, 100)
          returning *
          `,
          [requesterUserId, workId || null, normalizedTitle, normalizeOptionalText(message)],
        );
        await client.query('commit');
        const row = rows[0];
        return {
          id: row.id,
          requesterUserId: row.requester_user_id,
          workId: row.work_id,
          title: row.title,
          message: row.message,
          status: row.status,
          costPeaches: Number(row.cost_peaches ?? 100),
          createdAt: toIsoDate(row.created_at),
          updatedAt: toIsoDate(row.updated_at),
        };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listManagedAuthorAccounts({ ownerUserId, limit = 100 } = {}) {
      const page = buildLimitOffset(limit, 0);
      const params = [];
      let ownerClause = '';
      if (ownerUserId) {
        params.push(ownerUserId);
        ownerClause = `maa.owner_user_id = $${params.length} and `;
      }
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from managed_author_accounts maa
        join users u on u.id = maa.managed_user_id
        left join author_profiles ap on ap.user_id = u.id
        where ${ownerClause}u.status <> 'deleted'
        order by maa.created_at desc, maa.managed_user_id desc
        limit $${params.length + 1}
        `,
        [...params, page.limit],
      );
      return rows.map(authorFromRow);
    },

    async getManagedAuthorAccount({ ownerUserId = null, managedUserId }) {
      if (!managedUserId) return null;
      const params = [];
      let ownerClause = '';
      if (ownerUserId) {
        params.push(ownerUserId);
        ownerClause = `maa.owner_user_id = $${params.length} and `;
      }
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.last_seen_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.avatar_url, ap.cover_image_url, ap.cover_image_position_x, ap.cover_image_position_y, ap.cover_image_scale, ap.city, ap.website_url, ap.birth_date, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured, ap.is_memorial_page, ap.is_child, ap.peach_balance, ap.audio_upload_slots
        from managed_author_accounts maa
        join users u on u.id = maa.managed_user_id
        left join author_profiles ap on ap.user_id = u.id
        where ${ownerClause}maa.managed_user_id = $${params.length + 1}
        limit 1
        `,
        [...params, managedUserId],
      );
      return rows.map(authorFromRow)[0] ?? null;
    },

    async createManagedAuthorAccount({ ownerUserId, login, displayName, bio = null, city = null, birthDate = null, websiteUrl = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const allocatedLogin = await buildUniqueLogin(client, normalizeLoginCandidate(login, 'author'));
        const email = buildManagedAuthorEmail(allocatedLogin);
        const insertedUser = await client.query(
          `
          insert into users (email, login, password_hash, role, status)
          values ($1, $2, $3, 'author', 'active')
          returning id
          `,
          [email, allocatedLogin, `managed:${Date.now()}:${allocatedLogin}`],
        );
        const managedUserId = insertedUser.rows[0].id;
        await client.query(
          `
          insert into author_profiles (user_id, display_name, bio, city, website_url, birth_date)
          values ($1, $2, $3, $4, $5, $6)
          `,
          [managedUserId, displayName, normalizeOptionalText(bio), normalizeOptionalText(city), normalizeOptionalText(websiteUrl), normalizeOptionalDate(birthDate)],
        );
        await client.query(
          `
          insert into managed_author_accounts (managed_user_id, owner_user_id)
          values ($1, $2)
          `,
          [managedUserId, ownerUserId],
        );
        await client.query('commit');
        return this.getManagedAuthorAccount({ ownerUserId, managedUserId });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async countUnreadDirectMessages({ userId } = {}) {
      if (!userId) return 0;
      const { rows } = await pool.query(
        "select count(*)::int as count from private_messages where recipient_user_id = $1 and read_at is null and status = 'visible'",
        [userId],
      );
      return Number(rows[0]?.count ?? 0);
    },
    async listPrivateDialogs({ userId, limit = 50 } = {}) {
      if (!userId) return [];
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        with dialog_base as (
          select
            case when pm.sender_user_id = $1 then pm.recipient_user_id else pm.sender_user_id end as peer_user_id,
            max(pm.created_at) as last_message_at,
            count(*) filter (where pm.recipient_user_id = $1 and pm.read_at is null and pm.status = 'visible')::int as unread_count
          from private_messages pm
          where pm.status = 'visible'
            and (pm.sender_user_id = $1 or pm.recipient_user_id = $1)
          group by 1
        )
        select db.peer_user_id, db.last_message_at, db.unread_count,
               lm.body as last_message_body,
               u.id as peer_id, u.email as peer_email, u.login as peer_login, u.registered_at as peer_registered_at, u.last_seen_at as peer_last_seen_at,
               u.created_at as peer_created_at, u.updated_at as peer_updated_at,
               ap.display_name as peer_display_name, ap.bio as peer_bio, ap.avatar_url as peer_avatar_url,
               ap.cover_image_url as peer_cover_image_url, ap.cover_image_position_x as peer_cover_image_position_x, ap.cover_image_position_y as peer_cover_image_position_y, ap.cover_image_scale as peer_cover_image_scale, ap.city as peer_city, ap.website_url as peer_website_url,
               ap.birth_date as peer_birth_date, ap.rating_total as peer_rating_total, ap.works_count_cached as peer_works_count_cached,
               ap.is_classic as peer_is_classic, ap.is_featured as peer_is_featured
        from dialog_base db
        join users u on u.id = db.peer_user_id
        left join author_profiles ap on ap.user_id = u.id
        left join lateral (
          select pm.body
          from private_messages pm
          where pm.status = 'visible'
            and ((pm.sender_user_id = $1 and pm.recipient_user_id = db.peer_user_id)
              or (pm.sender_user_id = db.peer_user_id and pm.recipient_user_id = $1))
          order by pm.created_at desc, pm.id desc
          limit 1
        ) lm on true
        where u.status <> 'deleted'
        order by db.last_message_at desc
        limit $2
        `,
        [userId, page.limit],
      );
      return rows.map(privateDialogFromRow);
    },

    async listPrivateMessages({ userId, withUserId = null, withLogin = null, limit = 100 } = {}) {
      if (!userId) return [];
      let peerUserId = withUserId;
      if (!peerUserId && withLogin) {
        const peer = await this.getAuthor({ login: withLogin });
        peerUserId = peer?.id ?? null;
      }
      if (!peerUserId) return [];
      const page = buildLimitOffset(limit, 0);
      const { rows } = await pool.query(
        `
        select pm.*,
               su.id as sender_id, su.email as sender_email, su.login as sender_login, su.registered_at as sender_registered_at, su.last_seen_at as sender_last_seen_at,
               su.created_at as sender_created_at, su.updated_at as sender_updated_at,
               sap.display_name as sender_display_name, sap.bio as sender_bio, sap.avatar_url as sender_avatar_url,
               sap.cover_image_url as sender_cover_image_url, sap.cover_image_position_x as sender_cover_image_position_x, sap.cover_image_position_y as sender_cover_image_position_y, sap.cover_image_scale as sender_cover_image_scale, sap.city as sender_city, sap.website_url as sender_website_url, sap.birth_date as sender_birth_date,
               sap.rating_total as sender_rating_total, sap.works_count_cached as sender_works_count_cached, sap.is_classic as sender_is_classic, sap.is_featured as sender_is_featured,
               ru.id as recipient_id, ru.email as recipient_email, ru.login as recipient_login, ru.registered_at as recipient_registered_at, ru.last_seen_at as recipient_last_seen_at,
               ru.created_at as recipient_created_at, ru.updated_at as recipient_updated_at,
               rap.display_name as recipient_display_name, rap.bio as recipient_bio, rap.avatar_url as recipient_avatar_url,
               rap.cover_image_url as recipient_cover_image_url, rap.cover_image_position_x as recipient_cover_image_position_x, rap.cover_image_position_y as recipient_cover_image_position_y, rap.cover_image_scale as recipient_cover_image_scale, rap.city as recipient_city, rap.website_url as recipient_website_url, rap.birth_date as recipient_birth_date,
               rap.rating_total as recipient_rating_total, rap.works_count_cached as recipient_works_count_cached, rap.is_classic as recipient_is_classic, rap.is_featured as recipient_is_featured
        from private_messages pm
        join users su on su.id = pm.sender_user_id
        left join author_profiles sap on sap.user_id = su.id
        join users ru on ru.id = pm.recipient_user_id
        left join author_profiles rap on rap.user_id = ru.id
        where pm.status = 'visible'
          and ((pm.sender_user_id = $1 and pm.recipient_user_id = $2)
            or (pm.sender_user_id = $2 and pm.recipient_user_id = $1))
        order by pm.created_at asc, pm.id asc
        limit $3
        `,
        [userId, peerUserId, page.limit],
      );
      return rows.map(privateMessageFromRow);
    },

    async sendPrivateMessage({ senderUserId, recipientUserId = null, recipientLogin = null, body }) {
      const normalizedBody = String(body ?? '').trim();
      if (!normalizedBody) throw new Error('body is required');
      let resolvedRecipientUserId = recipientUserId;
      if (!resolvedRecipientUserId && recipientLogin) {
        const peer = await this.getAuthor({ login: recipientLogin });
        resolvedRecipientUserId = peer?.id ?? null;
      }
      if (!resolvedRecipientUserId) throw new Error('Получатель не найден');
      if (String(resolvedRecipientUserId) == String(senderUserId)) throw new Error('Нельзя отправить личное сообщение самой себе.');
      const recipientUser = await this.getUserById(resolvedRecipientUserId);
      if (!recipientUser || recipientUser.status === 'deleted') throw new Error('Получатель недоступен.');
      if (!await this.canReceivePrivateMessages(resolvedRecipientUserId)) {
        throw new Error('Личные сообщения недоступны для этой авторской страницы.');
      }
      const { rows } = await pool.query(
        `
        insert into private_messages (sender_user_id, recipient_user_id, body)
        values ($1, $2, $3)
        returning id
        `,
        [senderUserId, resolvedRecipientUserId, normalizedBody],
      );
      const messages = await this.listPrivateMessages({ userId: senderUserId, withUserId: resolvedRecipientUserId, limit: 1 });
      return messages[messages.length - 1] ?? null;
    },

    async canReceivePrivateMessages(userId) {
      if (!userId) return false;
      const { rows } = await pool.query(
        `
        select u.status,
               coalesce(ap.is_classic, false) as is_classic,
               coalesce(ap.is_memorial_page, false) as is_memorial_page,
               coalesce(ap.can_receive_private_messages, true) as can_receive_private_messages
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where u.id = $1
        limit 1
        `,
        [userId],
      );
      const recipient = rows[0];
      return Boolean(recipient)
        && recipient.status !== 'deleted'
        && !recipient.is_classic
        && !recipient.is_memorial_page
        && recipient.can_receive_private_messages;
    },

    async markPrivateMessagesRead({ userId, withUserId = null, withLogin = null }) {
      if (!userId) return 0;
      let peerUserId = withUserId;
      if (!peerUserId && withLogin) {
        const peer = await this.getAuthor({ login: withLogin });
        peerUserId = peer?.id ?? null;
      }
      if (!peerUserId) return 0;
      const { rowCount } = await pool.query(
        `
        update private_messages
        set read_at = now(),
            updated_at = now()
        where sender_user_id = $1
          and recipient_user_id = $2
          and status = 'visible'
          and read_at is null
        `,
        [peerUserId, userId],
      );
      return rowCount;
    },

    async listContests({ status = null, scope = null, limit = 20, offset = 0 } = {}) {
      const page = buildLimitOffset(limit, offset);
      const conditions = [];
      const params = [];
      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }
      if (scope) {
        params.push(scope);
        conditions.push(`contest_scope = $${params.length}`);
      }
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select *
        from contests
        ${where}
        order by starts_at desc nulls last, created_at desc
        limit $${params.length - 1} offset $${params.length}
        `,
        params,
      );
      return rows.map(contestFromRow);
    },

    async createRadioTrack({ title, authorName = null, durationSeconds = null, audioUrl, sourceUrl = null, workId = null, creatorUserId = null }) {
      const normalizedTitle = String(title ?? '').trim();
      if (!normalizedTitle) {
        throw new Error('title is required');
      }

      const normalizedAudioUrl = normalizeOptionalText(audioUrl);
      if (!normalizedAudioUrl) {
        throw new Error('audioUrl is required');
      }

      const normalizedDuration = durationSeconds == null || durationSeconds === ''
        ? null
        : Math.max(0, Number.parseInt(durationSeconds, 10) || 0);

      const client = await pool.connect();
      try {
        await client.query('begin');
        if (creatorUserId) {
          const quota = await client.query(
            `
            update author_profiles
            set audio_upload_slots = audio_upload_slots - 1,
                updated_at = now()
            where user_id = $1
              and audio_upload_slots > 0
            returning audio_upload_slots
            `,
            [creatorUserId],
          );
          if (!quota.rows[0]) {
            throw new Error('Для загрузки аудио сначала купи пакет за 100 персиков. Он даёт 20 загрузок.');
          }
        }
        const { rows } = await client.query(
          `
          insert into radio_tracks (
            title,
            author_name,
            work_id,
            duration_seconds,
            audio_url,
            source_url,
            creator_user_id
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning *
          `,
          [
            normalizedTitle,
            normalizeOptionalText(authorName),
            workId || null,
            normalizedDuration,
            normalizedAudioUrl,
            normalizeOptionalText(sourceUrl),
            creatorUserId || null,
          ],
        );
        await client.query('commit');
        return radioTrackFromRow(rows[0]);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async updateRadioTrack({ id, title, authorName, canManageAll, requestingUserId }) {
      const { rows: existing } = await pool.query('select * from radio_tracks where id = $1', [id]);
      if (!existing[0]) throw new Error('Track not found');
      const track = radioTrackFromRow(existing[0]);
      if (!canManageAll && String(track.creatorUserId) !== String(requestingUserId)) {
        throw new Error('Only the track author or the owner can edit this track.');
      }
      const nextTitle = title != null ? String(title).trim() : track.title;
      if (!nextTitle) throw new Error('Title cannot be empty.');
      const nextAuthor = authorName != null ? normalizeOptionalText(authorName) : track.authorName;
      const { rows } = await pool.query(
        'update radio_tracks set title = $1, author_name = $2, updated_at = now() where id = $3 returning *',
        [nextTitle, nextAuthor, id],
      );
      return radioTrackFromRow(rows[0]);
    },

    async deleteRadioTrack({ id, canManageAll, requestingUserId }) {
      const { rows: existing } = await pool.query('select * from radio_tracks where id = $1', [id]);
      if (!existing[0]) throw new Error('Track not found');
      const track = radioTrackFromRow(existing[0]);
      if (!canManageAll && String(track.creatorUserId) !== String(requestingUserId)) {
        throw new Error('Only the track author or the owner can delete this track.');
      }
      const { rows } = await pool.query('delete from radio_tracks where id = $1 returning *', [id]);
      return radioTrackFromRow(rows[0]);
    },

    async listRadioTracksByCreator({ creatorUserId, limit = 50, offset = 0 } = {}) {
      const page = buildLimitOffset(limit, offset);
      const { rows } = await pool.query(
        `
        select rt.*,
               coalesce(avg(rtr.rating), 0)::numeric(4,2) as average_rating,
               count(rtr.id)::int as ratings_count
        from radio_tracks rt
        left join radio_track_ratings rtr on rtr.track_id = rt.id
        where rt.creator_user_id = $1
        group by rt.id
        order by rt.created_at desc
        limit $2 offset $3
        `,
        [creatorUserId, page.limit, page.offset],
      );
      return rows.map(radioTrackFromRow);
    },

    async upsertSiteSetting({ key, value }) {
      const { rows } = await pool.query(
        'insert into site_settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value returning *',
        [key, value],
      );
      return rows[0];
    },

    async listSiteSettings() {
      const { rows } = await pool.query('select key, value from site_settings order by key');
      return rows;
    },

    async listRadioTracks({ limit = 20, offset = 0 } = {}) {
      const page = buildLimitOffset(limit, offset);
      const { rows } = await pool.query(
        `
        select rt.*,
               coalesce(avg(rtr.rating), 0)::numeric(4,2) as average_rating,
               count(rtr.id)::int as ratings_count
        from radio_tracks rt
        left join radio_track_ratings rtr on rtr.track_id = rt.id
        group by rt.id
        order by rt.created_at desc
        limit $1 offset $2
        `,
        [page.limit, page.offset],
      );
      return rows.map(radioTrackFromRow);
    },
  };
}
