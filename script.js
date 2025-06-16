document.addEventListener('DOMContentLoaded', () => {
    const jsonFileInput = document.getElementById('jsonFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const costValueInput = document.getElementById('costValue');
    const cooldownValueInput = document.getElementById('cooldownValue');
    const processFileButton = document.getElementById('processFile');

    // Elements for the modal
    const showLogButton = document.getElementById('showLogButton');
    const logModal = document.getElementById('logModal');
    const closeButton = document.querySelector('.close-button');
    const modalLogContent = document.getElementById('modalLogContent'); // Changed from logContent

    let currentLog = ''; // Variable to store log messages

    // Display selected file name
    jsonFileInput.addEventListener('change', () => {
        if (jsonFileInput.files.length > 0) {
            fileNameDisplay.textContent = `Đã chọn: ${jsonFileInput.files[0].name}`;
        } else {
            fileNameDisplay.textContent = 'Chưa có tệp nào được chọn';
        }
    });

    // Function to append messages to the log variable
    function log(message) {
        currentLog += message + '\n';
        // logContent.textContent += message + '\n'; // Remove direct update to hidden logContent
        // logContent.scrollTop = logContent.scrollHeight; 
    }

    // Event listener for processing the file
    processFileButton.addEventListener('click', () => {
        currentLog = ''; // Clear previous log
        modalLogContent.textContent = ''; // Clear modal log content as well
        showLogButton.style.display = 'none'; // Hide log button until processing is done

        const file = jsonFileInput.files[0];
        const newCost = parseInt(costValueInput.value, 10);
        const newCooldown = parseInt(cooldownValueInput.value, 10);

        if (!file) {
            log('Vui lòng chọn tệp PlantLevels.json trước.');
            showLogButton.style.display = 'block'; // Show button if there's a message
            return;
        }
        if (file.name !== 'PlantLevels.json') {
            log('Tên tệp phải là PlantLevels.json.');
            showLogButton.style.display = 'block';
            return;
        }
        if (isNaN(newCost) || newCost < 0) {
            log('Giá cây (Cost) phải là một số nguyên không âm hợp lệ.');
            showLogButton.style.display = 'block';
            return;
        }
        if (isNaN(newCooldown) || newCooldown < 0) {
            log('Thời gian hồi chiêu (Cooldown) phải là một số nguyên không âm hợp lệ.');
            showLogButton.style.display = 'block';
            return;
        }

        log('Bắt đầu xử lý tệp...');

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const rawJson = e.target.result;
                let data;
                try {
                    data = JSON.parse(rawJson);
                } catch (jsonError) {
                    log(`Lỗi: Tệp JSON không hợp lệ. Vui lòng kiểm tra định dạng.`);
                    console.error(jsonError);
                    showLogButton.style.display = 'block';
                    return;
                }

                log('Tệp JSON đã được tải và phân tích cú pháp.');

                let modificationsMade = 0;

                if (data && Array.isArray(data.objects)) {
                    data.objects.forEach(obj => {
                        if (obj.objdata && Array.isArray(obj.objdata.FloatStats)) {
                            const plantName = obj.aliases && obj.aliases.length > 0 ? obj.aliases[0] : 'Unknown Plant';

                            let hasPacketCooldown = false;
                            let hasStartingCooldown = false;

                            obj.objdata.FloatStats.forEach(stat => {
                                // Update 'Cost'
                                if (stat.Name === 'Cost' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newCost);
                                    log(`  - Cập nhật Cost cho ${plantName} thành ${newCost}`);
                                    modificationsMade++;
                                }

                                // Update 'PacketCooldown'
                                if (stat.Name === 'PacketCooldown' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newCooldown);
                                    log(`  - Cập nhật PacketCooldown cho ${plantName} thành ${newCooldown}`);
                                    modificationsMade++;
                                    hasPacketCooldown = true;
                                }

                                // Update 'StartingCooldown'
                                if (stat.Name === 'StartingCooldown' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newCooldown);
                                    log(`  - Cập nhật StartingCooldown cho ${plantName} thành ${newCooldown}`);
                                    modificationsMade++;
                                    hasStartingCooldown = true;
                                }
                            });

                            if (!hasPacketCooldown || !hasStartingCooldown) {
                                if (plantName !== "marigold" && obj.objdata.FloatStats.length > 0) {
                                    if (!hasPacketCooldown) log(`  Lưu ý: Không tìm thấy PacketCooldown cho ${plantName}.`);
                                    if (!hasStartingCooldown) log(`  Lưu ý: Không tìm thấy StartingCooldown cho ${plantName}.`);
                                }
                            }
                        }
                    });
                } else {
                    log('Lỗi: Cấu trúc tệp JSON không mong đợi. Không tìm thấy mảng "objects" hoặc "objdata.FloatStats".');
                    showLogButton.style.display = 'block';
                    return;
                }

                if (modificationsMade > 0) {
                    log(`\nHoàn tất chỉnh sửa. Tổng số thay đổi: ${modificationsMade}.`);
                    const modifiedJsonString = JSON.stringify(data, null, 4);

                    const blob = new Blob([modifiedJsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name.replace('.json', '_modified.json');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    log(`Tệp đã sửa đổi đã được tải xuống: ${a.download}`);
                } else {
                    log('Không có thay đổi nào được thực hiện hoặc không tìm thấy thuộc tính phù hợp để chỉnh sửa. Vui lòng kiểm tra lại tệp và cài đặt.');
                }
                showLogButton.style.display = 'block'; // Show log button after processing

            } catch (error) {
                log(`Lỗi không xác định khi xử lý tệp: ${error.message}`);
                console.error(error);
                showLogButton.style.display = 'block';
            } finally {
                // Đảm bảo modalLogContent được cập nhật với log cuối cùng
                modalLogContent.textContent = currentLog;
            }
        };

        reader.onerror = () => {
            log('Lỗi khi đọc tệp. Vui lòng thử lại.');
            showLogButton.style.display = 'block';
            // Đảm bảo modalLogContent được cập nhật với log cuối cùng
            modalLogContent.textContent = currentLog;
        };

        reader.readAsText(file);
    });

    // Modal event listeners
    showLogButton.addEventListener('click', () => {
        logModal.style.display = 'flex'; // Show the modal
    });

    closeButton.addEventListener('click', () => {
        logModal.style.display = 'none'; // Hide the modal
    });

    // Close the modal if user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === logModal) {
            logModal.style.display = 'none';
        }
    });
});