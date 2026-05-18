"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export type AuthUser = {
  email: string;
  id: string;
  image: string | null;
  name: string;
};

function mapSupabaseUser(user: SupabaseUser): AuthUser {
  const metadata = user.user_metadata as Record<string, unknown>;
  const name =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";

  return {
    email: user.email ?? "",
    id: user.id,
    image:
      (metadata.avatar_url as string | undefined) ??
      (metadata.picture as string | undefined) ??
      null,
    name,
  };
}

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsPending(false);
      return;
    }

    const supabase = createClient();

    const init = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser ? mapSupabaseUser(currentUser) : null);
      setIsPending(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setIsPending(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    data: user ? { session: { userId: user.id }, user } : null,
    isPending,
  };
}

export const useCurrentUser = () => {
  const { data, isPending } = useSession();
  return {
    isPending,
    session: data?.session,
    user: data?.user ?? null,
  };
};

export const useCurrentUserOrRedirect = (
  forbiddenUrl = "/auth/sign-in",
  okUrl = "",
  ignoreForbidden = false,
) => {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && router) {
      if (!data?.user) {
        if (!ignoreForbidden) {
          router.push(forbiddenUrl);
        }
      } else if (okUrl) {
        router.push(okUrl);
      }
    }
  }, [isPending, data?.user, router, forbiddenUrl, okUrl, ignoreForbidden]);

  return {
    isPending,
    session: data?.session,
    user: data?.user ?? null,
  };
};

/** Redirect to server OAuth route so redirectTo matches the live site host. */
export function signInWithGoogle(callbackPath = "/auth/callback") {
  const params = new URLSearchParams();

  const nextMatch = callbackPath.match(/[?&]next=([^&]+)/);
  if (nextMatch?.[1]) {
    params.set("next", decodeURIComponent(nextMatch[1]));
  } else if (callbackPath.startsWith("/auth/callback")) {
    params.set("next", "/");
  } else {
    params.set("next", callbackPath);
  }

  const query = params.toString();
  window.location.href = query
    ? `/api/auth/google?${query}`
    : "/api/auth/google";
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export const signIn = {
  social: ({
    callbackURL,
    provider,
  }: {
    callbackURL?: string;
    provider: "google";
  }) => {
    if (provider !== "google") {
      return Promise.reject(new Error(`Unsupported provider: ${provider}`));
    }
    const callbackPath = callbackURL
      ? `/auth/callback?next=${encodeURIComponent(callbackURL)}`
      : "/auth/callback";
    return signInWithGoogle(callbackPath);
  },
};

export function useMfa() {
  const supabase = createClient();

  const enroll = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error) throw error;
    return {
      data: {
        backupCodes: [] as string[],
        totpURI: data.totp.qr_code,
        secret: data.totp.secret,
      },
    };
  }, [supabase.auth.mfa]);

  const disable = useCallback(
    async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    [supabase.auth.mfa],
  );

  const listFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  }, [supabase.auth.mfa]);

  const verifyTotp = useCallback(
    async ({ code, factorId }: { code: string; factorId: string }) => {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        challengeId: challenge.id,
        code,
        factorId,
      });
      if (error) throw error;
    },
    [supabase.auth.mfa],
  );

  return { disable, enroll, listFactors, verifyTotp };
}

// Kept for backward compatibility with profile/MFA pages
export const twoFactor = {
  disable: async ({ password: _password }: { password: string }) => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totpFactor = data?.totp?.[0];
    if (!totpFactor) {
      throw new Error("No TOTP factor enrolled");
    }
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: totpFactor.id,
    });
    if (error) throw error;
    return { data: null };
  },
  enable: async ({ password: _password }: { password: string }) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error) throw error;
    return {
      data: {
        backupCodes: [] as string[],
        totpURI: data.totp.qr_code,
      },
    };
  },
  verifyBackupCode: async ({ code: _code }: { code: string }) => {
    throw new Error("Backup codes are managed in the Supabase dashboard.");
  },
  verifyTotp: async ({ code }: { code: string }) => {
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];
    if (!totpFactor) {
      throw new Error("No TOTP factor enrolled");
    }
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError) throw challengeError;

    const { error } = await supabase.auth.mfa.verify({
      challengeId: challenge.id,
      code,
      factorId: totpFactor.id,
    });
    if (error) throw error;
    return { data: null };
  },
};
