document.addEventListener('DOMContentLoaded', () => {
    // Thêm dòng này để lấy button chọn file
    const fileSelectButton = document.getElementById('fileSelectButton');
    const jsonFileInput = document.getElementById('jsonFile');

    // Thêm sự kiện click cho button chọn file
    fileSelectButton.addEventListener('click', () => {
        jsonFileInput.click();
    });
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const costValueInput = document.getElementById('costValue');
    const cooldownValueInput = document.getElementById('cooldownValue');

    const processFileButton = document.getElementById('processFile');

    // Elements for the modal
    const showLogButton = document.getElementById('showLogButton');
    const logModal = document.getElementById('logModal');
    const closeButton = document.querySelector('.close-button'); // Correctly querySelector
    const modalLogContent = document.getElementById('modalLogContent');

    let currentLog = '';

    jsonFileInput.addEventListener('change', () => {
        if (jsonFileInput.files.length > 0) {
            fileNameDisplay.textContent = `Đã chọn: ${jsonFileInput.files[0].name}`;
        } else {
            fileNameDisplay.textContent = 'Chưa có tệp nào được chọn';
        }
    });

    function log(message) {
        currentLog += message + '\n';
    }

    // Event listener for processing the file
    processFileButton.addEventListener('click', () => {
        currentLog = ''; // Clear previous log
        modalLogContent.textContent = ''; // Clear modal log content as well
        showLogButton.style.display = 'none'; // Hide log button until processing is done

        const file = jsonFileInput.files[0];
        const newCost = parseInt(costValueInput.value, 10);
        const newCooldown = parseInt(cooldownValueInput.value, 10);

        // GÁN CỨNG GIÁ TRỊ 0 CHO CÁC THUỘC TÍNH MỚI NÀY
        const newUltomatoCostPerExistingPlant = 0;
        const newTileTurnipFirstNonFreeCost = 0;


        if (!file) {
            log('Vui lòng chọn tệp PlantLevels.json trước.');
            showLogButton.style.display = 'block';
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
                        const plantName = obj.aliases && obj.aliases.length > 0 ? obj.aliases[0] : 'Unknown Plant';
                        let hasPlantSpecificChanges = false; // Flag for Ultomato/PowerPlant

                        if (obj.objdata && Array.isArray(obj.objdata.FloatStats)) {

                            let hasPacketCooldown = false;
                            let hasStartingCooldown = false;

                            obj.objdata.FloatStats.forEach(stat => {
                                // Update 'Cost' for all plants
                                if (stat.Name === 'Cost' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newCost);
                                    log(`  - Cập nhật Cost cho ${plantName} thành ${newCost}`);
                                    modificationsMade++;
                                }

                                // Update 'PacketCooldown' for all plants
                                if (stat.Name === 'PacketCooldown' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newCooldown);
                                    log(`  - Cập nhật PacketCooldown cho ${plantName} thành ${newCooldown}`);
                                    modificationsMade++;
                                    hasPacketCooldown = true;
                                }

                                // Update 'StartingCooldown' for all plants
                                if (stat.Name === 'StartingCooldown' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newCooldown);
                                    log(`  - Cập nhật StartingCooldown cho ${plantName} thành ${newCooldown}`);
                                    modificationsMade++;
                                    hasStartingCooldown = true;
                                }

                                // --- Xử lý thuộc tính đặc biệt cho Ultomato ---
                                if (plantName === 'ultomato' && stat.Name === 'Ultomato_CostPerExistingPlant' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newUltomatoCostPerExistingPlant);
                                    log(`  - Cập nhật Ultomato_CostPerExistingPlant cho ${plantName} thành ${newUltomatoCostPerExistingPlant}`);
                                    modificationsMade++;
                                    hasPlantSpecificChanges = true;
                                }

                                // --- Xử lý thuộc tính đặc biệt cho Power Plant ---
                                if (plantName === 'powerplant' && stat.Name === 'TileTurnip_FirstNonFreeCost' && Array.isArray(stat.Values)) {
                                    const originalLength = stat.Values.length;
                                    stat.Values = Array(originalLength).fill(newTileTurnipFirstNonFreeCost);
                                    log(`  - Cập nhật TileTurnip_FirstNonFreeCost cho ${plantName} thành ${newTileTurnipFirstNonFreeCost}`);
                                    modificationsMade++;
                                    hasPlantSpecificChanges = true;
                                }
                            });

                            // Log warnings for general cooldowns
                            if (plantName !== "marigold" && obj.objdata.FloatStats.length > 0) { // Marigold is a special case
                                if (!hasPacketCooldown) log(`  Lưu ý: Không tìm thấy PacketCooldown cho ${plantName}.`);
                                if (!hasStartingCooldown) log(`  Lưu ý: Không tìm thấy StartingCooldown cho ${plantName}.`);
                            }
                        } else if (plantName === 'marigold') {
                            // Marigold thường không có FloatStats/cấu trúc giống các cây khác, bỏ qua log cảnh báo cho nó
                            // log(`  Lưu ý: Cây ${plantName} có cấu trúc dữ liệu khác, không áp dụng thay đổi mặc định.`);
                        }

                        // Log warnings for plant-specific properties if not found
                        if (plantName === 'ultomato' && !hasPlantSpecificChanges) {
                            log(`  Lưu ý: Không tìm thấy Ultomato_CostPerExistingPlant cho Ultomato.`);
                        }
                        if (plantName === 'powerplant' && !hasPlantSpecificChanges) {
                            log(`  Lưu ý: Không tìm thấy TileTurnip_FirstNonFreeCost cho Power Plant.`);
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
                showLogButton.style.display = 'block';

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
            modalLogContent.textContent = currentLog;
        };

        reader.readAsText(file);
    });

    showLogButton.addEventListener('click', () => {
        logModal.style.display = 'flex'; // Use flex to center the modal
    });

    closeButton.addEventListener('click', () => {
        logModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === logModal) {
            logModal.style.display = 'none';
        }
    });
});
