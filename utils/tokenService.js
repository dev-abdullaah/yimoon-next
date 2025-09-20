import { getAuthToken, setAuthToken } from '@/utils/cryptoHelper';

import { BASE_URL } from '@/lib/config';

let tokenFetchPromise = null;

export const getOrFetchToken = async () => {
    // First check if we already have a token
    const existingToken = getAuthToken();
    if (existingToken) {
        return existingToken;
    }

    // If a token fetch is already in progress, return that promise
    if (tokenFetchPromise) {
        return tokenFetchPromise;
    }

    // Fetch new token
    tokenFetchPromise = (async () => {
        try {
            const formData = new FormData();
            formData.append('username', 'user1');
            formData.append('password', 'Yy123456');
            // formData.append('username', 'pacific1');
            // formData.append('password', 'Ff123456');

            const response = await fetch(`${BASE_URL}/auth`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to fetch token');
            }

            const data = await response.json();

            if (data.token) {
                setAuthToken(data.token);
                return data.token;
            }
            throw new Error('No token in response');
        } catch (error) {
            console.error('Error fetching token:', error);
            throw error;
        } finally {
            tokenFetchPromise = null;
        }
    })();

    return tokenFetchPromise;
};