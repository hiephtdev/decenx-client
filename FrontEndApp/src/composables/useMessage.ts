import { ElMessage } from 'element-plus'

export const useMessage = () => {
    const showMessage = (content: string, msgType?: string) => {
        ElMessage({
            showClose: true,
            message: content,
            type: msgType as 'success' | 'warning' | 'error' | 'info' // Cast msgType to the correct type
        });
    };

    return {
        showMessage,
    };
}