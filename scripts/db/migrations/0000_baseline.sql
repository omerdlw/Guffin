SET LOCAL check_function_bodies = false;

SET LOCAL client_min_messages = warning;

SELECT pg_catalog.set_config('search_path', '', true);

-- Roles. The application connects as the database owner and, for every
-- request made on someone's behalf, switches into one of these two roles for
-- the length of a transaction (see src/lib/db/client.ts). Grants and row level
-- security are written against them; the owner itself is used only by the auth
-- library, seeds and maintenance jobs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

GRANT anon, authenticated TO CURRENT_USER;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE DOMAIN public.http_url AS text
	CONSTRAINT http_url_check CHECK (((char_length(VALUE) <= 2048) AND (VALUE ~ '^https?://[^[:space:]]+$'::text)));

CREATE DOMAIN public.tmdb_path AS text
	CONSTRAINT tmdb_path_check CHECK ((VALUE ~ '^/[A-Za-z0-9._-]{1,200}$'::text));

-- Guffin is a film diary: every title in this schema is a TMDB movie id.

CREATE FUNCTION private.account_diary_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'INSERT' then
    perform set_config('app.implied_watch', 'on', true);
    insert into public.account_watched as w (
      account_id, tmdb_id, title, poster_path, backdrop_path, release_date,
      first_watched_at, last_watched_at
    )
    values (
      NEW.account_id, NEW.tmdb_id, NEW.title, NEW.poster_path, NEW.backdrop_path, NEW.release_date,
      NEW.watched_at, NEW.watched_at
    )
    on conflict (account_id, tmdb_id) do update
    set last_watched_at = greatest(w.last_watched_at, excluded.last_watched_at);
    perform set_config('app.implied_watch', '', true);

    delete from public.account_watchlist
    where account_id = NEW.account_id and tmdb_id = NEW.tmdb_id;

    perform private.record_activity(
      NEW.account_id,
      case when NEW.is_rewatch then 'WATCH_DIARY_REWATCHED' else 'WATCH_DIARY_LOGGED' end,
      'diary:' || NEW.id,
      NEW.tmdb_id, null, null,
      jsonb_build_object(
        'title', NEW.title,
        'poster_path', NEW.poster_path,
        'release_date', NEW.release_date,
        'watched_on', NEW.watched_on,
        'is_rewatch', NEW.is_rewatch
      )
    );
  else
    perform private.remove_activity(OLD.account_id, 'diary:' || OLD.id);
    perform private.restore_watched_activity(OLD.account_id, OLD.tmdb_id);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.account_diary_before_write() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_latest date;
begin
  if TG_OP = 'UPDATE' then
    if NEW.account_id <> OLD.account_id or NEW.tmdb_id <> OLD.tmdb_id then
      raise exception 'A diary entry cannot be moved to another title' using errcode = '42501';
    end if;
    NEW.updated_at := now();
    if NEW.watched_on = OLD.watched_on then
      return NEW;
    end if;
  end if;

  if NEW.watched_on > current_date + 1 then
    raise exception 'DIARY_DATE_IN_FUTURE' using errcode = '22023';
  end if;

  if TG_OP = 'INSERT' then
    select max(d.watched_on) into v_latest
    from public.account_diary d
    where d.account_id = NEW.account_id
      and d.tmdb_id = NEW.tmdb_id;

    if v_latest is not null then
      if NEW.watched_on < v_latest then
        raise exception 'DIARY_DATE_BEFORE_LATEST_ENTRY' using errcode = '22023';
      end if;
      NEW.is_rewatch := true;
    end if;
  end if;

  return NEW;
end;
$$;

CREATE FUNCTION private.account_follows_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_old_status text := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END;
  v_new_status text := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END;
  v_follower   uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.follower_id ELSE NEW.follower_id END;
  v_following  uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.following_id ELSE NEW.following_id END;
  v_request_key  text := 'follow-request:' || v_follower::text;
  v_follower_key text := 'new-follower:' || v_follower::text;
  v_accepted_key text := 'follow-accepted:' || v_following::text;
BEGIN
  IF v_old_status IS NOT DISTINCT FROM v_new_status THEN
    RETURN NULL;
  END IF;

  -- counters
  IF v_new_status = 'accepted' THEN
    PERFORM private.adjust_stat(v_following, 'followers_count', 1);
    PERFORM private.adjust_stat(v_follower, 'following_count', 1);
  END IF;
  IF v_old_status = 'accepted' THEN
    PERFORM private.adjust_stat(v_following, 'followers_count', -1);
    PERFORM private.adjust_stat(v_follower, 'following_count', -1);
  END IF;

  -- notifications
  IF v_new_status = 'pending' THEN
    PERFORM private.notify(v_following, v_follower, 'FOLLOW_REQUEST',
      jsonb_build_object('status', 'pending'), v_request_key);
  ELSIF v_new_status = 'accepted' THEN
    IF v_old_status = 'pending' THEN
      -- the request was answered: tell the requester, retire the request
      PERFORM private.unnotify(v_following, v_request_key);
      PERFORM private.notify(v_follower, v_following, 'FOLLOW_ACCEPTED',
        jsonb_build_object('status', 'accepted'), v_accepted_key);
    ELSE
      PERFORM private.notify(v_following, v_follower, 'NEW_FOLLOWER',
        jsonb_build_object('status', 'accepted'), v_follower_key);
    END IF;
  END IF;

  IF v_new_status IS DISTINCT FROM 'pending' THEN
    PERFORM private.unnotify(v_following, v_request_key);
  END IF;
  IF v_new_status IS NULL OR v_new_status = 'rejected' THEN
    PERFORM private.unnotify(v_following, v_follower_key);
    PERFORM private.unnotify(v_follower, v_accepted_key);
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION private.account_follows_before_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.status <> 'pending' AND NEW.responded_at IS NULL THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.account_follows_before_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_actor uuid := private.viewer_id();
BEGIN
  IF NEW.follower_id <> OLD.follower_id OR NEW.following_id <> OLD.following_id THEN
    RAISE EXCEPTION 'A follow cannot be moved to other accounts' USING ERRCODE = '42501';
  END IF;

  IF v_actor IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_actor = OLD.following_id THEN
      IF NEW.status NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'A follow request can only be accepted or rejected' USING ERRCODE = '42501';
      END IF;
    ELSIF v_actor = OLD.follower_id THEN
      IF NEW.status IS DISTINCT FROM private.initial_follow_status(OLD.following_id) THEN
        RAISE EXCEPTION 'Only the followed account can answer a follow request' USING ERRCODE = '42501';
      END IF;
      IF OLD.status = 'accepted' THEN
        NEW.status := OLD.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Not allowed to change this follow' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.responded_at := CASE WHEN NEW.status = 'pending' THEN NULL ELSE now() END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.account_likes_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'INSERT' then
    perform set_config('app.implied_watch', 'on', true);
    insert into public.account_watched
      (account_id, tmdb_id, title, poster_path, backdrop_path, release_date)
    values
      (NEW.account_id, NEW.tmdb_id, NEW.title, NEW.poster_path, NEW.backdrop_path, NEW.release_date)
    on conflict (account_id, tmdb_id) do nothing;
    perform set_config('app.implied_watch', '', true);

    perform private.record_activity(
      NEW.account_id, 'LIKED_ADDED', 'like:' || NEW.tmdb_id,
      NEW.tmdb_id, null, null,
      jsonb_build_object('title', NEW.title, 'poster_path', NEW.poster_path, 'release_date', NEW.release_date)
    );
  else
    perform private.remove_activity(OLD.account_id, 'like:' || OLD.tmdb_id);
    perform private.restore_watched_activity(OLD.account_id, OLD.tmdb_id);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.account_watched_after_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  delete from public.account_diary
  where account_id = OLD.account_id and tmdb_id = OLD.tmdb_id;
  delete from public.account_likes
  where account_id = OLD.account_id and tmdb_id = OLD.tmdb_id;

  perform private.remove_activity(OLD.account_id, 'watched:' || OLD.tmdb_id);
  return null;
end;
$$;

