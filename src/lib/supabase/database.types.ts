export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      account_activity: {
        Row: {
          account_id: string;
          created_at: string;
          dedupe_key: string;
          id: string;
          list_id: string | null;
          media_type: string | null;
          payload: Json;
          review_id: string | null;
          target_account_id: string | null;
          tmdb_id: number | null;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          dedupe_key: string;
          id?: string;
          list_id?: string | null;
          media_type?: string | null;
          payload?: Json;
          review_id?: string | null;
          target_account_id?: string | null;
          tmdb_id?: number | null;
          type: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          dedupe_key?: string;
          id?: string;
          list_id?: string | null;
          media_type?: string | null;
          payload?: Json;
          review_id?: string | null;
          target_account_id?: string | null;
          tmdb_id?: number | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_activity_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_activity_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_activity_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_activity_target_account_id_fkey";
            columns: ["target_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_diary: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          episode_number: number | null;
          id: string;
          is_rewatch: boolean;
          media_type: string;
          poster_path: string | null;
          release_date: string | null;
          season_number: number | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
          watched_at: string;
          watched_on: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          episode_number?: number | null;
          id?: string;
          is_rewatch?: boolean;
          media_type?: string;
          poster_path?: string | null;
          release_date?: string | null;
          season_number?: number | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
          watched_at?: string;
          watched_on?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          episode_number?: number | null;
          id?: string;
          is_rewatch?: boolean;
          media_type?: string;
          poster_path?: string | null;
          release_date?: string | null;
          season_number?: number | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
          watched_at?: string;
          watched_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_diary_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_emails: {
        Row: {
          account_id: string;
          created_at: string;
          email: string;
          id: string;
          is_primary: boolean;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          email: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_emails_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_episode_ratings: {
        Row: {
          account_id: string;
          created_at: string;
          episode_number: number;
          rating: number;
          season_number: number;
          show_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          episode_number: number;
          rating: number;
          season_number: number;
          show_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          episode_number?: number;
          rating?: number;
          season_number?: number;
          show_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_episode_ratings_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_favorites: {
        Row: {
          account_id: string;
          created_at: string;
          media_type: string;
          position: number;
          tmdb_id: number;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          media_type?: string;
          position: number;
          tmdb_id: number;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          media_type?: string;
          position?: number;
          tmdb_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "account_favorites_like_fkey";
            columns: ["account_id", "media_type", "tmdb_id"];
            isOneToOne: false;
            referencedRelation: "account_likes";
            referencedColumns: ["account_id", "media_type", "tmdb_id"];
          },
        ];
      };
      account_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
          responded_at: string | null;
          status: "pending" | "accepted" | "rejected";
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "rejected";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "rejected";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_likes: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          media_type: string;
          payload: Json;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          media_type?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          media_type?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_likes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_show_progress: {
        Row: {
          account_id: string;
          aired_episodes: number | null;
          backdrop_path: string | null;
          last_episode: number | null;
          last_season: number | null;
          last_watched_at: string | null;
          next_air_date: string | null;
          poster_path: string | null;
          release_date: string | null;
          show_id: number;
          started_at: string;
          status: string;
          title: string;
          updated_at: string;
          watched_episodes: number;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          aired_episodes?: number | null;
          backdrop_path?: string | null;
          last_episode?: number | null;
          last_season?: number | null;
          last_watched_at?: string | null;
          next_air_date?: string | null;
          poster_path?: string | null;
          release_date?: string | null;
          show_id: number;
          started_at?: string;
          status: string;
          title: string;
          updated_at?: string;
          watched_episodes?: number;
        };
        Update: {
          account_id?: string;
          aired_episodes?: number | null;
          backdrop_path?: string | null;
          last_episode?: number | null;
          last_season?: number | null;
          last_watched_at?: string | null;
          next_air_date?: string | null;
          poster_path?: string | null;
          release_date?: string | null;
          show_id?: number;
          started_at?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          watched_episodes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "account_show_progress_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_stats: {
        Row: {
          account_id: string;
          diary_count: number;
          episode_minutes: number;
          episodes_watched_count: number;
          followers_count: number;
          following_count: number;
          likes_count: number;
          lists_count: number;
          reviews_count: number;
          shows_diary_count: number;
          shows_likes_count: number;
          shows_lists_count: number;
          shows_reviews_count: number;
          shows_watched_count: number;
          shows_watchlist_count: number;
          updated_at: string;
          watched_count: number;
          watchlist_count: number;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          diary_count?: number;
          episode_minutes?: number;
          episodes_watched_count?: number;
          followers_count?: number;
          following_count?: number;
          likes_count?: number;
          lists_count?: number;
          reviews_count?: number;
          shows_diary_count?: number;
          shows_likes_count?: number;
          shows_lists_count?: number;
          shows_reviews_count?: number;
          shows_watched_count?: number;
          shows_watchlist_count?: number;
          updated_at?: string;
          watched_count?: number;
          watchlist_count?: number;
        };
        Update: {
          account_id?: string;
          diary_count?: number;
          episode_minutes?: number;
          episodes_watched_count?: number;
          followers_count?: number;
          following_count?: number;
          likes_count?: number;
          lists_count?: number;
          reviews_count?: number;
          shows_diary_count?: number;
          shows_likes_count?: number;
          shows_lists_count?: number;
          shows_reviews_count?: number;
          shows_watched_count?: number;
          shows_watchlist_count?: number;
          updated_at?: string;
          watched_count?: number;
          watchlist_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "account_stats_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_watched: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          first_watched_at: string;
          last_watched_at: string;
          media_type: string;
          payload: Json;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          first_watched_at?: string;
          last_watched_at?: string;
          media_type?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          first_watched_at?: string;
          last_watched_at?: string;
          media_type?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_watched_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_watched_episodes: {
        Row: {
          account_id: string;
          episode_number: number;
          is_rewatch: boolean;
          runtime_minutes: number | null;
          season_number: number;
          show_id: number;
          watched_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          episode_number: number;
          is_rewatch?: boolean;
          runtime_minutes?: number | null;
          season_number: number;
          show_id: number;
          watched_at?: string;
        };
        Update: {
          account_id?: string;
          episode_number?: number;
          is_rewatch?: boolean;
          runtime_minutes?: number | null;
          season_number?: number;
          show_id?: number;
          watched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_watched_episodes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_watchlist: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          media_type: string;
          payload: Json;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          media_type?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          media_type?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_watchlist_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          avatar_url: string | null;
          background_url: string | null;
          bio: string | null;
          created_at: string;
          deactivated_at: string | null;
          display_name: string | null;
          id: string;
          is_active: boolean;
          is_private: boolean;
          status: string | null;
          updated_at: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          background_url?: string | null;
          bio?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          display_name?: string | null;
          id: string;
          is_active?: boolean;
          is_private?: boolean;
          status?: never;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          background_url?: string | null;
          bio?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          is_private?: boolean;
          status?: never;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      auth_events: {
        Row: {
          created_at: string;
          id: number;
          ip_address: string | null;
          metadata: Json;
          session_id: string | null;
          type: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          ip_address?: string | null;
          metadata?: Json;
          session_id?: string | null;
          type: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          ip_address?: string | null;
          metadata?: Json;
          session_id?: string | null;
          type?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      auth_sessions: {
        Row: {
          created_at: string;
          ip_address: string | null;
          last_seen_at: string;
          revoked_at: string | null;
          session_id: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ip_address?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          session_id: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ip_address?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          session_id?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      episode_stats: {
        Row: {
          episode_number: number;
          rating_average: number | null;
          ratings: number[];
          ratings_count: number | null;
          season_number: number;
          show_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          episode_number: number;
          rating_average?: never;
          ratings?: number[];
          ratings_count?: never;
          season_number: number;
          show_id: number;
          updated_at?: string;
        };
        Update: {
          episode_number?: number;
          rating_average?: never;
          ratings?: number[];
          ratings_count?: never;
          season_number?: number;
          show_id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      list_items: {
        Row: {
          backdrop_path: string | null;
          created_at: string;
          list_id: string;
          media_type: string;
          payload: Json;
          position: number;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          backdrop_path?: string | null;
          created_at?: string;
          list_id: string;
          media_type?: string;
          payload?: Json;
          position?: number;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          backdrop_path?: string | null;
          created_at?: string;
          list_id?: string;
          media_type?: string;
          payload?: Json;
          position?: number;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      list_likes: {
        Row: {
          account_id: string;
          created_at: string;
          list_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          list_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          list_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_likes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "list_likes_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          description: string;
          id: string;
          is_private: boolean;
          is_ranked: boolean;
          items_count: number;
          likes_count: number;
          media_type: string;
          poster_path: string | null;
          reviews_count: number;
          slug: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_private?: boolean;
          is_ranked?: boolean;
          items_count?: number;
          likes_count?: number;
          media_type?: string;
          poster_path?: string | null;
          reviews_count?: number;
          slug?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_private?: boolean;
          is_ranked?: boolean;
          items_count?: number;
          likes_count?: number;
          media_type?: string;
          poster_path?: string | null;
          reviews_count?: number;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lists_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      media_catalog: {
        Row: {
          backdrop_path: string | null;
          eligible: boolean;
          episodes_count: number | null;
          fetched_at: string;
          genre_ids: number[];
          last_air_date: string | null;
          media_type: string;
          origin_countries: string[];
          original_language: string | null;
          original_title: string | null;
          popularity: number;
          poster_path: string | null;
          quality_flags: string[];
          quality_score: number;
          release_date: string | null;
          runtime_minutes: number | null;
          seasons_count: number | null;
          status: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
          vote_average: number | null;
          vote_count: number;
        };
        ComputedFields: never;
        Insert: {
          backdrop_path?: string | null;
          eligible?: boolean;
          episodes_count?: number | null;
          fetched_at?: string;
          genre_ids?: number[];
          last_air_date?: string | null;
          media_type: string;
          origin_countries?: string[];
          original_language?: string | null;
          original_title?: string | null;
          popularity?: number;
          poster_path?: string | null;
          quality_flags?: string[];
          quality_score?: number;
          release_date?: string | null;
          runtime_minutes?: number | null;
          seasons_count?: number | null;
          status?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
          vote_average?: number | null;
          vote_count?: number;
        };
        Update: {
          backdrop_path?: string | null;
          eligible?: boolean;
          episodes_count?: number | null;
          fetched_at?: string;
          genre_ids?: number[];
          last_air_date?: string | null;
          media_type?: string;
          origin_countries?: string[];
          original_language?: string | null;
          original_title?: string | null;
          popularity?: number;
          poster_path?: string | null;
          quality_flags?: string[];
          quality_score?: number;
          release_date?: string | null;
          runtime_minutes?: number | null;
          seasons_count?: number | null;
          status?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
          vote_average?: number | null;
          vote_count?: number;
        };
        Relationships: [];
      };
      media_catalog_overrides: {
        Row: {
          created_at: string;
          media_type: string;
          note: string;
          tmdb_id: number;
          verdict: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          media_type: string;
          note?: string;
          tmdb_id: number;
          verdict: string;
        };
        Update: {
          created_at?: string;
          media_type?: string;
          note?: string;
          tmdb_id?: number;
          verdict?: string;
        };
        Relationships: [];
      };
      media_stats: {
        Row: {
          liked_count: number;
          listed_count: number;
          media_type: string;
          rating_average: number | null;
          ratings: number[];
          ratings_count: number | null;
          reviews_count: number;
          tmdb_id: number;
          updated_at: string;
          watched_count: number;
          watching_count: number;
          watchlist_count: number;
        };
        ComputedFields: never;
        Insert: {
          liked_count?: number;
          listed_count?: number;
          media_type?: string;
          rating_average?: never;
          ratings?: number[];
          ratings_count?: never;
          reviews_count?: number;
          tmdb_id: number;
          updated_at?: string;
          watched_count?: number;
          watching_count?: number;
          watchlist_count?: number;
        };
        Update: {
          liked_count?: number;
          listed_count?: number;
          media_type?: string;
          rating_average?: never;
          ratings?: number[];
          ratings_count?: never;
          reviews_count?: number;
          tmdb_id?: number;
          updated_at?: string;
          watched_count?: number;
          watching_count?: number;
          watchlist_count?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          created_at: string;
          dedupe_key: string | null;
          id: string;
          list_id: string | null;
          payload: Json;
          read: boolean;
          read_at: string | null;
          review_id: string | null;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          list_id?: string | null;
          payload?: Json;
          read?: boolean;
          read_at?: string | null;
          review_id?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          list_id?: string | null;
          payload?: Json;
          read?: boolean;
          read_at?: string | null;
          review_id?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      review_likes: {
        Row: {
          account_id: string;
          created_at: string;
          review_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          review_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          review_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_likes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_likes_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          content: string;
          created_at: string;
          id: string;
          is_spoiler: boolean;
          likes_count: number;
          list_id: string | null;
          media_type: string;
          poster_path: string | null;
          rating: number | null;
          release_date: string | null;
          title: string | null;
          tmdb_id: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          is_spoiler?: boolean;
          likes_count?: number;
          list_id?: string | null;
          media_type?: string;
          poster_path?: string | null;
          rating?: number | null;
          release_date?: string | null;
          title?: string | null;
          tmdb_id?: number | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          is_spoiler?: boolean;
          likes_count?: number;
          list_id?: string | null;
          media_type?: string;
          poster_path?: string | null;
          rating?: number | null;
          release_date?: string | null;
          title?: string | null;
          tmdb_id?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      film_stats: {
        Row: {
          liked_count: number;
          listed_count: number;
          rating_average: number | null;
          ratings: number[];
          ratings_count: number | null;
          reviews_count: number;
          tmdb_id: number;
          updated_at: string;
          watched_count: number;
          watchlist_count: number;
        };
        ComputedFields: never;
        Insert: {
          liked_count?: number | null;
          listed_count?: number | null;
          rating_average?: number | null;
          ratings?: number[] | null;
          ratings_count?: number | null;
          reviews_count?: number | null;
          tmdb_id?: number | null;
          updated_at?: string | null;
          watched_count?: number | null;
          watchlist_count?: number | null;
        };
        Update: {
          liked_count?: number | null;
          listed_count?: number | null;
          rating_average?: number | null;
          ratings?: number[] | null;
          ratings_count?: number | null;
          reviews_count?: number | null;
          tmdb_id?: number | null;
          updated_at?: string | null;
          watched_count?: number | null;
          watchlist_count?: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_auth_session: {
        Args: {
          p_ip_address?: string | null;
          p_session_id: string;
          p_user_agent?: string | null;
        };
        Returns: boolean;
      };
      deactivate_current_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      get_account_follow_counts: {
        Args: {
          p_account_id: string;
        };
        Returns: {
          followers_count: number;
          following_count: number;
        }[];
      };
      get_account_follow_target: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          id: string;
          is_private: boolean;
        }[];
      };
      get_account_follows: {
        Args: {
          p_account_id: string;
          p_before?: string | null;
          p_before_id?: string | null;
          p_direction: string;
          p_limit?: number;
        };
        Returns: {
          account_id: string;
          avatar_url: string;
          display_name: string;
          follow_id: string;
          followed_at: string;
          username: string;
          viewer_status: string;
        }[];
      };
      get_account_header: {
        Args: {
          p_account_id: string;
          p_media_type?: string;
          p_mutual?: number;
        };
        Returns: Json;
      };
      get_account_overview: {
        Args: {
          p_account_id: string;
          p_activity?: number;
          p_diary?: number;
          p_following?: number;
          p_lists?: number;
          p_media_type?: string;
          p_popular?: number;
          p_reviews?: number;
          p_watched?: number;
          p_watchlist?: number;
        };
        Returns: Json;
      };
      get_home_circle: { Args: Record<PropertyKey, never>; Returns: Json };
      get_home_pulse: { Args: { p_media_type?: string }; Returns: Json };
      get_list_page: {
        Args: {
          p_account_id: string;
          p_comments?: number;
          p_decade?: number | null;
          p_genre?: number | null;
          p_page?: number;
          p_page_size?: number;
          p_pattern?: string | null;
          p_slug: string;
          p_sort?: string;
        };
        Returns: Json;
      };
      get_list_previews: {
        Args: {
          p_limit?: number;
          p_list_ids: string[];
        };
        Returns: {
          list_id: string;
          poster_path: string;
        }[];
      };
      get_media_social_proof: {
        Args: {
          p_limit?: number;
          p_media_type: string;
          p_tmdb_id: number;
        };
        Returns: {
          account_id: string;
          avatar_url: string;
          display_name: string;
          liked: boolean;
          rating: number;
          reviewed: boolean;
          total: number;
          username: string;
          watched: boolean;
          watchlisted: boolean;
        }[];
      };
      get_movie_social_proof: {
        Args: {
          p_limit?: number;
          p_tmdb_id: number;
        };
        Returns: {
          account_id: string;
          avatar_url: string;
          display_name: string;
          liked: boolean;
          rating: number;
          reviewed: boolean;
          total: number;
          username: string;
          watched: boolean;
          watchlisted: boolean;
        }[];
      };
      get_mutual_followers: {
        Args: {
          p_account_id: string;
          p_limit?: number;
        };
        Returns: {
          account_id: string;
          avatar_url: string;
          display_name: string;
          total: number;
          username: string;
        }[];
      };
      get_rating_spread: {
        Args: {
          p_account_id: string;
          p_media_type?: string;
        };
        Returns: number[];
      };
      get_review_stats: {
        Args: {
          p_media_type?: string;
          p_tmdb_id: number;
          p_username?: string | null;
        };
        Returns: {
          average: number;
          rated: number;
          total: number;
        }[];
      };
      prune_account_data: { Args: Record<PropertyKey, never>; Returns: Json };
      reactivate_current_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      record_auth_event: {
        Args: {
          p_ip_address?: string | null;
          p_metadata?: Json | null;
          p_type: string;
          p_user_agent?: string | null;
        };
        Returns: undefined;
      };
      refresh_account_stats: {
        Args: {
          p_account_id: string;
        };
        Returns: undefined;
      };
      refresh_film_stats: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      refresh_media_stats: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      reorder_list_items: {
        Args: {
          p_list_id: string;
          p_tmdb_ids: number[];
        };
        Returns: undefined;
      };
      revoke_auth_session: {
        Args: {
          p_session_id: string;
        };
        Returns: undefined;
      };
      revoke_other_auth_sessions: {
        Args: {
          p_current_session_id: string;
        };
        Returns: undefined;
      };
      search_accounts: {
        Args: {
          p_limit?: number;
          p_query: string;
        };
        Returns: {
          avatar_url: string;
          display_name: string;
          followers_count: number;
          id: string;
          is_private: boolean;
          username: string;
        }[];
      };
      search_lists: {
        Args: {
          p_limit?: number;
          p_query: string;
        };
        Returns: {
          id: string;
          items_count: number;
          likes_count: number;
          media_type: string;
          owner_display_name: string;
          owner_username: string;
          poster_path: string;
          slug: string;
          title: string;
        }[];
      };
      search_reviews: {
        Args: {
          p_limit?: number;
          p_query: string;
        };
        Returns: {
          author_avatar_url: string;
          author_display_name: string;
          author_username: string;
          content: string;
          id: string;
          is_spoiler: boolean;
          likes_count: number;
          media_type: string;
          poster_path: string;
          rating: number;
          release_date: string;
          title: string;
          tmdb_id: number;
        }[];
      };
      seed_apply_profiles: { Args: { p_profiles: Json }; Returns: number };
      seed_backdate: { Args: { p_ids: string[] }; Returns: number };
      set_episode_rating: {
        Args: {
          p_episode: number;
          p_rating: number | null;
          p_runtime?: number | null;
          p_season: number;
          p_show_id: number;
        };
        Returns: undefined;
      };
      set_episodes_watched: {
        Args: {
          p_aired_count?: number | null;
          p_episodes: number[];
          p_runtimes?: number[] | null;
          p_season: number;
          p_show_id: number;
          p_watched: boolean;
        };
        Returns: {
          account_id: string;
          aired_episodes: number | null;
          backdrop_path: string | null;
          last_episode: number | null;
          last_season: number | null;
          last_watched_at: string | null;
          next_air_date: string | null;
          poster_path: string | null;
          release_date: string | null;
          show_id: number;
          started_at: string;
          status: string;
          title: string;
          updated_at: string;
          watched_episodes: number;
        };
        SetofOptions: {
          from: "*";
          to: "account_show_progress";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_show_status: {
        Args: {
          p_episodes?: Json | null;
          p_show_id: number;
          p_status: string | null;
        };
        Returns: {
          account_id: string;
          aired_episodes: number | null;
          backdrop_path: string | null;
          last_episode: number | null;
          last_season: number | null;
          last_watched_at: string | null;
          next_air_date: string | null;
          poster_path: string | null;
          release_date: string | null;
          show_id: number;
          started_at: string;
          status: string;
          title: string;
          updated_at: string;
          watched_episodes: number;
        };
        SetofOptions: {
          from: "*";
          to: "account_show_progress";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      touch_auth_session: {
        Args: {
          p_ip_address?: string | null;
          p_session_id: string;
          p_user_agent?: string | null;
        };
        Returns: undefined;
      };
      update_account: {
        Args: {
          p_avatar_url?: string | null;
          p_background_url?: string | null;
          p_bio?: string | null;
          p_display_name?: string | null;
          p_is_private?: boolean | null;
          p_username?: string | null;
        };
        Returns: {
          avatar_url: string | null;
          background_url: string | null;
          bio: string | null;
          created_at: string;
          deactivated_at: string | null;
          display_name: string | null;
          id: string;
          is_active: boolean;
          is_private: boolean;
          status: string | null;
          updated_at: string;
          username: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "accounts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
