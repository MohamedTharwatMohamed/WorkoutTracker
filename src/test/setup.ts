import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import Dexie from 'dexie';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { beforeEach } from 'vitest';

// fake-indexeddb clones with Node's structuredClone, which turns jsdom Blobs into plain
// objects. Node's own Blob and File survive the clone, as browser Blobs do in IndexedDB.
globalThis.Blob = NodeBlob;
globalThis.File = NodeFile;

beforeEach(() => {
  const factory = new IDBFactory();
  globalThis.indexedDB = factory;
  Dexie.dependencies.indexedDB = factory;
});