CREATE FUNCTION private.account_watched_after_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  delete from public.account_watchlist
  where account_id = NEW.account_id and tmdb_id = NEW.tmdb_id;

  -- a diary entry, like or review that implies this film is watched is the event
  if coalesce(current_setting('app.implied_watch', true), '') <> 'on' then
    perform private.record_activity(
      NEW.account_id, 'WATCHED_ADDED', 'watched:' || NEW.tmdb_id,
      NEW.tmdb_id, null, null,
      jsonb_build_object('title', NEW.title, 'poster_path', NEW.poster_path, 'release_date', NEW.release_date)
    );
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.account_watchlist_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'INSERT' then
    perform private.record_activity(
      NEW.account_id, 'WATCHLIST_ADDED', 'watchlist:' || NEW.tmdb_id,
      NEW.tmdb_id, null, null,
      jsonb_build_object('title', NEW.title, 'poster_path', NEW.poster_path, 'release_date', NEW.release_date)
    );
  elsif not exists (
    -- it left the watchlist because it was watched: that is history, keep it
    select 1 from public.account_watched w
    where w.account_id = OLD.account_id and w.tmdb_id = OLD.tmdb_id
  ) then
    perform private.remove_activity(OLD.account_id, 'watchlist:' || OLD.tmdb_id);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.accounts_after_privacy_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE public.account_follows
  SET status = 'accepted'
  WHERE following_id = NEW.id AND status = 'pending';
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.accounts_before_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.deactivated_at := CASE WHEN NEW.is_active THEN NULL ELSE now() END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.adjust_stat(p_account_id uuid, p_field text, p_delta integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
begin
  if p_account_id is null or p_delta = 0 then
    return;
  end if;

  if p_field not in (
    'followers_count', 'following_count', 'watched_count', 'watchlist_count',
    'likes_count', 'lists_count', 'reviews_count', 'diary_count'
  ) then
    raise exception 'Unknown stat %', p_field;
  end if;

  execute format(
    'update public.account_stats set %1$I = greatest(0, %1$I + $1), updated_at = now() where account_id = $2',
    p_field
  ) using p_delta, p_account_id;
end;
$_$;

CREATE FUNCTION private.bump_film_stat(p_tmdb_id integer, p_field text, p_delta integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
begin
  if p_tmdb_id is null or p_delta = 0 then
    return;
  end if;

  if p_field not in ('watched_count', 'liked_count', 'listed_count', 'watchlist_count') then
    raise exception 'Unknown film stat %', p_field;
  end if;

  execute format(
    'insert into public.film_stats as s (tmdb_id, %1$I) values ($1, greatest($2, 0))
     on conflict (tmdb_id) do update
     set %1$I = greatest(0, s.%1$I + $2), updated_at = now()',
    p_field
  ) using p_tmdb_id, p_delta;
end;
$_$;

CREATE FUNCTION private.can_view_account(p_owner_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT CASE
    WHEN p_owner_id IS NULL THEN false
    WHEN p_owner_id = (SELECT private.viewer_id()) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.accounts a
      WHERE a.id = p_owner_id
        AND a.is_active
        AND (
          NOT a.is_private
          OR EXISTS (
            SELECT 1
            FROM public.account_follows f
            WHERE f.follower_id = (SELECT private.viewer_id())
              AND f.following_id = a.id
              AND f.status = 'accepted'
          )
        )
    )
  END;
$$;

CREATE FUNCTION private.count_film_rows() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'INSERT' then
    perform private.bump_film_stat(NEW.tmdb_id, TG_ARGV[0], 1);
  else
    perform private.bump_film_stat(OLD.tmdb_id, TG_ARGV[0], -1);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.count_rows() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.adjust_stat(NEW.account_id, TG_ARGV[0], 1);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM private.adjust_stat(OLD.account_id, TG_ARGV[0], -1);
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.edit_activity(p_account_id uuid, p_dedupe_key text, p_type text, p_payload jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.account_activity
  set type = p_type, payload = p_payload || jsonb_build_object('edited', true)
  where account_id = p_account_id and dedupe_key = p_dedupe_key;
  return found;
end;
$$;

CREATE FUNCTION private.forbid_column_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_column text;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
BEGIN
  FOREACH v_column IN ARRAY TG_ARGV LOOP
    IF v_old -> v_column IS DISTINCT FROM v_new -> v_column THEN
      RAISE EXCEPTION '% cannot be changed', v_column USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE
  v_display_name text := left(btrim(coalesce(NEW.name, '')), 80);
  v_avatar_url   text := NEW.image;
BEGIN
  IF v_avatar_url IS NULL
    OR char_length(v_avatar_url) > 2048
    OR v_avatar_url !~ '^https?://[^[:space:]]+$' THEN
    v_avatar_url := NULL;
  END IF;

  INSERT INTO public.accounts (id, display_name, avatar_url)
  VALUES (NEW.id, nullif(v_display_name, ''), v_avatar_url)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.account_stats (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;

  INSERT INTO public.account_emails (account_id, email, is_primary, verified_at)
  VALUES (
    NEW.id, lower(btrim(NEW.email)), true,
    CASE WHEN NEW.email_verified THEN now() END
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$_$;

CREATE FUNCTION private.handle_user_email_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE public.account_emails
  SET email = lower(btrim(NEW.email)),
      verified_at = CASE
        WHEN NOT NEW.email_verified THEN NULL
        WHEN NEW.email IS DISTINCT FROM OLD.email OR verified_at IS NULL THEN now()
        ELSE verified_at
      END
  WHERE account_id = NEW.id AND is_primary;

  IF NOT FOUND THEN
    INSERT INTO public.account_emails (account_id, email, is_primary, verified_at)
    VALUES (
      NEW.id, lower(btrim(NEW.email)), true,
      CASE WHEN NEW.email_verified THEN now() END
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.initial_follow_status(p_target_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT CASE WHEN a.is_private THEN 'pending' ELSE 'accepted' END
  FROM public.accounts a
  WHERE a.id = p_target_id AND a.is_active;
$$;

CREATE FUNCTION private.is_reserved_username(p_username text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select p_username = any (array[
    'edit', 'settings', 'me', 'new', 'admin', 'api', 'support', 'guffin',
    'tvizzie', 'null', 'undefined', 'activity', 'diary', 'followers',
    'following', 'likes', 'lists', 'reviews', 'watched', 'watchlist'
  ]);
$$;

CREATE FUNCTION private.like_escape(p_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select replace(replace(replace(p_text, '\', '\\'), '%', '\%'), '_', '\_');
$$;

CREATE FUNCTION private.list_items_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_list uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.list_id ELSE NEW.list_id END;
BEGIN
  UPDATE public.lists
  SET items_count = greatest(0, items_count + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END),
      updated_at = now()
  WHERE id = v_list;
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.list_items_before_write() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.list_id <> OLD.list_id or NEW.tmdb_id <> OLD.tmdb_id then
      raise exception 'A list item cannot be moved to another list or title' using errcode = '42501';
    end if;
    NEW.updated_at := now();
    return NEW;
  end if;

  -- serialise appends so two concurrent inserts do not pick the same slot
  perform 1 from public.lists l where l.id = NEW.list_id for update;

  if NEW.position = 0 then
    select coalesce(max(i.position), 0) + 1 into NEW.position
    from public.list_items i
    where i.list_id = NEW.list_id;

    if NEW.position > 2000 then
      raise exception 'LIST_FULL' using errcode = '54000';
    end if;
  end if;
  return NEW;
end;
$$;

CREATE FUNCTION private.list_items_film_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_list_id uuid := case when TG_OP = 'DELETE' then OLD.list_id else NEW.list_id end;
  v_private boolean;
begin
  select l.is_private into v_private from public.lists l where l.id = v_list_id;
  if not found or v_private then
    return null;
  end if;

  if TG_OP = 'INSERT' then
    perform private.bump_film_stat(NEW.tmdb_id, 'listed_count', 1);
  else
    perform private.bump_film_stat(OLD.tmdb_id, 'listed_count', -1);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.list_likes_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_list   public.lists%ROWTYPE;
  v_actor  uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.account_id ELSE NEW.account_id END;
  v_list_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.list_id ELSE NEW.list_id END;
  v_key    text := 'list-like:' || v_list_id || ':' || v_actor;
BEGIN
  SELECT * INTO v_list FROM public.lists WHERE id = v_list_id;
  IF NOT FOUND THEN
    -- the list itself is being deleted
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.lists SET likes_count = likes_count + 1 WHERE id = v_list_id;

    PERFORM private.notify(v_list.account_id, v_actor, 'LIST_LIKE',
      jsonb_build_object(
        'message', 'Liked your list',
        'subjectTitle', v_list.title,
        'subjectHref', '/account/' || v_list.account_id || '/lists/' || v_list.slug,
        'listId', v_list.id
      ),
      v_key, v_list.id);

    IF NOT v_list.is_private THEN
      PERFORM private.record_activity(v_actor, 'LIST_LIKED', v_key, NULL, v_list.id, v_list.account_id,
        jsonb_build_object('title', v_list.title, 'slug', v_list.slug, 'poster_path', v_list.poster_path));
    END IF;
  ELSE
    UPDATE public.lists SET likes_count = greatest(0, likes_count - 1) WHERE id = v_list_id;
    PERFORM private.unnotify(v_list.account_id, v_key);
    PERFORM private.remove_activity(v_actor, v_key);
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.list_likes_before_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.lists l WHERE l.id = NEW.list_id AND l.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'You cannot like your own list' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.lists_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.is_private THEN
    DELETE FROM public.account_activity WHERE list_id = NEW.id;
    RETURN NULL;
  END IF;

  -- (re)published: every event about the list keeps the date it happened
  INSERT INTO public.account_activity
    (account_id, type, dedupe_key, list_id, payload, created_at)
  VALUES (
    NEW.account_id, 'LIST_CREATED', 'list:' || NEW.id, NEW.id,
    jsonb_build_object('title', NEW.title, 'slug', NEW.slug, 'poster_path', NEW.poster_path),
    CASE WHEN TG_OP = 'INSERT' THEN clock_timestamp() ELSE NEW.created_at END
  )
  ON CONFLICT (account_id, dedupe_key) DO NOTHING;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.account_activity
      (account_id, type, dedupe_key, list_id, target_account_id, payload, created_at)
    SELECT ll.account_id, 'LIST_LIKED', 'list-like:' || NEW.id || ':' || ll.account_id, NEW.id, NEW.account_id,
           jsonb_build_object('title', NEW.title, 'slug', NEW.slug, 'poster_path', NEW.poster_path),
           ll.created_at
    FROM public.list_likes ll
    WHERE ll.list_id = NEW.id
    ON CONFLICT (account_id, dedupe_key) DO NOTHING;

    INSERT INTO public.account_activity
      (account_id, type, dedupe_key, list_id, target_account_id, review_id, payload, created_at)
    SELECT r.account_id, 'LIST_COMMENTED', 'review:' || r.id, NEW.id, NEW.account_id, r.id,
           jsonb_build_object('title', NEW.title, 'slug', NEW.slug, 'rating', r.rating)
             || CASE WHEN r.updated_at > r.created_at THEN jsonb_build_object('edited', true) ELSE '{}'::jsonb END,
           r.created_at
    FROM public.reviews r
    WHERE r.list_id = NEW.id
    ON CONFLICT (account_id, dedupe_key) DO NOTHING;

    INSERT INTO public.account_activity
      (account_id, type, dedupe_key, list_id, target_account_id, review_id, payload, created_at)
    SELECT rl.account_id, 'REVIEW_LIKED', 'review-like:' || rl.review_id || ':' || rl.account_id,
           NEW.id, r.account_id, r.id,
           jsonb_build_object('title', NEW.title, 'poster_path', r.poster_path, 'slug', NEW.slug),
           rl.created_at
    FROM public.review_likes rl
    JOIN public.reviews r ON r.id = rl.review_id
    WHERE r.list_id = NEW.id
    ON CONFLICT (account_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.lists_before_write() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_base      text;
  v_candidate text;
  v_n         integer := 1;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- counters always start at zero, whatever the client sent
    NEW.items_count := 0;
    NEW.likes_count := 0;
    NEW.reviews_count := 0;

    IF NEW.slug = '' THEN
      v_base := private.slugify(NEW.title);
      v_candidate := v_base;
      WHILE EXISTS (
        SELECT 1 FROM public.lists l
        WHERE l.account_id = NEW.account_id AND l.slug = v_candidate
      ) LOOP
        v_n := v_n + 1;
        v_candidate := left(v_base, 70) || '-' || v_n;
      END LOOP;
      NEW.slug := v_candidate;
    END IF;
  ELSE
    IF NEW.account_id <> OLD.account_id OR NEW.slug <> OLD.slug THEN
      RAISE EXCEPTION 'A list''s owner and slug cannot be changed' USING ERRCODE = '42501';
    END IF;

    -- `updated_at` means "the list was edited"; counter bumps do not count
    IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at AND (
      NEW.title, NEW.description, NEW.poster_path, NEW.backdrop_path, NEW.is_ranked, NEW.is_private
    ) IS DISTINCT FROM (
      OLD.title, OLD.description, OLD.poster_path, OLD.backdrop_path, OLD.is_ranked, OLD.is_private
    ) THEN
      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION private.lists_film_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'DELETE' then
    if not OLD.is_private then
      perform private.shift_listed(OLD.id, -1);
    end if;
    return OLD;
  end if;

  if NEW.is_private is distinct from OLD.is_private then
    perform private.shift_listed(NEW.id, case when NEW.is_private then -1 else 1 end);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.film_catalog_apply_override() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_verdict text;
begin
  select o.verdict into v_verdict
  from public.film_catalog_overrides o
  where o.tmdb_id = NEW.tmdb_id;

  if v_verdict is not null then
    NEW.eligible := v_verdict = 'allow';
    NEW.quality_flags := array_remove(NEW.quality_flags, 'override') || '{override}';
  end if;
  return NEW;
end;
$$;

CREATE FUNCTION private.film_catalog_overrides_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  -- touching the row re-runs the override trigger
  update public.film_catalog c
  set quality_flags = array_remove(c.quality_flags, 'override')
  where c.tmdb_id = coalesce(NEW.tmdb_id, OLD.tmdb_id);
  return null;
end;
$$;

CREATE FUNCTION private.notifications_before_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.read AND NOT OLD.read AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  ELSIF NOT NEW.read THEN
    NEW.read_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.notify(p_user_id uuid, p_actor_id uuid, p_type text, p_payload jsonb, p_dedupe_key text, p_list_id uuid DEFAULT NULL::uuid, p_review_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- never notify someone about their own action
  IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, payload, dedupe_key, list_id, review_id)
  VALUES (p_user_id, p_actor_id, p_type, coalesce(p_payload, '{}'::jsonb), p_dedupe_key, p_list_id, p_review_id)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
  DO UPDATE SET
    actor_id   = EXCLUDED.actor_id,
    type       = EXCLUDED.type,
    payload    = EXCLUDED.payload,
    list_id    = EXCLUDED.list_id,
    review_id  = EXCLUDED.review_id,
    read       = false,
    read_at    = NULL,
    created_at = now();
END;
$$;

CREATE FUNCTION private.prune_notifications(p_limit integer DEFAULT 5000) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_deleted integer;
begin
  delete from public.notifications n
  where n.id in (
    select id
    from public.notifications
    where read
      and created_at < now() - interval '90 days'
      and type not in ('FOLLOW_REQUEST', 'FOLLOW_ACCEPTED')
    order by created_at
    limit least(greatest(coalesce(p_limit, 5000), 1), 100000)
  );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

CREATE FUNCTION private.record_activity(p_account_id uuid, p_type text, p_dedupe_key text, p_tmdb_id integer, p_list_id uuid, p_target_account_id uuid, p_payload jsonb, p_review_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.account_activity
    (account_id, type, dedupe_key, tmdb_id, list_id, review_id, target_account_id, payload, created_at)
  values (
    p_account_id, p_type, p_dedupe_key, p_tmdb_id,
    p_list_id, p_review_id, p_target_account_id, coalesce(p_payload, '{}'::jsonb),
    clock_timestamp()
  )
  on conflict (account_id, dedupe_key) do update set
    type              = excluded.type,
    tmdb_id           = excluded.tmdb_id,
    list_id           = excluded.list_id,
    review_id         = excluded.review_id,
    target_account_id = excluded.target_account_id,
    payload           = excluded.payload,
    created_at        = excluded.created_at;
$$;

CREATE FUNCTION private.remove_activity(p_account_id uuid, p_dedupe_key text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  DELETE FROM public.account_activity
  WHERE account_id = p_account_id AND dedupe_key = p_dedupe_key;
$$;

CREATE FUNCTION private.restore_watched_activity(p_account_id uuid, p_tmdb_id integer) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.account_activity (account_id, type, dedupe_key, tmdb_id, payload, created_at)
  select w.account_id, 'WATCHED_ADDED', 'watched:' || w.tmdb_id, w.tmdb_id,
         jsonb_build_object('title', w.title, 'poster_path', w.poster_path, 'release_date', w.release_date),
         w.first_watched_at
  from public.account_watched w
  where w.account_id = p_account_id and w.tmdb_id = p_tmdb_id
    -- not while the account itself is being deleted
    and exists (select 1 from public.accounts a where a.id = w.account_id)
    and not exists (
      select 1 from public.account_diary d
      where d.account_id = w.account_id and d.tmdb_id = w.tmdb_id
    )
    and not exists (
      select 1 from public.account_likes l
      where l.account_id = w.account_id and l.tmdb_id = w.tmdb_id
    )
    and not exists (
      select 1 from public.reviews r
      where r.account_id = w.account_id and r.tmdb_id = w.tmdb_id
    )
  on conflict (account_id, dedupe_key) do nothing;
$$;

CREATE FUNCTION private.review_likes_after_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_review    public.reviews%rowtype;
  v_list      public.lists%rowtype;
  v_actor     uuid := case when TG_OP = 'DELETE' then OLD.account_id else NEW.account_id end;
  v_review_id uuid := case when TG_OP = 'DELETE' then OLD.review_id else NEW.review_id end;
  v_key       text := 'review-like:' || v_review_id || ':' || v_actor;
  v_title     text;
  v_href      text;
  v_private   boolean := false;
  v_extra     jsonb := '{}'::jsonb;
begin
  select * into v_review from public.reviews where id = v_review_id;
  if not found then
    -- the review itself is being deleted
    return null;
  end if;

  if TG_OP = 'DELETE' then
    update public.reviews set likes_count = greatest(0, likes_count - 1) where id = v_review_id;
    perform private.unnotify(v_review.account_id, v_key);
    perform private.remove_activity(v_actor, v_key);
    return null;
  end if;

  update public.reviews set likes_count = likes_count + 1 where id = v_review_id;

  if v_review.tmdb_id is not null then
    v_title := v_review.title;
    v_href := '/movie/' || v_review.tmdb_id;
  else
    select * into v_list from public.lists where id = v_review.list_id;
    v_title := v_list.title;
    v_href := '/account/' || v_list.account_id || '/lists/' || v_list.slug;
    v_private := v_list.is_private;
    v_extra := jsonb_build_object('slug', v_list.slug);
  end if;

  perform private.notify(v_review.account_id, v_actor, 'REVIEW_LIKE',
    jsonb_build_object(
      'message', 'Liked your review',
      'subjectTitle', v_title,
      'subjectHref', v_href,
      'reviewId', v_review.id
    ),
    v_key, v_review.list_id, v_review.id);

  if not v_private then
    perform private.record_activity(v_actor, 'REVIEW_LIKED', v_key,
      v_review.tmdb_id, v_review.list_id, v_review.account_id,
      jsonb_build_object('title', v_title, 'poster_path', v_review.poster_path) || v_extra,
      v_review.id);
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.review_likes_before_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reviews r WHERE r.id = NEW.review_id AND r.account_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'You cannot like your own review' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.reviews_after_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.list_id IS NOT NULL THEN
    UPDATE public.lists SET reviews_count = greatest(0, reviews_count - 1) WHERE id = OLD.list_id;
  ELSIF OLD.tmdb_id IS NOT NULL THEN
    PERFORM private.restore_watched_activity(OLD.account_id, OLD.tmdb_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION private.reviews_after_write() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_list public.lists%rowtype;
  v_type text;
  v_payload jsonb;
  v_published boolean := TG_OP = 'UPDATE'
    and char_length(btrim(OLD.content)) = 0
    and char_length(btrim(NEW.content)) > 0;
begin
  if NEW.tmdb_id is not null then
    -- reviewing a film means you watched it
    if TG_OP = 'INSERT' then
      perform set_config('app.implied_watch', 'on', true);
      insert into public.account_watched
        (account_id, tmdb_id, title, poster_path, backdrop_path, release_date)
      values
        (NEW.account_id, NEW.tmdb_id, NEW.title, NEW.poster_path, NEW.backdrop_path, NEW.release_date)
      on conflict (account_id, tmdb_id) do nothing;
      perform set_config('app.implied_watch', '', true);
    end if;

    v_type := case when char_length(btrim(NEW.content)) > 0 then 'REVIEW_PUBLISHED' else 'RATING_LOGGED' end;
    v_payload := jsonb_build_object(
      'title', NEW.title,
      'poster_path', NEW.poster_path,
      'release_date', NEW.release_date,
      'rating', NEW.rating
    );

    if TG_OP = 'INSERT' or v_published
      or not private.edit_activity(NEW.account_id, 'review:' || NEW.id, v_type, v_payload) then
      perform private.record_activity(
        NEW.account_id, v_type, 'review:' || NEW.id,
        NEW.tmdb_id, null, null, v_payload, NEW.id
      );
    end if;
  else
    select * into v_list from public.lists where id = NEW.list_id;

    if TG_OP = 'INSERT' then
      update public.lists set reviews_count = reviews_count + 1 where id = NEW.list_id;
      perform private.notify(v_list.account_id, NEW.account_id, 'LIST_COMMENT',
        jsonb_build_object(
          'message', 'Commented on your list',
          'subjectTitle', v_list.title,
          'subjectHref', '/account/' || v_list.account_id || '/lists/' || v_list.slug,
          'listId', v_list.id,
          'reviewId', NEW.id
        ),
        'list-comment:' || NEW.id, v_list.id, NEW.id);
    end if;

    if not v_list.is_private then
      v_payload := jsonb_build_object('title', v_list.title, 'slug', v_list.slug, 'rating', NEW.rating);
      if TG_OP = 'INSERT'
        or not private.edit_activity(NEW.account_id, 'review:' || NEW.id, 'LIST_COMMENTED', v_payload) then
        perform private.record_activity(NEW.account_id, 'LIST_COMMENTED', 'review:' || NEW.id,
          null, v_list.id, v_list.account_id, v_payload, NEW.id);
      end if;
    end if;
  end if;
  return null;
end;
$$;

CREATE FUNCTION private.reviews_before_write() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if TG_OP = 'INSERT' then
    if NEW.list_id is not null and exists (
      select 1 from public.lists l where l.id = NEW.list_id and l.account_id = NEW.account_id
    ) then
      raise exception 'You cannot comment on your own list' using errcode = '42501';
    end if;
    NEW.likes_count := 0;
  else
    if NEW.account_id <> OLD.account_id
      or NEW.tmdb_id is distinct from OLD.tmdb_id
      or NEW.list_id is distinct from OLD.list_id then
      raise exception 'A review cannot be moved to another subject' using errcode = '42501';
    end if;

    -- `updated_at` means "the review was edited"; like counter bumps do not count
    if NEW.updated_at is not distinct from OLD.updated_at and (
      NEW.content, NEW.rating, NEW.is_spoiler
    ) is distinct from (
      OLD.content, OLD.rating, OLD.is_spoiler
    ) then
      NEW.updated_at := now();
    end if;
  end if;
  return NEW;
end;
$$;

CREATE FUNCTION private.reviews_film_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_row public.reviews%rowtype;
  v_old_written integer := 0;
  v_new_written integer := 0;
  v_old_slot integer;
  v_new_slot integer;
begin
  if TG_OP = 'DELETE' then v_row := OLD; else v_row := NEW; end if;
  if v_row.tmdb_id is null then
    return null;
  end if;
  if TG_OP <> 'INSERT' then
    v_old_written := (char_length(btrim(OLD.content)) > 0)::int;
    v_old_slot := (OLD.rating * 2)::int;
  end if;
  if TG_OP <> 'DELETE' then
    v_new_written := (char_length(btrim(NEW.content)) > 0)::int;
    v_new_slot := (NEW.rating * 2)::int;
  end if;

  if v_old_written = v_new_written and v_old_slot is not distinct from v_new_slot then
    return null;
  end if;

  insert into public.film_stats as s (tmdb_id, reviews_count, ratings)
  values (
    v_row.tmdb_id,
    greatest(v_new_written - v_old_written, 0),
    private.shift_rating(array_fill(0, array[10]), null, v_new_slot)
  )
  on conflict (tmdb_id) do update
  set reviews_count = greatest(0, s.reviews_count + v_new_written - v_old_written),
      ratings = private.shift_rating(s.ratings, v_old_slot, v_new_slot),
      updated_at = now();
  return null;
end;
$$;

CREATE FUNCTION private.seed_account_ids(p_ids uuid[]) RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT coalesce(array_agg(u.id), '{}')
  FROM public.auth_users u
  WHERE u.id = any(p_ids)
    AND u.is_seed
    AND u.email LIKE '%@guffin.test';
$$;

CREATE FUNCTION private.shift_listed(p_list_id uuid, p_delta integer) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.film_stats as s (tmdb_id, listed_count)
  select i.tmdb_id, greatest(p_delta, 0)
  from public.list_items i
  where i.list_id = p_list_id
  order by i.tmdb_id
  on conflict (tmdb_id) do update
  set listed_count = greatest(0, s.listed_count + p_delta), updated_at = now();
$$;

CREATE FUNCTION private.shift_rating(p_ratings integer[], p_from integer, p_to integer) RETURNS integer[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select array_agg(
    greatest(0, p_ratings[i] - coalesce((i = p_from)::int, 0) + coalesce((i = p_to)::int, 0))
    order by i
  )
  from generate_series(1, 10) as i;
$$;

CREATE FUNCTION private.slugify(p_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select coalesce(
    nullif(
      trim(both '-' from left(
        trim(both '-' from regexp_replace(
          lower(translate(
            coalesce(p_text, ''),
            'çğıöşüÇĞİÖŞÜâîûéèêàáíóúñÂÎÛÉÈÊÀÁÍÓÚÑ',
            'cgiosucgiosuaiueeeaaiounaiueeeaaioun'
          )),
          '[^a-z0-9]+', '-', 'g'
        )),
        60
      )),
      ''
    ),
    'list'
  );
$$;

CREATE FUNCTION private.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.unnotify(p_user_id uuid, p_dedupe_key text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  DELETE FROM public.notifications
  WHERE user_id = p_user_id AND dedupe_key = p_dedupe_key;
$$;

CREATE FUNCTION private.viewer_id() RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT nullif(pg_catalog.current_setting('app.viewer_id', true), '')::uuid;
$$;

CREATE FUNCTION public.deactivate_current_account() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  UPDATE public.accounts SET is_active = false WHERE id = (SELECT private.viewer_id());
$$;

CREATE FUNCTION public.get_account_follow_counts(p_account_id uuid) RETURNS TABLE(followers_count integer, following_count integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select s.followers_count, s.following_count
  from public.account_stats s
  join public.accounts a on a.id = s.account_id
  where s.account_id = p_account_id
    and (a.is_active or a.id = (select private.viewer_id()));
$$;

CREATE FUNCTION public.get_account_follow_target(p_user_id uuid) RETURNS TABLE(id uuid, is_private boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT a.id, a.is_private
  FROM public.accounts a
  WHERE a.id = p_user_id AND a.is_active
  LIMIT 1;
$$;

CREATE FUNCTION public.get_account_follows(p_account_id uuid, p_direction text, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50) RETURNS TABLE(follow_id uuid, account_id uuid, username text, display_name text, avatar_url text, followed_at timestamp with time zone, viewer_status text)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if p_direction is null or p_direction not in ('followers', 'following') then
    raise exception 'Unknown follow direction' using errcode = '22023';
  end if;
  if not private.can_view_account(p_account_id) then
    raise exception 'This account is private' using errcode = '42501';
  end if;

  if p_direction = 'followers' then
    return query
    select f.id, a.id, a.username, a.display_name, a.avatar_url::text,
           f.created_at, mine.status
    from public.account_follows f
    join public.accounts a on a.id = f.follower_id
    left join public.account_follows mine
      on mine.follower_id = (select private.viewer_id()) and mine.following_id = a.id
    where f.following_id = p_account_id
      and f.status = 'accepted'
      and (p_before is null or (f.created_at, f.id) < (p_before, coalesce(p_before_id, f.id)))
    order by f.created_at desc, f.id desc
    limit v_limit;
  else
    return query
    select f.id, a.id, a.username, a.display_name, a.avatar_url::text,
           f.created_at, mine.status
    from public.account_follows f
    join public.accounts a on a.id = f.following_id
    left join public.account_follows mine
      on mine.follower_id = (select private.viewer_id()) and mine.following_id = a.id
    where f.follower_id = p_account_id
      and f.status = 'accepted'
      and (p_before is null or (f.created_at, f.id) < (p_before, coalesce(p_before_id, f.id)))
    order by f.created_at desc, f.id desc
    limit v_limit;
  end if;
end;
$$;

CREATE FUNCTION public.get_account_header(p_account_id uuid, p_mutual integer DEFAULT 3) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    SET plan_cache_mode TO 'force_generic_plan'
    AS $$
declare
  v_viewer uuid := private.viewer_id();
  v_own boolean := coalesce(p_account_id = private.viewer_id(), false);
  v_visible boolean;
  v_stats public.account_stats;
begin
  -- An inactive account is its owner's alone.
  if p_account_id is null or not exists (
    select 1 from public.accounts a
    where a.id = p_account_id and (a.is_active or v_own)
  ) then
    return null;
  end if;

  v_visible := private.can_view_account(p_account_id);

  select * into v_stats
  from public.account_stats s
  where s.account_id = p_account_id;

  return jsonb_build_object(
    -- The viewer's own follow of this account, in whatever state.
    'follow_status', case when v_viewer is not null and not v_own then (
      select f.status
      from public.account_follows f
      where f.follower_id = v_viewer and f.following_id = p_account_id
    ) end,

    -- A private account still shows how many follow it and how many it
    -- follows, as get_account_follow_counts does.
    'followers_count', coalesce(v_stats.followers_count, 0),
    'following_count', coalesce(v_stats.following_count, 0),

    -- People the viewer follows who follow this account. A follow of an
    -- account the viewer may not see is hidden from them, so a locked
    -- account has none to show.
    'mutual', case when v_viewer is not null and not v_own then (
      select jsonb_build_object(
        'people', coalesce(jsonb_agg(jsonb_build_object(
          'account_id', m.id,
          'username', m.username,
          'display_name', m.display_name,
          'avatar_url', m.avatar_url
        ) order by m.rn) filter (
          where m.rn <= least(greatest(coalesce(p_mutual, 3), 1), 20)
        ), '[]'::jsonb),
        'total', count(*)
      )
      from (
        select a.id, a.username, a.display_name, a.avatar_url,
               row_number() over (order by theirs.created_at desc, a.id) as rn
        from public.account_follows mine
        join public.account_follows theirs
          on theirs.follower_id = mine.following_id
         and theirs.following_id = p_account_id
         and theirs.status = 'accepted'
        join public.accounts a
          on a.id = mine.following_id and a.is_active and a.username is not null
        where mine.follower_id = v_viewer
          and mine.status = 'accepted'
          and v_visible
      ) m
    ) end,

    -- A locked profile shows no numbers of its library.
    'library', case when v_visible then jsonb_build_object(
      'lists', coalesce(v_stats.lists_count, 0),
      'reviews', coalesce(v_stats.reviews_count, 0),
      'watched', coalesce(v_stats.watched_count, 0),
      'this_year', (
        select count(*)
        from public.account_watched x
        where x.account_id = p_account_id
          and x.last_watched_at >= date_trunc('year', now(), 'UTC')
      )
    ) end
  );
end;
$$;

CREATE FUNCTION public.get_account_overview(p_account_id uuid, p_watched integer DEFAULT 5, p_watchlist integer DEFAULT 5, p_reviews integer DEFAULT 3, p_popular integer DEFAULT 6, p_diary integer DEFAULT 10, p_lists integer DEFAULT 3, p_following integer DEFAULT 18, p_activity integer DEFAULT 6) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    SET plan_cache_mode TO 'force_generic_plan'
    AS $$
declare
  v_viewer uuid := private.viewer_id();
  v_own boolean := coalesce(p_account_id = private.viewer_id(), false);
begin
  if p_account_id is null or not private.can_view_account(p_account_id) then
    return null;
  end if;

  return jsonb_build_object(
    'stats', (
      select jsonb_build_object(
        'diary_count', s.diary_count,
        'following_count', s.following_count,
        'likes_count', s.likes_count,
        'lists_count', s.lists_count,
        'reviews_count', s.reviews_count,
        'watched_count', s.watched_count,
        'watchlist_count', s.watchlist_count
      )
      from public.account_stats s
      where s.account_id = p_account_id
    ),

    'favorites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tmdb_id', f.tmdb_id,
        'title', l.title,
        'poster_path', l.poster_path,
        'release_date', l.release_date
      ) order by f.position)
      from public.account_favorites f
      join public.account_likes l
        on l.account_id = f.account_id and l.tmdb_id = f.tmdb_id
      where f.account_id = p_account_id
    ), '[]'::jsonb),

    'watched', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.last_watched_at desc)
      from (
        select x.tmdb_id, x.title, x.poster_path, x.release_date, x.last_watched_at
        from public.account_watched x
        where x.account_id = p_account_id
        order by x.last_watched_at desc
        limit least(greatest(p_watched, 0), 50)
      ) w
    ), '[]'::jsonb),

    'watchlist', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at desc)
      from (
        select x.tmdb_id, x.title, x.poster_path, x.release_date, x.created_at
        from public.account_watchlist x
        where x.account_id = p_account_id
        order by x.created_at desc
        limit least(greatest(p_watchlist, 0), 50)
      ) w
    ), '[]'::jsonb),

    'recent_reviews', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.updated_at desc)
      from (
        select x.id, x.tmdb_id, x.title, x.poster_path, x.backdrop_path,
               x.release_date, x.content, x.rating, x.is_spoiler, x.likes_count,
               x.created_at, x.updated_at,
               exists (
                 select 1 from public.review_likes rl
                 where rl.review_id = x.id and rl.account_id = v_viewer
               ) as liked
        from public.reviews x
        where x.account_id = p_account_id
          and x.tmdb_id is not null
          and x.content <> ''
        order by x.updated_at desc
        limit least(greatest(p_reviews, 0), 50)
      ) r
    ), '[]'::jsonb),

    'popular_reviews', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.likes_count desc, r.updated_at desc)
      from (
        select x.id, x.tmdb_id, x.title, x.poster_path, x.backdrop_path,
               x.release_date, x.content, x.rating, x.is_spoiler, x.likes_count,
               x.created_at, x.updated_at,
               exists (
                 select 1 from public.review_likes rl
                 where rl.review_id = x.id and rl.account_id = v_viewer
               ) as liked
        from public.reviews x
        where x.account_id = p_account_id
          and x.tmdb_id is not null
          and x.content <> ''
          and x.likes_count > 0
        order by x.likes_count desc, x.updated_at desc
        limit least(greatest(p_popular, 0), 50)
      ) r
    ), '[]'::jsonb),

    'diary', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.watched_on desc, d.watched_at desc)
      from (
        select x.id, x.tmdb_id, x.title, x.watched_on, x.watched_at
        from public.account_diary x
        where x.account_id = p_account_id
        order by x.watched_on desc, x.watched_at desc
        limit least(greatest(p_diary, 0), 50)
      ) d
    ), '[]'::jsonb),

    'rating_spread', (
      select jsonb_agg(coalesce(c.n, 0) order by s.step)
      from generate_series(1, 10) as s(step)
      left join (
        select (x.rating * 2)::integer as step, count(*) as n
        from public.reviews x
        where x.account_id = p_account_id
          and x.tmdb_id is not null
          and x.rating is not null
        group by 1
      ) c on c.step = s.step
    ),

    -- A private list is its owner's alone.
    'lists', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.updated_at desc)
      from (
        select x.id, x.slug, x.title, x.description, x.is_private, x.is_ranked,
               x.items_count, x.likes_count, x.reviews_count, x.updated_at,
               coalesce((
                 select array_agg(i.poster_path::text order by i.position)
                 from (
                   select li.poster_path, li.position
                   from public.list_items li
                   where li.list_id = x.id
                   order by li.position
                   limit 5
                 ) i
               ), '{}') as previews
        from public.lists x
        where x.account_id = p_account_id
          and (v_own or not x.is_private)
        order by x.updated_at desc
        limit least(greatest(p_lists, 0), 50)
      ) l
    ), '[]'::jsonb),

    -- Someone this account follows shows only if the viewer could see them:
    -- account_follows and accounts hide the rest from everyone but the two
    -- people the follow is between.
    'following', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.followed_at desc)
      from (
        select a.username, a.display_name, a.avatar_url, f.created_at as followed_at
        from public.account_follows f
        join public.accounts a on a.id = f.following_id
        where f.follower_id = p_account_id
          and f.status = 'accepted'
          and a.username is not null
          and (a.is_active or a.id = v_viewer)
          and (
            v_own
            or a.id = v_viewer
            or (a.is_active and (not a.is_private or exists (
              select 1 from public.account_follows mine
              where mine.follower_id = v_viewer
                and mine.following_id = a.id
                and mine.status = 'accepted'
            )))
          )
        order by f.created_at desc
        limit least(greatest(p_following, 0), 50)
      ) p
    ), '[]'::jsonb),

    'activity', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (
        select x.id, x.type, x.tmdb_id, x.payload, x.created_at,
               (
                 select jsonb_build_object('username', t.username, 'display_name', t.display_name)
                 from public.accounts t
                 where t.id = x.target_account_id
                   and (t.is_active or t.id = v_viewer)
               ) as target
        from public.account_activity x
        where x.account_id = p_account_id
        order by x.created_at desc
        limit least(greatest(p_activity, 0), 50)
      ) e
    ), '[]'::jsonb),

    -- How much the account did each day (UTC) from the Monday 52 weeks before
    -- this one to today: the calendar on the overview.
    'activity_days', (
      select jsonb_build_object(
        'from', w.start,
        'counts', (
          select jsonb_agg(coalesce(c.n, 0) order by d.day)
          from generate_series(w.start, w.today, interval '1 day') as d(day)
          left join (
            select (x.created_at at time zone 'UTC')::date as day, count(*) as n
            from public.account_activity x
            where x.account_id = p_account_id
              and x.created_at >= w.start::timestamp at time zone 'UTC'
            group by 1
          ) c on c.day = d.day::date
        )
      )
      from (
        select (date_trunc('week', now() at time zone 'UTC') - interval '52 weeks')::date as start,
               (now() at time zone 'UTC')::date as today
      ) w
    )
  );
