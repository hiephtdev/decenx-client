<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import axios from 'axios';
import { API_URL } from '../constants/config';
import { useSocket } from '../composables/useSocket';
import { useMessage } from '../composables/useMessage';
import { decode } from 'jsonwebtoken';

const socketServer = useSocket();
const { showMessage } = useMessage();
//Token
const accessToken = ref(localStorage.getItem('token') || "");
const userId = decode(accessToken.value)?.userId || "";

//Trạng thái socket
const socketConnected = ref(false);

const pingServer = () => {
  socketServer.emit('sendMessage', { channel: userId, event: 'ping', message: { clientId: uuid.value, cpu: '20/50', ram: '10/200' } });
}

onBeforeUnmount(() => {
  socketServer.emit('unsubscribe', uuid.value);
}),

  //Connect websocket
  socketServer.on('connect', () => {
    socketConnected.value = true;
    showMessage('Connected to the server', "success");
  });

// Nghe sự kiện lỗi kết nối
socketServer.on('connect_error', (error: any) => {
  socketConnected.value = false;
  connectLoading.value = false;
  showMessage(`Connection error: ${error}`, "error");
  // Xử lý lỗi kết nối ở đây
});

// Lắng nghe sự kiện disconnect
socketServer.on('disconnect', () => {
  socketConnected.value = false;
  connectLoading.value = false;
  showMessage(`Disconnected from the server`, "error");
});

//post client
import { Client } from '../types/client.type';

// Gửi thông tin kết nối từ client lên server
const sendRequestConnect = async () => {
  if (!uuid.value) {
    showMessage("UUID không tồn tại", "error");
    return;
  }
  const client: Client = {
    platform: "tiktok",
    clientId: uuid.value || "",
    mac: macAddress.value || "",
    pcName: pcName.value || "",
    tdsid: []
  }
  await axios.post(`${API_URL}/client`, client, {
    headers: {
      'Authorization': `Bearer ${accessToken.value}`
    }
  });
}
const connectLoading = ref(false);
// Kết nối client với server
const connectClient = () => {
  try {
    if (!uuid.value) {
      showMessage("UUID không tồn tại", "error");
      return;
    }
    connectLoading.value = true;
    // window.ipcRenderer.send('runBrowser');
    socketServer.emit('subscribe', uuid.value);

    // Lắng nghe sự kiện khi server thông báo việc tham gia channel thành công
    socketServer.on('subscribed', async (message: any) => {
      try {
        await sendRequestConnect();
        showMessage(`Subscribed thành công: ${message}`, "success");
      } catch (error) {
        showMessage(`Gửi yêu cầu kết nối thất bại ${error}`, "error");
        socketServer.emit('unsubscribe', uuid.value);
      }
    });

    //ping báo trạng thái server 30s 1 lần
    pingServer();
    setInterval(() => {
      if (socketConnected.value) {
        pingServer();
      }
    }, 30000);

    // socketServer.on('allow', (args) => {
    //   sendRequestConnect();
    // });

    socketServer.on('unsubscribed', (message: any) => {
      connectLoading.value = false;
    });

    socketServer.on('tiktok-like', (message: any) => {
      console.log(message);
    });
  } catch (e) {
    connectLoading.value = false;
    console.log(e);
  }
}

// Lấy thông tin client truyền về server để tiến hành pair
const tmpUuid = ref('');
const uuid = computed(() => {
  if (localStorage.getItem('uuid')) {
    return localStorage.getItem('uuid');
  }
  return tmpUuid.value;
});

const tmpMac = ref('');
const macAddress = computed(() => {
  if (localStorage.getItem('macAddress')) {
    return localStorage.getItem('macAddress');
  }
  return tmpMac.value;
})

const tmpPcName = ref('');
const pcName = computed(() => {
  if (localStorage.getItem('pcName')) {
    return localStorage.getItem('pcName');
  }
  return tmpPcName.value;
})

// Lấy các thông tin của máy
onMounted(() => {
  window.ipcRenderer.receive('genuuid', (arg: any) => {
    tmpUuid.value = arg
    localStorage.setItem('uuid', arg);
  });

  window.ipcRenderer.receive('pcinfo', (arg: any) => {
    tmpMac.value = arg.macAddress
    localStorage.setItem('macAddress', arg.macAddress);

    tmpPcName.value = arg.pcName
    localStorage.setItem('pcName', arg.pcName);
  });
})

</script>

<template>
  <div class="flex justify-center items-center h-screen bg-gray-100">
    <div class="text-center">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-input v-model="uuid" disabled placeholder="UUID" />
        </el-col>
        <el-col :span="8">
          <el-button type="primary" @click="connectClient" :loading="connectLoading">Connect</el-button>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped></style>
