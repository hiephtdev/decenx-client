<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount, reactive } from 'vue'
import axios from 'axios';
import { API_URL } from '../constants/config';
import { useSocket } from '../composables/useSocket';
import { useMessage } from '../composables/useMessage';
import { JwtPayload, decode } from 'jsonwebtoken';

const socketServer = useSocket();
const { showMessage } = useMessage();
//Token
const accessToken = ref(localStorage.getItem('token') || "");
const userId = (decode(accessToken.value) as JwtPayload)?.userId || "";

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
    // connectClient();
    showMessage('Connected to the server', "success");
  });

// Nghe sự kiện lỗi kết nối
socketServer.on('connect_error', (error: any) => {
  try {
    socketConnected.value = false;
    connectLoading.value = false;
    socketServer.emit('unsubscribe', uuid.value);
    showMessage(`Connection error: ${error}`, "error");
  } catch (ex) {
    showMessage(`Connection error: ${ex}`, "error");
  }
  // Xử lý lỗi kết nối ở đây
});

// Lắng nghe sự kiện disconnect
socketServer.on('disconnect', () => {
  try {
    socketConnected.value = false;
    connectLoading.value = false;
    socketServer.emit('unsubscribe', uuid.value);
    showMessage(`Disconnected from the server`, "error");
  } catch (error) {
    showMessage(`Connection error: ${error}`, "error");
  }
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
    pcName: pcName.value || ""
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

    /**
     * Chạy browser
     */
    socketServer.on('client-start', (data: any) => {
      if (!data.message) {
        return;
      }

      for (let i = 0; i < data.message.length; i++) {
        (window as any).ipcRenderer.send('woker-start', data.message[i]);
      }
    });

    /**
     * Gọi stop browser
     */
    socketServer.on('client-stop', (data: any) => {
      if (!data.message) {
        return
      }
      for (let i = 0; i < data.message.length; i++) {
        const clientBrowser = data.message[i];
        (window as any).ipcRenderer.send('woker-stop', clientBrowser.profileName);
      }
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
  (window as any).ipcRenderer.receive('genuuid', (arg: any) => {
    tmpUuid.value = arg
    localStorage.setItem('uuid', arg);
  });

  (window as any).ipcRenderer.receive('pcinfo', (arg: any) => {
    tmpMac.value = arg.macAddress
    localStorage.setItem('macAddress', arg.macAddress);

    tmpPcName.value = arg.pcName
    localStorage.setItem('pcName', arg.pcName);
  });

  (window as any).ipcRenderer.receive('worker-logs', (arg: any) => {
    logs.value.unshift({
      time: `${new Date().toLocaleString()}`,
      content: arg
    });

    if (logs.value.length > 1000) {
      logs.value.pop();
    }
  });

  (window as any).ipcRenderer.receive('download-drivers', (arg: any) => {
    if (arg === 'success') {
      connectDisabled.value = false;
    }
  });
})

const connectDisabled = ref(true);

const handleUploadSucess = (response: any, file: any, fileList: any) => {
  console.log(response, file, fileList);
}

const logs = ref([] as any[]);

</script>

<template>
  <div class="flex justify-center items-center h-screen bg-gray-100">
    <div class="text-center">
      <el-row :gutter="20">
        <el-col :span="20">
          <el-input v-model="uuid" disabled placeholder="UUID" />
        </el-col>
        <el-col :span="4" class="text-right">
          <el-button type="primary" @click="connectClient" :loading="connectLoading"
            :disable="connectDisabled">Connect</el-button>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col>
          <el-table class="mt-3" :data="logs" style="width: 900px;height: 500px;">
            <el-table-column prop="time" label="Thời gian" width="180" />
            <el-table-column prop="content" label="Nội dung" />
          </el-table>
        </el-col>
      </el-row>
      <!-- <el-row>
        <el-upload ref="uploadRef" :auto-upload="false" :on-change="handleUploadSucess">
          <template #trigger>
            <el-button type="primary">Chọn file</el-button>
          </template>
</el-upload>
</el-row> -->
    </div>
  </div>
</template>

<style scoped></style>