end;
$$;

CREATE FUNCTION public.get_home_circle() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  with me as (
    select a.id, a.username, a.display_name
    from public.accounts a
    where a.id = private.viewer_id() and a.is_active
  ),

  following as (
    select f.following_id as id
    from public.account_follows f
    join public.accounts a on a.id = f.following_id and a.is_active
    where f.follower_id = (select id from me)
      and f.status = 'accepted'
  ),

  seen as (
    select w.tmdb_id
    from public.account_watched w
    where w.account_id = (select id from me)
  ),

  friend_logs as (
    select distinct on (d.account_id, d.tmdb_id)
           d.id, d.account_id, d.tmdb_id, d.title, d.poster_path,
           d.release_date, d.watched_at, d.is_rewatch
    from public.account_diary d
    where d.account_id in (select id from following)
      and d.watched_at >= now() - interval '30 days'
    order by d.account_id, d.tmdb_id, d.watched_at desc
  ),

  latest as (
    select fl.*
    from (
      select fl.*,
             row_number() over (partition by fl.account_id order by fl.watched_at desc) as turn
      from friend_logs fl
    ) fl
    where fl.turn <= 2
    order by fl.watched_at desc, fl.id
    limit 18
  ),

  shared as (
    select fl.tmdb_id,
           count(*) as friends,
           max(fl.title) as title,
           max(fl.poster_path) as poster_path,
           max(fl.release_date) as release_date,
           max(fl.watched_at) as latest
    from friend_logs fl
    where fl.tmdb_id not in (select tmdb_id from seen)
      and fl.poster_path is not null
    group by fl.tmdb_id
    having count(*) >= 2
    order by count(*) desc, max(fl.watched_at) desc
    limit 16
  ),

  friends_of_friends as (
    select f2.following_id as id, count(*) as mutual
    from following fo
    join public.account_follows f2
      on f2.follower_id = fo.id and f2.status = 'accepted'
    where f2.following_id <> (select id from me)
      and not exists (
        select 1 from public.account_follows x
        where x.follower_id = (select id from me)
          and x.following_id = f2.following_id
      )
    group by f2.following_id
    having count(*) >= 2
    order by count(*) desc, f2.following_id
    limit 12
  ),

  seeds as (
    select distinct on (s.tmdb_id) s.tmdb_id, s.title, s.at
    from (
      select r.tmdb_id, r.title, r.updated_at as at
      from public.reviews r
      where r.account_id = (select id from me)
        and r.tmdb_id is not null
        and r.rating >= 4
      union all
      select l.tmdb_id, l.title, l.created_at
      from public.account_likes l
      where l.account_id = (select id from me)
    ) s
    where s.title is not null
    order by s.tmdb_id, s.at desc
  )

  select case when not exists (select 1 from me) then null else jsonb_build_object(
    'viewer', (
      select jsonb_build_object('username', m.username, 'display_name', m.display_name)
      from me m
    ),

    'following', (select count(*) from following),

    'followed', coalesce((
      select jsonb_agg(f.following_id)
      from public.account_follows f
      where f.follower_id = (select id from me)
    ), '[]'::jsonb),

    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'tmdb_id', l.tmdb_id,
        'title', l.title,
        'poster_path', l.poster_path,
        'release_date', l.release_date,
        'watched_at', l.watched_at,
        'rewatch', l.is_rewatch,
        'rating', r.rating,
        'reviewed', coalesce(r.content <> '', false),
        'liked', exists (
          select 1 from public.account_likes k
          where k.account_id = l.account_id and k.tmdb_id = l.tmdb_id
        ),
        'author', jsonb_build_object(
          'username', a.username,
          'display_name', a.display_name,
          'avatar_url', a.avatar_url
        )
      ) order by l.watched_at desc, l.id)
      from latest l
      join public.accounts a on a.id = l.account_id
      left join public.reviews r
        on r.account_id = l.account_id and r.tmdb_id = l.tmdb_id
      where a.username is not null
    ), '[]'::jsonb),

    'shared', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tmdb_id', s.tmdb_id,
        'title', s.title,
        'poster_path', s.poster_path,
        'release_date', s.release_date,
        'friends', s.friends,
        'faces', coalesce((
          select jsonb_agg(jsonb_build_object(
            'username', f.username,
            'display_name', f.display_name,
            'avatar_url', f.avatar_url
          ))
          from (
            select a.username, a.display_name, a.avatar_url
            from friend_logs fl
            join public.accounts a on a.id = fl.account_id
            where fl.tmdb_id = s.tmdb_id and a.username is not null
            order by fl.watched_at desc
            limit 3
          ) f
        ), '[]'::jsonb)
      ) order by s.friends desc, s.latest desc)
      from shared s
    ), '[]'::jsonb),

    'suggested', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'username', a.username,
        'display_name', a.display_name,
        'avatar_url', a.avatar_url,
        'bio', case when a.is_private then null else a.bio end,
        'mutual', fof.mutual,
        'followers', coalesce(st.followers_count, 0),
        'watched', coalesce(st.watched_count, 0),
        'reviews', coalesce(st.reviews_count, 0)
      ) order by fof.mutual desc, a.id)
      from friends_of_friends fof
      join public.accounts a on a.id = fof.id and a.is_active
      left join public.account_stats st on st.account_id = a.id
      where a.username is not null
    ), '[]'::jsonb),

    'seeds', coalesce((
      select jsonb_agg(jsonb_build_object('tmdb_id', s.tmdb_id, 'title', s.title) order by s.at desc)
      from (select * from seeds order by at desc limit 6) s
    ), '[]'::jsonb),

    'seen', coalesce((select jsonb_agg(s.tmdb_id) from seen s), '[]'::jsonb)
  ) end;
