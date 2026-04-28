#include <stdio.h>

#define STACK_CAPACITY 8

struct IntStack {
    int data[STACK_CAPACITY];
    int top;
};

void stack_init(struct IntStack *s) {
    s->top = 0;
}

int stack_push(struct IntStack *s, int value) {
    if (s->top >= STACK_CAPACITY) return 0;
    s->data[s->top++] = value;
    return 1;
}

int stack_pop(struct IntStack *s, int *out) {
    if (s->top <= 0) return 0;
    s->top--;
    *out = s->data[s->top];
    return 1;
}

int main(void) {
    struct IntStack s;
    int value;

    stack_init(&s);

    stack_push(&s, 10);
    stack_push(&s, 20);
    stack_push(&s, 30);

    while (stack_pop(&s, &value)) {
        printf("pop=%d\n", value);
    }

    return 0;
}
