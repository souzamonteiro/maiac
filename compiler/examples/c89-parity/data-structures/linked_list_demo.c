#include <stdio.h>

struct Node {
    int value;
    struct Node *next;
};

int sum_list(struct Node *head) {
    int total = 0;
    while (head != 0) {
        total += head->value;
        head = head->next;
    }
    return total;
}

int main(void) {
    struct Node third;
    struct Node second;
    struct Node first;

    third.value = 9;
    third.next = 0;
    second.value = 6;
    second.next = &third;
    first.value = 3;
    first.next = &second;

    printf("sum=%d\n", sum_list(&first));
    return 0;
}