$$;

CREATE FUNCTION public.get_home_pulse() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  with open_accounts as (
    select a.id from public.accounts a where a.is_active and not a.is_private
  ),

  signals as (
    select d.tmdb_id, d.account_id, 'log' as kind, 1.0::float8 as weight,
           d.watched_at as at, null::numeric as rating
    from public.account_diary d
    where d.watched_at >= now() - interval '7 days'
      and d.account_id in (select id from open_accounts)
    union all
    select l.tmdb_id, l.account_id, 'like', 1.5, l.created_at, null
    from public.account_likes l
    where l.created_at >= now() - interval '7 days'
      and l.account_id in (select id from open_accounts)
    union all
    select r.tmdb_id, r.account_id, 'review',
           case when r.content <> '' then 2.0 else 0.75 end,
           r.created_at, r.rating
    from public.reviews r
    where r.tmdb_id is not null
      and r.created_at >= now() - interval '7 days'
      and r.account_id in (select id from open_accounts)
    union all
    select w.tmdb_id, w.account_id, 'watchlist', 0.5, w.created_at, null
    from public.account_watchlist w
    where w.created_at >= now() - interval '7 days'
      and w.account_id in (select id from open_accounts)
  ),

  by_kind as (
    select s.tmdb_id, s.account_id, s.kind,
           max(s.weight * exp(-extract(epoch from now() - s.at)::float8 / 259200)) as heat,
           max(s.rating) as rating
    from signals s
    group by s.tmdb_id, s.account_id, s.kind
  ),

  by_account as (
    select k.tmdb_id, k.account_id,
           sum(k.heat) as heat,
           max(k.heat) filter (where k.kind = 'log') as log_heat,
           max(k.rating) as rating
    from by_kind k
    group by k.tmdb_id, k.account_id
  ),

  popular as (
    select ba.tmdb_id,
           sum(ba.heat) as score,
           count(ba.log_heat) as watchers,
           count(*) as members,
           round(avg(ba.rating), 1) as rating
    from by_account ba
    group by ba.tmdb_id
    having count(*) >= 3
    order by sum(ba.heat) desc, ba.tmdb_id
    limit 24
  ),

  faces as (
    select x.tmdb_id,
           jsonb_agg(jsonb_build_object(
             'username', x.username,
             'display_name', x.display_name,
             'avatar_url', x.avatar_url
           ) order by x.rn) as faces
    from (
      select p.tmdb_id, a.username, a.display_name, a.avatar_url,
             row_number() over (partition by p.tmdb_id order by ba.log_heat desc, ba.account_id) as rn
      from popular p
      join by_account ba on ba.tmdb_id = p.tmdb_id and ba.log_heat is not null
      join public.accounts a on a.id = ba.account_id
      where a.avatar_url is not null and a.username is not null
    ) x
    where x.rn <= 4
    group by x.tmdb_id
  ),

  diary_account as (
    select d.tmdb_id, d.account_id,
           bool_or(d.watched_at >= now() - interval '7 days') as in_week,
           bool_or(d.watched_at < now() - interval '7 days') as before_week,
           bool_or(d.poster_path is not null) as has_poster
    from public.account_diary d
    where d.watched_at >= now() - interval '35 days'
      and d.account_id in (select id from open_accounts)
    group by d.tmdb_id, d.account_id
  ),

  rising as (
    select da.tmdb_id,
           count(*) filter (where da.in_week) as week,
           count(*) filter (where da.before_week)::float8 / 4 as base,
           (count(*) filter (where da.in_week) + 1)
             / (count(*) filter (where da.before_week)::float8 / 4 + 1) as lift
    from diary_account da
    group by da.tmdb_id
    having count(*) filter (where da.in_week) >= 4 and bool_or(da.has_poster)
    order by ln(1 + count(*) filter (where da.in_week))
             * (count(*) filter (where da.in_week) + 1)
             / (count(*) filter (where da.before_week)::float8 / 4 + 1) desc,
             da.tmdb_id
    limit 16
  ),

  wanted as (
    select p.tmdb_id from popular p
    union
    select r.tmdb_id from rising r
  ),

  film_meta as (
    select distinct on (m.tmdb_id)
           m.tmdb_id, m.title, m.poster_path, m.backdrop_path, m.release_date
    from (
      select d.tmdb_id, d.title, d.poster_path, d.backdrop_path, d.release_date, d.watched_at as at
      from public.account_diary d
      where d.watched_at >= now() - interval '7 days'
        and d.tmdb_id in (select tmdb_id from wanted)
        and d.account_id in (select id from open_accounts)
      union all
      select l.tmdb_id, l.title, l.poster_path, l.backdrop_path, l.release_date, l.created_at
      from public.account_likes l
      where l.created_at >= now() - interval '7 days'
        and l.tmdb_id in (select tmdb_id from wanted)
        and l.account_id in (select id from open_accounts)
      union all
      select r.tmdb_id, r.title, r.poster_path, r.backdrop_path, r.release_date, r.created_at
      from public.reviews r
      where r.tmdb_id is not null
        and r.created_at >= now() - interval '7 days'
        and r.tmdb_id in (select tmdb_id from wanted)
        and r.account_id in (select id from open_accounts)
      union all
      select w.tmdb_id, w.title, w.poster_path, w.backdrop_path, w.release_date, w.created_at
      from public.account_watchlist w
      where w.created_at >= now() - interval '7 days'
        and w.tmdb_id in (select tmdb_id from wanted)
        and w.account_id in (select id from open_accounts)
    ) m
    where m.title is not null
    order by m.tmdb_id, (m.poster_path is null), (m.backdrop_path is null), m.at desc
  ),

  rating_mean as (
    select sum(
             fs.ratings[1] * 1 + fs.ratings[2] * 2 + fs.ratings[3] * 3
             + fs.ratings[4] * 4 + fs.ratings[5] * 5 + fs.ratings[6] * 6
             + fs.ratings[7] * 7 + fs.ratings[8] * 8 + fs.ratings[9] * 9
             + fs.ratings[10] * 10
           )::numeric / 2 / nullif(sum(fs.ratings_count), 0) as c
    from public.film_stats fs
  ),

  top_rated as (
    select fs.tmdb_id, fs.rating_average, fs.ratings_count, fs.watched_count,
           (fs.ratings_count * fs.rating_average + 30 * rm.c)
             / (fs.ratings_count + 30) as weighted
    from public.film_stats fs, rating_mean rm
    where fs.ratings_count >= 15
    order by 5 desc, fs.tmdb_id
    limit 20
  ),

  review_candidates as (
    select r.id, r.account_id, r.tmdb_id, r.title, r.poster_path,
           r.backdrop_path, r.release_date, r.rating, r.content,
           r.likes_count, r.created_at,
           (r.likes_count + 1)::float8
             / power(extract(epoch from now() - r.created_at)::float8 / 3600 + 6, 1.2) as hot
    from public.reviews r
    where r.tmdb_id is not null
      and r.created_at >= now() - interval '21 days'
      and not r.is_spoiler
      and length(r.content) >= 160
      and r.account_id in (select id from open_accounts)
  ),

  best_per_film as (
    select rc.*,
           row_number() over (partition by rc.tmdb_id order by rc.hot desc, rc.id) as film_rank
    from review_candidates rc
  ),

  best_reviews as (
    select b.*,
           row_number() over (partition by b.account_id order by b.hot desc, b.id) as author_rank
    from best_per_film b
    where b.film_rank = 1
  ),

  recent_list_likes as (
    select ll.list_id, count(*) as recent
    from public.list_likes ll
    where ll.created_at >= now() - interval '30 days'
    group by ll.list_id
  ),

  top_lists as (
    select l.id, l.account_id, l.slug, l.title, l.description,
           l.items_count, l.likes_count, l.reviews_count
    from public.lists l
    left join recent_list_likes rl on rl.list_id = l.id
    where not l.is_private
      and l.items_count >= 5
      and l.account_id in (select id from open_accounts)
    order by coalesce(rl.recent, 0)
             + 2 * ln(1 + l.likes_count)
             + 3 * exp(-extract(epoch from now() - l.updated_at)::float8 / 2592000) desc,
             l.id
    limit 6
  ),

  recent_review_likes as (
    select rl.review_id, count(*) as likes
    from public.review_likes rl
    where rl.created_at >= now() - interval '30 days'
    group by rl.review_id
  ),

  earned as (
    select r.account_id, sum(rrl.likes) as likes
    from recent_review_likes rrl
    join public.reviews r on r.id = rrl.review_id
    where r.account_id in (select id from open_accounts)
    group by r.account_id
  ),

  reviewers as (
    select e.account_id, e.likes
    from earned e
    order by e.likes desc, e.account_id
    limit 12
  )

  select jsonb_build_object(
    'counts', jsonb_build_object(
      'members', (select count(*) from public.accounts a where a.is_active),
      'logs', (
        select count(*) from public.account_diary d
        where d.watched_at >= now() - interval '7 days'
      ),
      'films', (
        select count(distinct d.tmdb_id) from public.account_diary d
        where d.watched_at >= now() - interval '7 days'
      ),
      'reviews', (
        select count(*) from public.reviews r
        where r.tmdb_id is not null
          and r.content <> ''
          and r.created_at >= now() - interval '7 days'
      ),
      'lists', (select count(*) from public.lists l where not l.is_private)
    ),

    'popular', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tmdb_id', p.tmdb_id,
        'title', m.title,
        'poster_path', m.poster_path,
        'backdrop_path', m.backdrop_path,
        'release_date', m.release_date,
        'watchers', p.watchers,
        'members', p.members,
        'rating', p.rating,
        'faces', coalesce(f.faces, '[]'::jsonb)
      ) order by p.score desc, p.tmdb_id)
      from popular p
      join film_meta m on m.tmdb_id = p.tmdb_id
      left join faces f on f.tmdb_id = p.tmdb_id
    ), '[]'::jsonb),

    'rising', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tmdb_id', r.tmdb_id,
        'title', m.title,
        'poster_path', m.poster_path,
        'backdrop_path', m.backdrop_path,
        'release_date', m.release_date,
        'week', r.week,
        'lift', round(r.lift::numeric, 2)
      ) order by ln(1 + r.week) * r.lift desc, r.tmdb_id)
      from rising r
      left join film_meta m on m.tmdb_id = r.tmdb_id
    ), '[]'::jsonb),

    'top_rated', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tmdb_id', t.tmdb_id,
        'title', meta.title,
        'poster_path', meta.poster_path,
        'release_date', meta.release_date,
        'rating', t.rating_average,
        'ratings', t.ratings_count,
        'watched', t.watched_count
      ) order by t.weighted desc, t.tmdb_id)
      from top_rated t
      cross join lateral (
        select r.title, r.poster_path, r.release_date
        from public.reviews r
        where r.tmdb_id = t.tmdb_id and r.title is not null
        order by r.updated_at desc
        limit 1
      ) meta
    ), '[]'::jsonb),

    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'tmdb_id', b.tmdb_id,
        'title', b.title,
        'poster_path', b.poster_path,
        'backdrop_path', b.backdrop_path,
        'release_date', b.release_date,
        'rating', b.rating,
        'content', left(b.content, 900),
        'likes_count', b.likes_count,
        'created_at', b.created_at,
        'author', jsonb_build_object(
          'username', a.username,
          'display_name', a.display_name,
          'avatar_url', a.avatar_url
        )
      ) order by b.hot desc, b.id)
      from (
        select * from best_reviews where author_rank = 1
        order by hot desc, id
        limit 8
      ) b
      join public.accounts a on a.id = b.account_id
      where a.username is not null
    ), '[]'::jsonb),

    'lists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'slug', l.slug,
        'title', l.title,
        'description', l.description,
        'items_count', l.items_count,
        'likes_count', l.likes_count,
        'reviews_count', l.reviews_count,
        'owner', jsonb_build_object(
          'username', a.username,
          'display_name', a.display_name,
          'avatar_url', a.avatar_url
        ),
        'previews', coalesce((
          select jsonb_agg(i.poster_path order by i.position)
          from (
            select li.poster_path, li.position
            from public.list_items li
            where li.list_id = l.id
            order by li.position
            limit 5
          ) i
        ), '[]'::jsonb)
      ))
      from top_lists l
      join public.accounts a on a.id = l.account_id
      where a.username is not null
    ), '[]'::jsonb),

    'reviewers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'username', a.username,
        'display_name', a.display_name,
        'avatar_url', a.avatar_url,
        'bio', a.bio,
        'likes', r.likes,
        'followers', coalesce(s.followers_count, 0),
        'watched', coalesce(s.watched_count, 0),
        'reviews', coalesce(s.reviews_count, 0)
      ) order by r.likes desc, a.id)
      from reviewers r
      join public.accounts a on a.id = r.account_id
      left join public.account_stats s on s.account_id = a.id
      where a.username is not null
    ), '[]'::jsonb)
  );
$$;

CREATE FUNCTION public.get_list_page(p_account_id uuid, p_slug text, p_pattern text DEFAULT NULL::text, p_genre integer DEFAULT NULL::integer, p_decade integer DEFAULT NULL::integer, p_sort text DEFAULT 'position'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 36, p_comments integer DEFAULT 50) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    SET plan_cache_mode TO 'force_generic_plan'
    AS $$
declare
  v_viewer uuid := private.viewer_id();
  v_own boolean := coalesce(p_account_id = private.viewer_id(), false);
  v_list public.lists;
  v_size integer := least(greatest(coalesce(p_page_size, 36), 1), 100);
  v_total integer;
  v_page integer;
begin
  if p_account_id is null or p_slug is null then
    return null;
  end if;

  select * into v_list
  from public.lists l
  where l.account_id = p_account_id and l.slug = p_slug;

  -- A private list is its owner's; the rest show to whoever may see the
  -- owner, and so do their films, likes and comments.
  if v_list.id is null or not (
    v_own or (not v_list.is_private and private.can_view_account(p_account_id))
  ) then
    return null;
  end if;

  select count(*) into v_total
  from public.list_items li
  where li.list_id = v_list.id
    and (p_pattern is null or li.title ilike p_pattern)
    and (p_genre is null
         or li.payload @> jsonb_build_object('genre_ids', jsonb_build_array(p_genre)))
    and (p_decade is null
         or (li.release_date >= make_date(p_decade, 1, 1)
             and li.release_date < make_date(p_decade + 10, 1, 1)));

  -- A page past the last one reads as the last page there is.
  v_page := least(
    greatest(coalesce(p_page, 1), 1),
    greatest(1, ceil(v_total::numeric / v_size)::integer)
  );

  return jsonb_build_object(
    'list', jsonb_build_object(
      'id', v_list.id,
      'slug', v_list.slug,
      'title', v_list.title,
      'description', v_list.description,
      'is_private', v_list.is_private,
      'is_ranked', v_list.is_ranked,
      'items_count', v_list.items_count,
      'likes_count', v_list.likes_count,
      'reviews_count', v_list.reviews_count,
      'updated_at', v_list.updated_at,
      'liked', exists (
        select 1 from public.list_likes ll
        where ll.list_id = v_list.id and ll.account_id = v_viewer
      ),
      -- The first film's poster stands for the list.
      'poster_path', (
        select li.poster_path from public.list_items li
        where li.list_id = v_list.id
        order by li.position
        limit 1
      )
    ),

    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tmdb_id', i.tmdb_id,
        'title', i.title,
        'poster_path', i.poster_path,
        'release_date', i.release_date
      ) order by i.n)
      from (
        select li.tmdb_id, li.title, li.poster_path, li.release_date,
               row_number() over (order by
                 case when p_sort = 'position' then li.position end,
                 case when p_sort = 'added_asc' then li.created_at end,
                 case when p_sort = 'added_desc' then li.created_at end desc nulls last,
                 case when p_sort = 'release_asc' then li.release_date end nulls last,
                 case when p_sort = 'release_desc' then li.release_date end desc nulls last,
                 case when p_sort = 'title_asc' then li.title end,
                 case when p_sort = 'title_desc' then li.title end desc nulls last,
                 li.tmdb_id
               ) as n
        from public.list_items li
        where li.list_id = v_list.id
          and (p_pattern is null or li.title ilike p_pattern)
          and (p_genre is null
               or li.payload @> jsonb_build_object('genre_ids', jsonb_build_array(p_genre)))
          and (p_decade is null
               or (li.release_date >= make_date(p_decade, 1, 1)
                   and li.release_date < make_date(p_decade + 10, 1, 1)))
      ) i
      where i.n > (v_page - 1) * v_size and i.n <= v_page * v_size
    ), '[]'::jsonb),
    'items_total', v_total,
    'page', v_page,

    -- A comment shows to whoever may see its author, and every comment to
    -- the list's owner; an inactive author's comments show to no one else.
    'comments', (
      select jsonb_build_object(
        'rows', coalesce(jsonb_agg(jsonb_build_object(
          'id', c.id,
          'content', c.content,
          'likes_count', c.likes_count,
          'created_at', c.created_at,
          'liked', c.liked,
          'author', c.author
        ) order by c.n) filter (
          where c.n <= least(greatest(coalesce(p_comments, 50), 0), 100)
        ), '[]'::jsonb),
        'total', count(*)
      )
      from (
        select r.id, r.content, r.likes_count, r.created_at,
               jsonb_build_object(
                 'id', a.id,
                 'username', a.username,
                 'display_name', a.display_name,
                 'avatar_url', a.avatar_url
               ) as author,
               exists (
                 select 1 from public.review_likes rl
                 where rl.review_id = r.id and rl.account_id = v_viewer
               ) as liked,
               row_number() over (order by r.created_at desc, r.id) as n
        from public.reviews r
        join public.accounts a on a.id = r.account_id
        where r.list_id = v_list.id
          and (a.is_active or a.id = v_viewer)
          and (
            v_own
            or a.id = v_viewer
            or (not a.is_private or exists (
              select 1 from public.account_follows f
              where f.follower_id = v_viewer
                and f.following_id = a.id
                and f.status = 'accepted'
            ))
          )
      ) c
    ),

    -- The viewer's own comment, which the comment form starts from.
    'own_comment', case when v_viewer is not null then (
      select r.content from public.reviews r
      where r.list_id = v_list.id and r.account_id = v_viewer
    ) end
  );
