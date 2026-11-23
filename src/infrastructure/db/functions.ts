export interface DbFunctions {
  deactivate_current_account: { args: Record<string, never>; returns: null };
  get_account_follow_counts: {
    args: { p_account_id: string | null };
    returns: { followers_count: number; following_count: number }[];
  };
  get_account_follow_target: {
    args: { p_user_id: string | null };
    returns: { id: string; is_private: boolean }[];
  };
  get_account_follows: {
    args: {
      p_account_id: string | null;
      p_direction: string | null;
      p_before?: string | null;
      p_before_id?: string | null;
      p_limit?: number | null;
    };
    returns: {
      follow_id: string;
      account_id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      followed_at: string;
      viewer_status: string;
    }[];
  };
  get_account_header: {
    args: { p_account_id: string | null; p_mutual?: number | null };
    returns: unknown | null;
  };
  get_account_overview: {
    args: {
      p_account_id: string | null;
      p_watched?: number | null;
      p_watchlist?: number | null;
      p_reviews?: number | null;
      p_popular?: number | null;
      p_diary?: number | null;
      p_lists?: number | null;
      p_following?: number | null;
      p_activity?: number | null;
    };
    returns: unknown | null;
  };
  get_home_circle: { args: Record<string, never>; returns: unknown | null };
  get_home_pulse: { args: Record<string, never>; returns: unknown | null };
  get_list_page: {
    args: {
      p_account_id: string | null;
      p_slug: string | null;
      p_pattern?: string | null;
      p_genre?: number | null;
      p_decade?: number | null;
      p_sort?: string | null;
      p_page?: number | null;
      p_page_size?: number | null;
      p_comments?: number | null;
    };
    returns: unknown | null;
  };
  get_list_previews: {
    args: { p_list_ids: string[] | null; p_limit?: number | null };
    returns: { list_id: string; poster_path: string }[];
  };
  get_movie_social_proof: {
    args: { p_tmdb_id: number | null; p_limit?: number | null };
    returns: {
      account_id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      watched: boolean;
      liked: boolean;
      watchlisted: boolean;
      reviewed: boolean;
      rating: number;
      total: number;
    }[];
  };
  get_mutual_followers: {
    args: { p_account_id: string | null; p_limit?: number | null };
    returns: {
      account_id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      total: number;
    }[];
  };
  get_rating_spread: {
    args: { p_account_id: string | null };
    returns: number[] | null;
  };
  get_review_stats: {
    args: { p_tmdb_id: number | null; p_username?: string | null };
    returns: { average: number; rated: number; total: number }[];
  };
  prune_account_data: { args: Record<string, never>; returns: unknown | null };
  reactivate_current_account: { args: Record<string, never>; returns: null };
  refresh_account_stats: {
    args: { p_account_id: string | null };
    returns: null;
  };
  refresh_film_stats: { args: Record<string, never>; returns: null };
  reorder_list_items: {
    args: { p_list_id: string | null; p_tmdb_ids: number[] | null };
    returns: null;
  };
  search_accounts: {
    args: { p_query: string | null; p_limit?: number | null };
    returns: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      is_private: boolean;
      followers_count: number;
    }[];
  };
  search_lists: {
    args: { p_query: string | null; p_limit?: number | null };
    returns: {
      id: string;
      slug: string;
      title: string;
      poster_path: string;
      items_count: number;
      likes_count: number;
      owner_username: string;
      owner_display_name: string;
    }[];
  };
  search_reviews: {
    args: { p_query: string | null; p_limit?: number | null };
    returns: {
      id: string;
      content: string;
      is_spoiler: boolean;
      rating: number;
      likes_count: number;
      tmdb_id: number;
      title: string;
      poster_path: string;
      release_date: string;
      author_username: string;
      author_display_name: string;
      author_avatar_url: string;
    }[];
  };
  seed_apply_profiles: {
    args: { p_profiles: unknown | null };
    returns: number | null;
  };
  seed_backdate: { args: { p_ids: string[] | null }; returns: number | null };
  update_account: {
    args: {
      p_avatar_url?: string | null;
      p_bio?: string | null;
      p_display_name?: string | null;
      p_is_private?: boolean | null;
      p_username?: string | null;
      p_background_url?: string | null;
    };
    returns: {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      background_url: string | null;
      bio: string | null;
      is_private: boolean;
      is_active: boolean;
      deactivated_at: string | null;
      status: string | null;
      created_at: string;
      updated_at: string;
    }[];
  };
}

