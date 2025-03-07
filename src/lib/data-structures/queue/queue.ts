/**
 * A queue is a data structure that follows the FIFO (first in, first out) principle.
 */
export class Queue<T> {
  private _queue: T[];
  constructor(initialData?: T[]) {
    this._queue = initialData ?? [];
  }

  /**
   * Adds an item to the end of the queue
   * @param item The item to add to the queue
   */
  enqueue(item: T) {
    this._queue.push(item);
  }

  /**
   * Removes the first item in the queue and returns it
   * @returns The first item in the queue
   */
  dequeue() {
    return this._queue.shift();
  }

  /**
   * Removes an item from the queue
   * @param item The item to remove from the queue
   */
  remove(item: T) {
    const index = this._queue.indexOf(item);
    if (index > -1) {
      const removed = this._queue.splice(index, 1);
      return removed[0];
    }
    return undefined;
  }

  /**
   * Clears the queue
   */
  clear() {
    this._queue = [];
  }

  /**
   * Retrieves the first item in the queue without removing it
   * @returns The first item in the queue
   */
  peek() {
    return this._queue[0];
  }

  get length() {
    return this._queue.length;
  }

  isEmpty() {
    return this._queue.length === 0;
  }
}