end;
$$;

CREATE FUNCTION public.get_list_previews(p_list_ids uuid[], p_limit integer DEFAULT 5) RETURNS TABLE(list_id uuid, poster_path text)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select l.id, i.poster_path
  from unnest(p_list_ids[1:50]) with ordinality as l(id, ord)
  cross join lateral (
    select li.poster_path, li.position
    from public.list_items li
    where li.list_id = l.id
    order by li.position
    limit least(greatest(coalesce(p_limit, 5), 1), 10)
  ) i
  order by l.ord, i.position;
$$;

CREATE FUNCTION public.get_movie_social_proof(p_tmdb_id integer, p_limit integer DEFAULT 100) RETURNS TABLE(account_id uuid, username text, display_name text, avatar_url text, watched boolean, liked boolean, watchlisted boolean, reviewed boolean, rating numeric, total bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  WITH signals AS (
    SELECT
      a.id,
      a.username,
      a.display_name,
      a.avatar_url,
      w.account_id IS NOT NULL AS watched,
      l.account_id IS NOT NULL AS liked,
      wl.account_id IS NOT NULL AS watchlisted,
      COALESCE(char_length(btrim(r.content)) > 0, false) AS reviewed,
      r.rating,
      GREATEST(w.last_watched_at, l.created_at, wl.created_at, r.updated_at) AS acted_at
    FROM public.account_follows f
    JOIN public.accounts a
      ON a.id = f.following_id AND a.is_active AND a.username IS NOT NULL
    LEFT JOIN public.account_watched w
      ON w.account_id = a.id AND w.tmdb_id = p_tmdb_id
    LEFT JOIN public.account_likes l
      ON l.account_id = a.id AND l.tmdb_id = p_tmdb_id
    LEFT JOIN public.account_watchlist wl
      ON wl.account_id = a.id AND wl.tmdb_id = p_tmdb_id
    LEFT JOIN public.reviews r
      ON r.account_id = a.id AND r.tmdb_id = p_tmdb_id
    WHERE f.follower_id = (SELECT private.viewer_id())
      AND f.status = 'accepted'
      AND (
        w.account_id IS NOT NULL
        OR l.account_id IS NOT NULL
        OR wl.account_id IS NOT NULL
        OR r.id IS NOT NULL
      )
  )
  SELECT
    s.id,
    s.username,
    s.display_name,
    s.avatar_url,
    s.watched,
    s.liked,
    s.watchlisted,
    s.reviewed,
    s.rating,
    count(*) OVER () AS total
  FROM signals s
  ORDER BY s.acted_at DESC, s.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;

CREATE FUNCTION public.get_mutual_followers(p_account_id uuid, p_limit integer DEFAULT 3) RETURNS TABLE(account_id uuid, username text, display_name text, avatar_url text, total bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT
    a.id,
    a.username,
    a.display_name,
    a.avatar_url,
    count(*) OVER () AS total
  FROM public.account_follows mine
  JOIN public.account_follows theirs
    ON theirs.follower_id = mine.following_id
   AND theirs.following_id = p_account_id
   AND theirs.status = 'accepted'
  JOIN public.accounts a
    ON a.id = mine.following_id AND a.is_active AND a.username IS NOT NULL
  WHERE mine.follower_id = (SELECT private.viewer_id())
    AND mine.status = 'accepted'
  ORDER BY theirs.created_at DESC, a.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 1), 20);
$$;

CREATE FUNCTION public.get_rating_spread(p_account_id uuid) RETURNS integer[]
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select array_agg(coalesce(c.n, 0)::integer order by s.step)
  from generate_series(1, 10) as s(step)
  left join (
    select (r.rating * 2)::integer as step, count(*) as n
    from public.reviews r
    where r.account_id = p_account_id
      and r.tmdb_id is not null
      and r.rating is not null
    group by 1
  ) c on c.step = s.step;
$$;

CREATE FUNCTION public.get_review_stats(p_tmdb_id integer, p_username text DEFAULT NULL::text) RETURNS TABLE(average numeric, rated bigint, total bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select round(avg(r.rating), 1), count(r.rating), count(*)
  from public.reviews r
  where r.tmdb_id = p_tmdb_id
    and (p_username is null or r.account_id = (
      select a.id from public.accounts a where a.username = lower(p_username)
    ));
$$;

CREATE FUNCTION public.prune_account_data() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_sessions      integer;
  v_verifications integer;
BEGIN
  DELETE FROM public.auth_sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM public.auth_verifications WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS v_verifications = ROW_COUNT;

  RETURN jsonb_build_object('sessions', v_sessions, 'verifications', v_verifications);
END;
$$;

CREATE FUNCTION public.reactivate_current_account() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  UPDATE public.accounts SET is_active = true WHERE id = (SELECT private.viewer_id());
$$;

CREATE FUNCTION public.refresh_account_stats(p_account_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.account_stats as s (
    account_id, followers_count, following_count,
    watched_count, watchlist_count, likes_count, lists_count, reviews_count, diary_count
  )
  select
    p_account_id,
    (select count(*) from public.account_follows where following_id = p_account_id and status = 'accepted'),
    (select count(*) from public.account_follows where follower_id = p_account_id and status = 'accepted'),
    (select count(*) from public.account_watched where account_id = p_account_id),
    (select count(*) from public.account_watchlist where account_id = p_account_id),
    (select count(*) from public.account_likes where account_id = p_account_id),
    (select count(*) from public.lists where account_id = p_account_id),
    (select count(*) from public.reviews where account_id = p_account_id and tmdb_id is not null),
    (select count(*) from public.account_diary where account_id = p_account_id)
  on conflict (account_id) do update set
    followers_count = excluded.followers_count,
    following_count = excluded.following_count,
    watched_count   = excluded.watched_count,
    watchlist_count = excluded.watchlist_count,
    likes_count     = excluded.likes_count,
    lists_count     = excluded.lists_count,
    reviews_count   = excluded.reviews_count,
    diary_count     = excluded.diary_count,
    updated_at      = now();
$$;

CREATE FUNCTION public.refresh_film_stats() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  with
    watched as (
      select tmdb_id, count(*)::int as n from public.account_watched group by 1
    ),
    liked as (
      select tmdb_id, count(*)::int as n from public.account_likes group by 1
    ),
    watchlist as (
      select tmdb_id, count(*)::int as n from public.account_watchlist group by 1
    ),
    listed as (
      select i.tmdb_id, count(*)::int as n
      from public.list_items i
      join public.lists l on l.id = i.list_id
      where not l.is_private
      group by 1
    ),
    reviewed as (
      select
        tmdb_id,
        (count(*) filter (where char_length(btrim(content)) > 0))::int as written,
        array[
          count(*) filter (where rating = 0.5), count(*) filter (where rating = 1.0),
          count(*) filter (where rating = 1.5), count(*) filter (where rating = 2.0),
          count(*) filter (where rating = 2.5), count(*) filter (where rating = 3.0),
          count(*) filter (where rating = 3.5), count(*) filter (where rating = 4.0),
          count(*) filter (where rating = 4.5), count(*) filter (where rating = 5.0)
        ]::integer[] as ratings
      from public.reviews
      where tmdb_id is not null
      group by 1
    ),
    titles as (
      select tmdb_id from watched
      union select tmdb_id from liked
      union select tmdb_id from watchlist
      union select tmdb_id from listed
      union select tmdb_id from reviewed
    ),
    counted as (
      select
        f.tmdb_id,
        coalesce(w.n, 0) as watched_count,
        coalesce(l.n, 0) as liked_count,
        coalesce(i.n, 0) as listed_count,
        coalesce(q.n, 0) as watchlist_count,
        coalesce(r.written, 0) as reviews_count,
        coalesce(r.ratings, array_fill(0, array[10])) as ratings
      from titles f
      left join watched w using (tmdb_id)
      left join liked l using (tmdb_id)
      left join listed i using (tmdb_id)
      left join watchlist q using (tmdb_id)
      left join reviewed r using (tmdb_id)
    ),
    gone as (
      delete from public.film_stats s
      where not exists (select 1 from titles f where f.tmdb_id = s.tmdb_id)
    )
  insert into public.film_stats as s (
    tmdb_id, watched_count, liked_count, listed_count, watchlist_count, reviews_count, ratings
  )
  select * from counted
  on conflict (tmdb_id) do update
  set watched_count = excluded.watched_count,
      liked_count = excluded.liked_count,
      listed_count = excluded.listed_count,
      watchlist_count = excluded.watchlist_count,
      reviews_count = excluded.reviews_count,
      ratings = excluded.ratings,
      updated_at = now()
  where (s.watched_count, s.liked_count, s.listed_count, s.watchlist_count, s.reviews_count, s.ratings)
    is distinct from
    (excluded.watched_count, excluded.liked_count, excluded.listed_count, excluded.watchlist_count, excluded.reviews_count, excluded.ratings);
end;
$$;

CREATE FUNCTION public.reorder_list_items(p_list_id uuid, p_tmdb_ids integer[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM 1 FROM public.lists l
  WHERE l.id = p_list_id AND l.account_id = (SELECT private.viewer_id())
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_count FROM public.list_items WHERE list_id = p_list_id;
  IF coalesce(cardinality(p_tmdb_ids), 0) <> v_count
    OR (SELECT count(DISTINCT x) FROM unnest(p_tmdb_ids) AS x) <> v_count
    OR EXISTS (
      SELECT 1 FROM unnest(p_tmdb_ids) AS x
      WHERE NOT EXISTS (SELECT 1 FROM public.list_items i WHERE i.list_id = p_list_id AND i.tmdb_id = x)
    ) THEN
    RAISE EXCEPTION 'The order must contain every list item exactly once' USING ERRCODE = '22023';
  END IF;

  -- the position constraint is deferred, so the swap is valid at commit
  UPDATE public.list_items i
  SET position = o.ord
  FROM unnest(p_tmdb_ids) WITH ORDINALITY AS o(id, ord)
  WHERE i.list_id = p_list_id AND i.tmdb_id = o.id;

  UPDATE public.lists SET updated_at = now() WHERE id = p_list_id;
END;
$$;

CREATE FUNCTION public.search_accounts(p_query text, p_limit integer DEFAULT 20) RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, is_private boolean, followers_count integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    SET plan_cache_mode TO 'force_custom_plan'
    AS $$
declare
  v_text text := btrim(p_query);
  v_prefix text;
  v_contains text;
begin
  if v_text is null or char_length(v_text) not between 2 and 100 then
    return;
  end if;
  v_prefix := private.like_escape(v_text) || '%';
  v_contains := '%' || v_prefix;

  return query
  select a.id, a.username, a.display_name, a.avatar_url::text, a.is_private,
         coalesce(s.followers_count, 0)
  from public.accounts a
  left join public.account_stats s on s.account_id = a.id
  where a.is_active
    and a.username is not null
    and (a.username ilike v_contains or a.display_name ilike v_contains)
  order by
    (a.username ilike v_prefix or a.display_name ilike v_prefix) desc,
    s.followers_count desc nulls last,
    a.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

CREATE FUNCTION public.search_lists(p_query text, p_limit integer DEFAULT 20) RETURNS TABLE(id uuid, slug text, title text, poster_path text, items_count integer, likes_count integer, owner_username text, owner_display_name text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    SET plan_cache_mode TO 'force_custom_plan'
    AS $$
declare
  v_text text := btrim(p_query);
  v_viewer uuid := private.viewer_id();
  v_prefix text;
  v_contains text;
begin
  if v_text is null or char_length(v_text) not between 2 and 100 then
    return;
  end if;
  v_prefix := private.like_escape(v_text) || '%';
  v_contains := '%' || v_prefix;

  return query
  select l.id, l.slug, l.title, l.poster_path::text, l.items_count, l.likes_count,
         a.username, a.display_name
  from public.lists l
  join public.accounts a on a.id = l.account_id
  where l.title ilike v_contains
    and a.username is not null
    and (
      l.account_id = v_viewer
      or (not l.is_private and a.is_active and (not a.is_private or exists (
        select 1 from public.account_follows f
        where f.follower_id = v_viewer
          and f.following_id = a.id
          and f.status = 'accepted'
      )))
    )
  order by (l.title ilike v_prefix) desc, l.likes_count desc, l.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

CREATE FUNCTION public.search_reviews(p_query text, p_limit integer DEFAULT 40) RETURNS TABLE(id uuid, content text, is_spoiler boolean, rating numeric, likes_count integer, tmdb_id integer, title text, poster_path text, release_date date, author_username text, author_display_name text, author_avatar_url text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    SET plan_cache_mode TO 'force_custom_plan'
    AS $$
declare
  v_text text := btrim(p_query);
  v_viewer uuid := private.viewer_id();
  v_contains text;
begin
  if v_text is null or char_length(v_text) not between 2 and 100 then
    return;
  end if;
  v_contains := '%' || private.like_escape(v_text) || '%';

  return query
  select r.id, r.content, r.is_spoiler, r.rating, r.likes_count, r.tmdb_id,
         r.title, r.poster_path::text, r.release_date,
         a.username, a.display_name, a.avatar_url::text
  from public.reviews r
  join public.accounts a on a.id = r.account_id
  where r.tmdb_id is not null
    and (r.title ilike v_contains or r.content ilike v_contains)
    and a.username is not null
    and (
      r.account_id = v_viewer
      or (a.is_active and (not a.is_private or exists (
        select 1 from public.account_follows f
        where f.follower_id = v_viewer
          and f.following_id = a.id
          and f.status = 'accepted'
      )))
    )
  order by r.likes_count desc, r.updated_at desc, r.id
  limit least(greatest(coalesce(p_limit, 40), 1), 100);
end;
$$;

CREATE FUNCTION public.seed_apply_profiles(p_profiles jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_count integer;
begin
  update public.accounts a
  set avatar_url = p.avatar_url,
      background_url = p.background_url,
      bio = p.bio,
      created_at = p.created_at,
      is_private = p.is_private
  from jsonb_to_recordset(p_profiles) as p(
    id uuid,
    avatar_url text,
    background_url text,
    bio text,
    created_at timestamptz,
    is_private boolean
  )
  where a.id = p.id
    and a.id = any(private.seed_account_ids(array(
      select (e ->> 'id')::uuid from jsonb_array_elements(p_profiles) e
    )));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

CREATE FUNCTION public.seed_backdate(p_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_ids uuid[] := private.seed_account_ids(p_ids);
begin
  update public.account_watched w
  set created_at = w.first_watched_at
  where w.account_id = any(v_ids)
    and w.created_at > w.first_watched_at;

  with moments (account_id, key, at) as (
    select account_id, 'diary:' || id, created_at
    from public.account_diary where account_id = any(v_ids)
    union all
    select account_id, 'watched:' || tmdb_id, first_watched_at
    from public.account_watched where account_id = any(v_ids)
    union all
    select account_id, 'like:' || tmdb_id, created_at
    from public.account_likes where account_id = any(v_ids)
    union all
    select account_id, 'watchlist:' || tmdb_id, created_at
    from public.account_watchlist where account_id = any(v_ids)
    union all
    select account_id, 'review:' || id, created_at
    from public.reviews where account_id = any(v_ids)
    union all
    select account_id, 'review-like:' || review_id || ':' || account_id, created_at
    from public.review_likes where account_id = any(v_ids)
    union all
    select account_id, 'list-like:' || list_id || ':' || account_id, created_at
    from public.list_likes where account_id = any(v_ids)
    union all
    select account_id, 'list:' || id, created_at
    from public.lists where account_id = any(v_ids)
    union all
    select follower_id, 'follow:' || following_id, coalesce(responded_at, created_at)
    from public.account_follows where follower_id = any(v_ids)
  )
  update public.account_activity a
  set created_at = m.at
  from moments m
  where a.account_id = m.account_id
    and a.dedupe_key = m.key
    and a.account_id = any(v_ids)
    and a.created_at is distinct from m.at;

  with moments (user_id, key, at) as (
    select r.account_id, 'review-like:' || rl.review_id || ':' || rl.account_id, rl.created_at
    from public.review_likes rl
    join public.reviews r on r.id = rl.review_id
    where r.account_id = any(v_ids)
    union all
    select l.account_id, 'list-like:' || ll.list_id || ':' || ll.account_id, ll.created_at
    from public.list_likes ll
    join public.lists l on l.id = ll.list_id
    where l.account_id = any(v_ids)
    union all
    select l.account_id, 'list-comment:' || r.id, r.created_at
    from public.reviews r
    join public.lists l on l.id = r.list_id
    where l.account_id = any(v_ids)
    union all
    select following_id, 'new-follower:' || follower_id, created_at
    from public.account_follows
    where following_id = any(v_ids) and status = 'accepted'
    union all
    select following_id, 'follow-request:' || follower_id, created_at
    from public.account_follows
    where following_id = any(v_ids) and status = 'pending'
  )
  update public.notifications n
  set created_at = m.at,
      read = seen.read,
      read_at = case
        when seen.read then least(now(), m.at + random() * interval '36 hours')
      end
  from moments m,
    lateral (
      select m.at < now() - interval '2 days' and random() < 0.85 as read
    ) seen
  where n.user_id = m.user_id
    and n.dedupe_key = m.key
    and n.user_id = any(v_ids);

  update public.lists l
  set updated_at = greatest(l.created_at, i.last_added)
  from (
    select list_id, max(created_at) as last_added
    from public.list_items
    where list_id in (select id from public.lists where account_id = any(v_ids))
    group by list_id
  ) i
  where i.list_id = l.id;

  perform public.refresh_account_stats(id) from unnest(v_ids) as id;

  return cardinality(v_ids);
end;
$$;

CREATE FUNCTION private.reviews_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  -- list comments are not film reviews
  if TG_OP = 'INSERT' and NEW.tmdb_id is not null then
    perform private.adjust_stat(NEW.account_id, 'reviews_count', 1);
  elsif TG_OP = 'DELETE' and OLD.tmdb_id is not null then
    perform private.adjust_stat(OLD.account_id, 'reviews_count', -1);
  end if;
  return null;
end;
$$;

SET LOCAL default_tablespace = '';

SET LOCAL default_table_access_method = heap;

CREATE TABLE public.accounts (
    id uuid NOT NULL,
    username text,
    display_name text,
    avatar_url public.http_url,
    background_url public.http_url,
    bio text,
    is_private boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deactivated_at timestamp with time zone,
    status text GENERATED ALWAYS AS (
CASE
    WHEN is_active THEN 'active'::text
    ELSE 'deactivated'::text
END) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounts_bio_length CHECK (((bio IS NULL) OR (char_length(bio) <= 500))),
    CONSTRAINT accounts_display_name_length CHECK (((display_name IS NULL) OR ((char_length(btrim(display_name)) >= 1) AND (char_length(btrim(display_name)) <= 80)))),
    CONSTRAINT accounts_username_format CHECK (((username IS NULL) OR ((username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'::text) AND (NOT private.is_reserved_username(username)))))
);

COMMENT ON TABLE public.accounts IS 'Public profile of an auth user. Rows are created by private.handle_new_user and changed only through public.update_account.';

CREATE FUNCTION public.update_account(p_avatar_url text DEFAULT '__UNCHANGED__'::text, p_bio text DEFAULT '__UNCHANGED__'::text, p_display_name text DEFAULT '__UNCHANGED__'::text, p_is_private boolean DEFAULT NULL::boolean, p_username text DEFAULT '__UNCHANGED__'::text, p_background_url text DEFAULT '__UNCHANGED__'::text) RETURNS SETOF public.accounts
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := private.viewer_id();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  update public.accounts a
  set
    avatar_url     = case when p_avatar_url = '__UNCHANGED__' then a.avatar_url else nullif(btrim(p_avatar_url), '') end,
    background_url = case when p_background_url = '__UNCHANGED__' then a.background_url else nullif(btrim(p_background_url), '') end,
    bio            = case when p_bio = '__UNCHANGED__' then a.bio else nullif(btrim(p_bio), '') end,
    display_name   = case when p_display_name = '__UNCHANGED__' then a.display_name else coalesce(nullif(btrim(p_display_name), ''), a.display_name) end,
    username       = case when p_username = '__UNCHANGED__' then a.username else coalesce(nullif(lower(btrim(p_username)), ''), a.username) end,
    is_private     = coalesce(p_is_private, a.is_private)
  where a.id = v_user_id
  returning a.*;
end;
$$;

CREATE TABLE public.account_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    type text NOT NULL,
    tmdb_id integer,
    list_id uuid,
    review_id uuid,
    target_account_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    dedupe_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_activity_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) <= 4096))),
    CONSTRAINT account_activity_type_check CHECK ((type = ANY (ARRAY['WATCHED_ADDED'::text, 'WATCHLIST_ADDED'::text, 'LIKED_ADDED'::text, 'WATCH_DIARY_LOGGED'::text, 'WATCH_DIARY_REWATCHED'::text, 'REVIEW_PUBLISHED'::text, 'RATING_LOGGED'::text, 'REVIEW_LIKED'::text, 'LIST_CREATED'::text, 'LIST_LIKED'::text, 'LIST_COMMENTED'::text])))
);

CREATE TABLE public.account_diary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    watched_on date DEFAULT CURRENT_DATE NOT NULL,
    watched_at timestamp with time zone DEFAULT now() NOT NULL,
    is_rewatch boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_diary_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT account_diary_tmdb_id_check CHECK ((tmdb_id > 0))
);

CREATE TABLE public.account_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    email text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_emails_lowercase CHECK ((email = lower(btrim(email))))
);

CREATE TABLE public.account_favorites (
    account_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    "position" smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_favorites_position_check CHECK ((("position" >= 1) AND ("position" <= 5)))
);

CREATE TABLE public.account_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_follows_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT chk_no_self_follow CHECK ((follower_id <> following_id))
);

ALTER TABLE ONLY public.account_follows REPLICA IDENTITY FULL;

CREATE TABLE public.account_likes (
    account_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_likes_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) <= 4096))),
    CONSTRAINT account_likes_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT account_likes_tmdb_id_check CHECK ((tmdb_id > 0))
);

