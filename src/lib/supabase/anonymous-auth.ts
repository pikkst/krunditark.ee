import { useEffect, useRef, useState } from "react";
import { supabase } from "./client";
import type { Session, User } from "@supabase/supabase-js";

export interface UseAnonymousAuthResult {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signInAnonymously: () => Promise<User>;
  signOut: () => Promise<void>;
  isAnonymous: boolean;
}

export function useAnonymousAuth(): UseAnonymousAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initializing = useRef(false);

  useEffect(() => {
    if (initializing.current) return;
    initializing.current = true;

    let mounted = true;

    async function init() {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signInAnonymously(): Promise<User> {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        throw authError;
      }

      const anonymousUser = data.user;
      if (!anonymousUser) {
        throw new Error("Anonymous sign-in succeeded but no user was returned");
      }

      setSession(data.session);
      setUser(anonymousUser);
      return anonymousUser;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setSession(null);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  const isAnonymous = user?.is_anonymous ?? false;

  return {
    session,
    user,
    isLoading,
    error,
    signInAnonymously,
    signOut,
    isAnonymous,
  };
}
