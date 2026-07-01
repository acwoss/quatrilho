const DB_NAME = 'quatrilho';
const DB_VERSION = 1;
const STORE_NAME = 'savegame';
const SAVE_KEY = 'current';

function getIndexedDB() {
  if (typeof indexedDB === 'undefined') {
    return null;
  }

  return indexedDB;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB();

    if (!idb) {
      reject(new Error('IndexedDB indisponível.'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, callback) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(request ? request.result : undefined);
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      }),
  );
}

export async function loadSavedGame() {
  try {
    const record = await runTransaction('readonly', (store) =>
      store.get(SAVE_KEY),
    );

    if (!record || !record.config || !record.game) {
      return null;
    }

    // Retorna o objeto de jogo completo, incluindo o histórico de sinais
    return record;
  } catch {
    return null;
  }
}

export async function saveGame(config, game) {
  try {
    await runTransaction('readwrite', (store) =>
      store.put({ config, game, savedAt: Date.now() }, SAVE_KEY),
    );
    return true;
  } catch {
    return false;
  }
}

export async function clearSavedGame() {
  try {
    await runTransaction('readwrite', (store) => store.delete(SAVE_KEY));
    return true;
  } catch {
    return false;
  }
}
