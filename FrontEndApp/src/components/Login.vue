<script setup lang="ts">
import { reactive, ref, defineEmits } from 'vue'
import { API_URL } from '../constants/config';
import axios from 'axios';
import { useMessage } from '../composables/useMessage';
const { showMessage } = useMessage();

const user = reactive({
    username: '',
    password: ''
})
const emit = defineEmits(['login']);
const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/login`, user);
        if (res.data.token) {
            showMessage(`Đăng nhập thành công`, 'success')
            emit('login', res.data.token)
        } else {
            showMessage(`Đăng nhập thất bại: ${res.data.message}`, 'error')
        }
    } catch (error) {
        showMessage(`Login lỗi: ${error}`, 'error')
    }
}
</script>
<template>
    <div class="flex justify-center items-center h-screen bg-gray-100">
        <div class="bg-white p-8 rounded-lg shadow-lg w-1/3">
            <!-- <img src="../assets/logo.png" alt="logo" class="logo" /> -->
            <h1 class="text-2xl font-bold text-center mb-4">Login</h1>
            <form @submit.prevent="login">
                <div class="mb-4">
                    <label for="username" class="block text-gray-700 text-sm font-bold mb-2">Username</label>
                    <input v-model="user.username" type="text" id="username" name="username"
                        class="w-full border-2 border-gray-200 p-3 rounded outline-none focus:border-blue-500" />
                </div>
                <div class="mb-4">
                    <label for="password" class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                    <input v-model="user.password" type="password" id="password" name="password"
                        class="w-full border-2 border-gray-200 p-3 rounded outline-none focus:border-blue-500" />
                </div>
                <div class="flex justify-center">
                    <button type="submit" class="bg-blue-500 text-white p-4 rounded-lg w-1/2">Login</button>
                </div>
            </form>
        </div>
    </div>
</template>