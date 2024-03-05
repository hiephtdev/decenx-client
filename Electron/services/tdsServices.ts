import axios from 'axios';
import { TiktokTask } from '../types/tiktokTask.type';

export const useTdsService = (token: string) => {
    const _token = token;
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const getTiktokTasks = async (type: string): Promise<TiktokTask[]> => {
        try {
            if (!_token) {
                return [];
            }
            const res = await axios.get(`https://traodoisub.com/api/?fields=${type}&access_token=${_token}`);
            if (res.status === 200 && res.data) {
                if (res.data.data && res.data.data.length > 0) {
                    return res.data.data;
                } else if (res.data.countdown) {
                    await wait(res.data.countdown * 1000 + 5000);
                    return await getTiktokTasks(type);
                }
            }
        } catch (error) {
            return [];
        }

        return [];
    };

    return { getTiktokTasks }
}