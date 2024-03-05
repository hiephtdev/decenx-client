import si from 'systeminformation';

export const useInfomationSystem = () => {
    const getinfomationSystem = () => {
        // setInterval(() => {
        //     si.cpu()
        //         .then((cpuData: any) => {
        //             console.log('Updated CPU Information:', cpuData.cores);
        //             // Cập nhật giao diện người dùng nếu cần
        //         })
        //         .catch((error: any) => console.error(error));
        //     si.processes()
        //         .then((data: any) => {
        //             // Tính tổng CPU sử dụng bởi tất cả các quá trình
        //             const totalCPUUsage = data.list.reduce((x: any, y: any) => x.cpu + y.cpu, 0);

        //             console.log('CPU Utilization (%):', totalCPUUsage.toFixed(2));
        //         })
        //         .catch(error => console.error(error));

        //     si.mem()
        //         .then((memData: any) => {
        //             const totalGB = memData.total / (1024 * 1024 * 1024);
        //             const usedGB = memData.used / (1024 * 1024 * 1024);
        //             console.log('Updated Memory Information:', `${usedGB.toFixed(2)}GB / ${totalGB.toFixed(2)}GB`);
        //             // Cập nhật giao diện người dùng nếu cần
        //         })
        //         .catch((error: any) => console.error(error));
        // }, 5000);
    }
    return {
        getinfomationSystem
    }
}