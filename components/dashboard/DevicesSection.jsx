// components/dashboard/DevicesSection.jsx
'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * The devices currently signed in to this account.
 *
 * This is the control a shopper reaches for when they think someone else has
 * their account — a lost phone, a shared computer — so it belongs next to the
 * password form rather than hidden. Two actions, and the difference matters:
 * revoking one session leaves the other devices alone, and "sign out
 * everywhere" ends all of them at once.
 *
 * The API does not tell us what device a session is. It reports the token's
 * `name`, which is the label the client that created it chose, so the row is
 * identified by that and by when it was last used. Inventing a browser or
 * platform from it would be a guess presented as a fact.
 */
export default function DevicesSection() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { logoutAll } = useAuth();

    const sessionsQuery = useQuery({
        queryKey: ['sessions'],
        queryFn: () => accountApi.getSessions(),
    });

    const sessions = sessionsQuery.data?.data?.sessions ?? [];

    const revoke = useMutation({
        mutationFn: (sessionId) => accountApi.revokeSession(sessionId),
        onSuccess: (response) => {
            // Revoking the session that made this request takes the sign-in with
            // it, so there is nothing left to re-read the list with. The API says
            // so in `meta.was_current` rather than leaving the client to guess
            // from which row was pressed.
            if (response?.meta?.was_current) {
                toast.success('That device has been signed out.');
                router.push('/');
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('That device has been signed out.');
        },
        onError: (error) => toast.error(error.message || 'Could not sign that device out'),
    });

    const signOutEverywhere = useMutation({
        mutationFn: () => logoutAll(),
        onSuccess: () => {
            toast.success('Signed out on every device.');
            router.push('/');
        },
        onError: (error) =>
            // `logoutAll` has already ended this session locally even though the
            // call failed, so the shopper is looking at a signed-out app with a
            // message saying the rest were not. That is the honest report.
            toast.error(
                error.message ||
                    'You have been signed out here, but the other devices could not be reached. Try again in a moment.'
            ),
    });

    return (
        <section>
            <h1 className="text-dark mb-1 text-xl font-semibold">Signed-in Devices</h1>

            <p className="text-gray mb-4 text-sm">
                Every device holding a session on your account. If you do not recognise one, sign it
                out and change your password.
            </p>

            {sessionsQuery.isLoading ? (
                <ul className="space-y-3">
                    {[0, 1, 2].map((index) => (
                        <li key={index} className="h-20 animate-pulse rounded-md bg-slate-100" />
                    ))}
                </ul>
            ) : sessionsQuery.isError ? (
                <p className="rounded-md border border-light-white p-5 text-sm text-gray">
                    Your devices could not be loaded. Reload the page to try again.
                </p>
            ) : (
                <ul className="space-y-3">
                    {sessions.map((session) => (
                        <li
                            key={session.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-light-white p-4"
                        >
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-semibold text-dark">
                                    {describeDevice(session.name)}
                                    {session.is_current && (
                                        // A `<span>` and not part of the name: it is
                                        // a state, and screen readers should hear it
                                        // as one rather than as another word of the
                                        // device's name.
                                        <span className="rounded bg-primary px-1.5 py-0.5 text-xxs font-medium text-white">
                                            This device
                                        </span>
                                    )}
                                </p>

                                <p className="text-gray mt-0.5 text-xs">
                                    {session.is_current
                                        ? 'In use now'
                                        : `Last used ${formatWhen(session.last_used_at ?? session.created_at)}`}
                                </p>
                            </div>

                            {!session.is_current && (
                                <button
                                    type="button"
                                    disabled={revoke.isPending}
                                    onClick={() => revoke.mutate(session.id)}
                                    className="rounded border border-gray-400 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Sign out
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {sessions.length > 1 && (
                <button
                    type="button"
                    disabled={signOutEverywhere.isPending}
                    onClick={() => signOutEverywhere.mutate()}
                    className="bg-dark mt-5 w-full rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {signOutEverywhere.isPending ? 'Signing out…' : 'Sign out on every device'}
                </button>
            )}
        </section>
    );
}

/**
 * A human label for a session.
 *
 * The API only carries the name the creating client gave it, so this falls back
 * to something neutral rather than guessing at a browser. An unfamiliar name is
 * shown as it is — that is exactly what a shopper is being asked to judge.
 */
function describeDevice(name) {
    if (!name) return 'Unknown device';

    return name.replace(/[-_]/g, ' ');
}

/** A relative time, falling back to the raw value when the API sent none. */
function formatWhen(timestamp) {
    if (!timestamp) return 'at an unknown time';

    const then = new Date(timestamp);

    if (Number.isNaN(then.getTime())) return 'at an unknown time';

    const seconds = Math.round((Date.now() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
