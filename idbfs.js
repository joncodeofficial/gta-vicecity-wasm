"use strict";

const textEncoder = new TextEncoder();

function wrapIDBFS(logger) {
    const onLoadListeners = [];
    const onSaveListeners = [];

    function getDB(instance, mount) {
        return new Promise((resolve, reject) => {
            instance.getDB(mount.mountpoint, (err, db) => {
                if (err) return reject(err);
                resolve(db);
            });
        });
    }

    async function saveToIDBFS(instance, mount, entries) {
        const db = await getDB(instance, mount);
        return new Promise((resolve, reject) => {
            (async function () {
                const tx = db.transaction([instance.DB_STORE_NAME], "readwrite");
                const store = tx.objectStore(instance.DB_STORE_NAME);
                
                for (const entry of entries) {
                    await new Promise((resolveStore, rejectStore) => {
                        instance.storeRemoteEntry(store, entry.path, entry, (err) => {
                            if (err) return rejectStore(err);
                            resolveStore();
                        });
                    });
                }

                tx.onerror = (e) => {
                    reject(e);
                    e.preventDefault();
                };
                tx.oncomplete = () => {
                    resolve();
                };
            })().catch(reject);
        });
    }

    async function clearIDBFS(instance, mount) {
        const db = await getDB(instance, mount);
        const tx = db.transaction([instance.DB_STORE_NAME], "readwrite");
        const store = tx.objectStore(instance.DB_STORE_NAME);
        
        await new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // Helper functions for binary encoding/decoding
    function writeInt32(buffer, value, offset) {
        buffer[offset] = value & 255;
        buffer[offset + 1] = (value & 65280) >> 8;
        buffer[offset + 2] = (value & 16711680) >> 16;
        buffer[offset + 3] = (value & 4278190080) >> 24;
        return offset + 4;
    }

    function readInt32(buffer, offset) {
        return (buffer[offset] & 255) | 
               ((buffer[offset + 1] << 8) & 65280) | 
               ((buffer[offset + 2] << 16) & 16711680) | 
               ((buffer[offset + 3] << 24) & 4278190080);
    }

    function writeInt64(buffer, value, offset) {
        const high = (value / 4294967296) >>> 0;
        writeInt32(buffer, value >>> 0, offset);
        writeInt32(buffer, high, offset + 4);
        return offset + 8;
    }

    function readInt64(buffer, offset) {
        const low = readInt32(buffer, offset);
        const high = readInt32(buffer, offset + 4);
        return 4294967296 * high + low;
    }

    function decodeEntries(buffer) {
        const entries = [];
        let offset = 0;
        while (offset < buffer.length) {
            const pathLen = readInt32(buffer, offset);
            offset += 4;
            const path = textDecoder.decode(buffer.subarray(offset, offset + pathLen));
            offset += pathLen;
            
            const timestamp = readInt64(buffer, offset);
            offset += 8;
            
            const mode = readInt32(buffer, offset);
            offset += 4;
            
            const hasContents = buffer[offset] === 1;
            offset += 1;
            
            let contents;
            if (hasContents) {
                const contentLen = readInt32(buffer, offset);
                offset += 4;
                contents = buffer.subarray(offset, offset + contentLen);
                offset += contentLen;
            }
            
            entries.push({
                path: path,
                timestamp: new Date(timestamp),
                mode: mode,
                contents: contents
            });
        }
        return entries;
    }

    function encodeEntries(entries) {
        let size = 0;
        const processedEntries = entries.map(entry => {
            const encodedPath = textEncoder.encode(entry.path);
            size += 4 + encodedPath.length + 8 + 4 + 1 + (entry.contents ? 4 + entry.contents.length : 0);
            return {
                key: encodedPath,
                time: entry.timestamp.getTime(),
                mode: entry.mode,
                contents: entry.contents
            };
        });

        const buffer = new Uint8Array(size);
        let offset = 0;
        
        for (const entry of processedEntries) {
            offset = writeInt32(buffer, entry.key.length, offset);
            buffer.set(entry.key, offset);
            offset += entry.key.length;
            
            offset = writeInt64(buffer, entry.time, offset);
            offset = writeInt32(buffer, entry.mode, offset);
            
            buffer[offset] = entry.contents ? 1 : 0;
            offset += 1;
            
            if (entry.contents) {
                offset = writeInt32(buffer, entry.contents.length, offset);
                buffer.set(entry.contents, offset);
                offset += entry.contents.length;
            }
        }
        return buffer;
    }

    async function getLocalEntries(instance, mount) {
        const localSet = await new Promise((resolve, reject) => {
            instance.getLocalSet(mount, (err, set) => {
                if (err) return reject(err);
                resolve(set);
            });
        });

        const entries = [];
        for (const path of Object.keys(localSet.entries)) {
            const entry = await new Promise((resolve, reject) => {
                instance.loadLocalEntry(path, (err, ent) => {
                    if (err) return reject(err);
                    resolve(ent);
                });
            });
            entry.path = path;
            entries.push(entry);
        }
        return entries;
    }

    window.syncfs = (instance, mount, populate, callback, originalSync) => {
        (async function () {
            if (populate) {
                for (const listener of onLoadListeners) {
                    const data = await listener(instance, mount);
                    if (data) {
                        await clearIDBFS(instance, mount);
                        if (data.length > 0) {
                            const entries = decodeEntries(data);
                            await saveToIDBFS(instance, mount, entries);
                        }
                        break;
                    }
                }
            }

            originalSync((err) => {
                callback(err);
                
                (async function () {
                    if (!populate) {
                        let cachedData = null;
                        const getData = async () => {
                            if (cachedData === null) {
                                const entries = await getLocalEntries(instance, mount);
                                cachedData = encodeEntries(entries);
                            }
                            return cachedData;
                        };

                        for (const listener of onSaveListeners) {
                            listener(getData, instance, mount);
                        }
                    }
                })().catch(err => {
                    logger("ERR!!! syncfs error", err);
                });
            });

        })().catch(err => {
            logger("ERR!!! syncfs error", err);
            callback(err);
        });
    };

    return {
        addListener: (listener) => {
            onLoadListeners.push(listener.onLoad);
            onSaveListeners.push(listener.onSave);
        }
    };
}

if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports.wrapIDBFS = wrapIDBFS;
}
window.wrapIDBFS = wrapIDBFS;