CREATE TABLE public.account_stats (
    account_id uuid NOT NULL,
    followers_count integer DEFAULT 0 NOT NULL,
    following_count integer DEFAULT 0 NOT NULL,
    watched_count integer DEFAULT 0 NOT NULL,
    watchlist_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    lists_count integer DEFAULT 0 NOT NULL,
    reviews_count integer DEFAULT 0 NOT NULL,
    diary_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_stats_diary_count_check CHECK ((diary_count >= 0)),
    CONSTRAINT account_stats_followers_count_check CHECK ((followers_count >= 0)),
    CONSTRAINT account_stats_following_count_check CHECK ((following_count >= 0)),
    CONSTRAINT account_stats_likes_count_check CHECK ((likes_count >= 0)),
    CONSTRAINT account_stats_lists_count_check CHECK ((lists_count >= 0)),
    CONSTRAINT account_stats_reviews_count_check CHECK ((reviews_count >= 0)),
    CONSTRAINT account_stats_watched_count_check CHECK ((watched_count >= 0)),
    CONSTRAINT account_stats_watchlist_count_check CHECK ((watchlist_count >= 0))
);

CREATE TABLE public.account_watched (
    account_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    first_watched_at timestamp with time zone DEFAULT now() NOT NULL,
    last_watched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_watched_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) <= 4096))),
    CONSTRAINT account_watched_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT account_watched_tmdb_id_check CHECK ((tmdb_id > 0))
);

CREATE TABLE public.account_watchlist (
    account_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_watchlist_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) <= 4096))),
    CONSTRAINT account_watchlist_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT account_watchlist_tmdb_id_check CHECK ((tmdb_id > 0))
);

CREATE TABLE public.auth_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.auth_passkeys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text,
    public_key text NOT NULL,
    credential_id text NOT NULL,
    counter integer NOT NULL,
    device_type text NOT NULL,
    backed_up boolean NOT NULL,
    transports text,
    aaguid text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    is_seed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.auth_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.film_stats (
    tmdb_id integer NOT NULL,
    watched_count integer DEFAULT 0 NOT NULL,
    liked_count integer DEFAULT 0 NOT NULL,
    listed_count integer DEFAULT 0 NOT NULL,
    watchlist_count integer DEFAULT 0 NOT NULL,
    reviews_count integer DEFAULT 0 NOT NULL,
    ratings integer[] DEFAULT array_fill(0, ARRAY[10]) NOT NULL,
    ratings_count integer GENERATED ALWAYS AS ((((((((((ratings[1] + ratings[2]) + ratings[3]) + ratings[4]) + ratings[5]) + ratings[6]) + ratings[7]) + ratings[8]) + ratings[9]) + ratings[10])) STORED,
    rating_average numeric(3,2) GENERATED ALWAYS AS (round((((((((((((((ratings[1] * 1) + (ratings[2] * 2)) + (ratings[3] * 3)) + (ratings[4] * 4)) + (ratings[5] * 5)) + (ratings[6] * 6)) + (ratings[7] * 7)) + (ratings[8] * 8)) + (ratings[9] * 9)) + (ratings[10] * 10)))::numeric / (2)::numeric) / (NULLIF((((((((((ratings[1] + ratings[2]) + ratings[3]) + ratings[4]) + ratings[5]) + ratings[6]) + ratings[7]) + ratings[8]) + ratings[9]) + ratings[10]), 0))::numeric), 2)) STORED,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT film_stats_liked_count_check CHECK ((liked_count >= 0)),
    CONSTRAINT film_stats_listed_count_check CHECK ((listed_count >= 0)),
    CONSTRAINT film_stats_ratings_check CHECK ((cardinality(ratings) = 10)),
    CONSTRAINT film_stats_reviews_count_check CHECK ((reviews_count >= 0)),
    CONSTRAINT film_stats_tmdb_id_check CHECK ((tmdb_id > 0)),
    CONSTRAINT film_stats_watched_count_check CHECK ((watched_count >= 0)),
    CONSTRAINT film_stats_watchlist_count_check CHECK ((watchlist_count >= 0))
);

CREATE TABLE public.list_items (
    list_id uuid NOT NULL,
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT list_items_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) <= 4096))),
    CONSTRAINT list_items_position_check CHECK ((("position" >= 0) AND ("position" <= 2000))),
    CONSTRAINT list_items_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT list_items_tmdb_id_check CHECK ((tmdb_id > 0))
);

CREATE TABLE public.list_likes (
    list_id uuid NOT NULL,
    account_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    slug text DEFAULT ''::text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    is_ranked boolean DEFAULT false NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    items_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    reviews_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lists_description_check CHECK ((char_length(description) <= 2000)),
    CONSTRAINT lists_items_count_check CHECK ((items_count >= 0)),
    CONSTRAINT lists_likes_count_check CHECK ((likes_count >= 0)),
    CONSTRAINT lists_reviews_count_check CHECK ((reviews_count >= 0)),
    CONSTRAINT lists_slug_format CHECK (((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND (char_length(slug) <= 80))),
    CONSTRAINT lists_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 120)))
);

CREATE TABLE public.film_catalog (
    tmdb_id integer NOT NULL,
    title text NOT NULL,
    original_title text,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    status text,
    original_language text,
    origin_countries text[] DEFAULT '{}'::text[] NOT NULL,
    genre_ids integer[] DEFAULT '{}'::integer[] NOT NULL,
    runtime_minutes integer,
    vote_average numeric(4,2),
    vote_count integer DEFAULT 0 NOT NULL,
    popularity numeric DEFAULT 0 NOT NULL,
    quality_score real DEFAULT 0 NOT NULL,
    quality_flags text[] DEFAULT '{}'::text[] NOT NULL,
    eligible boolean DEFAULT false NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT film_catalog_runtime_minutes_check CHECK (((runtime_minutes IS NULL) OR (runtime_minutes >= 0))),
    CONSTRAINT film_catalog_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT film_catalog_tmdb_id_check CHECK ((tmdb_id > 0)),
    CONSTRAINT film_catalog_vote_count_check CHECK ((vote_count >= 0))
);

CREATE TABLE public.film_catalog_overrides (
    tmdb_id integer NOT NULL,
    verdict text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT film_catalog_overrides_note_check CHECK ((char_length(note) <= 500)),
    CONSTRAINT film_catalog_overrides_tmdb_id_check CHECK ((tmdb_id > 0)),
    CONSTRAINT film_catalog_overrides_verdict_check CHECK ((verdict = ANY (ARRAY['allow'::text, 'deny'::text])))
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    actor_id uuid,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    list_id uuid,
    review_id uuid,
    dedupe_key text,
    read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (pg_column_size(payload) <= 4096))),
    CONSTRAINT notifications_type_check CHECK ((type ~ '^[A-Z][A-Z0-9_]*$'::text))
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;

CREATE TABLE public.review_likes (
    review_id uuid NOT NULL,
    account_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    tmdb_id integer,
    list_id uuid,
    title text,
    poster_path public.tmdb_path,
    backdrop_path public.tmdb_path,
    release_date date,
    content text DEFAULT ''::text NOT NULL,
    rating numeric(2,1),
    is_spoiler boolean DEFAULT false NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_content_check CHECK ((char_length(content) <= 8000)),
    CONSTRAINT reviews_likes_count_check CHECK ((likes_count >= 0)),
    CONSTRAINT reviews_not_empty CHECK (((char_length(btrim(content)) > 0) OR (rating IS NOT NULL))),
    CONSTRAINT reviews_rating_range CHECK (((rating IS NULL) OR ((rating >= 0.5) AND (rating <= 5.0) AND ((rating * (2)::numeric) = trunc((rating * (2)::numeric)))))),
    CONSTRAINT reviews_subject CHECK ((((tmdb_id IS NOT NULL) AND (list_id IS NULL) AND (title IS NOT NULL)) OR ((list_id IS NOT NULL) AND (tmdb_id IS NULL) AND (title IS NULL)))),
    CONSTRAINT reviews_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 300))),
    CONSTRAINT reviews_tmdb_id_check CHECK ((tmdb_id > 0))
);

ALTER TABLE ONLY public.account_activity
    ADD CONSTRAINT account_activity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.account_diary
    ADD CONSTRAINT account_diary_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.account_emails
    ADD CONSTRAINT account_emails_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.account_favorites
    ADD CONSTRAINT account_favorites_pkey PRIMARY KEY (account_id, tmdb_id);

ALTER TABLE ONLY public.account_follows
    ADD CONSTRAINT account_follows_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.account_likes
    ADD CONSTRAINT account_likes_pkey PRIMARY KEY (account_id, tmdb_id);

ALTER TABLE ONLY public.account_stats
    ADD CONSTRAINT account_stats_pkey PRIMARY KEY (account_id);

ALTER TABLE ONLY public.account_watched
    ADD CONSTRAINT account_watched_pkey PRIMARY KEY (account_id, tmdb_id);

