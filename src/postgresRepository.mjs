function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || `item-${Date.now()}`;
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
    registeredAt: row.registered_at?.toISOString?.() ?? row.registered_at,
    lastLoginAt: row.last_login_at?.toISOString?.() ?? row.last_login_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    profile: row.display_name == null ? null : {
      displayName: row.display_name,
      bio: row.bio,
      city: row.city,
      websiteUrl: row.website_url,
      ratingTotal: Number(row.rating_total ?? 0),
      worksCountCached: Number(row.works_count_cached ?? 0),
      isClassic: Boolean(row.is_classic),
      isFeatured: Boolean(row.is_featured),
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
    city: row.city,
    websiteUrl: row.website_url,
    ratingTotal: Number(row.rating_total ?? 0),
    worksCountCached: Number(row.works_count_cached ?? 0),
    isClassic: Boolean(row.is_classic),
    isFeatured: Boolean(row.is_featured),
    registeredAt: row.registered_at?.toISOString?.() ?? row.registered_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
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
    commentsCount: Number(row.comments_count ?? 0),
    ratingsCount: Number(row.ratings_count ?? 0),
    averageRating: Number(row.average_rating ?? 0),
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
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
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
    status: row.status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    author: row.author_login ? {
      id: row.author_id ?? row.user_id,
      email: row.author_email,
      login: row.author_login,
      displayName: row.author_display_name,
      bio: row.author_bio,
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
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
    viewsCount: Number(row.views_count ?? 0),
    status: row.status,
    isPinned: Boolean(row.is_pinned),
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
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
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
    status: row.status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    author: row.author_login ? {
      id: row.author_id ?? row.author_user_id,
      email: row.author_email,
      login: row.author_login,
      displayName: row.author_display_name,
      bio: row.author_bio,
      city: row.author_city,
      websiteUrl: row.author_website_url,
      ratingTotal: Number(row.author_rating_total ?? 0),
      worksCountCached: Number(row.author_works_count_cached ?? 0),
      isClassic: Boolean(row.author_is_classic),
      isFeatured: Boolean(row.author_is_featured),
      registeredAt: row.author_registered_at?.toISOString?.() ?? row.author_registered_at,
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

function buildLimitOffset(limit = 20, offset = 0) {
  return { limit: Math.min(Math.max(Number(limit) || 20, 1), 100), offset: Math.max(Number(offset) || 0, 0) };
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
        select u.*, ap.display_name, ap.bio, ap.city, ap.website_url, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured
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
        select u.*, ap.display_name, ap.bio, ap.city, ap.website_url, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where u.email = $1 or u.login = $1
        limit 1
        `,
        [identifier],
      );
      return userFromRow(rows[0]);
    },

    async createUser({ email, login, passwordHash, displayName }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const inserted = await client.query(
          `
          insert into users (email, login, password_hash)
          values ($1, $2, $3)
          returning id
          `,
          [email, login, passwordHash],
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
        select u.*, ap.display_name, ap.bio, ap.city, ap.website_url, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured
        from users u
        left join author_profiles ap on ap.user_id = u.id
        where u.id = $1
        limit 1
        `,
        [id],
      );
      return userFromRow(rows[0]);
    },

    async getAuthorByUserId(userId) {
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.city, ap.website_url, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured
        from users u
        join author_profiles ap on ap.user_id = u.id
        where u.id = $1
        limit 1
        `,
        [userId],
      );
      return authorFromRow(rows[0]);
    },

    async listAuthors({ limit = 20, offset = 0, search = null, classicsOnly = false, featuredOnly = false } = {}) {
      const page = buildLimitOffset(limit, offset);
      const conditions = [];
      const params = [];
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(u.login ilike $${params.length} or u.email::text ilike $${params.length} or ap.display_name ilike $${params.length})`);
      }
      if (classicsOnly) conditions.push('ap.is_classic = true');
      if (featuredOnly) conditions.push('ap.is_featured = true');
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.city, ap.website_url, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured
        from users u
        join author_profiles ap on ap.user_id = u.id
        ${where}
        order by ap.rating_total desc, u.registered_at desc
        limit $${params.length - 1} offset $${params.length}
        `,
        params,
      );
      return rows.map(authorFromRow);
    },

    async getAuthor({ id = null, login = null } = {}) {
      const field = id != null ? 'u.id = $1' : 'u.login = $1';
      const value = id != null ? id : login;
      const { rows } = await pool.query(
        `
        select u.id, u.email, u.login, u.registered_at, u.created_at, u.updated_at,
               ap.display_name, ap.bio, ap.city, ap.website_url, ap.rating_total, ap.works_count_cached, ap.is_classic, ap.is_featured
        from users u
        join author_profiles ap on ap.user_id = u.id
        where ${field}
        limit 1
        `,
        [value],
      );
      return authorFromRow(rows[0]);
    },

    async listWorks({ limit = 20, offset = 0, sectionCode = null, genreSlug = null, authorId = null, search = null, status = 'published' } = {}) {
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
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select w.*, ws.code as section_code, wg.slug as genre_slug,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
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
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
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
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
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

    async createWork({ authorUserId, sectionCode, genreSlug = null, title, summary = null, body = null, excerpt = null, status = 'published', projectFormat = null }) {
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
          insert into works (author_user_id, section_id, genre_id, title, slug, summary, body, excerpt, status, project_format, published_at)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          returning id
          `,
          [authorUserId, section.rows[0].id, genreId, title, slug, summary, body, excerpt, status, projectFormat, publishedAt],
        );
        await client.query(
          'update author_profiles set works_count_cached = (select count(*) from works where author_user_id = $1) where user_id = $1',
          [authorUserId],
        );
        await client.query('commit');
        return await this.getWorkById(inserted.rows[0].id);
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

    async addWorkComment({ workId, userId, body, parentCommentId = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const inserted = await client.query(
          `
          insert into work_comments (work_id, user_id, parent_comment_id, body)
          values ($1, $2, $3, $4)
          returning *
          `,
          [workId, userId, parentCommentId, body],
        );
        await client.query('update works set comments_count = comments_count + 1 where id = $1', [workId]);
        await client.query('commit');
        const comment = inserted.rows[0];
        const author = await this.getAuthorByUserId(userId);
        return workCommentFromRow({ ...comment, author_login: author?.login, author_email: author?.email, author_display_name: author?.displayName, author_bio: author?.bio, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt, author_id: author?.id });
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
        select wc.*, u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_featured as author_is_featured
        from work_comments wc
        join users u on u.id = wc.user_id
        left join author_profiles ap on ap.user_id = u.id
        where wc.work_id = $1
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

    async listForumTopics({ sectionSlug = null, tag = null, limit = 20, offset = 0 } = {}) {
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
      params.push(page.limit, page.offset);
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await pool.query(
        `
        select ft.*, fs.slug as section_slug,
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_featured as author_is_featured,
               array_remove(array_agg(distinct tg.name), null) as tags
        from forum_topics ft
        join forum_sections fs on fs.id = ft.section_id
        join users u on u.id = ft.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        left join forum_topic_tags ftt on ftt.topic_id = ft.id
        left join forum_tags tg on tg.id = ftt.tag_id
        ${where}
        group by ft.id, fs.slug, u.id, ap.user_id
        order by ft.is_pinned desc, coalesce(ft.last_post_at, ft.created_at) desc
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
               u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_featured as author_is_featured,
               array_remove(array_agg(distinct tg.name), null) as tags
        from forum_topics ft
        join forum_sections fs on fs.id = ft.section_id
        join users u on u.id = ft.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        left join forum_topic_tags ftt on ftt.topic_id = ft.id
        left join forum_tags tg on tg.id = ftt.tag_id
        where ${id != null ? 'ft.id = $1' : 'ft.slug = $1'}
        group by ft.id, fs.slug, u.id, ap.user_id
        limit 1
        `,
        [id != null ? id : slug],
      );
      return forumTopicFromRow(rows[0]);
    },

    async createForumTopic({ sectionSlug, authorUserId, title, body }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const section = await client.query('select id from forum_sections where slug = $1 limit 1', [sectionSlug]);
        if (!section.rows[0]) throw new Error(`Unknown sectionSlug: ${sectionSlug}`);
        const slug = `${slugify(title)}-${Date.now()}`;
        const inserted = await client.query(
          `
          insert into forum_topics (section_id, author_user_id, title, slug, body, last_post_at)
          values ($1, $2, $3, $4, $5, now())
          returning id
          `,
          [section.rows[0].id, authorUserId, title, slug, body],
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

    async createForumPost({ topicId, authorUserId, body, parentPostId = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const inserted = await client.query(
          `
          insert into forum_posts (topic_id, author_user_id, parent_post_id, body)
          values ($1, $2, $3, $4)
          returning *
          `,
          [topicId, authorUserId, parentPostId, body],
        );
        await client.query(
          `update forum_topics set replies_count = replies_count + 1, last_post_at = now() where id = $1`,
          [topicId],
        );
        await client.query('commit');
        const post = inserted.rows[0];
        const author = await this.getAuthorByUserId(authorUserId);
        return forumPostFromRow({ ...post, author_id: author?.id, author_email: author?.email, author_login: author?.login, author_display_name: author?.displayName, author_bio: author?.bio, author_city: author?.city, author_website_url: author?.websiteUrl, author_rating_total: author?.ratingTotal, author_works_count_cached: author?.worksCountCached, author_is_classic: author?.isClassic, author_is_featured: author?.isFeatured, author_registered_at: author?.registeredAt, author_created_at: author?.createdAt, author_updated_at: author?.updatedAt });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listForumPosts(topicId) {
      const { rows } = await pool.query(
        `
        select fp.*, u.id as author_id, u.email as author_email, u.login as author_login, u.registered_at as author_registered_at,
               u.created_at as author_created_at, u.updated_at as author_updated_at,
               ap.display_name as author_display_name, ap.bio as author_bio, ap.city as author_city,
               ap.website_url as author_website_url, ap.rating_total as author_rating_total,
               ap.works_count_cached as author_works_count_cached, ap.is_classic as author_is_classic,
               ap.is_featured as author_is_featured
        from forum_posts fp
        join users u on u.id = fp.author_user_id
        left join author_profiles ap on ap.user_id = u.id
        where fp.topic_id = $1
        order by fp.created_at asc
        `,
        [topicId],
      );
      return rows.map(forumPostFromRow);
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
