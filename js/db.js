// Thin wrapper around IndexedDB via idb
const { openDB } = idb;

let _db;

export const db = {
  async open() {
    _db = await openDB('fitx', 1, {
      upgrade(database) {
        // Per-profile blobs
        if (!database.objectStoreNames.contains('profiles')) {
          database.createObjectStore('profiles', { keyPath: 'id' });
        }
        // Workout sessions
        if (!database.objectStoreNames.contains('sessions')) {
          const s = database.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          s.createIndex('by-profile-date', ['profileId', 'date']);
        }
        // Meal log
        if (!database.objectStoreNames.contains('meals')) {
          const m = database.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
          m.createIndex('by-profile-date', ['profileId', 'date']);
        }
        // Sleep log
        if (!database.objectStoreNames.contains('sleep')) {
          const sl = database.createObjectStore('sleep', { keyPath: 'id', autoIncrement: true });
          sl.createIndex('by-profile-date', ['profileId', 'date']);
        }
        // 1RM history
        if (!database.objectStoreNames.contains('orm')) {
          const o = database.createObjectStore('orm', { keyPath: 'id', autoIncrement: true });
          o.createIndex('by-profile-lift', ['profileId', 'lift']);
        }
        // Offline sync queue
        if (!database.objectStoreNames.contains('syncQueue')) {
          database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
    return _db;
  },

  get() { return _db; },

  async getAll(store) { return _db.getAll(store); },
  async get(store, key) { return _db.get(store, key); },
  async put(store, value) { return _db.put(store, value); },
  async delete(store, key) { return _db.delete(store, key); },
  async getAllFromIndex(store, index, query) {
    return _db.getAllFromIndex(store, index, query);
  },
};