ALTER TABLE ONLY public.account_watchlist
    ADD CONSTRAINT account_watchlist_pkey PRIMARY KEY (account_id, tmdb_id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_username_key UNIQUE (username);

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_provider_id_account_id_key UNIQUE (provider_id, account_id);

ALTER TABLE ONLY public.auth_passkeys
    ADD CONSTRAINT auth_passkeys_credential_id_key UNIQUE (credential_id);

ALTER TABLE ONLY public.auth_passkeys
    ADD CONSTRAINT auth_passkeys_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_token_key UNIQUE (token);

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_verifications
    ADD CONSTRAINT auth_verifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.list_items
    ADD CONSTRAINT list_items_pkey PRIMARY KEY (list_id, tmdb_id);

ALTER TABLE ONLY public.list_likes
    ADD CONSTRAINT list_likes_pkey PRIMARY KEY (list_id, account_id);

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.film_catalog_overrides
    ADD CONSTRAINT film_catalog_overrides_pkey PRIMARY KEY (tmdb_id);

ALTER TABLE ONLY public.film_catalog
    ADD CONSTRAINT film_catalog_pkey PRIMARY KEY (tmdb_id);

ALTER TABLE ONLY public.film_stats
    ADD CONSTRAINT film_stats_pkey PRIMARY KEY (tmdb_id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_pkey PRIMARY KEY (review_id, account_id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.account_activity
    ADD CONSTRAINT uq_account_activity_dedupe UNIQUE (account_id, dedupe_key);

ALTER TABLE ONLY public.account_favorites
    ADD CONSTRAINT uq_account_favorites_position UNIQUE (account_id, "position") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.account_follows
    ADD CONSTRAINT uq_account_follows UNIQUE (follower_id, following_id);

ALTER TABLE ONLY public.list_items
    ADD CONSTRAINT uq_list_items_position UNIQUE (list_id, "position") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT uq_lists_account_slug UNIQUE (account_id, slug);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_reviews_account_list UNIQUE (account_id, list_id);

CREATE INDEX idx_account_activity_account_created ON public.account_activity USING btree (account_id, created_at DESC);

CREATE INDEX idx_account_activity_list ON public.account_activity USING btree (list_id) WHERE (list_id IS NOT NULL);

CREATE INDEX idx_account_activity_review ON public.account_activity USING btree (review_id) WHERE (review_id IS NOT NULL);

CREATE INDEX idx_account_activity_target ON public.account_activity USING btree (target_account_id) WHERE (target_account_id IS NOT NULL);

CREATE INDEX idx_account_diary_account_day ON public.account_diary USING btree (account_id, watched_on DESC, watched_at DESC);

CREATE INDEX idx_account_diary_account_film ON public.account_diary USING btree (account_id, tmdb_id, watched_on DESC);

CREATE INDEX idx_account_diary_recent ON public.account_diary USING btree (watched_at);

CREATE INDEX idx_account_emails_account ON public.account_emails USING btree (account_id);

CREATE INDEX idx_account_follows_follower ON public.account_follows USING btree (follower_id, status, created_at DESC);

CREATE INDEX idx_account_follows_following ON public.account_follows USING btree (following_id, status, created_at DESC);

CREATE INDEX idx_account_likes_created ON public.account_likes USING btree (account_id, created_at DESC);

CREATE INDEX idx_account_likes_recent ON public.account_likes USING btree (created_at);

CREATE INDEX idx_account_watched_last ON public.account_watched USING btree (account_id, last_watched_at DESC);

CREATE INDEX idx_account_watched_recent ON public.account_watched USING btree (last_watched_at);

CREATE INDEX idx_account_watchlist_created ON public.account_watchlist USING btree (account_id, created_at DESC);

CREATE INDEX idx_account_watchlist_recent ON public.account_watchlist USING btree (created_at);

CREATE INDEX idx_accounts_display_name_trgm ON public.accounts USING gin (display_name extensions.gin_trgm_ops);

CREATE INDEX idx_accounts_username_trgm ON public.accounts USING gin (username extensions.gin_trgm_ops);

CREATE INDEX idx_auth_accounts_user ON public.auth_accounts USING btree (user_id);

CREATE INDEX idx_auth_passkeys_user ON public.auth_passkeys USING btree (user_id);

CREATE INDEX idx_auth_sessions_user ON public.auth_sessions USING btree (user_id);

CREATE INDEX idx_auth_verifications_identifier ON public.auth_verifications USING btree (identifier);

CREATE INDEX idx_list_likes_account ON public.list_likes USING btree (account_id, created_at DESC);

CREATE INDEX idx_lists_account_updated ON public.lists USING btree (account_id, updated_at DESC);

CREATE INDEX idx_lists_title_trgm ON public.lists USING gin (title extensions.gin_trgm_ops);

CREATE INDEX idx_film_catalog_popular ON public.film_catalog USING btree (popularity DESC) WHERE eligible;

CREATE INDEX idx_film_catalog_quality ON public.film_catalog USING btree (eligible, quality_score DESC);

CREATE INDEX idx_film_catalog_stale ON public.film_catalog USING btree (fetched_at);

CREATE INDEX idx_film_catalog_title_trgm ON public.film_catalog USING gin (title extensions.gin_trgm_ops);

CREATE INDEX idx_notifications_actor ON public.notifications USING btree (actor_id);

CREATE INDEX idx_notifications_list ON public.notifications USING btree (list_id) WHERE (list_id IS NOT NULL);

CREATE INDEX idx_notifications_read_created ON public.notifications USING btree (created_at) WHERE read;

CREATE INDEX idx_notifications_review ON public.notifications USING btree (review_id) WHERE (review_id IS NOT NULL);

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (NOT read);

CREATE INDEX idx_review_likes_account ON public.review_likes USING btree (account_id, created_at DESC);

CREATE INDEX idx_reviews_account_updated ON public.reviews USING btree (account_id, updated_at DESC);

CREATE INDEX idx_reviews_content_trgm ON public.reviews USING gin (content extensions.gin_trgm_ops);

CREATE INDEX idx_reviews_list_updated ON public.reviews USING btree (list_id, updated_at DESC) WHERE (list_id IS NOT NULL);

CREATE INDEX idx_reviews_film_updated ON public.reviews USING btree (tmdb_id, updated_at DESC) WHERE (tmdb_id IS NOT NULL);

CREATE INDEX idx_reviews_movie_likes ON public.reviews USING btree (likes_count DESC, updated_at DESC, id) WHERE (tmdb_id IS NOT NULL);

CREATE INDEX idx_reviews_movie_recent ON public.reviews USING btree (updated_at) WHERE (tmdb_id IS NOT NULL);

CREATE INDEX idx_reviews_recent ON public.reviews USING btree (created_at) WHERE (tmdb_id IS NOT NULL);

CREATE INDEX idx_reviews_title_trgm ON public.reviews USING gin (title extensions.gin_trgm_ops) WHERE (tmdb_id IS NOT NULL);

CREATE UNIQUE INDEX uq_account_emails_email ON public.account_emails USING btree (email);

CREATE UNIQUE INDEX uq_account_emails_primary ON public.account_emails USING btree (account_id) WHERE is_primary;

CREATE UNIQUE INDEX uq_notifications_dedupe ON public.notifications USING btree (user_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);

CREATE UNIQUE INDEX uq_reviews_account_film ON public.reviews USING btree (account_id, tmdb_id) WHERE (tmdb_id IS NOT NULL);

CREATE TRIGGER on_auth_user_created AFTER INSERT ON public.auth_users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE TRIGGER on_auth_user_email_changed AFTER UPDATE OF email, email_verified ON public.auth_users FOR EACH ROW EXECUTE FUNCTION private.handle_user_email_change();

CREATE TRIGGER trg_account_diary_after_change AFTER INSERT OR DELETE ON public.account_diary FOR EACH ROW EXECUTE FUNCTION private.account_diary_after_change();

CREATE TRIGGER trg_account_diary_before_write BEFORE INSERT OR UPDATE ON public.account_diary FOR EACH ROW EXECUTE FUNCTION private.account_diary_before_write();

CREATE TRIGGER trg_account_diary_count AFTER INSERT OR DELETE ON public.account_diary FOR EACH ROW EXECUTE FUNCTION private.count_rows('diary_count');

CREATE TRIGGER trg_account_favorites_keys BEFORE UPDATE ON public.account_favorites FOR EACH ROW EXECUTE FUNCTION private.forbid_column_change('account_id', 'tmdb_id');

CREATE TRIGGER trg_account_follows_after_change AFTER INSERT OR DELETE OR UPDATE ON public.account_follows FOR EACH ROW EXECUTE FUNCTION private.account_follows_after_change();

CREATE TRIGGER trg_account_follows_before_insert BEFORE INSERT ON public.account_follows FOR EACH ROW EXECUTE FUNCTION private.account_follows_before_insert();

CREATE TRIGGER trg_account_follows_before_update BEFORE UPDATE ON public.account_follows FOR EACH ROW EXECUTE FUNCTION private.account_follows_before_update();

CREATE TRIGGER trg_account_likes_after_change AFTER INSERT OR DELETE ON public.account_likes FOR EACH ROW EXECUTE FUNCTION private.account_likes_after_change();

CREATE TRIGGER trg_account_likes_count AFTER INSERT OR DELETE ON public.account_likes FOR EACH ROW EXECUTE FUNCTION private.count_rows('likes_count');

CREATE TRIGGER trg_account_likes_film_stats AFTER INSERT OR DELETE ON public.account_likes FOR EACH ROW EXECUTE FUNCTION private.count_film_rows('liked_count');

CREATE TRIGGER trg_account_likes_keys BEFORE UPDATE ON public.account_likes FOR EACH ROW EXECUTE FUNCTION private.forbid_column_change('account_id', 'tmdb_id');

CREATE TRIGGER trg_account_likes_updated_at BEFORE UPDATE ON public.account_likes FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER trg_account_watched_after_delete AFTER DELETE ON public.account_watched FOR EACH ROW EXECUTE FUNCTION private.account_watched_after_delete();

CREATE TRIGGER trg_account_watched_after_insert AFTER INSERT ON public.account_watched FOR EACH ROW EXECUTE FUNCTION private.account_watched_after_insert();

CREATE TRIGGER trg_account_watched_count AFTER INSERT OR DELETE ON public.account_watched FOR EACH ROW EXECUTE FUNCTION private.count_rows('watched_count');

CREATE TRIGGER trg_account_watched_film_stats AFTER INSERT OR DELETE ON public.account_watched FOR EACH ROW EXECUTE FUNCTION private.count_film_rows('watched_count');

CREATE TRIGGER trg_account_watched_keys BEFORE UPDATE ON public.account_watched FOR EACH ROW EXECUTE FUNCTION private.forbid_column_change('account_id', 'tmdb_id');

CREATE TRIGGER trg_account_watched_updated_at BEFORE UPDATE ON public.account_watched FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER trg_account_watchlist_after_change AFTER INSERT OR DELETE ON public.account_watchlist FOR EACH ROW EXECUTE FUNCTION private.account_watchlist_after_change();

CREATE TRIGGER trg_account_watchlist_count AFTER INSERT OR DELETE ON public.account_watchlist FOR EACH ROW EXECUTE FUNCTION private.count_rows('watchlist_count');

CREATE TRIGGER trg_account_watchlist_film_stats AFTER INSERT OR DELETE ON public.account_watchlist FOR EACH ROW EXECUTE FUNCTION private.count_film_rows('watchlist_count');

CREATE TRIGGER trg_account_watchlist_keys BEFORE UPDATE ON public.account_watchlist FOR EACH ROW EXECUTE FUNCTION private.forbid_column_change('account_id', 'tmdb_id');

CREATE TRIGGER trg_account_watchlist_updated_at BEFORE UPDATE ON public.account_watchlist FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER trg_accounts_after_privacy_change AFTER UPDATE OF is_private ON public.accounts FOR EACH ROW WHEN ((old.is_private AND (NOT new.is_private))) EXECUTE FUNCTION private.accounts_after_privacy_change();

CREATE TRIGGER trg_accounts_before_update BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION private.accounts_before_update();

CREATE TRIGGER trg_list_items_after_change AFTER INSERT OR DELETE ON public.list_items FOR EACH ROW EXECUTE FUNCTION private.list_items_after_change();

CREATE TRIGGER trg_list_items_before_write BEFORE INSERT OR UPDATE ON public.list_items FOR EACH ROW EXECUTE FUNCTION private.list_items_before_write();

CREATE TRIGGER trg_list_items_film_stats AFTER INSERT OR DELETE ON public.list_items FOR EACH ROW EXECUTE FUNCTION private.list_items_film_stats();

CREATE TRIGGER trg_list_likes_after_change AFTER INSERT OR DELETE ON public.list_likes FOR EACH ROW EXECUTE FUNCTION private.list_likes_after_change();

CREATE TRIGGER trg_list_likes_before_insert BEFORE INSERT ON public.list_likes FOR EACH ROW EXECUTE FUNCTION private.list_likes_before_insert();

CREATE TRIGGER trg_lists_after_insert AFTER INSERT ON public.lists FOR EACH ROW WHEN ((NOT new.is_private)) EXECUTE FUNCTION private.lists_after_change();

CREATE TRIGGER trg_lists_after_privacy_change AFTER UPDATE OF is_private ON public.lists FOR EACH ROW WHEN ((old.is_private IS DISTINCT FROM new.is_private)) EXECUTE FUNCTION private.lists_after_change();

CREATE TRIGGER trg_lists_before_write BEFORE INSERT OR UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION private.lists_before_write();

CREATE TRIGGER trg_lists_count AFTER INSERT OR DELETE ON public.lists FOR EACH ROW EXECUTE FUNCTION private.count_rows('lists_count');

CREATE TRIGGER trg_lists_film_stats_delete BEFORE DELETE ON public.lists FOR EACH ROW EXECUTE FUNCTION private.lists_film_stats();

CREATE TRIGGER trg_lists_film_stats_privacy AFTER UPDATE OF is_private ON public.lists FOR EACH ROW EXECUTE FUNCTION private.lists_film_stats();

CREATE TRIGGER trg_film_catalog_override BEFORE INSERT OR UPDATE ON public.film_catalog FOR EACH ROW EXECUTE FUNCTION private.film_catalog_apply_override();

CREATE TRIGGER trg_film_catalog_overrides_after_change AFTER INSERT OR DELETE OR UPDATE ON public.film_catalog_overrides FOR EACH ROW EXECUTE FUNCTION private.film_catalog_overrides_after_change();

CREATE TRIGGER trg_film_catalog_updated_at BEFORE UPDATE ON public.film_catalog FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER trg_notifications_before_update BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION private.notifications_before_update();

CREATE TRIGGER trg_review_likes_after_change AFTER INSERT OR DELETE ON public.review_likes FOR EACH ROW EXECUTE FUNCTION private.review_likes_after_change();

CREATE TRIGGER trg_review_likes_before_insert BEFORE INSERT ON public.review_likes FOR EACH ROW EXECUTE FUNCTION private.review_likes_before_insert();

CREATE TRIGGER trg_reviews_after_delete AFTER DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.reviews_after_delete();

CREATE TRIGGER trg_reviews_after_write AFTER INSERT OR UPDATE OF content, rating ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.reviews_after_write();

CREATE TRIGGER trg_reviews_before_write BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.reviews_before_write();

CREATE TRIGGER trg_reviews_count AFTER INSERT OR DELETE OR UPDATE OF content ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.reviews_count();

CREATE TRIGGER trg_reviews_film_stats AFTER INSERT OR DELETE OR UPDATE OF content, rating ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.reviews_film_stats();

ALTER TABLE ONLY public.account_activity
    ADD CONSTRAINT account_activity_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_activity
    ADD CONSTRAINT account_activity_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_activity
    ADD CONSTRAINT account_activity_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_activity
    ADD CONSTRAINT account_activity_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_diary
    ADD CONSTRAINT account_diary_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_emails
    ADD CONSTRAINT account_emails_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_favorites
    ADD CONSTRAINT account_favorites_like_fkey FOREIGN KEY (account_id, tmdb_id) REFERENCES public.account_likes(account_id, tmdb_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_follows
    ADD CONSTRAINT account_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_follows
    ADD CONSTRAINT account_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_likes
    ADD CONSTRAINT account_likes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_stats
    ADD CONSTRAINT account_stats_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_watched
    ADD CONSTRAINT account_watched_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.account_watchlist
    ADD CONSTRAINT account_watchlist_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_id_fkey FOREIGN KEY (id) REFERENCES public.auth_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auth_passkeys
    ADD CONSTRAINT auth_passkeys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.list_items
    ADD CONSTRAINT list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.list_likes
    ADD CONSTRAINT list_likes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.list_likes
    ADD CONSTRAINT list_likes_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

ALTER TABLE public.account_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_activity_delete_own ON public.account_activity FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_activity_select ON public.account_activity FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_activity.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

ALTER TABLE public.account_diary ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_diary_delete ON public.account_diary FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_diary_insert ON public.account_diary FOR INSERT TO authenticated WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_diary_select ON public.account_diary FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_diary.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

CREATE POLICY account_diary_update ON public.account_diary FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.account_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_emails_select_own ON public.account_emails FOR SELECT TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.account_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_favorites_delete ON public.account_favorites FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_favorites_insert ON public.account_favorites FOR INSERT TO authenticated WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_favorites_select ON public.account_favorites FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_favorites.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

CREATE POLICY account_favorites_update ON public.account_favorites FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.account_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_follows_delete ON public.account_follows FOR DELETE TO authenticated USING (((follower_id = ( SELECT private.viewer_id() AS uid)) OR (following_id = ( SELECT private.viewer_id() AS uid))));

CREATE POLICY account_follows_insert ON public.account_follows FOR INSERT TO authenticated WITH CHECK (((follower_id = ( SELECT private.viewer_id() AS uid)) AND (status = private.initial_follow_status(following_id))));

CREATE POLICY account_follows_select ON public.account_follows FOR SELECT USING (((follower_id = ( SELECT private.viewer_id() AS uid)) OR (following_id = ( SELECT private.viewer_id() AS uid)) OR ((status = 'accepted'::text) AND private.can_view_account(following_id) AND private.can_view_account(follower_id))));

CREATE POLICY account_follows_update ON public.account_follows FOR UPDATE TO authenticated USING (((follower_id = ( SELECT private.viewer_id() AS uid)) OR (following_id = ( SELECT private.viewer_id() AS uid)))) WITH CHECK (((follower_id = ( SELECT private.viewer_id() AS uid)) OR (following_id = ( SELECT private.viewer_id() AS uid))));

ALTER TABLE public.account_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_likes_delete ON public.account_likes FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_likes_insert ON public.account_likes FOR INSERT TO authenticated WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_likes_select ON public.account_likes FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_likes.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

CREATE POLICY account_likes_update ON public.account_likes FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.account_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_stats_select ON public.account_stats FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_stats.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

ALTER TABLE public.account_watched ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_watched_delete ON public.account_watched FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_watched_insert ON public.account_watched FOR INSERT TO authenticated WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_watched_select ON public.account_watched FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_watched.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

CREATE POLICY account_watched_update ON public.account_watched FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.account_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_watchlist_delete ON public.account_watchlist FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_watchlist_insert ON public.account_watchlist FOR INSERT TO authenticated WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY account_watchlist_select ON public.account_watchlist FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_watchlist.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text))))))))));

