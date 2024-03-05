import { io } from 'socket.io-client';
import { ref, onBeforeUnmount } from 'vue';
import { SOCKET_URL } from '../constants/config';

export const useSocket = () => {
    const socket = io(SOCKET_URL, { query: { token: localStorage.getItem('token') } });

    const isConnected = ref(true);

    const disconnect = () => {
        if (isConnected.value) {
            socket.disconnect();
            isConnected.value = false;
        }
    };

    const on = (event: string, callback: (...args: any[]) => void) => {
        socket.on(event, callback);
    };

    const off = (event: string, callback: (...args: any[]) => void) => {
        socket.off(event, callback);
    };

    const emit = (event: string, data: any) => {
        socket.emit(event, data);
    };

    onBeforeUnmount(() => {
        disconnect();
    });

    return {
        isConnected,
        disconnect,
        on,
        off,
        emit,
    };
};
