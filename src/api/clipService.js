const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Creates a new clip request.
 * @param {Object} data - { youtube_url, start_time, end_time }
 * @returns {Promise<Object>} - The created clip request object.
 */
export const createClipRequest = async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/clip-request/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create clip request');
    }

    return response.json();
};

/**
 * Gets the status of a specific clip request.
 * @param {string} clipRequestId 
 * @returns {Promise<Object>} - The clip request object with status.
 */
export const getClipTaskStatus = async (clipRequestId) => {
    const response = await fetch(`${API_BASE_URL}/api/clip-request/task_status?clip_request_id=${clipRequestId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        // Handle 404 or other errors
        throw new Error('Failed to fetch task status');
    }

    return response.json();
};
/**
 * Sends the clip to a specified email.
 * @param {string} clipRequestId 
 * @param {string} email 
 * @returns {Promise<Object>}
 */
export const sendClipToEmail = async (clipRequestId, email) => {
    const response = await fetch(`${API_BASE_URL}/api/clip-request/send_clip_to_email?clip_request_id=${clipRequestId}&email=${email}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send email');
    }

    return response.json();
};