export const DB_FUNCTIONS = {
  deactivate_current_account: { kind: "scalar", args: [] },
  get_account_follow_counts: { kind: "set", args: [["p_account_id", "uuid"]] },
  get_account_follow_target: { kind: "set", args: [["p_user_id", "uuid"]] },
  get_account_follows: {
    kind: "set",
    args: [
      ["p_account_id", "uuid"],
      ["p_direction", "text"],
      ["p_before", "timestamp with time zone"],
      ["p_before_id", "uuid"],
      ["p_limit", "integer"],
    ],
  },
  get_account_header: {
    kind: "scalar",
    args: [
      ["p_account_id", "uuid"],
      ["p_mutual", "integer"],
    ],
  },
  get_account_overview: {
    kind: "scalar",
    args: [
      ["p_account_id", "uuid"],
      ["p_watched", "integer"],
      ["p_watchlist", "integer"],
      ["p_reviews", "integer"],
      ["p_popular", "integer"],
      ["p_diary", "integer"],
      ["p_lists", "integer"],
      ["p_following", "integer"],
      ["p_activity", "integer"],
    ],
  },
  get_home_circle: { kind: "scalar", args: [] },
  get_home_pulse: { kind: "scalar", args: [] },
  get_list_page: {
    kind: "scalar",
    args: [
      ["p_account_id", "uuid"],
      ["p_slug", "text"],
      ["p_pattern", "text"],
      ["p_genre", "integer"],
      ["p_decade", "integer"],
      ["p_sort", "text"],
      ["p_page", "integer"],
      ["p_page_size", "integer"],
      ["p_comments", "integer"],
    ],
  },
  get_list_previews: {
    kind: "set",
    args: [
      ["p_list_ids", "uuid[]"],
      ["p_limit", "integer"],
    ],
  },
  get_movie_social_proof: {
    kind: "set",
    args: [
      ["p_tmdb_id", "integer"],
      ["p_limit", "integer"],
    ],
  },
  get_mutual_followers: {
    kind: "set",
    args: [
      ["p_account_id", "uuid"],
      ["p_limit", "integer"],
    ],
  },
  get_rating_spread: { kind: "scalar", args: [["p_account_id", "uuid"]] },
  get_review_stats: {
    kind: "set",
    args: [
      ["p_tmdb_id", "integer"],
      ["p_username", "text"],
    ],
  },
  prune_account_data: { kind: "scalar", args: [] },
  reactivate_current_account: { kind: "scalar", args: [] },
  refresh_account_stats: { kind: "scalar", args: [["p_account_id", "uuid"]] },
  refresh_film_stats: { kind: "scalar", args: [] },
  reorder_list_items: {
    kind: "scalar",
    args: [
      ["p_list_id", "uuid"],
      ["p_tmdb_ids", "integer[]"],
    ],
  },
  search_accounts: {
    kind: "set",
    args: [
      ["p_query", "text"],
      ["p_limit", "integer"],
    ],
  },
  search_lists: {
    kind: "set",
    args: [
      ["p_query", "text"],
      ["p_limit", "integer"],
    ],
  },
  search_reviews: {
    kind: "set",
    args: [
      ["p_query", "text"],
      ["p_limit", "integer"],
    ],
  },
  seed_apply_profiles: { kind: "scalar", args: [["p_profiles", "jsonb"]] },
  seed_backdate: { kind: "scalar", args: [["p_ids", "uuid[]"]] },
  update_account: {
    kind: "set",
    args: [
      ["p_avatar_url", "text"],
      ["p_bio", "text"],
      ["p_display_name", "text"],
      ["p_is_private", "boolean"],
      ["p_username", "text"],
      ["p_background_url", "text"],
    ],
  },
} as const satisfies Record<
  keyof DbFunctions,
  {
    kind: "set" | "row" | "scalar";
    args: readonly (readonly [string, string])[];
  }
>;
