export interface UserProfile {
    isGuest: boolean;
    displayName: string;
    avatarUrl: string | null;
    avatarInitial: string;
}

export function useUserProfile(user: any): UserProfile {
    const isGuest = !!user?.is_anonymous;
    const displayName = isGuest
        ? "Guest User"
        : user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "User";
    const avatarUrl =
        !isGuest && user?.user_metadata?.avatar_url
            ? user.user_metadata.avatar_url
            : null;
    const avatarInitial = displayName?.charAt(0)?.toUpperCase() || "U";

    return { isGuest, displayName, avatarUrl, avatarInitial };
}