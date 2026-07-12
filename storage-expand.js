// storage-expand.js - 扩容 + 自动清理紧急备份
(function() {
    // 需要迁移的 localStorage 键名（这些可能含有大图片数据）
    const BIG_KEYS = [
        'chatBackground',
        'partnerAvatar',
        'myAvatar',
        'myAvatarFrame',
        'partnerAvatarFrame',
        'dg_header_bg',
        'dg_overlay_bg',
        'dg_custom_data',
        'playerCover',
        'callBgImageData',
        'stickerLibrary',
        'myStickerLibrary'
    ];

    // 在页面加载时，将这些大键从 localStorage 迁移到 IndexedDB
    async function migrateToIndexedDB() {
        // 打开 IndexedDB 数据库
        const dbName = 'MilkChatDB_Expand';
        const storeName = 'bigData';
        let db;
        try {
            db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(dbName, 1);
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains(storeName)) {
                        request.result.createObjectStore(storeName);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch(e) {
            console.warn('IndexedDB 打开失败，继续使用 localStorage', e);
            return;
        }

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        // 遍历所有大键，如果 localStorage 有数据，则移到 IndexedDB，并删除 localStorage 中的该项
        for (const key of BIG_KEYS) {
            const val = localStorage.getItem(key);
            if (val) {
                try {
                    await new Promise((resolve, reject) => {
                        const req = store.put(val, key);
                        req.onsuccess = resolve;
                        req.onerror = () => reject(req.error);
                    });
                    localStorage.removeItem(key);
                    console.log(`[storage-expand] 已迁移 ${key} 到 IndexedDB`);
                } catch(e) {
                    console.warn(`[storage-expand] 迁移 ${key} 失败`, e);
                }
            }
        }

        // ========== 🆕 关键新增：清理占用空间的紧急备份 ==========
        // 删除 localStorage 中的消息紧急备份（原代码会在这里存 200 条消息，占满 5MB）
        try {
            const backupKey = 'BACKUP_V1_critical';
            const timestampKey = 'BACKUP_V1_timestamp';
            if (localStorage.getItem(backupKey)) {
                localStorage.removeItem(backupKey);
                console.log('[storage-expand] 已清理紧急备份 (BACKUP_V1_critical)，释放 localStorage 空间');
            }
            if (localStorage.getItem(timestampKey)) {
                localStorage.removeItem(timestampKey);
            }
        } catch(e) {
            console.warn('[storage-expand] 清理备份失败', e);
        }

        // 重写 localStorage 方法，让后续写入大数据时也自动存到 IndexedDB
        const originalSetItem = Storage.prototype.setItem;
        const originalGetItem = Storage.prototype.getItem;
        const originalRemoveItem = Storage.prototype.removeItem;

        Storage.prototype.setItem = function(key, value) {
            // 如果是大键，存到 IndexedDB
            if (BIG_KEYS.includes(key)) {
                try {
                    const tx2 = db.transaction(storeName, 'readwrite');
                    const store2 = tx2.objectStore(storeName);
                    store2.put(value, key);
                } catch(e) {
                    originalSetItem.call(this, key, value);
                }
                return;
            }
            // 拦截紧急备份，如果太大就跳过（防止再次撑爆 localStorage）
            if (key === 'BACKUP_V1_critical') {
                // 如果 value 超过 100KB，就不存了（因为聊天记录本身在 IndexedDB 里是安全的）
                if (value && value.length > 100 * 1024) {
                    console.warn('[storage-expand] 跳过过大的紧急备份 (超过100KB)，避免撑爆 localStorage');
                    return;
                }
            }
            originalSetItem.call(this, key, value);
        };

        Storage.prototype.getItem = function(key) {
            if (BIG_KEYS.includes(key)) {
                if (!window._bigDataCache) {
                    window._bigDataCache = {};
                    try {
                        const tx3 = db.transaction(storeName, 'readonly');
                        const store3 = tx3.objectStore(storeName);
                        const request = store3.getAllKeys();
                        request.onsuccess = () => {
                            const keys = request.result;
                            keys.forEach(k => {
                                const getReq = store3.get(k);
                                getReq.onsuccess = () => {
                                    window._bigDataCache[k] = getReq.result;
                                };
                            });
                        };
                    } catch(e) {}
                }
                const cached = window._bigDataCache[key];
                if (cached !== undefined) return cached;
                return originalGetItem.call(this, key);
            }
            return originalGetItem.call(this, key);
        };

        Storage.prototype.removeItem = function(key) {
            if (BIG_KEYS.includes(key)) {
                try {
                    const tx4 = db.transaction(storeName, 'readwrite');
                    const store4 = tx4.objectStore(storeName);
                    store4.delete(key);
                } catch(e) {}
                if (window._bigDataCache) delete window._bigDataCache[key];
                return;
            }
            originalRemoveItem.call(this, key);
        };
    }

    // 执行迁移
    migrateToIndexedDB().then(() => {
        console.log('[storage-expand] 扩容 + 紧急备份清理完成！');
        // 显示当前 localStorage 剩余空间（估算）
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length * 2; // UTF-16 双字节
                }
            }
            const usedKB = (total / 1024).toFixed(1);
            const maxKB = 5 * 1024;
            const percent = ((total / (5 * 1024 * 1024)) * 100).toFixed(1);
            console.log(`[storage-expand] 当前 localStorage 使用: ${usedKB} KB / 5120 KB (${percent}%)`);
            if (percent < 30) {
                console.log('✅ localStorage 空间充足，聊天记录将安全存储在 IndexedDB 中，不受 5MB 限制');
            }
        } catch(e) {}
    });
})();