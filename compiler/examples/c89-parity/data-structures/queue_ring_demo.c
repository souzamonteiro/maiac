#include <stdio.h>

#define CAPACITY 5

struct RingQueue {
    int data[CAPACITY];
    int head;
    int tail;
    int count;
};

void queue_init(struct RingQueue *q) {
    q->head = 0;
    q->tail = 0;
    q->count = 0;
}

int enqueue(struct RingQueue *q, int value) {
    if (q->count == CAPACITY) return 0;
    q->data[q->tail] = value;
    q->tail = (q->tail + 1) % CAPACITY;
    q->count++;
    return 1;
}

int dequeue(struct RingQueue *q, int *out) {
    if (q->count == 0) return 0;
    *out = q->data[q->head];
    q->head = (q->head + 1) % CAPACITY;
    q->count--;
    return 1;
}

int main(void) {
    struct RingQueue q;
    int value;
    queue_init(&q);
    enqueue(&q, 4);
    enqueue(&q, 8);
    enqueue(&q, 12);
    while (dequeue(&q, &value)) {
        printf("deq=%d\n", value);
    }
    return 0;
}
