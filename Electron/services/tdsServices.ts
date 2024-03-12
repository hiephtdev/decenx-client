import axios from 'axios';
import { TiktokTask } from '../types/tiktokTask.type';

export const useTdsService = (token: string) => {
    const _token = token;
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Lấy danh sách nhiệm vụ tiktok
     * @param type 
     * @returns 
     */
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

    /**
     * Gửi duyệt và nhận tiền
     * @param type 
     * @param id 
     * @returns 
     */
    const confirmAndSendQuest = async (type: string, id: string): Promise<{ success: boolean, message: string }> => {
        const result: { success: boolean, message: string } = { success: false, message: '' };
        try {
            if (!_token) {
                return result;
            }
            // gửi duyệt
            const resConfirm = await axios.get(`https://traodoisub.com/api/coin/?type=${type.toUpperCase()}_CACHE&id=${id}&access_token=${_token}`);
            if (!resConfirm || resConfirm.status !== 200) {
                return result;
            }

            if (resConfirm.data && resConfirm.data.error) {
                return result;
            }
            result.success = true;
            if (resConfirm.data.cache > 9) {
                // gửi nhận tiền
                const res = await axios.get(`https://traodoisub.com/api/coin/?type=${type.toUpperCase()}&id=${type.toUpperCase()}_API&access_token=${_token}`);
                if (!res || res.status !== 200) {
                    return result;
                }
                if (!res.data || res.data.error) {
                    return result;
                }
                result.message = res.data.message;
            }
            return result;
        } catch (error) {
            return result;
        }
    };

    return { getTiktokTasks, confirmAndSendQuest }
}