CREATE POLICY account_watchlist_update ON public.account_watchlist FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounts_select ON public.accounts FOR SELECT USING ((is_active OR (id = ( SELECT private.viewer_id() AS uid))));

ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_passkeys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_verifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY list_items_delete ON public.list_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lists l
  WHERE ((l.id = list_items.list_id) AND (l.account_id = ( SELECT private.viewer_id() AS uid))))));

CREATE POLICY list_items_insert ON public.list_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.lists l
  WHERE ((l.id = list_items.list_id) AND (l.account_id = ( SELECT private.viewer_id() AS uid))))));

CREATE POLICY list_items_select ON public.list_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.lists l
  WHERE (l.id = list_items.list_id))));

CREATE POLICY list_items_update ON public.list_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lists l
  WHERE ((l.id = list_items.list_id) AND (l.account_id = ( SELECT private.viewer_id() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.lists l
  WHERE ((l.id = list_items.list_id) AND (l.account_id = ( SELECT private.viewer_id() AS uid))))));

ALTER TABLE public.list_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY list_likes_delete ON public.list_likes FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY list_likes_insert ON public.list_likes FOR INSERT TO authenticated WITH CHECK (((account_id = ( SELECT private.viewer_id() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.lists l
  WHERE (l.id = list_likes.list_id)))));

CREATE POLICY list_likes_select ON public.list_likes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.lists l
  WHERE (l.id = list_likes.list_id))));

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY lists_delete ON public.lists FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY lists_insert ON public.lists FOR INSERT TO authenticated WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY lists_select ON public.lists FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR ((NOT is_private) AND (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = lists.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text)))))))))));

CREATE POLICY lists_update ON public.lists FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.film_catalog ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.film_catalog_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY film_catalog_overrides_select ON public.film_catalog_overrides FOR SELECT USING (true);

CREATE POLICY film_catalog_select ON public.film_catalog FOR SELECT USING (true);

ALTER TABLE public.film_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY film_stats_select ON public.film_stats FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated USING ((user_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((user_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((user_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((user_id = ( SELECT private.viewer_id() AS uid)));

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_likes_delete ON public.review_likes FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY review_likes_insert ON public.review_likes FOR INSERT TO authenticated WITH CHECK (((account_id = ( SELECT private.viewer_id() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE (r.id = review_likes.review_id)))));

CREATE POLICY review_likes_select ON public.review_likes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE (r.id = review_likes.review_id))));

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_delete ON public.reviews FOR DELETE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid)));

CREATE POLICY reviews_insert ON public.reviews FOR INSERT TO authenticated WITH CHECK (((account_id = ( SELECT private.viewer_id() AS uid)) AND ((list_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.lists l
  WHERE (l.id = reviews.list_id))))));

CREATE POLICY reviews_select ON public.reviews FOR SELECT USING (((account_id = ( SELECT private.viewer_id() AS uid)) OR ((EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = reviews.account_id) AND a.is_active AND ((NOT a.is_private) OR (EXISTS ( SELECT 1
           FROM public.account_follows f
          WHERE ((f.follower_id = ( SELECT private.viewer_id() AS uid)) AND (f.following_id = a.id) AND (f.status = 'accepted'::text)))))))) AND ((tmdb_id IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM public.lists l
  WHERE (l.id = reviews.list_id))))) OR ((list_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.lists l
  WHERE ((l.id = reviews.list_id) AND (l.account_id = ( SELECT private.viewer_id() AS uid))))))));

CREATE POLICY reviews_update ON public.reviews FOR UPDATE TO authenticated USING ((account_id = ( SELECT private.viewer_id() AS uid))) WITH CHECK ((account_id = ( SELECT private.viewer_id() AS uid)));

GRANT USAGE ON SCHEMA private TO anon;

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON FUNCTION private.account_diary_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_diary_before_write() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_follows_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_follows_before_insert() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_follows_before_update() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_likes_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_watched_after_delete() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_watched_after_insert() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.account_watchlist_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.accounts_after_privacy_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.accounts_before_update() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.adjust_stat(p_account_id uuid, p_field text, p_delta integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.can_view_account(p_owner_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION private.can_view_account(p_owner_id uuid) TO anon;

GRANT ALL ON FUNCTION private.can_view_account(p_owner_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION private.count_rows() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.forbid_column_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.handle_user_email_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.initial_follow_status(p_target_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION private.initial_follow_status(p_target_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION private.is_reserved_username(p_username text) FROM PUBLIC;

GRANT ALL ON FUNCTION private.is_reserved_username(p_username text) TO anon;

GRANT ALL ON FUNCTION private.is_reserved_username(p_username text) TO authenticated;

REVOKE ALL ON FUNCTION private.like_escape(p_text text) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.list_items_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.list_items_before_write() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.list_likes_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.list_likes_before_insert() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.lists_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.lists_before_write() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.notifications_before_update() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.notify(p_user_id uuid, p_actor_id uuid, p_type text, p_payload jsonb, p_dedupe_key text, p_list_id uuid, p_review_id uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.prune_notifications(p_limit integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.record_activity(p_account_id uuid, p_type text, p_dedupe_key text, p_tmdb_id integer, p_list_id uuid, p_target_account_id uuid, p_payload jsonb, p_review_id uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.remove_activity(p_account_id uuid, p_dedupe_key text) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.restore_watched_activity(p_account_id uuid, p_tmdb_id integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.review_likes_after_change() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.review_likes_before_insert() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.reviews_after_delete() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.reviews_after_write() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.reviews_before_write() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.reviews_count() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.seed_account_ids(p_ids uuid[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.shift_listed(p_list_id uuid, p_delta integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION private.slugify(p_text text) FROM PUBLIC;

GRANT ALL ON FUNCTION private.slugify(p_text text) TO anon;

GRANT ALL ON FUNCTION private.slugify(p_text text) TO authenticated;

REVOKE ALL ON FUNCTION private.touch_updated_at() FROM PUBLIC;

REVOKE ALL ON FUNCTION private.unnotify(p_user_id uuid, p_dedupe_key text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.deactivate_current_account() FROM PUBLIC;

GRANT ALL ON FUNCTION public.deactivate_current_account() TO authenticated;

REVOKE ALL ON FUNCTION public.get_account_follow_counts(p_account_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_account_follow_counts(p_account_id uuid) TO anon;

GRANT ALL ON FUNCTION public.get_account_follow_counts(p_account_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_account_follow_target(p_user_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_account_follow_target(p_user_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_account_follows(p_account_id uuid, p_direction text, p_before timestamp with time zone, p_before_id uuid, p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_account_follows(p_account_id uuid, p_direction text, p_before timestamp with time zone, p_before_id uuid, p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.get_account_follows(p_account_id uuid, p_direction text, p_before timestamp with time zone, p_before_id uuid, p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_account_header(p_account_id uuid, p_mutual integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_account_header(p_account_id uuid, p_mutual integer) TO anon;

GRANT ALL ON FUNCTION public.get_account_header(p_account_id uuid, p_mutual integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_account_overview(p_account_id uuid, p_watched integer, p_watchlist integer, p_reviews integer, p_popular integer, p_diary integer, p_lists integer, p_following integer, p_activity integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_account_overview(p_account_id uuid, p_watched integer, p_watchlist integer, p_reviews integer, p_popular integer, p_diary integer, p_lists integer, p_following integer, p_activity integer) TO anon;

GRANT ALL ON FUNCTION public.get_account_overview(p_account_id uuid, p_watched integer, p_watchlist integer, p_reviews integer, p_popular integer, p_diary integer, p_lists integer, p_following integer, p_activity integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_home_circle() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_home_circle() TO authenticated;

REVOKE ALL ON FUNCTION public.get_home_pulse() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_list_page(p_account_id uuid, p_slug text, p_pattern text, p_genre integer, p_decade integer, p_sort text, p_page integer, p_page_size integer, p_comments integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_list_page(p_account_id uuid, p_slug text, p_pattern text, p_genre integer, p_decade integer, p_sort text, p_page integer, p_page_size integer, p_comments integer) TO anon;

GRANT ALL ON FUNCTION public.get_list_page(p_account_id uuid, p_slug text, p_pattern text, p_genre integer, p_decade integer, p_sort text, p_page integer, p_page_size integer, p_comments integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_list_previews(p_list_ids uuid[], p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_list_previews(p_list_ids uuid[], p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.get_list_previews(p_list_ids uuid[], p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_movie_social_proof(p_tmdb_id integer, p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_movie_social_proof(p_tmdb_id integer, p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.get_movie_social_proof(p_tmdb_id integer, p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_mutual_followers(p_account_id uuid, p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_mutual_followers(p_account_id uuid, p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_rating_spread(p_account_id uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_rating_spread(p_account_id uuid) TO anon;

GRANT ALL ON FUNCTION public.get_rating_spread(p_account_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_review_stats(p_tmdb_id integer, p_username text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_review_stats(p_tmdb_id integer, p_username text) TO anon;

GRANT ALL ON FUNCTION public.get_review_stats(p_tmdb_id integer, p_username text) TO authenticated;

REVOKE ALL ON FUNCTION public.prune_account_data() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reactivate_current_account() FROM PUBLIC;

GRANT ALL ON FUNCTION public.reactivate_current_account() TO authenticated;

REVOKE ALL ON FUNCTION public.refresh_account_stats(p_account_id uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.refresh_film_stats() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reorder_list_items(p_list_id uuid, p_tmdb_ids integer[]) FROM PUBLIC;

GRANT ALL ON FUNCTION public.reorder_list_items(p_list_id uuid, p_tmdb_ids integer[]) TO authenticated;

REVOKE ALL ON FUNCTION public.search_accounts(p_query text, p_limit integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.search_lists(p_query text, p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.search_lists(p_query text, p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.search_lists(p_query text, p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.search_reviews(p_query text, p_limit integer) FROM PUBLIC;

GRANT ALL ON FUNCTION public.search_reviews(p_query text, p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.search_reviews(p_query text, p_limit integer) TO authenticated;

REVOKE ALL ON FUNCTION public.seed_apply_profiles(p_profiles jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.seed_backdate(p_ids uuid[]) FROM PUBLIC;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.accounts TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.accounts TO authenticated;

REVOKE ALL ON FUNCTION public.update_account(p_avatar_url text, p_bio text, p_display_name text, p_is_private boolean, p_username text, p_background_url text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.update_account(p_avatar_url text, p_bio text, p_display_name text, p_is_private boolean, p_username text, p_background_url text) TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_activity TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_activity TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_diary TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_diary TO authenticated;

GRANT INSERT(account_id) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(tmdb_id) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(title) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(poster_path) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(backdrop_path) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(release_date) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(watched_on),UPDATE(watched_on) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(watched_at) ON TABLE public.account_diary TO authenticated;

GRANT INSERT(is_rewatch),UPDATE(is_rewatch) ON TABLE public.account_diary TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_emails TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_emails TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_favorites TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_favorites TO authenticated;

GRANT INSERT(account_id),UPDATE(account_id) ON TABLE public.account_favorites TO authenticated;

GRANT INSERT(tmdb_id),UPDATE(tmdb_id) ON TABLE public.account_favorites TO authenticated;

GRANT INSERT("position"),UPDATE("position") ON TABLE public.account_favorites TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_follows TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_follows TO authenticated;

GRANT INSERT(follower_id),UPDATE(follower_id) ON TABLE public.account_follows TO authenticated;

GRANT INSERT(following_id),UPDATE(following_id) ON TABLE public.account_follows TO authenticated;

GRANT INSERT(status),UPDATE(status) ON TABLE public.account_follows TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_likes TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_likes TO authenticated;

GRANT INSERT(account_id),UPDATE(account_id) ON TABLE public.account_likes TO authenticated;

GRANT INSERT(tmdb_id),UPDATE(tmdb_id) ON TABLE public.account_likes TO authenticated;

GRANT INSERT(title),UPDATE(title) ON TABLE public.account_likes TO authenticated;

GRANT INSERT(poster_path),UPDATE(poster_path) ON TABLE public.account_likes TO authenticated;

GRANT INSERT(backdrop_path),UPDATE(backdrop_path) ON TABLE public.account_likes TO authenticated;

GRANT INSERT(release_date),UPDATE(release_date) ON TABLE public.account_likes TO authenticated;

GRANT INSERT(payload),UPDATE(payload) ON TABLE public.account_likes TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_stats TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_stats TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_watched TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_watched TO authenticated;

GRANT INSERT(account_id),UPDATE(account_id) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(tmdb_id),UPDATE(tmdb_id) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(title),UPDATE(title) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(poster_path),UPDATE(poster_path) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(backdrop_path),UPDATE(backdrop_path) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(release_date),UPDATE(release_date) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(payload),UPDATE(payload) ON TABLE public.account_watched TO authenticated;

GRANT INSERT(last_watched_at),UPDATE(last_watched_at) ON TABLE public.account_watched TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_watchlist TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(account_id),UPDATE(account_id) ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(tmdb_id),UPDATE(tmdb_id) ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(title),UPDATE(title) ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(poster_path),UPDATE(poster_path) ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(backdrop_path),UPDATE(backdrop_path) ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(release_date),UPDATE(release_date) ON TABLE public.account_watchlist TO authenticated;

GRANT INSERT(payload),UPDATE(payload) ON TABLE public.account_watchlist TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.film_stats TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.film_stats TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.list_items TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.list_items TO authenticated;

GRANT INSERT(list_id),UPDATE(list_id) ON TABLE public.list_items TO authenticated;

GRANT INSERT(tmdb_id),UPDATE(tmdb_id) ON TABLE public.list_items TO authenticated;

GRANT INSERT(title),UPDATE(title) ON TABLE public.list_items TO authenticated;

GRANT INSERT(poster_path),UPDATE(poster_path) ON TABLE public.list_items TO authenticated;

GRANT INSERT(backdrop_path),UPDATE(backdrop_path) ON TABLE public.list_items TO authenticated;

GRANT INSERT(release_date),UPDATE(release_date) ON TABLE public.list_items TO authenticated;

GRANT INSERT(payload),UPDATE(payload) ON TABLE public.list_items TO authenticated;

GRANT INSERT("position"),UPDATE("position") ON TABLE public.list_items TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.list_likes TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.list_likes TO authenticated;

GRANT INSERT(list_id) ON TABLE public.list_likes TO authenticated;

GRANT INSERT(account_id) ON TABLE public.list_likes TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lists TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.lists TO authenticated;

GRANT INSERT(account_id) ON TABLE public.lists TO authenticated;

GRANT INSERT(slug) ON TABLE public.lists TO authenticated;

GRANT INSERT(title),UPDATE(title) ON TABLE public.lists TO authenticated;

GRANT INSERT(description),UPDATE(description) ON TABLE public.lists TO authenticated;

GRANT INSERT(poster_path),UPDATE(poster_path) ON TABLE public.lists TO authenticated;

GRANT INSERT(backdrop_path),UPDATE(backdrop_path) ON TABLE public.lists TO authenticated;

GRANT INSERT(is_ranked),UPDATE(is_ranked) ON TABLE public.lists TO authenticated;

GRANT INSERT(is_private),UPDATE(is_private) ON TABLE public.lists TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.film_catalog TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.film_catalog TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.film_catalog_overrides TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.film_catalog_overrides TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO authenticated;

GRANT UPDATE(read) ON TABLE public.notifications TO authenticated;

GRANT UPDATE(read_at) ON TABLE public.notifications TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.review_likes TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.review_likes TO authenticated;

GRANT INSERT(review_id) ON TABLE public.review_likes TO authenticated;

GRANT INSERT(account_id) ON TABLE public.review_likes TO authenticated;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reviews TO anon;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reviews TO authenticated;

GRANT INSERT(account_id),UPDATE(account_id) ON TABLE public.reviews TO authenticated;

GRANT INSERT(tmdb_id),UPDATE(tmdb_id) ON TABLE public.reviews TO authenticated;

GRANT INSERT(list_id),UPDATE(list_id) ON TABLE public.reviews TO authenticated;

GRANT INSERT(title),UPDATE(title) ON TABLE public.reviews TO authenticated;

GRANT INSERT(poster_path),UPDATE(poster_path) ON TABLE public.reviews TO authenticated;

GRANT INSERT(backdrop_path),UPDATE(backdrop_path) ON TABLE public.reviews TO authenticated;

GRANT INSERT(release_date),UPDATE(release_date) ON TABLE public.reviews TO authenticated;

GRANT INSERT(content),UPDATE(content) ON TABLE public.reviews TO authenticated;

GRANT INSERT(rating),UPDATE(rating) ON TABLE public.reviews TO authenticated;

GRANT INSERT(is_spoiler),UPDATE(is_spoiler) ON TABLE public.reviews TO authenticated;

REVOKE ALL ON FUNCTION private.bump_film_stat(p_tmdb_id integer, p_field text, p_delta integer) FROM PUBLIC;
